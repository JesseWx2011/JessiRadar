// Mapbox access token (replace with your own for production)
mapboxgl.accessToken = 'pk.eyJ1Ijoid2VhdGhlciIsImEiOiJjbHAxbHNjdncwaDhvMmptcno1ZTdqNDJ0In0.iywE3NefjboFg11a11ON0Q';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [-98.5795, 39.8283], // Center of USA
    zoom: 4,
    projection: 'mercator',
    pitchWithRotate: false,
    dragRotate: false,
    touchPitch: false,
    pitch: 0,
    bearing: 0,
    fadeDuration: 0
});

const radarBtn = document.getElementById('radarBtn');
const satelliteBtn = document.getElementById('satelliteBtn');
const modelsBtn = document.getElementById('modelsBtn');
const globalRadarBtn = document.getElementById('globalRadarBtn');

function setActiveTab(tabBtn) {
    [radarBtn, satelliteBtn, modelsBtn, globalRadarBtn].forEach(btn => btn.classList.remove('active'));
    tabBtn.classList.add('active');
}

function updateModalControlsVisibility() {
    const satDropdowns = document.querySelector('.satellite-dropdowns');
    const satLayerList = document.getElementById('satelliteLayerList');
    const weatherModelControls = document.getElementById('weatherModelControls');
    const playbackBtn = document.getElementById('playPauseBtn');
    const frameSlider = document.getElementById('frameSlider');
    const frameTimestamp = document.getElementById('frameTimestamp');
    const radarProductSelect = document.getElementById('radarProductSelect');
    
    if (satelliteBtn.classList.contains('active')) {
        // Show satellite controls, hide others
        if (satDropdowns) satDropdowns.style.display = '';
        if (satLayerList) satLayerList.style.display = '';
        if (weatherModelControls) weatherModelControls.style.display = 'none';
        if (playbackBtn) playbackBtn.style.display = 'none';
        if (frameSlider) frameSlider.style.display = 'none';
        if (frameTimestamp) frameTimestamp.style.display = 'none';
        if (radarProductSelect) radarProductSelect.style.display = 'none';
    } else if (modelsBtn.classList.contains('active')) {
        // Show weather model controls and playback
        if (satDropdowns) satDropdowns.style.display = 'none';
        if (satLayerList) satLayerList.style.display = 'none';
        if (weatherModelControls) weatherModelControls.style.display = '';
        if (playbackBtn) playbackBtn.style.display = '';
        if (frameSlider) frameSlider.style.display = '';
        if (frameTimestamp) frameTimestamp.style.display = '';
        if (radarProductSelect) radarProductSelect.style.display = 'none';
        // Enable frame slider for weather models
        if (frameSlider) frameSlider.disabled = false;
    } else if (radarBtn.classList.contains('active')) {
        // Hide all controls for radar tab (temporarily disabled)
        if (satDropdowns) satDropdowns.style.display = 'none';
        if (satLayerList) satLayerList.style.display = 'none';
        if (weatherModelControls) weatherModelControls.style.display = 'none';
        if (playbackBtn) playbackBtn.style.display = 'none';
        if (frameSlider) frameSlider.style.display = 'none';
        if (frameTimestamp) frameTimestamp.style.display = 'none';
        if (radarProductSelect) radarProductSelect.style.display = '';
    } else {
        // Show playback for global radar only, hide satellite controls
        if (satDropdowns) satDropdowns.style.display = 'none';
        if (satLayerList) satLayerList.style.display = 'none';
        if (weatherModelControls) weatherModelControls.style.display = 'none';
        if (playbackBtn) playbackBtn.style.display = '';
        if (frameSlider) frameSlider.style.display = '';
        if (frameTimestamp) frameTimestamp.style.display = '';
        if (radarProductSelect) radarProductSelect.style.display = 'none';
        // Enable frame slider for global radar
        if (frameSlider) {
            frameSlider.disabled = false;
        }
    }
}

radarBtn.addEventListener('click', () => {
    setActiveTab(radarBtn);
    // Show radar layer, hide satellite, models and global radar layers
    hideSatelliteLayer();
    hideWeatherModelLayer();
    removeGlobalRadarLayer();
    showLocalRadarLayer();
    globalRadarBtn.textContent = 'Global Radar';
    radarLayerAdded = false;
    updateModalControlsVisibility();
    updateFrameDisplay(); // Ensure modal text is correct
});

satelliteBtn.addEventListener('click', () => {
    setActiveTab(satelliteBtn);
    // Show satellite layer, hide radar, models and global radar layers
    showSatelliteLayer();
    hideLocalRadarLayer();
    hideWeatherModelLayer();
    removeGlobalRadarLayer();
    globalRadarBtn.textContent = 'Global Radar';
    radarLayerAdded = false;
    updateModalControlsVisibility();
    updateFrameDisplay(); // Ensure modal text is correct
});

modelsBtn.addEventListener('click', () => {
    setActiveTab(modelsBtn);
    // Show weather model layer, hide radar, satellite and global radar layers
    showWeatherModelLayer();
    hideLocalRadarLayer();
    hideSatelliteLayer();
    removeGlobalRadarLayer();
    globalRadarBtn.textContent = 'Global Radar';
    radarLayerAdded = false;
    updateModalControlsVisibility();
    currentFrame = 0;
    frameSlider.value = 0;
    updateFrameDisplay(); // Ensure modal text is correct
});

globalRadarBtn.addEventListener('click', () => {
    setActiveTab(globalRadarBtn);
    hideLocalRadarLayer();
    hideSatelliteLayer();
    hideWeatherModelLayer();
    if (!radarLayerAdded) {
        addGlobalRadarLayer();
        globalRadarBtn.textContent = 'Hide Global Radar';
    } else {
        removeGlobalRadarLayer();
        globalRadarBtn.textContent = 'Global Radar';
    }
    radarLayerAdded = !radarLayerAdded;
    updateModalControlsVisibility();
});

