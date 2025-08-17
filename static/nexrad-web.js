/**
 * NEXRAD Weather Radar Visualization with Mapbox GL JS (Production Version)
 * Connects to the NEXRAD API backend for processing and displaying radar data
 */

class NEXRADWebVisualization {
    constructor() {
        // Set your Mapbox access token here
        mapboxgl.accessToken = 'pk.eyJ1Ijoid2VhdGhlciIsImEiOiJjbHAxbHNjdncwaDhvMmptcno1ZTdqNDJ0In0.iywE3NefjboFg11a11ON0Q';
        
        this.map = null;
        this.currentJobId = null;
        this.radarLayers = [];
        this.apiBaseUrl = '/api'; // API endpoint
        
        this.init();
    }
    
    init() {
        // Check if Mapbox token is set
        if (mapboxgl.accessToken === 'pk.eyJ1Ijoid2VhdGhlciIsImEiOiJjbHAxbHNjdncwaDhvMmptcno1ZTdqNDJ0In0.iywE3NefjboFg11a11ON0Q') {
            this.showTokenWarning();
            return;
        }
        
        this.initMap();
        this.setupEventListeners();
        this.showStatus('Ready to load NEXRAD data', 'success');
    }
    
    showTokenWarning() {
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; color: white; background: #1a1a1a; height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <h1>⚠️ Mapbox Access Token Required</h1>
                <p>Please set your Mapbox access token in the JavaScript file (static/nexrad-web.js)</p>
                <p>Get your free token at: <a href="https://account.mapbox.com/" style="color: #0078d4;">https://account.mapbox.com/</a></p>
                <p>Replace the example token in line 8 of nexrad-web.js with your actual token.</p>
                <div style="background: #333; padding: 15px; border-radius: 8px; margin-top: 20px; font-family: monospace; font-size: 14px;">
                    mapboxgl.accessToken = 'your-actual-token-here';
                </div>
            </div>
        `;
    }
    
    initMap() {
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-98.5795, 39.8283], // Center of USA
            zoom: 4,
            projection: 'mercator'
        });
        
        this.map.on('load', () => {
            console.log('Map loaded successfully');
        });
        
        // Add navigation controls
        this.map.addControl(new mapboxgl.NavigationControl());
        
        // Add fullscreen control
        this.map.addControl(new mapboxgl.FullscreenControl());
    }
    
    setupEventListeners() {
        const loadButton = document.getElementById('loadData');
        const opacitySlider = document.getElementById('opacity');
        const vizTypeSelect = document.getElementById('vizType');
        
        loadButton.addEventListener('click', () => this.loadNEXRADData());
        
        opacitySlider.addEventListener('input', (e) => {
            this.updateOpacity(parseFloat(e.target.value));
        });
        
        vizTypeSelect.addEventListener('change', (e) => {
            this.updateVisualizationType(e.target.value);
        });
    }
    
    async loadNEXRADData() {
        const url = document.getElementById('nexradUrl').value;
        const loadButton = document.getElementById('loadData');
        
        if (!url) {
            this.showStatus('Please enter a NEXRAD file URL', 'error');
            return;
        }
        
        loadButton.disabled = true;
        loadButton.textContent = 'Processing...';
        this.showStatus('Submitting NEXRAD data for processing...', 'loading');
        
        try {
            // Step 1: Submit NEXRAD URL for processing
            const processResponse = await fetch(`${this.apiBaseUrl}/process-nexrad`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            });
            
            if (!processResponse.ok) {
                throw new Error(`HTTP error! status: ${processResponse.status}`);
            }
            
            const processResult = await processResponse.json();
            this.currentJobId = processResult.job_id;
            
            if (processResult.cached) {
                this.showStatus('Using cached data...', 'loading');
                await this.fetchProcessedData();
            } else {
                this.showStatus('Processing NEXRAD data, please wait...', 'loading');
                await this.pollForCompletion();
            }
            
            loadButton.disabled = false;
            loadButton.textContent = 'Load NEXRAD Data';
            
        } catch (error) {
            console.error('Error loading NEXRAD data:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
            loadButton.disabled = false;
            loadButton.textContent = 'Load NEXRAD Data';
        }
    }
    
    async pollForCompletion() {
        const maxAttempts = 60; // 5 minutes max
        let attempts = 0;
        
        const poll = async () => {
            try {
                attempts++;
                
                const response = await fetch(`${this.apiBaseUrl}/data/${this.currentJobId}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.status === 'completed') {
                    await this.displayProcessedData(result.data);
                    this.showStatus('NEXRAD data loaded successfully!', 'success');
                } else if (result.status === 'error') {
                    throw new Error(result.error || 'Processing failed');
                } else if (result.status === 'processing') {
                    if (attempts < maxAttempts) {
                        this.showStatus(`Processing... (${attempts}/${maxAttempts})`, 'loading');
                        setTimeout(poll, 5000); // Poll every 5 seconds
                    } else {
                        throw new Error('Processing timeout');
                    }
                }
                
            } catch (error) {
                throw new Error(`Polling error: ${error.message}`);
            }
        };
        
        await poll();
    }
    
    async fetchProcessedData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/data/${this.currentJobId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'completed') {
                await this.displayProcessedData(result.data);
                this.showStatus('NEXRAD data loaded successfully!', 'success');
            } else {
                throw new Error(result.error || 'Data not ready');
            }
            
        } catch (error) {
            throw new Error(`Failed to fetch processed data: ${error.message}`);
        }
    }
    
    async displayProcessedData(data) {
        this.clearRadarLayers();
        
        // Store the processed data
        this.processedData = {
            geojson: data.geojson,
            imageInfo: data.image_info,
            imageUrl: `${this.apiBaseUrl}/image/${this.currentJobId}`,
            timestamp: data.timestamp,
            sourceUrl: data.url
        };
        
        // Add data to map
        this.addRadarDataToMap();
        
        // Fit map to data bounds if available
        if (data.image_info && data.image_info.bounds) {
            const bounds = data.image_info.bounds;
            this.map.fitBounds([
                [bounds.west, bounds.south],
                [bounds.east, bounds.north]
            ], { padding: 50 });
        }
    }
    
    addRadarDataToMap() {
        if (!this.processedData) return;
        
        const vizType = document.getElementById('vizType').value;
        const opacity = parseFloat(document.getElementById('opacity').value);
        
        // Add raster overlay
        if (vizType === 'raster' || vizType === 'both') {
            this.addRasterOverlay(opacity);
        }
        
        // Add point data
        if (vizType === 'points' || vizType === 'both') {
            this.addPointData(opacity);
        }
    }
    
    addRasterOverlay(opacity) {
        const sourceId = 'nexrad-raster';
        const layerId = 'nexrad-raster-layer';
        
        if (!this.processedData.imageInfo || !this.processedData.imageInfo.coordinates) {
            console.warn('No image coordinates available for raster overlay');
            return;
        }
        
        // Add source
        this.map.addSource(sourceId, {
            type: 'image',
            url: this.processedData.imageUrl,
            coordinates: this.processedData.imageInfo.coordinates
        });
        
        // Add layer
        this.map.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
                'raster-opacity': opacity
            }
        });
        
        this.radarLayers.push({ sourceId, layerId, type: 'raster' });
    }
    
    addPointData(opacity) {
        const sourceId = 'nexrad-points';
        const layerId = 'nexrad-points-layer';
        
        if (!this.processedData.geojson || !this.processedData.geojson.features) {
            console.warn('No GeoJSON data available for point visualization');
            return;
        }
        
        // Add source
        this.map.addSource(sourceId, {
            type: 'geojson',
            data: this.processedData.geojson
        });
        
        // Add layer
        this.map.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            paint: {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    4, 2,
                    8, 6,
                    12, 12
                ],
                'circle-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'reflectivity'],
                    -10, '#40E0FF',
                    5, '#00FF00',
                    20, '#FFFF00',
                    35, '#FFA500',
                    50, '#FF0000',
                    65, '#FF00FF'
                ],
                'circle-opacity': opacity,
                'circle-stroke-width': 0
            }
        });
        
        this.radarLayers.push({ sourceId, layerId, type: 'points' });
        
        // Add popup on click
        this.map.on('click', layerId, (e) => {
            const properties = e.features[0].properties;
            const coordinates = e.features[0].geometry.coordinates.slice();
            
            new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(`
                    <div style="color: black;">
                        <strong>Reflectivity:</strong> ${properties.reflectivity.toFixed(1)} dBZ<br>
                        <strong>Intensity:</strong> ${properties.intensity.toFixed(0)}%
                    </div>
                `)
                .addTo(this.map);
        });
        
        // Change cursor on hover
        this.map.on('mouseenter', layerId, () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });
        
        this.map.on('mouseleave', layerId, () => {
            this.map.getCanvas().style.cursor = '';
        });
    }
    
    clearRadarLayers() {
        this.radarLayers.forEach(({ sourceId, layerId }) => {
            if (this.map.getLayer(layerId)) {
                this.map.removeLayer(layerId);
            }
            if (this.map.getSource(sourceId)) {
                this.map.removeSource(sourceId);
            }
        });
        this.radarLayers = [];
    }
    
    updateOpacity(opacity) {
        this.radarLayers.forEach(({ layerId, type }) => {
            if (this.map.getLayer(layerId)) {
                if (type === 'raster') {
                    this.map.setPaintProperty(layerId, 'raster-opacity', opacity);
                } else if (type === 'points') {
                    this.map.setPaintProperty(layerId, 'circle-opacity', opacity);
                }
            }
        });
    }
    
    updateVisualizationType(vizType) {
        if (this.processedData) {
            this.addRadarDataToMap();
        }
    }
    
    showStatus(message, type) {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
        statusEl.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new NEXRADWebVisualization();
});
