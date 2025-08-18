# NEXRAD Level III Parsing Research

## Overview
NEXRAD (Next Generation Weather Radar) Level III data represents processed, derived products that combine Level II raw radar data to provide additional meteorological information. This document provides comprehensive information about parsing NEXRAD Level III data based on research from authoritative sources and successful implementations.

## Data Format Structure

### File Naming Convention
NEXRAD Level III files follow the format: `SSS_PPP_YYYY_MM_DD_HH_MM_SS`
- **SSS**: Radar site ICAO code without leading 'K' (e.g., MOB for Mobile, AL)
- **PPP**: Product code (e.g., N0B for Base Reflectivity)
- **YYYY_MM_DD**: Date in UTC
- **HH_MM_SS**: Time in UTC (24-hour format)

### Example
`MOB_N0B_2025_08_18_00_00_31` represents:
- **Station**: Mobile, AL (MOB)
- **Product**: Base Reflectivity (N0B)
- **Date**: August 18, 2025
- **Time**: 00:00:31 UTC

## File Structure

### 1. Text Header (30 bytes)
The first 30 bytes contain human-readable text information:

```
Offset | Size | Field | Description
-------|------|-------|-------------
0-5    | 6    | File Type | Always "SDUS" for NEXRAD
6      | 1    | Space | Single space character
7-10   | 4    | Station ID | 4-letter ICAO code
11     | 1    | Space | Single space character
12-17  | 6    | Timestamp | DDHHMM format
18-20  | 3    | Line breaks | CR/LF characters
21-23  | 3    | Product Type | 3-letter product code
24-26  | 3    | Site ID | 3-letter site identifier
27-29  | 3    | Line breaks | CR/LF characters
```

### 2. Message Header (16 bytes)
Contains metadata about the message:

```
Offset | Size | Field | Description
-------|------|-------|-------------
30-31  | 2    | Product Code | Numeric product identifier
32-33  | 2    | Julian Date | Modified Julian date
34-37  | 4    | Seconds | Seconds since midnight UTC
38-41  | 4    | Message Length | Total message size in bytes
42-43  | 2    | Source | Message source identifier
44-45  | 2    | Destination | Message destination identifier
```

### 3. Product Description (60 bytes)
Contains detailed product information:

```
Offset | Size | Field | Description
-------|------|-------|-------------
46-47  | 2    | Divider | Always -1 (0xFFFF)
48-49  | 2    | Product Code | Product identifier
50-53  | 4    | Latitude | Station latitude (degrees * 1000)
54-57  | 4    | Longitude | Station longitude (degrees * 1000)
58-59  | 2    | Height | Station height above sea level (m)
60-61  | 2    | Product Code | Duplicate of offset 48-49
62-63  | 2    | Mode | Operational mode (0=Maintenance, 1=Clean Air, 2=Precipitation)
64-65  | 2    | VCP | Volume Coverage Pattern
66-67  | 2    | Sequence Number | Scan sequence number
68-69  | 2    | Volume Scan Number | Volume scan identifier
70-71  | 2    | Volume Scan Date | Julian date of volume scan
72-75  | 4    | Volume Scan Time | UTC time of volume scan (ms)
76-77  | 2    | Product Date | Julian date of product generation
78-81  | 4    | Product Time | UTC time of product generation (ms)
82-85  | 4    | Product Dependent | Product-specific data (halfwords 27-28)
86-133 | 48   | Product Dependent | Product-specific data (halfwords 30-53)
134     | 1    | Version | Product version number
135     | 1    | Spot Blank | Spot blanking flag
136-139 | 4    | Symbology Offset | Offset to symbology data (halfwords)
140-143 | 4    | Graphic Offset | Offset to graphic data (halfwords)
144-147 | 4    | Tabular Offset | Offset to tabular data (halfwords)
148-149 | 2    | Compression Method | Data compression method (0=none, 1=bzip2)
150-153 | 4    | Uncompressed Size | Size of uncompressed data
```

## Product Types