let radarLayerAdded = false;
let radarSourceId = 'global-radar-source';
let radarLayerId = 'global-radar-layer';
let localRadarSourceId = 'local-radar-source';
let localRadarLayerId = 'local-radar-layer';
let localRadarVisible = false;
let currentRadarSite = 'BMX';

// Weather model variables
let weatherModelSourceId = 'weather-model-source';
let weatherModelLayerId = 'weather-model-layer';
let weatherModelVisible = false;
let currentModel = 'hrrr';
let currentFrame = 0;

// HRRR model frame URLs
const HRRR_FRAMES = {
    0: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-F0000-0/{z}/{x}/{y}.png',
    1: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-F0060-0/{z}/{x}/{y}.png',
    2: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-F0120-0/{z}/{x}/{y}.png',
    3: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-F0180-0/{z}/{x}/{y}.png',
    4: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-F0240-0/{z}/{x}/{y}.png',
    5: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-F0240-0/{z}/{x}/{y}.png',
    6: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-F0300-0/{z}/{x}/{y}.png',
    7: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-F0300-0/{z}/{x}/{y}.png'
};

// Radar sites data
const RADAR_SITES = {
        'KBMX': {
        name: 'Birmingham, AL',
        coordinates: [-86.7704, 33.1721],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::BMX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::BMX-N0S-0/{z}/{x}/{y}.png'
    },
    'KMOB': {
        name: 'Mobile, AL',
        coordinates: [-88.23980167818203, 30.67955420809063],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::MOB-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::MOB-N0S-0/{z}/{x}/{y}.png'
    },
    'KSJT': {
        name: 'San Angelo, TX',
        coordinates: [-100.49254797554903, 31.371271075387693],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::SJT-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::SJT-N0S-0/{z}/{x}/{y}.png'
    },
    'KGLD': {
        name: 'Goodland, KS',
        coordinates: [-101.70035405855634, 39.36677016408064],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::GLD-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::GLD-N0S-0/{z}/{x}/{y}.png'
    },
    'KFTG': {
        name: 'Denver, CO',
        coordinates: [-104.54580988554935, 39.78657637840219],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::FTG-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::FTG-N0S-0/{z}/{x}/{y}.png'
    },
    'KFFC': {
        name: 'Peachtree City, GA',
        coordinates: [-84.56591015063673, 33.363571449672605],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::FFC-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::FFC-N0S-0/{z}/{x}/{y}.png'
    },
    'PAEC': {
        name: 'Nome, AK',
        coordinates: [-165.29510965894443, 64.51146581337451],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::AEC-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::AEC-N0S-0/{z}/{x}/{y}.png'
    },
    'PAPD': {
        name: 'Fairbanks (Fox), AK',
        coordinates: [-147.50187900387215, 65.03491892338862],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::APD-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::APD-N0S-0/{z}/{x}/{y}.png'
    },
    'PAIH': {
        name: 'Middelton Island, AK',
        coordinates: [-146.303452, 59.460769],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::AIH-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::AIH-N0S-0/{z}/{x}/{y}.png'
    },
    'PABC': {
        name: 'Bethel, AK',
        coordinates: [-161.87653978191392, 60.79196666924735],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::ABC-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::ABC-N0S-0/{z}/{x}/{y}.png'
    },
    'PAKC': {
        name: 'King Salmon, AK',
        coordinates: [-156.62943672, 58.67944179],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::AKC-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::AKC-N0S-0/{z}/{x}/{y}.png'
    },
    'PAHG': {
        name: 'Kenai, AK',
        coordinates: [-151.35145858, 60.72591164],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::AHG-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::AHG-N0S-0/{z}/{x}/{y}.png'
    },
    'PACG': {
        name: 'Sitka, AK',
        coordinates: [-135.52916471, 56.85277715],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::ACG-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::ACG-N0S-0/{z}/{x}/{y}.png'
    },
    'KSRX': {
        name: 'Fort Smith, AR',
        coordinates: [-94.36191658922293, 35.29044180297745],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::SRX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::SRX-N0S-0/{z}/{x}/{y}.png'
    },
    'KINX': {
        name: 'Inola, OK',
        coordinates: [-95.56416727063674, 36.1752028067492],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::INX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::INX-N0S-0/{z}/{x}/{y}.png'
    },
    'PGUA': {
        name: 'Tauming, Guam',
        coordinates: [144.81111349, 13.45582808],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::GUA-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::GUA-N0S-0/{z}/{x}/{y}.png'
    },
    'KCAE': {
        name: 'Columbia, SC',
        coordinates: [-81.11831851053395, 33.94873449083545],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::CAE-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::CAE-N0S-0/{z}/{x}/{y}.png'
    },
    'KLWX': {
        name: 'Sterling, VA',
        coordinates: [-77.48759671101222, 38.976265860921735],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::LWX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::LWX-N0S-0/{z}/{x}/{y}.png'
    },
    'KDOX': {
        name: 'Ellendale, DE',
        coordinates: [-75.44005350487282, 38.82573816368541],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::DOX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::DOX-N0S-0/{z}/{x}/{y}.png'
    },
    'KAKQ': {
        name: 'Wakefield, VA',
        coordinates: [-77.00731166630416, 36.984056647121704],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::AKQ-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::AKQ-N0S-0/{z}/{x}/{y}.png'
    },
    'KEVX': {
        name: 'Ponce De Leon, FL',
        coordinates: [-85.92163254938248, 30.564993024717726],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::EVX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::EVX-N0S-0/{z}/{x}/{y}.png'
    },
    'KSHV': {
        name: 'Shreveport, LA',
        coordinates: [-93.84126939481186, 32.45084696319989],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::SHV-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::SHV-N0S-0/{z}/{x}/{y}.png'
    },
    'KOKX': {
        name: 'Upton, NY',
        coordinates: [-72.86410585014471, 40.86560052842017],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::OKX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::OKX-N0S-0/{z}/{x}/{y}.png'
    },
    'KDIX': {
        name: 'Manchester Township, NJ',
        coordinates: [-74.41078041712441, 39.94706049781776],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::DIX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::DIX-N0S-0/{z}/{x}/{y}.png'
    },
    'KBOX': {
        name: 'Taunton, MA',
        coordinates: [-71.13696335314464, 41.95593259541687],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::BOX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::BOX-N0S-0/{z}/{x}/{y}.png'
    },
    'KGYX': {
        name: 'Gray, ME',
        coordinates: [-70.25650160753966, 43.891341213618674],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::GYX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::GYX-N0S-0/{z}/{x}/{y}.png'
    },
    'KCXX': {
        name: 'Colchester, VT',
        coordinates: [-73.16643850306231, 44.51105045470628],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::CXX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::CXX-N0S-0/{z}/{x}/{y}.png'
    },
    'KCBW': {
        name: 'Houlton, ME',
        coordinates: [-67.80662542274432, 46.03929278565091],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::CBW-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::CBW-N0S-0/{z}/{x}/{y}.png'
    },
    'KBUF': {
        name: 'Buffalo, NY',
        coordinates: [-78.7367812560146, 42.94883481293418],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::BUF-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::BUF-N0S-0/{z}/{x}/{y}.png'
    },
    'KHDC': {
        name: 'Hammond, LA',
        coordinates: [-90.40733347950966, 30.51930546164259],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::HDC-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::HDC-N0S-0/{z}/{x}/{y}.png'
    },
    'KDGX': {
        name: 'Brandon, MS',
        coordinates: [-89.98448134924753, 32.27981180649009],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::DGX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::DGX-N0S-0/{z}/{x}/{y}.png'
    },
    'KGWX': {
        name: 'Wise Gap, MS',
        coordinates: [-88.32927019993114, 33.89693455989751],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::GWX-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::GWX-N0S-0/{z}/{x}/{y}.png'
    },
    'KBRO': {
        name: 'Brownsville, TX',
        coordinates: [-97.41893118665767, 25.916032652914698],
        reflectivity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::BRO-N0B-0/{z}/{x}/{y}.png',
        velocity: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::BRO-N0S-0/{z}/{x}/{y}.png'
    }
};

