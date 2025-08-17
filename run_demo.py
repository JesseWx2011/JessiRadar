#!/usr/bin/env python3
"""
NEXRAD Demo Script
Demonstrates the NEXRAD processing capabilities
"""

import os
import sys
import subprocess
import time
import requests
from nexrad_processor import NEXRADProcessor

def run_standalone_demo():
    """Run a standalone demo of NEXRAD processing"""
    print("🌦️  NEXRAD Weather Radar Processing Demo")
    print("=" * 50)
    
    # Example NEXRAD URL
    nexrad_url = "https://unidata-nexrad-level3.s3.amazonaws.com/FDR_N0B_2025_08_17_22_05_15"
    
    print(f"Processing NEXRAD file: {nexrad_url}")
    print("This may take a few moments...")
    
    # Initialize processor
    processor = NEXRADProcessor()
    
    # Fetch and process data
    print("\n1. Fetching NEXRAD data...")
    if not processor.fetch_nexrad_data(nexrad_url):
        print("❌ Failed to fetch NEXRAD data")
        return False
    
    print("✅ NEXRAD data fetched successfully")
    
    # Convert to image overlay
    print("\n2. Creating image overlay...")
    image_info = processor.convert_to_image_overlay("demo_overlay.png")
    if image_info:
        print(f"✅ Image overlay created: demo_overlay.png")
        print(f"   Bounds: {image_info['bounds']}")
    else:
        print("❌ Failed to create image overlay")
        return False
    
    # Convert to GeoJSON
    print("\n3. Converting to GeoJSON...")
    if processor.convert_to_geojson("demo_data.geojson"):
        print("✅ GeoJSON created: demo_data.geojson")
    else:
        print("❌ Failed to create GeoJSON")
        return False
    
    print("\n🎉 Demo completed successfully!")
    print("\nFiles created:")
    print("- demo_overlay.png (Radar image overlay)")
    print("- demo_data.geojson (Point data)")
    
    return True

def run_api_demo():
    """Run a demo using the API server"""
    print("🌐 NEXRAD API Demo")
    print("=" * 30)
    
    # Check if API server is running
    api_url = "http://localhost:5000"
    
    try:
        response = requests.get(f"{api_url}/health", timeout=5)
        print("✅ API server is running")
    except requests.exceptions.RequestException:
        print("❌ API server is not running")
        print("Please start the API server first:")
        print("  python nexrad_api.py")
        return False
    
    # Submit processing job
    nexrad_url = "https://unidata-nexrad-level3.s3.amazonaws.com/FDR_N0B_2025_08_17_22_05_15"
    
    print(f"\nSubmitting NEXRAD URL: {nexrad_url}")
    
    try:
        response = requests.post(
            f"{api_url}/api/process-nexrad",
            json={"url": nexrad_url},
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        
        job_id = result["job_id"]
        print(f"✅ Processing job submitted: {job_id}")
        
        # Poll for completion
        print("\nWaiting for processing to complete...")
        max_attempts = 30
        
        for attempt in range(max_attempts):
            time.sleep(2)
            
            response = requests.get(f"{api_url}/api/data/{job_id}")
            response.raise_for_status()
            status = response.json()
            
            if status["status"] == "completed":
                print("✅ Processing completed!")
                
                # Show data info
                data = status["data"]
                print(f"\nProcessed data:")
                print(f"- GeoJSON features: {len(data['geojson']['features'])}")
                print(f"- Image bounds: {data['image_info']['bounds']}")
                print(f"- Timestamp: {data['timestamp']}")
                
                # Save image
                img_response = requests.get(f"{api_url}/api/image/{job_id}")
                with open("api_demo_overlay.png", "wb") as f:
                    f.write(img_response.content)
                print(f"- Image saved: api_demo_overlay.png")
                
                # Save GeoJSON
                with open("api_demo_data.geojson", "w") as f:
                    import json
                    json.dump(data["geojson"], f, indent=2)
                print(f"- GeoJSON saved: api_demo_data.geojson")
                
                return True
                
            elif status["status"] == "error":
                print(f"❌ Processing failed: {status.get('error', 'Unknown error')}")
                return False
            else:
                print(f"⏳ Processing... ({attempt + 1}/{max_attempts})")
        
        print("❌ Processing timeout")
        return False
        
    except requests.exceptions.RequestException as e:
        print(f"❌ API request failed: {e}")
        return False

def main():
    """Main demo function"""
    print("NEXRAD Weather Radar Processing Demo")
    print("Choose demo type:")
    print("1. Standalone processing (no API server needed)")
    print("2. API server demo (requires running API server)")
    print("3. Run both")
    
    choice = input("\nEnter your choice (1-3): ").strip()
    
    if choice == "1":
        run_standalone_demo()
    elif choice == "2":
        run_api_demo()
    elif choice == "3":
        print("\n" + "="*60)
        if run_standalone_demo():
            print("\n" + "="*60)
            run_api_demo()
    else:
        print("Invalid choice. Please run again and select 1, 2, or 3.")

if __name__ == "__main__":
    main()