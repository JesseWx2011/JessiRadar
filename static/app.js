/**
 * WeatherRadar Pro - Advanced NEXRAD Weather Radar Visualization
 * Modern web application similar to WeatherWise and AtticRadar
 */

class WeatherRadarApp {
    constructor() {
        // Mapbox configuration
        mapboxgl.accessToken = 'pk.eyJ1Ijoid2VhdGhlciIsImEiOiJjbHAxbHNjdncwaDhvMmptcno1ZTdqNDJ0In0.iywE3NefjboFg11a11ON0Q';
        
        // Application state
        this.map = null;
        this.currentJobId = null;
        this.radarLayers = [];
        this.processedData = null;
        this.apiBaseUrl = '/api';
        this.isPlaying = false;
        this.currentFrame = 0;
        this.totalFrames = 0;
        this.animationInterval = null;
        this.nexradSites = [];
        this.availableFiles = [];
        
        // UI state
        this.leftSidebarCollapsed = false;
        this.rightSidebarCollapsed = false;
        this.bottomPanelCollapsed = true;
        
        // Settings
        this.settings = {
            theme: 'dark',
            units: 'imperial',
            autoRefresh: true,
            showAlerts: true
        };
        
        this.init();
    }
    
    async init() {
        try {
            await this.initializeApp();
            this.hideLoadingScreen();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showToast('Failed to initialize application', 'error');
        }
    }
    