function getRadarTileUrl() {
    // Get current time in seconds
    const now = Math.floor(Date.now() / 1000);
    // 30 minutes ago
    let ts = now - 30 * 60;
    // Round down to the nearest 5th minute (300 seconds)
    ts = ts - (ts % 300);
    // Use {z}/{x}/{y} format for Mapbox tile URLs
    return `https://api.weather.com/v3/TileServer/tile/twcRadarMosaic?ts=${ts}&xyz={x}:{y}:{z}&apiKey=e1f10a1e78da46f5b10a1e78da96f525`;
}

function getWeatherModelTileUrl() {
    if (currentModel === 'hrrr') {
        return HRRR_FRAMES[currentFrame] || HRRR_FRAMES[0];
    }
    return HRRR_FRAMES[0]; // Default fallback
}

function addGlobalRadarLayer() {
    if (map.getSource(radarSourceId)) return;
    
    // Calculate timestamp based on current frame
    const now = Math.floor(Date.now() / 1000);
    const minutesAgo = (7 - currentFrame) * 5; // 5-minute intervals
    const ts = now - (minutesAgo * 60);
    // Round down to the nearest 5th minute (300 seconds)
    const roundedTs = ts - (ts % 300);
    
    const tileUrl = `https://api.weather.com/v3/TileServer/tile/twcRadarMosaic?ts=${roundedTs}&xyz={x}:{y}:{z}&apiKey=e1f10a1e78da46f5b10a1e78da96f525`;
    
    map.addSource(radarSourceId, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        maxzoom: 14 // Allow overzooming
    });
    map.addLayer({
        id: radarLayerId,
        type: 'raster',
        source: radarSourceId,
        paint: {
            'raster-opacity': 1,
            'raster-resampling': 'linear',
            'raster-saturation': 0,
            'raster-contrast': 0,
            'raster-brightness-min': 0,
            'raster-brightness-max': 1,
            'raster-fade-duration': 0
        }
    });
    // Move radar layer below the first road layer
    const layers = map.getStyle().layers;
    const roadLayer = layers.find(l => l.id.includes('road') && l.type === 'line');
    if (roadLayer) {
        map.moveLayer(radarLayerId, roadLayer.id);
    }
    // Move radar site indicators and labels above the radar layer
    if (map.getLayer('radar-sites-indicators')) {
        map.moveLayer('radar-sites-indicators');
    }
    if (map.getLayer('radar-sites-labels')) {
        map.moveLayer('radar-sites-labels');
    }
}

function removeGlobalRadarLayer() {
    if (map.getLayer(radarLayerId)) map.removeLayer(radarLayerId);
    if (map.getSource(radarSourceId)) map.removeSource(radarSourceId);
}

function showWeatherModelLayer() {
    if (!weatherModelVisible) {
        updateWeatherModelLayer();
        weatherModelVisible = true;
    }
}

function hideWeatherModelLayer() {
    if (weatherModelVisible) {
        if (map.getLayer(weatherModelLayerId)) map.removeLayer(weatherModelLayerId);
        if (map.getSource(weatherModelSourceId)) map.removeSource(weatherModelSourceId);
        weatherModelVisible = false;
    }
}

