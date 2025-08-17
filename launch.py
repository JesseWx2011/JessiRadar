#!/usr/bin/env python3
"""
WeatherRadar Pro Launcher
Quick launcher for the NEXRAD weather radar web application
"""

import os
import sys
import subprocess
import webbrowser
import time
import threading
from pathlib import Path

def print_banner():
    """Print application banner"""
    print("\n" + "="*60)
    print("🌦️  WeatherRadar Pro - NEXRAD Visualization Platform")
    print("="*60)
    print("A modern web application for real-time weather radar data")
    print("Similar to WeatherWise and AtticRadar\n")

def check_requirements():
    """Check if required packages are installed"""
    try:
        import flask
        import requests
        import numpy
        from PIL import Image
        print("✅ All required packages are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing required package: {e.name}")
        print("\nPlease install requirements:")
        print("pip install -r requirements-api.txt")
        return False

def start_api_server():
    """Start the API server in background"""
    print("🚀 Starting API server...")
    
    # Start the Flask API server
    env = os.environ.copy()
    env['DEBUG'] = 'false'
    env['PORT'] = '5000'
    
    process = subprocess.Popen(
        [sys.executable, 'nexrad_api.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env
    )
    
    # Wait a moment for server to start
    time.sleep(3)
    
    # Check if server is running
    try:
        import requests
        response = requests.get('http://localhost:5000/health', timeout=5)
        if response.status_code == 200:
            print("✅ API server started successfully")
            return process
        else:
            print("❌ API server failed to start")
            return None
    except Exception as e:
        print(f"❌ Failed to connect to API server: {e}")
        return None

def start_web_server():
    """Start a simple web server for static files"""
    print("🌐 Starting web server...")
    
    os.chdir('static')
    
    # Try different Python HTTP server commands
    commands = [
        [sys.executable, '-m', 'http.server', '8000'],
        ['python3', '-m', 'http.server', '8000'],
        ['python', '-m', 'http.server', '8000']
    ]
    
    for cmd in commands:
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            time.sleep(2)
            
            # Test if server is running
            import requests
            response = requests.get('http://localhost:8000', timeout=5)
            if response.status_code == 200:
                print("✅ Web server started successfully")
                return process
        except Exception:
            if process:
                process.terminate()
            continue
    
    print("❌ Failed to start web server")
    return None

def open_browser():
    """Open the web application in default browser"""
    print("🌐 Opening web application...")
    time.sleep(2)
    
    url = "http://localhost:8000"
    try:
        webbrowser.open(url)
        print(f"✅ Opened {url} in your default browser")
    except Exception as e:
        print(f"❌ Failed to open browser: {e}")
        print(f"Please manually open: {url}")

def show_usage_info():
    """Show usage information"""
    print("\n" + "="*60)
    print("📖 USAGE INFORMATION")
    print("="*60)
    print("1. The web application should now be open in your browser")
    print("2. If not, manually navigate to: http://localhost:8000")
    print("3. API server is running at: http://localhost:5000")
    print("\n🎯 QUICK START:")
    print("• Click 'Load Radar Data' to process the default NEXRAD file")
    print("• Adjust visualization settings in the left panel")
    print("• Use the map controls to zoom and pan")
    print("• Click on radar data points for detailed information")
    print("\n⌨️  KEYBOARD SHORTCUTS:")
    print("• Space: Play/Pause animation")
    print("• ←/→: Previous/Next frame")
    print("• F: Toggle fullscreen")
    print("• L: Go to current location")
    print("\n🔧 CUSTOMIZATION:")
    print("• Edit static/app.js to modify behavior")
    print("• Edit static/styles.css to change appearance")
    print("• Edit nexrad_processor.py to modify data processing")
    print("\n" + "="*60)

def main():
    """Main launcher function"""
    print_banner()
    
    # Check if we're in the right directory
    if not os.path.exists('nexrad_api.py'):
        print("❌ Please run this script from the WeatherRadar Pro directory")
        sys.exit(1)
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    print("🔧 Starting WeatherRadar Pro...")
    
    # Start API server
    api_process = start_api_server()
    if not api_process:
        print("❌ Failed to start API server")
        sys.exit(1)
    
    # Start web server
    web_process = start_web_server()
    if not web_process:
        print("❌ Failed to start web server")
        api_process.terminate()
        sys.exit(1)
    
    # Open browser
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.start()
    
    # Show usage info
    show_usage_info()
    
    try:
        print("🔄 WeatherRadar Pro is running...")
        print("Press Ctrl+C to stop all servers\n")
        
        # Keep the main thread alive
        while True:
            time.sleep(1)
            
            # Check if processes are still running
            if api_process.poll() is not None:
                print("❌ API server stopped unexpectedly")
                break
            if web_process.poll() is not None:
                print("❌ Web server stopped unexpectedly")
                break
                
    except KeyboardInterrupt:
        print("\n🛑 Shutting down WeatherRadar Pro...")
        
        # Terminate processes
        if api_process:
            api_process.terminate()
        if web_process:
            web_process.terminate()
        
        print("✅ All servers stopped")
        print("Thank you for using WeatherRadar Pro! 🌦️")

if __name__ == "__main__":
    main()