    async initializeApp() {
        // Load settings from localStorage
        this.loadSettings();
        
        // Load NEXRAD sites data
        await this.loadNEXRADSites();
        
        // Initialize map
        this.initMap();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Request location permission
        this.requestLocation();
        
        // Apply theme
        this.applyTheme();
        
        // Initialize UI with current date
        this.initializeUI();
        
        console.log('WeatherRadar Pro (Alpha) initialized successfully');
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                app.style.display = 'grid';
                app.style.opacity = '0';
                setTimeout(() => {
                    app.style.opacity = '1';
                    app.style.transition = 'opacity 0.5s ease-in-out';
                }, 50);
            }, 300);
        }, 1500);
    }
    
    initMap() {
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-98.5795, 39.8283], // Center of USA
            zoom: 4,
            projection: 'mercator',
            antialias: true
        });
        
        // Add controls
        this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
        this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
        
        // Map event handlers
        this.map.on('load', () => {
            this.onMapLoad();
        });
        
        this.map.on('click', (e) => {
            this.onMapClick(e);
        });
        
        this.map.on('mousemove', (e) => {
            this.onMapMouseMove(e);
        });
    }
    
    onMapLoad() {
        // Add base layers
        this.addBaseLayers();
        
        // Update status
        this.updateStatus('Map loaded', 'Ready');
        
        console.log('Map loaded successfully');
    }
    
    addBaseLayers() {
        // Add county boundaries
        this.map.addSource('counties', {
            type: 'vector',
            url: 'mapbox://mapbox.boundaries-adm2-v3'
        });
        
        this.map.addLayer({
            id: 'counties-layer',
            type: 'line',
            source: 'counties',
            'source-layer': 'boundaries_admin_2',
            paint: {
                'line-color': '#64748b',
                'line-width': 0.5,
                'line-opacity': 0.5
            },
            filter: ['==', ['get', 'iso_3166_1'], 'US']
        });
        
        // Add cities
        this.map.addSource('cities', {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-streets-v8'
        });
        
        this.map.addLayer({
            id: 'cities-layer',
            type: 'symbol',
            source: 'cities',
            'source-layer': 'place_label',
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                'text-size': 12,
                'text-anchor': 'center'
            },
            paint: {
                'text-color': '#cbd5e1',
                'text-halo-color': '#0f172a',
                'text-halo-width': 1
            },
            filter: ['>=', ['get', 'scalerank'], 2]
        });
    }
    
    async loadNEXRADSites() {
        try {
            const response = await fetch('/nexrad_sites.json');
            const data = await response.json();
            this.nexradSites = data.nexrad_sites;
            this.populateRadarSiteDropdown();
        } catch (error) {
            console.error('Failed to load NEXRAD sites:', error);
            // Fallback to a few common sites
            this.nexradSites = [
                { code: "FDR", name: "Frederick, OK", state: "Oklahoma", lat: 34.3622, lon: -99.0285 },
                { code: "KFWS", name: "Dallas/Fort Worth, TX", state: "Texas", lat: 32.5731, lon: -97.3031 },
                { code: "KOKX", name: "New York City, NY", state: "New York", lat: 40.8656, lon: -72.8639 },
                { code: "KLOT", name: "Chicago, IL", state: "Illinois", lat: 41.6044, lon: -88.0844 },
                { code: "KFFC", name: "Atlanta, GA", state: "Georgia", lat: 33.3636, lon: -84.5658 }
            ];
            this.populateRadarSiteDropdown();
        }
    }
    
    populateRadarSiteDropdown() {
        const select = document.getElementById('radarSite');
        
        // Group sites by region for better organization
        const regions = {};
        this.nexradSites.forEach(site => {
            const region = site.region || 'Other';
            if (!regions[region]) regions[region] = [];
            regions[region].push(site);
        });
        
        // Clear existing options except the first one
        select.innerHTML = '<option value="">Select a radar site...</option>';
        
        // Add sites grouped by region
        Object.keys(regions).sort().forEach(region => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = region;
            
            regions[region].sort((a, b) => a.name.localeCompare(b.name)).forEach(site => {
                const option = document.createElement('option');
                option.value = site.code;
                option.textContent = `${site.code} - ${site.name}, ${site.state}`;
                optgroup.appendChild(option);
            });
            
            select.appendChild(optgroup);
        });
    }
    
    initializeUI() {
        // Set current date
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        document.getElementById('dataDate').value = dateString;
        
        // Set default radar site to FDR
        document.getElementById('radarSite').value = 'FDR';
        
        // Update URL field when site or date changes
        this.updateNEXRADUrl();
    }
    
    buildNEXRADUrl(siteCode, date, product = 'N0B') {
        // Format: https://unidata-nexrad-level3.s3.amazonaws.com/?prefix=XXX_N0B_YYYY_MM_DD
        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        
        return `https://unidata-nexrad-level3.s3.amazonaws.com/?prefix=${siteCode}_${product}_${year}_${month}_${day}`;
    }
    
    updateNEXRADUrl() {
        const siteCode = document.getElementById('radarSite').value;
        const date = document.getElementById('dataDate').value;
        const product = document.getElementById('radarProduct').value || 'N0B';
        
        if (siteCode && date) {
            const url = this.buildNEXRADUrl(siteCode, date, product);
            // Don't overwrite if user has manually entered a URL
            const urlField = document.getElementById('nexradUrl');
            if (!urlField.value || urlField.value.includes('unidata-nexrad-level3.s3.amazonaws.com/?prefix=')) {
                urlField.value = url;
            }
        }
    }
    
    setupEventListeners() {
        // Header buttons
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettingsModal());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelpModal());
        
        // Sidebar toggles
        document.getElementById('leftSidebarToggle').addEventListener('click', () => this.toggleLeftSidebar());
        document.getElementById('rightSidebarToggle').addEventListener('click', () => this.toggleRightSidebar());
        document.getElementById('bottomPanelToggle').addEventListener('click', () => this.toggleBottomPanel());
        
        // NEXRAD controls
        document.getElementById('radarSite').addEventListener('change', () => {
            this.updateNEXRADUrl();
            this.focusOnRadarSite();
        });
        document.getElementById('dataDate').addEventListener('change', () => this.updateNEXRADUrl());
        document.getElementById('radarProduct').addEventListener('change', () => this.updateNEXRADUrl());
        document.getElementById('loadDataBtn').addEventListener('click', () => this.loadNEXRADData());
        document.getElementById('browseDataBtn').addEventListener('click', () => this.browseAvailableFiles());
        document.getElementById('pasteUrlBtn').addEventListener('click', () => this.pasteUrl());
        
        // Visualization controls
        document.querySelectorAll('input[name="vizType"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.updateVisualizationType(e.target.value));
        });
        
        const opacitySlider = document.getElementById('opacitySlider');
        opacitySlider.addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('opacityValue').textContent = value + '%';
            this.updateOpacity(value / 100);
        });
        
        // Layer toggles
        document.getElementById('showCounties').addEventListener('change', (e) => this.toggleLayer('counties-layer', e.target.checked));
        document.getElementById('showCities').addEventListener('change', (e) => this.toggleLayer('cities-layer', e.target.checked));
        
        // Timeline controls
        document.getElementById('playBtn').addEventListener('click', () => this.playAnimation());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseAnimation());
        document.getElementById('prevBtn').addEventListener('click', () => this.previousFrame());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextFrame());
        
        // FAB buttons
        document.getElementById('locationBtn').addEventListener('click', () => this.goToCurrentLocation());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
        
        // Modal controls
        document.getElementById('settingsModalClose').addEventListener('click', () => this.hideModal('settingsModal'));
        document.getElementById('helpModalClose').addEventListener('click', () => this.hideModal('helpModal'));
        
        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });
        
        // Settings changes
        document.getElementById('themeSelect').addEventListener('change', (e) => this.changeTheme(e.target.value));
        document.getElementById('unitsSelect').addEventListener('change', (e) => this.changeUnits(e.target.value));
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.isPlaying ? this.pauseAnimation() : this.playAnimation();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousFrame();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextFrame();
                    break;
                case 'KeyF':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'KeyL':
                    e.preventDefault();
                    this.goToCurrentLocation();
                    break;
                case 'Escape':
                    this.hideAllModals();
                    break;
            }
        });
    }
    
    focusOnRadarSite() {
        const siteCode = document.getElementById('radarSite').value;
        const site = this.nexradSites.find(s => s.code === siteCode);
        
        if (site) {
            // Fly to the radar site location
            this.map.flyTo({
                center: [site.lon, site.lat],
                zoom: 8,
                duration: 2000
            });
            
            // Add radar site marker
            this.clearRadarSiteMarkers();
            new mapboxgl.Marker({ color: '#2563eb', scale: 1.2 })
                .setLngLat([site.lon, site.lat])
                .setPopup(new mapboxgl.Popup().setHTML(`
                    <div style="color: #1e293b; padding: 8px;">
                        <h4 style="margin: 0 0 8px 0; color: #0f172a;">${site.code} Radar</h4>
                        <div><strong>Location:</strong> ${site.name}, ${site.state}</div>
                        <div><strong>Elevation:</strong> ${site.elevation} ft</div>
                        <div><strong>Coordinates:</strong> ${site.lat.toFixed(4)}°, ${site.lon.toFixed(4)}°</div>
                    </div>
                `))
                .addTo(this.map);
            
            // Update location display
            document.getElementById('locationText').textContent = `${site.name}, ${site.state}`;
        }
    }
    
    clearRadarSiteMarkers() {
        // Remove existing radar site markers
        const markers = document.querySelectorAll('.mapboxgl-marker[style*="rgb(37, 99, 235)"]');
        markers.forEach(marker => marker.remove());
    }
    
    async browseAvailableFiles() {
        const siteCode = document.getElementById('radarSite').value;
        const date = document.getElementById('dataDate').value;
        
        if (!siteCode || !date) {
            this.showToast('Please select a radar site and date first', 'warning');
            return;
        }
        
        this.showToast('Browsing available files...', 'info');
        
        try {
            // This would typically call an API endpoint that lists available files
            // For now, we'll simulate this functionality
            const product = document.getElementById('radarProduct').value || 'N0B';
            const baseUrl = this.buildNEXRADUrl(siteCode, date, product);
            
            // In a real implementation, you'd fetch the S3 bucket listing
            // For alpha testing, we'll just show the constructed URL
            this.showToast(`Browse URL: ${baseUrl}`, 'info', 10000);
            
            // Copy URL to clipboard
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(baseUrl);
                this.showToast('URL copied to clipboard', 'success');
            }
            
        } catch (error) {
            console.error('Error browsing files:', error);
            this.showToast('Failed to browse available files', 'error');
        }
    }
    
    async loadNEXRADData() {
        let url = document.getElementById('nexradUrl').value;
        const loadBtn = document.getElementById('loadDataBtn');
        
        // If no direct URL, build from site/date selection
        if (!url) {
            const siteCode = document.getElementById('radarSite').value;
            const date = document.getElementById('dataDate').value;
            
            if (!siteCode || !date) {
                this.showToast('Please select a radar site and date, or enter a direct URL', 'error');
                return;
            }
            
            const product = document.getElementById('radarProduct').value || 'N0B';
            url = this.buildNEXRADUrl(siteCode, date, product);
            
            // For alpha testing, we'll need to handle the S3 prefix URL differently
            // This is a browse URL, not a direct file URL
            this.showToast('Note: This is a browse URL for alpha testing. You may need to select a specific file.', 'warning', 8000);
        }
        
        loadBtn.disabled = true;
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        this.updateStatus('Processing NEXRAD data...', 'Loading');
        
        try {
            // Submit for processing
            const response = await fetch(`${this.apiBaseUrl}/process-nexrad`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            this.currentJobId = result.job_id;
            
            if (result.cached) {
                this.showToast('Using cached data', 'success');
                await this.fetchProcessedData();
            } else {
                this.showToast('Processing NEXRAD data...', 'warning');
                await this.pollForCompletion();
            }
            
        } catch (error) {
            console.error('Error loading NEXRAD data:', error);
            this.showToast(`Failed to load data: ${error.message}`, 'error');
            this.updateStatus('Error loading data', 'Error');
        } finally {
            loadBtn.disabled = false;
            loadBtn.innerHTML = '<i class="fas fa-download"></i> Load Radar Data';
        }
    }
    
    async pollForCompletion() {
        const maxAttempts = 60;
        let attempts = 0;
        
        const poll = async () => {
            try {
                attempts++;
                const response = await fetch(`${this.apiBaseUrl}/data/${this.currentJobId}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.status === 'completed') {
                    await this.displayProcessedData(result.data);
                    this.showToast('NEXRAD data loaded successfully!', 'success');
                    this.updateStatus('Data loaded', 'Ready');
                } else if (result.status === 'error') {
                    throw new Error(result.error || 'Processing failed');
                } else if (result.status === 'processing') {
                    if (attempts < maxAttempts) {
                        this.updateStatus(`Processing... (${attempts}/${maxAttempts})`, 'Loading');
                        setTimeout(poll, 5000);
                    } else {
                        throw new Error('Processing timeout');
                    }
                }
            } catch (error) {
                throw error;
            }
        };
        
        await poll();
    }
    
    async fetchProcessedData() {
        const response = await fetch(`${this.apiBaseUrl}/data/${this.currentJobId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'completed') {
            await this.displayProcessedData(result.data);
            this.updateStatus('Data loaded', 'Ready');
        } else {
            throw new Error(result.error || 'Data not ready');
        }
    }
    
    async displayProcessedData(data) {
        this.clearRadarLayers();
        
        // Store processed data
        this.processedData = {
            geojson: data.geojson,
            imageInfo: data.image_info,
            imageUrl: `${this.apiBaseUrl}/image/${this.currentJobId}`,
            timestamp: data.timestamp,
            sourceUrl: data.url
        };
        
        // Update UI
        this.updateDataInfo(data);
        
        // Add data to map
        this.addRadarDataToMap();
        
        // Fit map to data bounds
        if (data.image_info && data.image_info.bounds) {
            const bounds = data.image_info.bounds;
            this.map.fitBounds([
                [bounds.west, bounds.south],
                [bounds.east, bounds.north]
            ], { padding: 50, duration: 2000 });
        }
        
        // Show timeline if we have animation data
        if (this.totalFrames > 1) {
            this.showBottomPanel();
        }
    }
    
    updateDataInfo(data) {
        // Update status display
        document.getElementById('dataPoints').textContent = data.geojson.features.length.toLocaleString();
        document.getElementById('lastUpdated').textContent = new Date(data.timestamp).toLocaleString();
        
        // Update location display
        if (data.image_info && data.image_info.bounds) {
            const bounds = data.image_info.bounds;
            const centerLat = ((bounds.north + bounds.south) / 2).toFixed(2);
            const centerLon = ((bounds.east + bounds.west) / 2).toFixed(2);
            document.getElementById('locationText').textContent = `${centerLat}°, ${centerLon}°`;
        }
    }
    
    addRadarDataToMap() {
        if (!this.processedData) return;
        
        const vizType = document.querySelector('input[name="vizType"]:checked').value;
        const opacity = document.getElementById('opacitySlider').value / 100;
        
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
            console.warn('No image coordinates available');
            return;
        }
        
        this.map.addSource(sourceId, {
            type: 'image',
            url: this.processedData.imageUrl,
            coordinates: this.processedData.imageInfo.coordinates
        });
        
        this.map.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
                'raster-opacity': opacity,
                'raster-fade-duration': 300
            }
        });
        
        this.radarLayers.push({ sourceId, layerId, type: 'raster' });
    }
    
    addPointData(opacity) {
        const sourceId = 'nexrad-points';
        const layerId = 'nexrad-points-layer';
        
        if (!this.processedData.geojson || !this.processedData.geojson.features) {
            console.warn('No GeoJSON data available');
            return;
        }
        
        this.map.addSource(sourceId, {
            type: 'geojson',
            data: this.processedData.geojson,
            cluster: false
        });
        
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
        
        // Add click handler
        this.map.on('click', layerId, (e) => {
            const properties = e.features[0].properties;
            const coordinates = e.features[0].geometry.coordinates.slice();
            
            new mapboxgl.Popup({ closeOnClick: true })
                .setLngLat(coordinates)
                .setHTML(`
                    <div style="color: #1e293b; padding: 8px;">
                        <h4 style="margin: 0 0 8px 0; color: #0f172a;">Radar Data</h4>
                        <div><strong>Reflectivity:</strong> ${properties.reflectivity.toFixed(1)} dBZ</div>
                        <div><strong>Intensity:</strong> ${properties.intensity.toFixed(0)}%</div>
                        <div><strong>Location:</strong> ${coordinates[1].toFixed(4)}°, ${coordinates[0].toFixed(4)}°</div>
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
    
    onMapClick(e) {
        // Update current coordinates display
        const lat = e.lngLat.lat.toFixed(4);
        const lng = e.lngLat.lng.toFixed(4);
        document.getElementById('currentCoords').textContent = `${lat}°, ${lng}°`;
        
        // Query radar data at this point if available
        if (this.processedData) {
            this.queryRadarDataAtPoint(e.lngLat);
        }
    }
    
    onMapMouseMove(e) {
        // Update cursor coordinates in real-time (optional)
        // Could be performance intensive, so implement throttling if needed
    }
    
    queryRadarDataAtPoint(lngLat) {
        // Query features at the clicked point
        const features = this.map.queryRenderedFeatures([
            this.map.project(lngLat)
        ], {
            layers: this.radarLayers.filter(layer => layer.type === 'points').map(layer => layer.layerId)
        });
        
        if (features.length > 0) {
            const reflectivity = features[0].properties.reflectivity;
            document.getElementById('currentReflectivity').textContent = `${reflectivity.toFixed(1)} dBZ`;
        } else {
            document.getElementById('currentReflectivity').textContent = 'No data';
        }
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
    
    toggleLayer(layerId, visible) {
        if (this.map.getLayer(layerId)) {
            this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        }
    }
    
    // Animation controls
    playAnimation() {
        if (this.totalFrames <= 1) return;
        
        this.isPlaying = true;
        document.getElementById('playBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'flex';
        
        this.animationInterval = setInterval(() => {
            this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
            this.updateFrame();
        }, 500);
    }
    
    pauseAnimation() {
        this.isPlaying = false;
        document.getElementById('playBtn').style.display = 'flex';
        document.getElementById('pauseBtn').style.display = 'none';
        
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
    }
    
    previousFrame() {
        if (this.totalFrames <= 1) return;
        this.currentFrame = Math.max(0, this.currentFrame - 1);
        this.updateFrame();
    }
    
    nextFrame() {
        if (this.totalFrames <= 1) return;
        this.currentFrame = Math.min(this.totalFrames - 1, this.currentFrame + 1);
        this.updateFrame();
    }
    
    updateFrame() {
        // Update timeline slider
        document.getElementById('timelineSlider').value = this.currentFrame;
        
        // Update frame display
        // This would update the radar data to show the current frame
        // Implementation depends on having multiple frames of data
    }
    
    // UI Controls
    toggleLeftSidebar() {
        const sidebar = document.getElementById('leftSidebar');
        const toggle = document.getElementById('leftSidebarToggle');
        
        this.leftSidebarCollapsed = !this.leftSidebarCollapsed;
        
        if (this.leftSidebarCollapsed) {
            sidebar.classList.add('collapsed');
            toggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
        } else {
            sidebar.classList.remove('collapsed');
            toggle.innerHTML = '<i class="fas fa-chevron-left"></i>';
        }
        
        // Resize map
        setTimeout(() => this.map.resize(), 300);
    }
    
    toggleRightSidebar() {
        const sidebar = document.getElementById('rightSidebar');
        const toggle = document.getElementById('rightSidebarToggle');
        
        this.rightSidebarCollapsed = !this.rightSidebarCollapsed;
        
        if (this.rightSidebarCollapsed) {
            sidebar.classList.add('collapsed');
            toggle.innerHTML = '<i class="fas fa-chevron-left"></i>';
        } else {
            sidebar.classList.remove('collapsed');
            toggle.innerHTML = '<i class="fas fa-chevron-right"></i>';
        }
        
        // Resize map
        setTimeout(() => this.map.resize(), 300);
    }
    
    toggleBottomPanel() {
        const panel = document.getElementById('bottomPanel');
        const toggle = document.getElementById('bottomPanelToggle');
        
        this.bottomPanelCollapsed = !this.bottomPanelCollapsed;
        
        if (this.bottomPanelCollapsed) {
            panel.classList.add('collapsed');
            toggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
        } else {
            panel.classList.remove('collapsed');
            toggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
        }
        
        // Resize map
        setTimeout(() => this.map.resize(), 300);
    }
    
    showBottomPanel() {
        if (this.bottomPanelCollapsed) {
            this.toggleBottomPanel();
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            document.getElementById('fullscreenBtn').innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            document.exitFullscreen();
            document.getElementById('fullscreenBtn').innerHTML = '<i class="fas fa-expand"></i>';
        }
    }
    
    async pasteUrl() {
        try {
            const text = await navigator.clipboard.readText();
            document.getElementById('nexradUrl').value = text;
            this.showToast('URL pasted from clipboard', 'success');
        } catch (error) {
            this.showToast('Failed to paste from clipboard', 'error');
        }
    }
    
    async goToCurrentLocation() {
        if (!navigator.geolocation) {
            this.showToast('Geolocation is not supported', 'error');
            return;
        }
        
        this.showToast('Getting your location...', 'warning');
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.map.flyTo({
                    center: [longitude, latitude],
                    zoom: 10,
                    duration: 2000
                });
                
                // Add location marker
                new mapboxgl.Marker({ color: '#ef4444' })
                    .setLngLat([longitude, latitude])
                    .addTo(this.map);
                
                this.showToast('Location found', 'success');
                document.getElementById('locationText').textContent = `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
            },
            (error) => {
                this.showToast('Failed to get location', 'error');
                console.error('Geolocation error:', error);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }
    
    refreshData() {
        if (this.currentJobId) {
            this.loadNEXRADData();
        } else {
            this.showToast('No data to refresh', 'warning');
        }
    }
    
    requestLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    document.getElementById('locationText').textContent = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
                },
                () => {
                    // Silently fail - user denied location
                }
            );
        }
    }
    
    // Modal controls
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('show');
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('show');
    }
    
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }
    
    showSettingsModal() {
        this.showModal('settingsModal');
    }
    
    showHelpModal() {
        this.showModal('helpModal');
    }
    
    // Settings
    loadSettings() {
        const saved = localStorage.getItem('weatherRadarSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        
        // Apply saved settings to UI
        document.getElementById('themeSelect').value = this.settings.theme;
        document.getElementById('unitsSelect').value = this.settings.units;
        document.getElementById('autoRefresh').checked = this.settings.autoRefresh;
        document.getElementById('showAlerts').checked = this.settings.showAlerts;
    }
    
    saveSettings() {
        localStorage.setItem('weatherRadarSettings', JSON.stringify(this.settings));
    }
    
    changeTheme(theme) {
        this.settings.theme = theme;
        this.applyTheme();
        this.saveSettings();
    }
    
    changeUnits(units) {
        this.settings.units = units;
        this.saveSettings();
        // Update any displayed values with new units
    }
    
    applyTheme() {
        // Theme switching would be implemented here
        // For now, we're using a fixed dark theme
    }
    
    // Status and notifications
    updateStatus(message, status) {
        document.getElementById('dataStatus').textContent = status;
        
        // Update status color based on status
        const statusEl = document.getElementById('dataStatus');
        statusEl.className = 'status-value';
        
        if (status === 'Error') {
            statusEl.style.color = 'var(--error-color)';
        } else if (status === 'Loading') {
            statusEl.style.color = 'var(--warning-color)';
        } else if (status === 'Ready') {
            statusEl.style.color = 'var(--success-color)';
        }
    }
    
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        const toastId = 'toast-' + Date.now();
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.id = toastId;
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="toast-icon fas ${icons[type] || icons.info}"></i>
                <div class="toast-text">
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close" onclick="document.getElementById('${toastId}').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (document.getElementById(toastId)) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100px)';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.weatherRadarApp = new WeatherRadarApp();
});