function updateWeatherModelLayer() {
    // Remove existing layer/source if present
    if (map.getLayer(weatherModelLayerId)) map.removeLayer(weatherModelLayerId);
    if (map.getSource(weatherModelSourceId)) map.removeSource(weatherModelSourceId);

    const tileUrl = getWeatherModelTileUrl();
    
    map.addSource(weatherModelSourceId, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        maxzoom: 14
    });
    map.addLayer({
        id: weatherModelLayerId,
        type: 'raster',
        source: weatherModelSourceId,
        paint: {
            'raster-opacity': 0.8,
            'raster-resampling': 'linear',
            'raster-saturation': 0,
            'raster-contrast': 0,
            'raster-brightness-min': 0,
            'raster-brightness-max': 1,
            'raster-fade-duration': 0
        }
    });
    
    // Move weather model layer below alert layers but above roads
    const layers = map.getStyle().layers;
    const alertOutline = layers.find(l => l.id === 'nws-alerts-outline');
    if (alertOutline) {
        map.moveLayer(weatherModelLayerId, alertOutline.id);
    }
}

function showSatelliteLayer() {
    if (!satelliteLayerVisible) {
        updateSatelliteLayer();
        satelliteLayerVisible = true;
    }
}

function hideSatelliteLayer() {
    if (satelliteLayerVisible) {
        if (map.getLayer(SATELLITE_LAYER_ID)) map.removeLayer(SATELLITE_LAYER_ID);
        if (map.getSource(SATELLITE_SOURCE_ID)) map.removeSource(SATELLITE_SOURCE_ID);
        satelliteLayerVisible = false;
    }
}

// Place getLocalRadarTileUrl here so it's available to all functions below
function getLocalRadarTileUrl(siteCode) {
    const site = RADAR_SITES[siteCode];
    if (!site) return undefined;
    if (currentRadarProduct === 'velocity' && site.velocity) {
        return site.velocity;
    }
    return site.reflectivity;
}

function showLocalRadarLayer() {
    if (!localRadarVisible) {
        if (map.getSource(localRadarSourceId)) return;
        const site = RADAR_SITES[currentRadarSite];
        if (!site) return;
        
        map.addSource(localRadarSourceId, {
            type: 'raster',
            tiles: [site.reflectivity], // Use reflectivity as default
            tileSize: 256,
            maxzoom: 14
        });
        map.addLayer({
            id: localRadarLayerId,
            type: 'raster',
            source: localRadarSourceId,
            paint: {
                'raster-opacity': 0.8,
                'raster-resampling': 'linear',
                'raster-saturation': 0,
                'raster-contrast': 0,
                'raster-brightness-min': 0,
                'raster-brightness-max': 1,
                'raster-fade-duration': 0
            }
        });
        // Move radar layer below the first road layer
        const layers = map.getStyle().layers;
        const roadLayer = layers.find(l => l.id.includes('road') && l.type === 'line');
        if (roadLayer) {
            map.moveLayer(localRadarLayerId, roadLayer.id);
        }
        // Move radar site indicators and labels above the radar layer
        if (map.getLayer('radar-sites-indicators')) {
            map.moveLayer('radar-sites-indicators');
        }
        if (map.getLayer('radar-sites-labels')) {
            map.moveLayer('radar-sites-labels');
        }
        localRadarVisible = true;
    }
}

function hideLocalRadarLayer() {
    if (localRadarVisible) {
        if (map.getLayer(localRadarLayerId)) map.removeLayer(localRadarLayerId);
        if (map.getSource(localRadarSourceId)) map.removeSource(localRadarSourceId);
        localRadarVisible = false;
    }
}

function updateLocalRadarLayer() {
    if (localRadarVisible) {
        // Remove existing layer/source
        if (map.getLayer(localRadarLayerId)) map.removeLayer(localRadarLayerId);
        if (map.getSource(localRadarSourceId)) map.removeSource(localRadarSourceId);
        
        // Add new layer with current site and product
        const site = RADAR_SITES[currentRadarSite];
        if (!site) return;
        const tileUrl = getLocalRadarTileUrl(currentRadarSite);
        
        map.addSource(localRadarSourceId, {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            maxzoom: 14
        });
        map.addLayer({
            id: localRadarLayerId,
            type: 'raster',
            source: localRadarSourceId,
            paint: {
                'raster-opacity': 0.8,
                'raster-resampling': 'linear',
                'raster-saturation': 0,
                'raster-contrast': 0,
                'raster-brightness-min': 0,
                'raster-brightness-max': 1,
                'raster-fade-duration': 0
            }
        });
        // Move radar layer below the first road layer
        const layers = map.getStyle().layers;
        const roadLayer = layers.find(l => l.id.includes('road') && l.type === 'line');
        if (roadLayer) {
            map.moveLayer(localRadarLayerId, roadLayer.id);
        }
        // Move radar site indicators and labels above the radar layer
        if (map.getLayer('radar-sites-indicators')) {
            map.moveLayer('radar-sites-indicators');
        }
        if (map.getLayer('radar-sites-labels')) {
            map.moveLayer('radar-sites-labels');
        }
        // Update radar site indicators to show selected site
        updateRadarSiteIndicators();
    }
}

function updateRadarSiteIndicators() {
    if (map.getSource('radar-sites')) {
        // Update the source data to include selection state
        const radarSitesData = {
            type: 'FeatureCollection',
            features: Object.keys(RADAR_SITES).map(siteCode => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: RADAR_SITES[siteCode].coordinates
                },
                properties: {
                    siteCode: siteCode,
                    name: RADAR_SITES[siteCode].name,
                    isSelected: siteCode === currentRadarSite
                }
            }))
        };
        map.getSource('radar-sites').setData(radarSitesData);
    }
}

