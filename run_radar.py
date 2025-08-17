#!/usr/bin/env python3
"""
StormTracker Pro Radar App Launcher
Quick and easy launcher for the radar application
"""

import os
import sys
import subprocess
import time

def print_banner():
    """Print the application banner"""
    print("\n" + "="*60)
    print("🌦️  StormTracker Pro - Live Weather Radar")
    print("="*60)
    print("A modern weather radar application with clean UI")
    print("No complex API dependencies - just pure radar visualization")
    print("="*60 + "\n")

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 6):
        print("❌ Python 3.6 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print("✅ Python version check passed")
    return True

def start_radar_server():
    """Start the radar server"""
    print("🚀 Starting StormTracker Pro Radar Server...")
    
    try:
        # Start the server
        process = subprocess.Popen([sys.executable, 'server.py'])
        
        print("✅ Radar server started successfully!")
        print("🌐 The application should open in your browser automatically")
        print("📡 Server running at: http://localhost:8000")
        print("\n⏹️  Press Ctrl+C to stop the server")
        
        # Wait for the process to complete
        process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 Stopping radar server...")
        if process:
            process.terminate()
        print("✅ Server stopped")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return False
    
    return True

def main():
    """Main launcher function"""
    print_banner()
    
    # Check Python version
    if not check_python_version():
        return 1
    
    # Start the radar server
    if start_radar_server():
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())