# 🌩️ StormTracker Pro - Raw NEXRAD Level III Data Display

## Overview

StormTracker Pro now includes advanced functionality to display **raw NEXRAD Level III data** directly on the map. This feature parses the binary radar data files and renders individual data points as colored circles, providing unprecedented insight into the actual radar measurements.

## 🚀 Features

### **Raw Data Visualization**
- **Individual Data Points**: Each radar measurement is displayed as a colored circle
- **Color-Coded Values**: Data values are mapped to a professional color scale
- **Interactive Tooltips**: Hover over points to see exact values, range, and azimuth
- **Real-Time Parsing**: Direct parsing of NEXRAD Level III binary files

### **Advanced Data Parsing**
- **Binary File Parsing**: Reads and parses NEXRAD Level III binary data
- **Radial Data Extraction**: Extracts individual radial measurements
- **Header Information**: Displays comprehensive file metadata
- **Data Validation**: Robust error handling and data integrity checks

### **Professional Visualization**
- **Color Legend**: Professional-grade color scale with value ranges
- **Range Rings**: Distance indicators for radar coverage
- **Station Markers**: Clear identification of radar station locations
- **Responsive Design**: Optimized for various screen sizes and zoom levels

## 🔧 Technical Implementation

### **Data Parsing Architecture**
```javascript
// Parse NEXRAD Level III binary data
parseNEXRADLevel3(arrayBuffer) {
    const dataView = new DataView(arrayBuffer);
    
    // Parse headers (30 + 16 + 60 bytes)
    const textHeader = this.parseTextHeader(dataView);
    const messageHeader = this.parseMessageHeader(dataView, 30);
    const productDescription = this.parseProductDescription(dataView, 46);
    
    // Parse radial data packets
    const radialData = this.parseRadialData(dataView, offset);
    
    return { textHeader, messageHeader, productDescription, radialData };
}
```

### **Radial Data Processing**
```javascript
// Parse individual radial data packets
parseRadialData(dataView, offset) {
    const radialData = [];
    
    while (currentOffset < dataView.byteLength - 4) {
        const packetHeader = {
            packetCode: dataView.getUint16(currentOffset, false),
            numberOfRangeBins: dataView.getUint16(currentOffset + 4, false),
            centerAzimuth: dataView.getUint16(currentOffset + 6, false)
        };
        
        if (packetHeader.packetCode === 0xAF1F) {
            // Extract range data for this radial
            const rangeData = this.extractRangeData(dataView, currentOffset + 12, packetHeader.numberOfRangeBins);
            radialData.push({ header: packetHeader, data: rangeData });
        }
    }
    
    return radialData;
}
```

### **Data Visualization**
```javascript
// Display radar data points on map
displayRadarData(radialData, stationCoords) {
    radialData.forEach(radial => {
        const azimuth = radial.header.centerAzimuth / 10;
        const azimuthRad = (azimuth * Math.PI) / 180;
        
        radial.data.forEach((dataValue, rangeIndex) => {
            if (dataValue > 0) {
                const rangeKm = rangeIndex * 1.0;
                const position = this.calculatePosition(stationCoords, rangeKm, azimuthRad);
                const color = this.colorScale(dataValue);
                
                // Create map point
                const point = L.circle(position, {
                    radius: 500,
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.7
                });
                
                point.addTo(this.map);
            }
        });
    });
}
```

## 🎨 Color Scale

### **Reflectivity Values**
| Range | Color | Description |
|-------|-------|-------------|
| 0-19 | 🟢 Green | Very light precipitation |
| 20-49 | 🟡 Yellow | Light precipitation |
| 50-79 | 🟠 Orange | Moderate precipitation |
| 80-109 | 🔴 Red | Heavy precipitation |
| 110-139 | 🟣 Magenta | Very heavy precipitation |
| 140-169 | 🔵 Blue | Extreme precipitation |
| 170-199 | 🔵 Blue-Green | Severe precipitation |
| 200+ | 🟢 Green | Maximum values |

### **Color Scale Implementation**
```javascript
createReflectivityColorScale() {
    return (value) => {
        if (value === 0) return '#000000';        // No data
        if (value < 20) return '#00ff00';        // Green
        if (value < 50) return '#ffff00';        // Yellow
        if (value < 80) return '#ff8000';        // Orange
        if (value < 110) return '#ff0000';       // Red
        if (value < 140) return '#ff00ff';       // Magenta
        if (value < 170) return '#8000ff';       // Purple
        if (value < 200) return '#00ffff';       // Cyan
        return '#00ff00';                        // Green (high)
    };
}
```

## 📊 Data Structure

### **NEXRAD Level III File Format**
```
┌─────────────────┬─────────────────┬─────────────────┐
│   Text Header   │  Message Header │ Product Desc.   │
│   (30 bytes)    │   (16 bytes)    │   (60 bytes)    │
├─────────────────┼─────────────────┼─────────────────┤
│  Symbology Data │  Graphic Data   │  Tabular Data   │
│   (variable)    │   (variable)    │   (variable)    │
└─────────────────┴─────────────────┴─────────────────┘
```