function addNWSAlertsLayer() {
    fetch('https://api.weather.gov/alerts/active?code=TOR%2CSVR%2CSVS%2CSPS%2CSVA%2CTOA')
        .then(res => res.json())
        .then(data => {
            if (map.getSource('nws-alerts')) {
                map.getSource('nws-alerts').setData(data);
            } else {
                map.addSource('nws-alerts', {
                    type: 'geojson',
                    data: data
                });
                map.addLayer({
                    id: 'nws-alerts-fill',
                    type: 'fill',
                    source: 'nws-alerts',
                    paint: {
                        'fill-color': [
                            'match',
                            ['get', 'event'],
                            'Tornado Warning', '#b50704', // Red
                            'Severe Thunderstorm Warning', '#ff9900', // Orange
                            'Special Weather Statement', '#b39ddb', // Light Purple
                            'Severe Thunderstorm Watch', '#ffb3b3', // Pale Red
                            'Tornado Watch', '#ffe066', // Yellow
                            /* other */ '#63eb63'
                        ],
                        'fill-opacity': 0.25
                    }
                });
                map.addLayer({
                    id: 'nws-alerts-outline',
                    type: 'line',
                    source: 'nws-alerts',
                    paint: {
                        'line-color': [
                            'match',
                            ['get', 'event'],
                            'Tornado Warning', '#b50704', // Red
                            'Severe Thunderstorm Warning', '#ff9900', // Orange
                            'Special Weather Statement', '#b39ddb', // Light Purple
                            'Severe Thunderstorm Watch', '#ffb3b3', // Pale Red
                            'Tornado Watch', '#ffe066', // Yellow
                            /* other */ '#63eb63'
                        ],
                        'line-width': 3,
                        'line-opacity': 0.85
                    }
                });

                // Move alert layers below the first road layer
                const layers = map.getStyle().layers;
                const roadLayer = layers.find(l => l.id.includes('road') && l.type === 'line');
                if (roadLayer) {
                    map.moveLayer('nws-alerts-outline', roadLayer.id);
                    map.moveLayer('nws-alerts-fill', roadLayer.id);
                }
            }
        });
}

function addRadarSiteIndicators() {
    // Create GeoJSON data for radar sites
    const radarSitesData = {
        type: 'FeatureCollection',
        features: Object.keys(RADAR_SITES).map(siteCode => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: RADAR_SITES[siteCode].coordinates
            },
            properties: {
                siteCode: siteCode,
                name: RADAR_SITES[siteCode].name,
                isSelected: siteCode === currentRadarSite
            }
        }))
    };

    // Add radar sites source
    map.addSource('radar-sites', {
        type: 'geojson',
        data: radarSitesData
    });

    // Add radar site indicators layer
    map.addLayer({
        id: 'radar-sites-indicators',
        type: 'circle',
        source: 'radar-sites',
        paint: {
            'circle-radius': 20,
            'circle-color': [
                'case',
                ['get', 'isSelected'], '#3a8dde', // Blue for selected
                '#000000' // Black for unselected
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-opacity': 0.9
        }
    });

    // Add radar site labels
    map.addLayer({
        id: 'radar-sites-labels',
        type: 'symbol',
        source: 'radar-sites',
        layout: {
            'text-field': ['get', 'siteCode'],
            'text-font': ['Open Sans Bold'],
            'text-size': 12,
            'text-offset': [0, 0],
            'text-anchor': 'center'
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1
        }
    });

    // Add click handler for radar sites
    map.on('click', 'radar-sites-indicators', (e) => {
        const feature = e.features[0];
        if (feature) {
            const siteCode = feature.properties.siteCode;
            if (siteCode !== currentRadarSite) {
                currentRadarSite = siteCode;
                updateLocalRadarLayer();
            }
        }
    });

    // Change cursor on hover
    map.on('mouseenter', 'radar-sites-indicators', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'radar-sites-indicators', () => {
        map.getCanvas().style.cursor = '';
    });
}

const satelliteSelect = document.getElementById('satelliteSelect');
const regionSelect = document.getElementById('regionSelect');

const SATELLITE_URLS = {
    'goes-east': {
        'conus': {
            'visible': 'http://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/conus-goes-vis-1km/{z}/{x}/{y}.png',
            'ir': 'http://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/conus-goes-ir-4km/{z}/{x}/{y}.png'
        },
        'meso1': {
            'visible': 'https://realearth.ssec.wisc.edu/api/image?products=G19-ABI-MESO1-BAND01&time={time}&x={x}&y={y}&z={z}'
            // Add IR if available
        },
        'meso2': {
            'visible': 'https://realearth.ssec.wisc.edu/api/image?products=G19-ABI-MESO2-BAND01&time={time}&x={x}&y={y}&z={z}'
            // Add IR if available
        },
        'fulldisk': {
            'visible': 'http://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-east-vis-1km/{z}/{x}/{y}.png'
            // Add IR if available
        }
        // Add other regions as you get their URLs
    },
    'goes-west': {
        'conus': {
            'visible': 'http://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-west-vis-1km/{z}/{x}/{y}.png',
            'ir': 'http://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-west-ir-4km/{z}/{x}/{y}.png'
        },
        'fulldisk': {
            'visible': 'http://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-west-vis-1km/{z}/{x}/{y}.png'
            // Add IR if available
        }
        // Add other regions as you get their URLs
    }
};

const SATELLITE_SOURCE_ID = 'satellite-imagery';
const SATELLITE_LAYER_ID = 'satellite-imagery-layer';

let currentSatLayer = 'visible';
let satelliteLayerVisible = false;

