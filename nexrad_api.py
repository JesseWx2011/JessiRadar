#!/usr/bin/env python3
"""
NEXRAD API Server
Flask-based API for processing NEXRAD data for web visualization
"""

from flask import Flask, request, jsonify, send_file, render_template_string
from flask_cors import CORS
import os
import json
import logging
from nexrad_processor import NEXRADProcessor
import tempfile
import uuid
from datetime import datetime, timedelta
import threading
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
PROCESSED_DATA_DIR = "processed_data"
CACHE_DURATION_HOURS = 24

# Ensure processed data directory exists
os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)

# In-memory cache for processed data
data_cache = {}
cache_lock = threading.Lock()

def cleanup_cache():
    """Remove expired cache entries"""
    while True:
        try:
            with cache_lock:
                current_time = datetime.now()
                expired_keys = []
                
                for key, data in data_cache.items():
                    if current_time - data['timestamp'] > timedelta(hours=CACHE_DURATION_HOURS):
                        expired_keys.append(key)
                
                for key in expired_keys:
                    del data_cache[key]
                    logger.info(f"Removed expired cache entry: {key}")
            
            time.sleep(3600)  # Check every hour
        except Exception as e:
            logger.error(f"Error in cache cleanup: {e}")
            time.sleep(3600)

# Start cache cleanup thread
cleanup_thread = threading.Thread(target=cleanup_cache, daemon=True)
cleanup_thread.start()

