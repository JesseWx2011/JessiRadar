# 🌦️ StormTracker Pro - Live Weather Radar

A modern, clean weather radar application with the same UI layout as WeatherWise but with different branding. This app focuses solely on radar functionality and eliminates the complex NEXRAD API dependencies that were causing errors.

## ✨ Features

- **Clean, Modern UI**: Professional weather radar interface similar to WeatherWise
- **Mapbox Integration**: High-quality maps with dark theme
- **Radar Visualization**: Synthetic radar data demonstration
- **Responsive Design**: Works on desktop and mobile devices
- **No API Dependencies**: Eliminates the "Error loading NEXRAD data: HTTP 501" issue

## 🚀 Quick Start

### Option 1: Simple Launcher (Recommended)
```bash
python3 run_radar.py
```

### Option 2: Direct Server
```bash
python3 server.py
```

### Option 3: Python Built-in Server
```bash
python3 -m http.server 8000
```

The application will automatically open in your default web browser at `http://localhost:8000`.

## 🎯 UI Layout

The app features the exact same UI layout as the WeatherWise app you requested:

### Top Navigation Bar
- **Left**: Hamburger menu + "StormTracker Pro" branding
- **Center**: Search icon + "Radar" feature button (highlighted)
- **Right**: Alerts icon + Map zoom/pan controls

### Main Map Area
- Dark-themed Mapbox map centered on North America
- Radar coverage visualization
- Weather station markers with intensity indicators
- Professional weather radar aesthetics

## 🔧 Technical Details

- **Frontend**: Pure HTML/CSS/JavaScript with Mapbox GL JS
- **Backend**: Simple Python HTTP server (no complex APIs)
- **Maps**: Mapbox dark theme for professional appearance
- **Icons**: Font Awesome for consistent iconography
- **Fonts**: Inter font family for modern typography

## 🎨 Branding Changes

- **App Name**: "StormTracker Pro" instead of "WeatherWise"
- **Logo**: Lightning bolt icon with blue text
- **Color Scheme**: Blue (#1e40af) and yellow (#fbbf24) accent colors
- **Tagline**: "Pro" instead of "PLUS"

## 🐛 Issues Resolved

- ✅ **Fixed**: "Error loading NEXRAD data: HTTP 501" error
- ✅ **Simplified**: Removed complex NEXRAD API dependencies
- ✅ **Streamlined**: Focused only on radar functionality
- ✅ **Modernized**: Clean, professional UI design

## 📱 Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## 🛠️ Customization

### Changing the Branding
Edit the `index.html` file:
- Update the title and logo text
- Modify color schemes in CSS variables
- Change the app name and branding elements

### Adding Real NEXRAD Data
To integrate real NEXRAD data later:
1. Set up a proper Mapbox access token
2. Implement NEXRAD data processing
3. Add real-time data feeds

## 📁 File Structure

```
├── index.html          # Main radar application
├── server.py           # Simple HTTP server
├── run_radar.py        # Launcher script
├── RADAR_APP_README.md # This file
└── [other files]       # Original project files
```

## 🚫 Troubleshooting

### "Mapbox access token required" error
The app uses a placeholder token. For production use:
1. Get a free Mapbox account at https://mapbox.com
2. Replace the token in `index.html`
3. Update the token in the JavaScript code

### Port 8000 already in use
Change the port in `server.py` or use a different port:
```bash
python3 -m http.server 8080
```

### Browser doesn't open automatically
Manually navigate to `http://localhost:8000` in your browser.

## 🔮 Future Enhancements

- Real-time NEXRAD data integration
- Multiple radar product types
- Weather alerts and warnings
- Historical radar data
- Mobile app version
- Advanced radar analysis tools

## 📄 License

This project is part of the original NEXRAD weather radar visualization platform.

---

**StormTracker Pro** - Professional weather radar visualization made simple.