// Cache for RealEarth timestamps to avoid repeated API calls
let realearthTimestampCache = {};
let realearthTimestampCacheTime = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getLatestRealEarthTimestamp(product) {
    const now = Date.now();
    
    // Return cached timestamp if still valid
    if (realearthTimestampCache[product] && (now - realearthTimestampCacheTime[product]) < CACHE_DURATION) {
        return realearthTimestampCache[product];
    }
    
    try {
        const response = await fetch(`https://realearth.ssec.wisc.edu/api/products?products=${product}&allapps=true&proxy=true`);
        const data = await response.json();
        
        if (data && data.length > 0 && data[0].times && data[0].times.length > 0) {
            // Get the latest timestamp (last in the array)
            const latestTimestamp = data[0].times[data[0].times.length - 1];
            realearthTimestampCache[product] = latestTimestamp;
            realearthTimestampCacheTime[product] = now;
            return latestTimestamp;
        }
    } catch (error) {
        console.error(`Error fetching RealEarth timestamp for ${product}:`, error);
    }
    
    // Fallback to current time if API fails
    const nowDate = new Date();
    const year = nowDate.getUTCFullYear();
    const month = String(nowDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(nowDate.getUTCDate()).padStart(2, '0');
    const hour = String(nowDate.getUTCHours()).padStart(2, '0');
    const minute = String(nowDate.getUTCMinutes()).padStart(2, '0');
    const second = String(nowDate.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}+${hour}${minute}${second}`;
}

function getCurrentTimeString() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');
    const minute = String(now.getUTCMinutes()).padStart(2, '0');
    const second = String(now.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}+${hour}${minute}${second}`;
}

async function updateSatelliteLayer() {
    // Remove existing layer/source if present
    if (map.getLayer(SATELLITE_LAYER_ID)) map.removeLayer(SATELLITE_LAYER_ID);
    if (map.getSource(SATELLITE_SOURCE_ID)) map.removeSource(SATELLITE_SOURCE_ID);

    const sat = satelliteSelect.value;
    const region = regionSelect.value;
    const urlObj = SATELLITE_URLS[sat] && SATELLITE_URLS[sat][region];
    let url = null;
    
    if (typeof urlObj === 'string') {
        url = urlObj;
    } else if (typeof urlObj === 'object' && urlObj[currentSatLayer]) {
        url = urlObj[currentSatLayer];
        
        // Replace {time} placeholder with appropriate timestamp
        if (url.includes('{time}')) {
            if (sat === 'goes-east' && (region === 'meso1' || region === 'meso2')) {
                // Use RealEarth API for GOES East Mesoscale Areas
                const product = region === 'meso1' ? 'G19-ABI-MESO1-BAND01' : 'G19-ABI-MESO2-BAND01';
                const timestamp = await getLatestRealEarthTimestamp(product);
                url = url.replace('{time}', timestamp);
            } else {
                // Use current time for other sources
                url = url.replace('{time}', getCurrentTimeString());
            }
        }
    }
    
    if (!url) return;

    map.addSource(SATELLITE_SOURCE_ID, {
        type: 'raster',
        tiles: [url],
        tileSize: 256,
        maxzoom: 10
    });
    map.addLayer({
        id: SATELLITE_LAYER_ID,
        type: 'raster',
        source: SATELLITE_SOURCE_ID,
        paint: { 
            'raster-opacity': 1,
            'raster-resampling': 'linear',
            'raster-saturation': 0,
            'raster-contrast': 0,
            'raster-brightness-min': 0,
            'raster-brightness-max': 1,
            'raster-fade-duration': 0
        }
    });
    // Move satellite layer below the first road layer
    const layers = map.getStyle().layers;
    const roadLayer = layers.find(l => l.id.includes('road') && l.type === 'line');
    if (roadLayer) {
        map.moveLayer(SATELLITE_LAYER_ID, roadLayer.id);
    }
}

// Listen for dropdown changes
satelliteSelect.addEventListener('change', () => {
    if (satelliteLayerVisible) {
        updateSatelliteLayer();
    }
});
regionSelect.addEventListener('change', () => {
    if (satelliteLayerVisible) {
        updateSatelliteLayer();
    }
});

// Weather model controls
const modelSelect = document.getElementById('modelSelect');
modelSelect.addEventListener('change', () => {
    currentModel = modelSelect.value;
    if (weatherModelVisible) {
        updateWeatherModelLayer();
    }
});

// Frame slider functionality
const frameSlider = document.getElementById('frameSlider');
const frameTimestamp = document.getElementById('frameTimestamp');
const playPauseBtn = document.getElementById('playPauseBtn');

let isPlaying = false;
let playbackInterval = null;

function updateFrameDisplay() {
    if (modelsBtn.classList.contains('active')) {
        frameTimestamp.textContent = `+${currentFrame} hr`;
    } else if (radarBtn.classList.contains('active') && localRadarVisible) {
        // For local radar sites, show "Live" since they don't support frames
        frameTimestamp.textContent = 'Live';
    } else {
        // For global radar, show timestamp
        const now = new Date();
        const minutesAgo = (7 - currentFrame) * 5; // 5-minute intervals
        const timestamp = new Date(now.getTime() - minutesAgo * 60000);
        frameTimestamp.textContent = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

function updateCurrentFrame() {
    if (modelsBtn.classList.contains('active')) {
        // Update weather model frame
        if (weatherModelVisible) {
            updateWeatherModelLayer();
        }
    } else {
        // Update radar frame - only for global radar since local sites don't support frames
        if (radarLayerAdded) {
            // For global radar, remove and re-add with new timestamp
            removeGlobalRadarLayer();
            addGlobalRadarLayer();
        }
        // Note: Local radar sites don't support frame-based timestamps
        // They show the most recent data available
    }
    updateFrameDisplay();
}

frameSlider.addEventListener('input', (e) => {
    currentFrame = parseInt(e.target.value);
    updateCurrentFrame();
});

// Helper: Get all visible tile coordinates for current viewport and zoom
function getVisibleTiles(z) {
    const bounds = map.getBounds();
    const nw = bounds.getNorthWest();
    const se = bounds.getSouthEast();
    const tileCoords = [];
    const tileCount = Math.pow(2, z);
    // Clamp latitudes for Web Mercator
    function clampLat(lat) {
        return Math.max(Math.min(lat, 85.05112878), -85.05112878);
    }
    // Convert lng/lat to tile x/y  
    function lngLatToTile(lng, lat, z) {
        lat = clampLat(lat);
        const x = Math.floor(((lng + 180) / 360) * tileCount);
        const y = Math.floor(
            (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * tileCount
        );
        return { x, y };
    }
    const min = lngLatToTile(nw.lng, se.lat, z);
    const max = lngLatToTile(se.lng, nw.lat, z);
    for (let x = Math.min(min.x, max.x); x <= Math.max(min.x, max.x); x++) {
        for (let y = Math.min(min.y, max.y); y <= Math.max(min.y, max.y); y++) {
            tileCoords.push({ x, y, z });
        }
    }
    return tileCoords;
}

// Helper: Preload all frame tiles for current view
function preloadAllFrameTiles(getTileUrlForFrame, frameCount, onProgress, onComplete) {
    const z = map.getZoom() | 0;
    const tiles = getVisibleTiles(z);
    let total = tiles.length * frameCount;
    let loaded = 0;
    let errored = 0;
    let done = false;
    if (total === 0) { onComplete(); return; }
    for (let frame = 0; frame < frameCount; frame++) {
        for (const tile of tiles) {
            const url = getTileUrlForFrame(frame, tile.x, tile.y, tile.z);
            const img = new window.Image();
            img.onload = img.onerror = () => {
                loaded++;
                if (onProgress) onProgress(loaded, total);
                if (!done && loaded + errored >= total) {
                    done = true;
                    onComplete();
                }
            };
            img.src = url;
        }
    }
}

// Show/hide loading message in modal
function setPlaybackLoading(isLoading) {
    const modal = document.getElementById('radarPlaybackModal');
    let loadingMsg = document.getElementById('frameLoadingMsg');
    if (isLoading) {
        if (!loadingMsg) {
            loadingMsg = document.createElement('span');
            loadingMsg.id = 'frameLoadingMsg';
            loadingMsg.style.marginLeft = '1rem';
            loadingMsg.style.color = '#3a8dde';
            loadingMsg.textContent = 'Loading frames...';
            modal.querySelector('.modal-content').appendChild(loadingMsg);
        }
    } else {
        if (loadingMsg) loadingMsg.remove();
    }
}

// --- Modified play button logic ---
playPauseBtn.addEventListener('click', () => {
    if (!isPlaying) {
        // Preload all frames before starting playback
        playPauseBtn.disabled = true;
        setPlaybackLoading(true);
        let frameCount = parseInt(frameSlider.max) + 1;
        let getTileUrlForFrame;
        if (modelsBtn.classList.contains('active')) {
            // Weather model
            getTileUrlForFrame = (frame, x, y, z) => {
                let url = HRRR_FRAMES[frame] || HRRR_FRAMES[0];
                return url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
            };
        } else {
            // Global radar
            getTileUrlForFrame = (frame, x, y, z) => {
                const now = Math.floor(Date.now() / 1000);
                const minutesAgo = (7 - frame) * 5;
                const ts = now - (minutesAgo * 60);
                const roundedTs = ts - (ts % 300);
                return `https://api.weather.com/v3/TileServer/tile/twcRadarMosaic?ts=${roundedTs}&xyz=${x}:${y}:${z}&apiKey=e1f10a1e78da46f5b10a1e78da96f525`;
            };
        }
        // Preload and cache all frame images for the current view
        preloadAllFrameTiles(getTileUrlForFrame, frameCount, null, () => {
            setPlaybackLoading(false);
            playPauseBtn.disabled = false;
            isPlaying = true;
            playPauseBtn.textContent = '⏸';
            let loopDelay = false;
            playbackInterval = setInterval(async () => {
                if (modelsBtn.classList.contains('active')) {
                    // Weather model: normal loop
                    currentFrame = (currentFrame + 1) % (parseInt(frameSlider.max) + 1);
                    frameSlider.value = currentFrame;
                    updateCurrentFrame();
                } else {
                    // Global radar: add 1s delay after last frame
                    if (currentFrame === parseInt(frameSlider.max)) {
                        if (!loopDelay) {
                            loopDelay = true;
                            setTimeout(() => {
                                currentFrame = 0;
                                frameSlider.value = currentFrame;
                                updateCurrentFrame();
                                loopDelay = false;
                            }, 1000);
                        }
                    } else if (!loopDelay) {
                        currentFrame = (currentFrame + 1) % (parseInt(frameSlider.max) + 1);
                        frameSlider.value = currentFrame;
                        updateCurrentFrame();
                    }
                }
            }, 250);
        });
    } else {
        playPauseBtn.textContent = '▶';
        if (playbackInterval) {
            clearInterval(playbackInterval);
            playbackInterval = null;
        }
        isPlaying = false;
    }
});

document.querySelectorAll('.sat-layer-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.sat-layer-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentSatLayer = this.dataset.layer;
        if (satelliteLayerVisible) {
            updateSatelliteLayer();
        }
    });
});

// Handle radar product button clicks
function setupRadarProductButtons() {
    const btns = document.querySelectorAll('.radar-product-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', function() {
            btns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentRadarProduct = this.dataset.product;
            // Only update if local radar is visible
            if (localRadarVisible) {
                updateLocalRadarLayer();
            }
        });
    });
}

