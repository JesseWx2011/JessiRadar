// Test script to verify weather.gov API and show station data structure
async function testWeatherAPI() {
    try {
        console.log('Testing weather.gov radar stations API...');
        
        const response = await fetch('https://api.weather.gov/radar/stations');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Total stations: ${data.features.length}`);
        
        // Show first few stations
        console.log('\nFirst 3 stations:');
        data.features.slice(0, 3).forEach((station, index) => {
            console.log(`\nStation ${index + 1}:`);
            console.log('  Properties:', station.properties);
            console.log('  Geometry:', station.geometry);
        });
        
        // Check for different identifier properties
        const firstStation = data.features[0];
        const properties = firstStation.properties;
        
        console.log('\nChecking identifier properties:');
        console.log('  identifier:', properties.identifier);
        console.log('  id:', properties.id);
        console.log('  station_id:', properties.station_id);
        console.log('  code:', properties.code);
        console.log('  name:', properties.name);
        console.log('  station_name:', properties.station_name);
        
        // Show all property keys
        console.log('\nAll property keys:', Object.keys(properties));
        
    } catch (error) {
        console.error('API test failed:', error);
    }
}

// Run the test
testWeatherAPI();