### Base Products
| Code | Description | Use Case |
|------|-------------|----------|
| N0B  | Base Reflectivity | Precipitation intensity |
| N0G  | Base Reflectivity Legacy | Legacy reflectivity data |
| N0Q  | Base Reflectivity HR | High-resolution reflectivity |
| N0U  | Base Velocity | Wind velocity data |
| N0S  | Storm Relative Velocity | Storm motion analysis |
| N0H  | Hydrometeor Classification | Precipitation type identification |

### Precipitation Products
| Code | Description | Use Case |
|------|-------------|----------|
| N1P  | One Hour Precipitation | Short-term rainfall totals |
| N3P  | Three Hour Precipitation | Medium-term rainfall totals |
| NTP  | Storm Total Precipitation | Storm duration rainfall |
| DAA  | Digital One Hour Accumulation | Digital precipitation data |
| DTA  | Digital Storm Total | Digital storm totals |

### Specialized Products
| Code | Description | Use Case |
|------|-------------|----------|
| N0K  | Specific Differential Phase | Dual-polarization data |
| N0Z  | Differential Reflectivity | Dual-polarization analysis |
| N0C  | Correlation Coefficient | Data quality assessment |
| NTV  | Tornadic Vortex Signature | Severe weather detection |
| NMD  | Mesocyclone Detection | Severe storm identification |

## Data Compression

### Compression Methods
- **0**: No compression (raw data)
- **1**: Bzip2 compression (most common)
- **2**: Gzip compression (rare)

### Decompression Process
1. Read compression method from product description
2. Extract compressed data from file
3. Apply appropriate decompression algorithm
4. Reconstruct full data structure

## Symbology Data

### Structure
Symbology data contains vector and text information:
- **Text Packets**: Weather warnings, station information
- **Vector Packets**: Wind barbs, storm tracks
- **Special Symbols**: Severe weather indicators

### Parsing Approach
1. Read symbology header (number of layers)
2. Parse individual layer data
3. Extract vector and text information
4. Convert to displayable format

## Graphic Data

### Structure
Graphic data contains raster information:
- **Radial Data**: Reflectivity, velocity values
- **Color Mapping**: Product-specific color scales
- **Resolution**: Typically 0.25-1.0 km bins

### Parsing Approach
1. Read graphic header (number of blocks)
2. Parse radial data packets
3. Apply color mapping
4. Convert to raster image

## Parsing Challenges

### 1. Byte Order
- **Big-Endian**: NEXRAD uses network byte order
- **DataView.getUint16/32**: Use `false` parameter for big-endian

### 2. Data Validation
- **Divider Values**: Check for expected constants (-1, etc.)
- **Offset Validation**: Ensure offsets are within file bounds
- **Product Codes**: Validate against known product types

### 3. Error Handling
- **Truncated Files**: Handle incomplete data gracefully
- **Corrupt Headers**: Skip invalid sections
- **Unknown Products**: Log unsupported product types

## Best Practices

### 1. Robust Parsing
```javascript
// Always validate data before parsing
if (dataView.byteLength < minimumSize) {
    throw new Error('File too small for NEXRAD Level III');
}

// Check divider values
const divider = dataView.getInt16(offset, false);
if (divider !== -1) {
    throw new Error(`Invalid divider: ${divider}`);
}
```

### 2. Error Recovery
```javascript
try {
    const data = parseNEXRADData(buffer);
    return data;
} catch (error) {
    console.warn('Parsing failed, attempting partial recovery:', error);
    return parsePartialData(buffer);
}
```

### 3. Memory Management
```javascript
// Use DataView for efficient parsing
const dataView = new DataView(arrayBuffer);

// Avoid creating unnecessary objects
const header = {
    code: dataView.getUint16(offset, false),
    length: dataView.getUint32(offset + 4, false)
};
```

## Data Sources

### Real-Time Data
- **AWS S3**: `s3://unidata-nexrad-level3/`
- **NOAA FTP**: `tgftp.nws.noaa.gov`
- **Direct URLs**: Individual file access