### **Radial Data Packet Structure**
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Packet Code │ First Range │ Num Range   │ Center      │
│   (2 bytes) │   (2 bytes) │  (2 bytes)  │ Azimuth     │
│             │             │             │ (2 bytes)   │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ Azimuthal   │ Radial      │ Range Data  │             │
│ Spacing     │ Status      │ (variable)  │             │
│ (2 bytes)   │ (2 bytes)   │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

## 🚀 Usage Instructions

### **1. Load Radar Station**
- Select a radar station from the dropdown menu
- Stations are loaded from NOAA's weather.gov API
- Fallback stations are available if API is unavailable

### **2. Load NEXRAD Data**
- Click "Load Data" button to fetch NEXRAD Level III files
- Data is automatically parsed and displayed on the map
- Color legend appears automatically

### **3. Interact with Data**
- **Hover**: See exact values, range, and azimuth
- **Zoom**: Adjust map zoom to see more detail
- **Pan**: Navigate around the radar coverage area
- **Info Panel**: View comprehensive data statistics

### **4. Customize Display**
- **Point Size**: Adjust the size of data points (100m - 2000m)
- **Opacity**: Control the transparency of data points
- **Clear Data**: Remove all displayed radar data

## 🔍 Data Sources

### **Real-Time NEXRAD Data**
- **AWS S3**: `s3://unidata-nexrad-level3/`
- **File Format**: `STATION_PRODUCT_YYYY_MM_DD_HH_MM_SS`
- **Update Frequency**: Every 5-10 minutes
- **Coverage**: Continental United States

### **Available Products**
- **N0B**: Base Reflectivity (0.5° elevation)
- **N0G**: Base Reflectivity Legacy
- **N0Q**: Base Reflectivity High Resolution
- **N0U**: Base Velocity
- **N0S**: Storm Relative Velocity
- **N0H**: Hydrometeor Classification

## 🛠️ Technical Requirements

### **Browser Compatibility**
- **Chrome**: 80+ (recommended)
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+

### **Performance Considerations**
- **Data Points**: Up to 100,000 individual points
- **Memory Usage**: Optimized for large datasets
- **Rendering**: Hardware-accelerated when available
- **Caching**: Automatic data caching for performance

## 📈 Performance Optimization

### **Data Processing**
- **Lazy Loading**: Data is processed on-demand
- **Batch Processing**: Multiple radials processed simultaneously
- **Memory Management**: Efficient buffer handling
- **Error Recovery**: Graceful handling of corrupt data

### **Visualization**
- **Level-of-Detail**: Points are filtered based on zoom level
- **Spatial Indexing**: Efficient point lookup and rendering
- **Canvas Optimization**: Optimized for large point counts
- **GPU Acceleration**: WebGL rendering when available

## 🔧 Troubleshooting

### **Common Issues**

#### **No Data Displayed**
- Check browser console for error messages
- Verify radar station selection
- Ensure NEXRAD data is available for selected station
- Check network connectivity to data sources

#### **Performance Issues**
- Reduce point size for better performance
- Clear data and reload if memory issues occur
- Check browser memory usage
- Close other browser tabs if needed

#### **Data Parsing Errors**
- Verify NEXRAD file integrity
- Check file format compatibility
- Review console logs for specific error details
- Try different radar stations or time periods

### **Debug Information**
```javascript
// Enable detailed logging
console.log('Radar data parsing:', {
    fileSize: arrayBuffer.byteLength,
    radialCount: radialData.length,
    dataPoints: totalDataPoints,
    parsingTime: endTime - startTime
});
```

## 🎯 Future Enhancements

### **Planned Features**
- **Real-Time Updates**: Live data streaming
- **Historical Data**: Time-series analysis
- **3D Visualization**: Volumetric data display
- **Advanced Filtering**: Data value and range filtering
- **Export Capabilities**: Data export in various formats

### **Advanced Analytics**
- **Storm Tracking**: Automated storm identification
- **Precipitation Estimation**: Rainfall rate calculations
- **Severe Weather Detection**: Automated warning systems
- **Climate Analysis**: Long-term trend analysis

## 📚 Additional Resources

### **Documentation**
- [NEXRAD Level III ICD](https://www.roc.noaa.gov/wsr88d/PublicDocs/ICDs/2620001Y.pdf)
- [NOAA NEXRAD Products](https://www.ncdc.noaa.gov/data-access/radar-data/nexrad-products)
- [AWS NEXRAD Data](https://registry.opendata.aws/noaa-nexrad/)

### **Technical References**
- [AtticRadar Implementation](https://github.com/SteepAtticStairs/AtticRadar)
- [NEXRAD Data Format](https://www.roc.noaa.gov/wsr88d/BuildInfo/Files.aspx)
- [Weather Radar Technology](https://www.weather.gov/jetstream/radar)

## 🤝 Contributing

### **Development Setup**
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Make changes and test functionality
5. Submit pull request with detailed description

### **Code Standards**
- **ES6+**: Use modern JavaScript features
- **Error Handling**: Comprehensive error handling
- **Documentation**: Inline code documentation
- **Testing**: Unit tests for critical functions

---

**StormTracker Pro** - Professional-grade weather radar visualization with raw NEXRAD Level III data display capabilities.