// Call setupRadarProductButtons on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupRadarProductButtons);
} else {
    setupRadarProductButtons();
}

// Set default tab and radar site on load
function setDefaultView() {
    // Set Radar tab active
    setActiveTab(radarBtn);
    // Set default radar site to KMOB
    currentRadarSite = 'KMOB';
    // Set default radar product to Reflectivity
    currentRadarProduct = 'reflectivity';
    // Update radar site indicators (if already loaded)
    if (map.isStyleLoaded() && map.getSource('radar-sites')) {
        updateRadarSiteIndicators();
    }
    // Set Reflectivity button active
    const btns = document.querySelectorAll('.radar-product-btn');
    btns.forEach(b => b.classList.remove('active'));
    const reflBtn = document.querySelector('.radar-product-btn[data-product="reflectivity"]');
    if (reflBtn) reflBtn.classList.add('active');
}

// --- IP Live Cams Integration ---
async function loadIPLiveCams() {
    const response = await fetch('iplivecams.json');
    const cams = await response.json();
    cams.forEach(cam => {
        const el = document.createElement('img');
        el.src = 'icons/camera.svg';
        el.className = 'ipcam-marker';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.cursor = 'pointer';
        // Add marker to map
        const marker = new mapboxgl.Marker(el, { anchor: 'bottom' })
            .setLngLat([cam.coordinates[1], cam.coordinates[0]])
            .addTo(map);
        // Click handler to show modal
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            showIPCamModal(cam);
        });
    });
}

