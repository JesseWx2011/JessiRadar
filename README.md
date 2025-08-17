# WeatherRadar Pro 🌦️

A modern, professional web application for real-time NEXRAD weather radar visualization, designed with the same quality and features as WeatherWise and AtticRadar. Built with Python, Flask, and Mapbox GL JS with high-performance WebGL rendering.

## 🌦️ Features

- **Real-time NEXRAD Data Processing**: Fetch and parse NEXRAD Level 3 files from NOAA's AWS S3 bucket
- **WebGL Visualization**: High-performance rendering using Mapbox GL JS with WebGL
- **Multiple Visualization Types**: Raster overlays and point-based visualizations
- **RESTful API**: Clean API for processing and serving radar data
- **Production Ready**: Docker containerization, Nginx reverse proxy, and caching
- **Responsive Design**: Mobile-friendly web interface

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Nginx         │    │   Flask API     │
│   (Mapbox GL)   │◄──►│   (Reverse      │◄──►│   (NEXRAD       │
│                 │    │    Proxy)       │    │    Processor)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │   NOAA NEXRAD   │
                                               │   AWS S3        │
                                               └─────────────────┘
```

## 🚀 Quick Start

### Option 1: One-Click Launcher (Easiest)

1. **Install dependencies:**
   ```bash
   pip install -r requirements-api.txt
   ```

2. **Launch the application:**
   ```bash
   python launch.py
   ```

3. **That's it!** The application will automatically:
   - Start the API server
   - Start the web server
   - Open your browser to http://localhost:8000
   - Display usage instructions

### Option 2: Docker Compose (Production)

1. **Run with Docker:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Open http://localhost in your browser
   - API documentation: http://localhost/api

### Option 3: Manual Setup (Development)

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements-api.txt
   ```

2. **Run the API server:**
   ```bash
   python nexrad_api.py
   ```

3. **Serve the frontend (in another terminal):**
   ```bash
   cd static
   python -m http.server 8000
   ```

4. **Access:**
   - Frontend: http://localhost:8000
   - API: http://localhost:5000

## 📁 Project Structure

```
weatherradar-pro/
├── nexrad_processor.py      # Core NEXRAD data processing
├── nexrad_api.py           # Flask API server
├── requirements.txt        # Python dependencies (standalone)
├── requirements-api.txt    # API server dependencies
├── Dockerfile              # API server container
├── docker-compose.yml      # Complete deployment
├── nginx.conf              # Nginx configuration
├── launch.py               # One-click launcher script
├── static/
│   ├── index.html          # Modern web interface
│   ├── styles.css          # Professional styling
│   └── app.js              # Advanced JavaScript application
└── README.md               # This file
```

## 🔧 API Endpoints

### Process NEXRAD Data
```http
POST /api/process-nexrad
Content-Type: application/json

{
  "url": "https://unidata-nexrad-level3.s3.amazonaws.com/FDR_N0B_2025_08_17_22_05_15"
}
```

### Get Processed Data
```http
GET /api/data/{job_id}
```

### Get Radar Image
```http
GET /api/image/{job_id}
```

### Get GeoJSON Data
```http
GET /api/geojson/{job_id}
```

## 🌐 Web Deployment

### For Production Deployment:

1. **Domain Setup:**
   - Point your domain to your server
   - Update `nginx.conf` with your domain name

2. **HTTPS (Recommended):**
   ```bash
   # Get SSL certificates (Let's Encrypt)
   certbot --nginx -d yourdomain.com
   ```

3. **Environment Variables:**
   ```bash
   export DEBUG=false
   export PORT=5000
   ```

4. **Deploy:**
   ```bash
   docker-compose up -d
   ```

### Cloud Deployment Options:

**AWS:**
- Use ECS or EKS for container orchestration
- CloudFront for CDN
- ALB for load balancing

**Google Cloud:**
- Cloud Run for serverless containers
- Cloud CDN for static assets

**Azure:**
- Container Instances or AKS
- Azure CDN

## 🔍 NEXRAD Data Sources

The application can process NEXRAD Level 3 data from:

- **NOAA AWS S3**: `https://unidata-nexrad-level3.s3.amazonaws.com/`
- **Real-time feeds**: NEXRAD sites update every 4-6 minutes
- **Historical data**: Archive data available through NOAA

### Supported Products:
- **N0B**: Base Reflectivity (0.5°)
- **N0G**: Base Reflectivity (0.5°) - Legacy
- **N0Q**: Base Reflectivity (0.5°) - High Resolution
- **N0U**: Base Radial Velocity (0.5°)

## 🎨 Customization

### Adding New Visualization Types:

1. **Modify the processor:**
   ```python
   # In nexrad_processor.py
   def convert_to_custom_format(self):
       # Your custom processing logic
       pass
   ```

2. **Update the API:**
   ```python
   # In nexrad_api.py
   @app.route('/api/custom/<job_id>')
   def get_custom_data(job_id):
       # Return custom format
       pass
   ```

3. **Frontend integration:**
   ```javascript
   // In nexrad-web.js
   addCustomLayer(data) {
       // Add to Mapbox map
   }
   ```

### Color Schemes:
Modify the `_get_radar_color()` method in `nexrad_processor.py` to customize radar colors.

## 🔧 Configuration

### Environment Variables:
- `DEBUG`: Enable debug mode (default: false)
- `PORT`: API server port (default: 5000)
- `CACHE_DURATION_HOURS`: Data cache duration (default: 24)

### Nginx Configuration:
- Rate limiting: 10 requests/second for API
- GZIP compression enabled
- Static asset caching: 1 year
- CORS headers for API endpoints

## 🐛 Troubleshooting

### Common Issues:

1. **Mapbox token error:**
   - Ensure you've set a valid Mapbox access token
   - Check token permissions and domain restrictions

2. **NEXRAD data not loading:**
   - Verify the NEXRAD URL is accessible
   - Check API server logs: `docker-compose logs nexrad-api`

3. **CORS issues:**
   - Nginx handles CORS headers
   - For development, ensure Flask-CORS is installed

4. **Memory issues:**
   - NEXRAD files can be large (1-10MB)
   - Adjust Docker memory limits if needed

### Logs:
```bash
# View API logs
docker-compose logs -f nexrad-api

# View Nginx logs
docker-compose logs -f nginx
```

## 📊 Performance

- **Processing Time**: 5-30 seconds per NEXRAD file
- **Memory Usage**: ~100-500MB per processing job
- **Cache**: Processed data cached for 24 hours
- **Concurrent Users**: Supports 10+ concurrent users

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **NOAA**: For providing NEXRAD data
- **Mapbox**: For the excellent mapping platform
- **Py-ART**: Python ARM Radar Toolkit for NEXRAD parsing
- **Flask**: Lightweight web framework

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review API logs
3. Open an issue on GitHub

---

**Built with ❤️ for weather enthusiasts and developers**