### Historical Data
- **NCDC Archive**: National Centers for Environmental Information
- **NOAA Climate Data**: Long-term radar records
- **University Archives**: Academic research collections

## Visualization Techniques

### 1. Raster Rendering
- **Canvas API**: HTML5 canvas for web display
- **Color Mapping**: Product-specific color scales
- **Resolution Handling**: Proper scaling for different zoom levels

### 2. Vector Overlays
- **SVG**: Scalable vector graphics for symbols
- **Text Rendering**: Weather warnings and information
- **Interactive Elements**: Clickable storm tracks

### 3. Performance Optimization
- **WebGL**: Hardware-accelerated rendering
- **Data Caching**: Store parsed data for reuse
- **Lazy Loading**: Load data on demand

## Implementation Examples

### Basic Parser Structure
```javascript
class NEXRADLevel3Parser {
    constructor(buffer) {
        this.dataView = new DataView(buffer);
        this.offset = 0;
    }
    
    parse() {
        const textHeader = this.parseTextHeader();
        const messageHeader = this.parseMessageHeader();
        const productDescription = this.parseProductDescription();
        
        return {
            textHeader,
            messageHeader,
            productDescription,
            // Additional parsed data...
        };
    }
    
    parseTextHeader() {
        // Implementation for 30-byte text header
    }
    
    parseMessageHeader() {
        // Implementation for 16-byte message header
    }
    
    parseProductDescription() {
        // Implementation for 60-byte product description
    }
}
```

### Data Validation
```javascript
validateFile(buffer) {
    const dataView = new DataView(buffer);
    
    // Check minimum file size
    if (buffer.byteLength < 106) { // 30 + 16 + 60 bytes
        throw new Error('File too small for NEXRAD Level III');
    }
    
    // Validate text header
    const fileType = new TextDecoder().decode(buffer.slice(0, 4));
    if (fileType !== 'SDUS') {
        throw new Error(`Invalid file type: ${fileType}`);
    }
    
    // Validate product description divider
    const divider = dataView.getInt16(46, false);
    if (divider !== -1) {
        throw new Error(`Invalid divider: ${divider}`);
    }
    
    return true;
}
```

## Future Developments

### 1. Enhanced Products
- **Dual-Polarization**: Improved precipitation classification
- **High-Resolution**: Sub-kilometer resolution data
- **Rapid Scan**: Faster update rates

### 2. Advanced Parsing
- **Machine Learning**: Automated data quality assessment
- **Real-Time Processing**: Streaming data parsing
- **Cloud Integration**: Distributed parsing systems

### 3. Visualization Improvements
- **3D Rendering**: Volumetric data display
- **Interactive Analysis**: User-driven data exploration
- **Mobile Optimization**: Responsive design for mobile devices

## Conclusion

NEXRAD Level III parsing requires understanding of:
- **File Structure**: Text, message, and product headers
- **Data Formats**: Compression, symbology, and graphic data
- **Product Types**: Various meteorological products available
- **Error Handling**: Robust parsing with graceful degradation
- **Performance**: Efficient memory usage and rendering

Successful implementations like AtticRadar demonstrate that with proper understanding of the data format and careful implementation, NEXRAD Level III data can be reliably parsed and visualized for weather applications.

## References

1. **NOAA ICD Documentation**: [2620001 ICD FOR THE RPG TO CLASS 1 USER](https://www.roc.noaa.gov/wsr88d/PublicDocs/ICDs/2620001Y.pdf)
2. **AtticRadar Implementation**: [nexrad-level-3-data](https://github.com/SteepAtticStairs/AtticRadar/tree/main/lib/nexrad-level-3-data)
3. **NEXRAD Products**: [NOAA NEXRAD Product List](https://www.ncdc.noaa.gov/data-access/radar-data/nexrad-products)
4. **AWS S3 Data**: [NOAA NEXRAD Level III on AWS](https://registry.opendata.aws/noaa-nexrad/)
5. **Technical Specifications**: [WSR-88D Build Information](https://www.roc.noaa.gov/WSR88D/BuildInfo/Files.aspx)