function showIPCamModal(cam) {
    // Remove any existing modal
    let modal = document.getElementById('ipcamModal');
    if (modal) modal.remove();
    // Create modal
    modal = document.createElement('div');
    modal.id = 'ipcamModal';
    modal.className = 'ipcam-modal';
    let contentHtml = `
        <div class=\"ipcam-modal-content\">
            <button class=\"ipcam-modal-close\" aria-label=\"Close\">&times;</button>
            <h2>${cam.name}</h2>
    `;
    if (cam.type === 'image' && cam.image) {
        contentHtml += `<img src=\"${cam.image}\" alt=\"${cam.name}\" style=\"width:100%;max-width:480px;border-radius:8px;background:#000;box-shadow:0 2px 12px rgba(0,0,0,0.18);margin-top:0.5rem;\"/>`;
    } else {
        contentHtml += `<video id=\"ipcamPlayer\" controls autoplay style=\"width:100%;max-width:480px;background:#000;\">\n` +
            `<source src=\"${cam.stream}\" type=\"application/x-mpegURL\">\n` +
            `<source src=\"${cam.stream}\" type=\"application/dash+xml\">\n` +
            `Your browser does not support the video tag or streaming format.\n</video>`;
    }
    contentHtml += `</div>`;
    modal.innerHTML = contentHtml;
    document.body.appendChild(modal);
    // HLS.js support for m3u8 streams
    if (cam.type === 'stream' && cam.stream && cam.stream.endsWith('.m3u8')) {
        const video = modal.querySelector('#ipcamPlayer');
        if (video) {
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = cam.stream;
            } else if (window.Hls) {
                const hls = new window.Hls();
                hls.loadSource(cam.stream);
                hls.attachMedia(video);
            }
        }
    }
    // Close handler
    modal.querySelector('.ipcam-modal-close').onclick = () => modal.remove();
    // Close on outside click
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// Load cams on map load
map.on('load', async () => {
    setDefaultView();
    addNWSAlertsLayer();
    addRadarSiteIndicators();
    // Don't automatically show satellite layer - let tab system control it

    // Add popup on alert click
    map.on('click', 'nws-alerts-fill', (e) => {
        const feature = e.features && e.features[0];
        if (!feature) return;
        const props = feature.properties;
        const headline = props.headline || props.event || 'NWS Alert';
        const area = props.areaDesc || 'Unknown area';
        const expires = props.expires ? new Date(props.expires).toLocaleString() : 'Unknown';
        const html = `
            <strong style="color: black;">${headline}</strong><br/>
            <em style="color: black;">Areas:</em> <span style="color: black;">${area}</span><br/>
            <em style="color: black;">Expires:</em> <span style="color: black;">${expires}</span>
        `;
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
    });

    // Change cursor to pointer on hover
    map.on('mouseenter', 'nws-alerts-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'nws-alerts-fill', () => {
        map.getCanvas().style.cursor = '';
    });

    // On load, set correct visibility
    updateModalControlsVisibility();
    updateFrameDisplay();
    if (radarBtn.classList.contains('active')) {
        showLocalRadarLayer();
    }
    await loadIPLiveCams();
}); 

// --- Menu button and dropdown logic ---
const menuBtn = document.getElementById('menuBtn');
const menuDropdown = document.getElementById('menuDropdown');

// Show/hide menu dropdown on button click
menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menuDropdown.style.display === 'none' || menuDropdown.style.display === '') {
        menuDropdown.style.display = 'flex';
    } else {
        menuDropdown.style.display = 'none';
    }
});
// Hide menu dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (menuDropdown.style.display === 'flex' && !menuDropdown.contains(e.target) && e.target !== menuBtn) {
        menuDropdown.style.display = 'none';
    }
});

let locationMarker = null;
let locationPulse = null;
let locationWatchInterval = null;

function addLocationMarker(lat, lng) {
    // Remove previous marker and pulse if any
    if (locationMarker) {
        locationMarker.remove();
        locationMarker = null;
    }
    if (locationPulse) {
        locationPulse.remove();
        locationPulse = null;
    }
    // Create marker container with flexbox centering
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.width = '44px';
    container.style.height = '44px';
    container.style.pointerEvents = 'none';
    // Create pulse div
    const pulse = document.createElement('div');
    pulse.className = 'gps-pulse';
    // Create marker icon
    const icon = document.createElement('img');
    icon.src = 'icons/gpsarrow.svg';
    icon.className = 'gps-arrow-icon';
    // Add to container
    container.appendChild(pulse);
    container.appendChild(icon);
    // Add marker to map
    locationMarker = new mapboxgl.Marker(container, { anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);
    // Save pulse for later removal
    locationPulse = locationMarker;
}

function removeLocationMarker() {
    if (locationMarker) {
        locationMarker.remove();
        locationMarker = null;
    }
    if (locationPulse) {
        locationPulse.remove();
        locationPulse = null;
    }
    if (locationWatchInterval) {
        clearInterval(locationWatchInterval);
        locationWatchInterval = null;
    }
}

const showLocationBtn = document.getElementById('showLocationBtn');
showLocationBtn.addEventListener('click', () => {
    menuDropdown.style.display = 'none';
    if (navigator.geolocation) {
        // Remove any previous marker and interval
        removeLocationMarker();
        // Function to update location
        function updateLocation() {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    addLocationMarker(pos.coords.latitude, pos.coords.longitude);
                },
                (err) => {
                    removeLocationMarker();
                }
            );
        }
        updateLocation();
        locationWatchInterval = setInterval(updateLocation, 4500);
    } else {
        removeLocationMarker();
    }
}); 