/**
 * NEXRAD Weather Radar Visualization with Mapbox GL JS
 * Handles fetching, processing, and displaying NEXRAD Level 3 data
 */

class NEXRADVisualization {
    constructor() {
        // Replace with your Mapbox access token
        mapboxgl.accessToken = 'pk.eyJ1Ijoid2VhdGhlciIsImEiOiJjbHAxbHNjdncwaDhvMmptcno1ZTdqNDJ0In0.iywE3NefjboFg11a11ON0Q';
        
        this.map = null;
        this.currentData = null;
        this.radarLayers = [];
        
        this.init();
    }
    
    init() {
        this.initMap();
        this.setupEventListeners();
        this.showStatus('Ready to load NEXRAD data', 'success');
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
        loadButton.textContent = 'Loading...';
        this.showStatus('Processing NEXRAD data...', 'loading');
        
        try {
            // In a real implementation, you would:
            // 1. Send the URL to your backend Python service
            // 2. The backend processes the NEXRAD file
            // 3. Returns processed data (GeoJSON, image, etc.)
            
            // For this demo, we'll simulate the process
            await this.simulateNEXRADProcessing(url);
            
            loadButton.disabled = false;
            loadButton.textContent = 'Load NEXRAD Data';
            this.showStatus('NEXRAD data loaded successfully!', 'success');
            
        } catch (error) {
            console.error('Error loading NEXRAD data:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
            loadButton.disabled = false;
            loadButton.textContent = 'Load NEXRAD Data';
        }
    }
    
    async simulateNEXRADProcessing(url) {
        // Simulate API call to backend
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generate synthetic radar data for demonstration
        const centerLat = 39.7817; // Indianapolis
        const centerLon = -86.1478;
        const extent = 2.0; // degrees
        
        // Create synthetic GeoJSON data
        const features = [];
        const gridSize = 50;
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const lat = centerLat + (i - gridSize/2) * extent / gridSize;
                const lon = centerLon + (j - gridSize/2) * extent / gridSize;
                
                // Simulate radar reflectivity with some pattern
                const distance = Math.sqrt(
                    Math.pow(lat - centerLat, 2) + Math.pow(lon - centerLon, 2)
                );
                const reflectivity = Math.max(0, 50 * Math.exp(-distance * 2) + 
                    Math.random() * 20 - 10);
                
                if (reflectivity > 5) {
                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [lon, lat]
                        },
                        properties: {
                            reflectivity: reflectivity,
                            intensity: Math.min(100, Math.max(0, (reflectivity + 10) / 80 * 100))
                        }
                    });
                }
            }
        }
        
        this.currentData = {
            geojson: {
                type: 'FeatureCollection',
                features: features
            },
            bounds: {
                north: centerLat + extent/2,
                south: centerLat - extent/2,
                east: centerLon + extent/2,
                west: centerLon - extent/2
            },
            center: [centerLon, centerLat]
        };
        
        // Create synthetic raster image data
        await this.createSyntheticRasterOverlay();
        
        // Add data to map
        this.addRadarDataToMap();
        
        // Fit map to data bounds
        this.map.fitBounds([
            [this.currentData.bounds.west, this.currentData.bounds.south],
            [this.currentData.bounds.east, this.currentData.bounds.north]
        ], { padding: 50 });
    }
    
    async createSyntheticRasterOverlay() {
        // Create a canvas for the raster overlay
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 256;
        
        canvas.width = size;
        canvas.height = size;
        
        // Create image data
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const index = (i * size + j) * 4;
                
                // Create a circular radar pattern
                const centerX = size / 2;
                const centerY = size / 2;
                const distance = Math.sqrt(
                    Math.pow(i - centerX, 2) + Math.pow(j - centerY, 2)
                );
                
                const maxDistance = size / 2;
                const intensity = Math.max(0, 1 - distance / maxDistance);
                const reflectivity = intensity * 70 - 10; // -10 to 60 dBZ range
                
                if (reflectivity > 5) {
                    const color = this.getRadarColor(reflectivity);
                    data[index] = color.r;     // Red
                    data[index + 1] = color.g; // Green
                    data[index + 2] = color.b; // Blue
                    data[index + 3] = color.a; // Alpha
                } else {
                    data[index] = 0;
                    data[index + 1] = 0;
                    data[index + 2] = 0;
                    data[index + 3] = 0; // Transparent
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Convert canvas to data URL
        this.currentData.rasterImage = canvas.toDataURL('image/png');
    }
    
    getRadarColor(reflectivity) {
        // Standard radar color scheme
        if (reflectivity < 5) {
            return { r: 64, g: 224, b: 255, a: 128 };  // Light blue
        } else if (reflectivity < 20) {
            return { r: 0, g: 255, b: 0, a: 160 };     // Green
        } else if (reflectivity < 35) {
            return { r: 255, g: 255, b: 0, a: 180 };   // Yellow
        } else if (reflectivity < 50) {
            return { r: 255, g: 165, b: 0, a: 200 };   // Orange
        } else if (reflectivity < 65) {
            return { r: 255, g: 0, b: 0, a: 220 };     // Red
        } else {
            return { r: 255, g: 0, b: 255, a: 240 };   // Magenta
        }
    }
    
    addRadarDataToMap() {
        this.clearRadarLayers();
        
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
        
        // Add source
        this.map.addSource(sourceId, {
            type: 'image',
            url: this.currentData.rasterImage,
            coordinates: [
                [this.currentData.bounds.west, this.currentData.bounds.north],
                [this.currentData.bounds.east, this.currentData.bounds.north],
                [this.currentData.bounds.east, this.currentData.bounds.south],
                [this.currentData.bounds.west, this.currentData.bounds.south]
            ]
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
        
        // Add source
        this.map.addSource(sourceId, {
            type: 'geojson',
            data: this.currentData.geojson
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
        if (this.currentData) {
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
    // Check if Mapbox access token is set
    const script = document.currentScript || document.scripts[document.scripts.length - 1];
    const accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN_HERE';
    
    if (accessToken === 'YOUR_MAPBOX_ACCESS_TOKEN_HERE') {
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; color: white; background: #1a1a1a; height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <h1>⚠️ Mapbox Access Token Required</h1>
                <p>Please set your Mapbox access token in the JavaScript file (nexrad-mapbox.js)</p>
                <p>Get your free token at: <a href="https://account.mapbox.com/" style="color: #0078d4;">https://account.mapbox.com/</a></p>
                <p>Replace 'YOUR_MAPBOX_ACCESS_TOKEN_HERE' with your actual token.</p>
            </div>
        `;
        return;
    }
    
    new NEXRADVisualization();
});