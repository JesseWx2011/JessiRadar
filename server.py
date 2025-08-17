#!/usr/bin/env python3
"""
Simple HTTP Server for StormTracker Pro Radar App
Serves the radar application without complex API dependencies
"""

import http.server
import socketserver
import os
import webbrowser
import threading
import time
from pathlib import Path

class RadarHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler for the radar app"""
    
    def end_headers(self):
        # Add CORS headers to allow cross-origin requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle preflight OPTIONS requests"""
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Custom logging for the radar app"""
        print(f"[Radar Server] {format % args}")

def start_server(port=8000):
    """Start the HTTP server"""
    # Change to the directory containing the HTML file
    os.chdir(Path(__file__).parent)
    
    # Create server
    with socketserver.TCPServer(("", port), RadarHTTPRequestHandler) as httpd:
        print(f"🌦️  StormTracker Pro Radar Server")
        print(f"📡 Server running at http://localhost:{port}")
        print(f"🌐 Opening browser automatically...")
        print(f"⏹️  Press Ctrl+C to stop the server")
        print("-" * 50)
        
        # Open browser automatically
        try:
            webbrowser.open(f'http://localhost:{port}')
        except:
            print("⚠️  Could not open browser automatically")
            print(f"🌐 Please open: http://localhost:{port}")
        
        # Start server
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
        except Exception as e:
            print(f"❌ Server error: {e}")

if __name__ == "__main__":
    start_server()