@app.route('/')
def index():
    """Serve the main application page"""
    return render_template_string("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>NEXRAD API Server</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; }
            .endpoint { background: #f8f9fa; padding: 15px; margin: 15px 0; border-left: 4px solid #007bff; }
            .method { background: #007bff; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; }
            code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
            .example { background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🌦️ NEXRAD API Server</h1>
            <p>Real-time NEXRAD Level 3 weather radar data processing API</p>
            
            <h2>API Endpoints</h2>
            
            <div class="endpoint">
                <span class="method">POST</span>
                <strong>/api/process-nexrad</strong>
                <p>Process a NEXRAD Level 3 file from URL</p>
                <div class="example">
                    <strong>Request Body:</strong><br>
                    <code>{"url": "https://unidata-nexrad-level3.s3.amazonaws.com/..."}</code>
                </div>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span>
                <strong>/api/data/{job_id}</strong>
                <p>Get processed data by job ID</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span>
                <strong>/api/image/{job_id}</strong>
                <p>Get processed radar image overlay</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span>
                <strong>/api/geojson/{job_id}</strong>
                <p>Get processed radar data as GeoJSON</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span>
                <strong>/health</strong>
                <p>Health check endpoint</p>
            </div>
            
            <h2>Usage Example</h2>
            <div class="example">
                <strong>JavaScript:</strong><br>
                <pre><code>
// Process NEXRAD data
const response = await fetch('/api/process-nexrad', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        url: 'https://unidata-nexrad-level3.s3.amazonaws.com/FDR_N0B_2025_08_17_22_05_15'
    })
});

const result = await response.json();
const jobId = result.job_id;

// Get processed data
const data = await fetch(`/api/data/${jobId}`).then(r => r.json());
                </code></pre>
            </div>
        </div>
    </body>
    </html>
    """)

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'cache_size': len(data_cache)
    })

@app.route('/api/process-nexrad', methods=['POST'])
def process_nexrad():
    """Process NEXRAD data from URL"""
    try:
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({'error': 'URL is required'}), 400
        
        nexrad_url = data['url']
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Check if URL is already cached
        url_hash = hash(nexrad_url)
        with cache_lock:
            for cached_id, cached_data in data_cache.items():
                if cached_data.get('url_hash') == url_hash:
                    logger.info(f"Using cached data for URL: {nexrad_url}")
                    return jsonify({
                        'job_id': cached_id,
                        'status': 'completed',
                        'cached': True,
                        'message': 'Data retrieved from cache'
                    })
        
        # Process data in background
        threading.Thread(
            target=process_nexrad_background,
            args=(job_id, nexrad_url, url_hash),
            daemon=True
        ).start()
        
        return jsonify({
            'job_id': job_id,
            'status': 'processing',
            'message': 'NEXRAD data processing started'
        })
        
    except Exception as e:
        logger.error(f"Error processing NEXRAD request: {e}")
        return jsonify({'error': str(e)}), 500

def process_nexrad_background(job_id, nexrad_url, url_hash):
    """Background task to process NEXRAD data"""
    try:
        logger.info(f"Starting NEXRAD processing for job {job_id}")
        
        # Initialize cache entry
        with cache_lock:
            data_cache[job_id] = {
                'status': 'processing',
                'timestamp': datetime.now(),
                'url': nexrad_url,
                'url_hash': url_hash
            }
        
        # Create temporary directory for this job
        job_dir = os.path.join(PROCESSED_DATA_DIR, job_id)
        os.makedirs(job_dir, exist_ok=True)
        
        # Process NEXRAD data
        processor = NEXRADProcessor()
        
        if not processor.fetch_nexrad_data(nexrad_url):
            raise Exception("Failed to fetch NEXRAD data")
        
        # Convert to image overlay
        image_path = os.path.join(job_dir, "overlay.png")
        image_info = processor.convert_to_image_overlay(image_path)
        
        if not image_info:
            raise Exception("Failed to create image overlay")
        
        # Convert to GeoJSON
        geojson_path = os.path.join(job_dir, "data.geojson")
        if not processor.convert_to_geojson(geojson_path):
            raise Exception("Failed to create GeoJSON")
        
        # Read GeoJSON data
        with open(geojson_path, 'r') as f:
            geojson_data = json.load(f)
        
        # Update cache with results
        with cache_lock:
            data_cache[job_id].update({
                'status': 'completed',
                'image_info': image_info,
                'geojson': geojson_data,
                'files': {
                    'image': image_path,
                    'geojson': geojson_path
                }
            })
        
        logger.info(f"NEXRAD processing completed for job {job_id}")
        
    except Exception as e:
        logger.error(f"Error processing NEXRAD data for job {job_id}: {e}")
        with cache_lock:
            if job_id in data_cache:
                data_cache[job_id]['status'] = 'error'
                data_cache[job_id]['error'] = str(e)

@app.route('/api/data/<job_id>')
def get_data(job_id):
    """Get processed data by job ID"""
    try:
        with cache_lock:
            if job_id not in data_cache:
                return jsonify({'error': 'Job not found'}), 404
            
            job_data = data_cache[job_id].copy()
        
        if job_data['status'] == 'processing':
            return jsonify({
                'status': 'processing',
                'message': 'Data is still being processed'
            })
        
        if job_data['status'] == 'error':
            return jsonify({
                'status': 'error',
                'error': job_data.get('error', 'Unknown error')
            }), 500
        
        # Return processed data
        return jsonify({
            'status': 'completed',
            'data': {
                'geojson': job_data['geojson'],
                'image_info': job_data['image_info'],
                'timestamp': job_data['timestamp'].isoformat(),
                'url': job_data['url']
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting data for job {job_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/image/<job_id>')
def get_image(job_id):
    """Get processed radar image overlay"""
    try:
        with cache_lock:
            if job_id not in data_cache:
                return jsonify({'error': 'Job not found'}), 404
            
            job_data = data_cache[job_id]
        
        if job_data['status'] != 'completed':
            return jsonify({'error': 'Data not ready'}), 404
        
        image_path = job_data['files']['image']
        
        if not os.path.exists(image_path):
            return jsonify({'error': 'Image file not found'}), 404
        
        return send_file(image_path, mimetype='image/png')
        
    except Exception as e:
        logger.error(f"Error getting image for job {job_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/geojson/<job_id>')
def get_geojson(job_id):
    """Get processed radar data as GeoJSON"""
    try:
        with cache_lock:
            if job_id not in data_cache:
                return jsonify({'error': 'Job not found'}), 404
            
            job_data = data_cache[job_id]
        
        if job_data['status'] != 'completed':
            return jsonify({'error': 'Data not ready'}), 404
        
        return jsonify(job_data['geojson'])
        
    except Exception as e:
        logger.error(f"Error getting GeoJSON for job {job_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting NEXRAD API server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)