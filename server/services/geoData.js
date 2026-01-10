/**
 * Country database with coordinates and metadata
 */
const COUNTRIES = [
  // North America
  { code: 'US', name: 'United States', lat: 37.0902, lon: -95.7129, region: 'North America' },
  { code: 'CA', name: 'Canada', lat: 56.1304, lon: -106.3468, region: 'North America' },
  { code: 'MX', name: 'Mexico', lat: 23.6345, lon: -102.5528, region: 'North America' },
  
  // South America
  { code: 'BR', name: 'Brazil', lat: -14.2350, lon: -51.9253, region: 'South America' },
  { code: 'AR', name: 'Argentina', lat: -38.4161, lon: -63.6167, region: 'South America' },
  { code: 'CO', name: 'Colombia', lat: 4.5709, lon: -74.2973, region: 'South America' },
  { code: 'CL', name: 'Chile', lat: -35.6751, lon: -71.5430, region: 'South America' },
  { code: 'PE', name: 'Peru', lat: -9.1900, lon: -75.0152, region: 'South America' },
  { code: 'VE', name: 'Venezuela', lat: 6.4238, lon: -66.5897, region: 'South America' },
  
  // Europe
  { code: 'GB', name: 'United Kingdom', lat: 55.3781, lon: -3.4360, region: 'Europe' },
  { code: 'DE', name: 'Germany', lat: 51.1657, lon: 10.4515, region: 'Europe' },
  { code: 'FR', name: 'France', lat: 46.2276, lon: 2.2137, region: 'Europe' },
  { code: 'IT', name: 'Italy', lat: 41.8719, lon: 12.5674, region: 'Europe' },
  { code: 'ES', name: 'Spain', lat: 40.4637, lon: -3.7492, region: 'Europe' },
  { code: 'PL', name: 'Poland', lat: 51.9194, lon: 19.1451, region: 'Europe' },
  { code: 'NL', name: 'Netherlands', lat: 52.1326, lon: 5.2913, region: 'Europe' },
  { code: 'BE', name: 'Belgium', lat: 50.5039, lon: 4.4699, region: 'Europe' },
  { code: 'SE', name: 'Sweden', lat: 60.1282, lon: 18.6435, region: 'Europe' },
  { code: 'NO', name: 'Norway', lat: 60.4720, lon: 8.4689, region: 'Europe' },
  { code: 'DK', name: 'Denmark', lat: 56.2639, lon: 9.5018, region: 'Europe' },
  { code: 'FI', name: 'Finland', lat: 61.9241, lon: 25.7482, region: 'Europe' },
  { code: 'PT', name: 'Portugal', lat: 39.3999, lon: -8.2245, region: 'Europe' },
  { code: 'GR', name: 'Greece', lat: 39.0742, lon: 21.8243, region: 'Europe' },
  { code: 'CH', name: 'Switzerland', lat: 46.8182, lon: 8.2275, region: 'Europe' },
  { code: 'AT', name: 'Austria', lat: 47.5162, lon: 14.5501, region: 'Europe' },
  { code: 'RU', name: 'Russia', lat: 61.5240, lon: 105.3188, region: 'Europe' },
  
  // Asia
  { code: 'CN', name: 'China', lat: 35.8617, lon: 104.1954, region: 'Asia' },
  { code: 'IN', name: 'India', lat: 20.5937, lon: 78.9629, region: 'Asia' },
  { code: 'JP', name: 'Japan', lat: 36.2048, lon: 138.2529, region: 'Asia' },
  { code: 'KR', name: 'South Korea', lat: 35.9078, lon: 127.7669, region: 'Asia' },
  { code: 'ID', name: 'Indonesia', lat: -0.7893, lon: 113.9213, region: 'Asia' },
  { code: 'TH', name: 'Thailand', lat: 15.8700, lon: 100.9925, region: 'Asia' },
  { code: 'VN', name: 'Vietnam', lat: 14.0583, lon: 108.2772, region: 'Asia' },
  { code: 'PH', name: 'Philippines', lat: 12.8797, lon: 121.7740, region: 'Asia' },
  { code: 'MY', name: 'Malaysia', lat: 4.2105, lon: 101.9758, region: 'Asia' },
  { code: 'SG', name: 'Singapore', lat: 1.3521, lon: 103.8198, region: 'Asia' },
  { code: 'PK', name: 'Pakistan', lat: 30.3753, lon: 69.3451, region: 'Asia' },
  { code: 'BD', name: 'Bangladesh', lat: 23.6850, lon: 90.3563, region: 'Asia' },
  
  // Middle East
  { code: 'SA', name: 'Saudi Arabia', lat: 23.8859, lon: 45.0792, region: 'Middle East' },
  { code: 'AE', name: 'United Arab Emirates', lat: 23.4241, lon: 53.8478, region: 'Middle East' },
  { code: 'TR', name: 'Turkey', lat: 38.9637, lon: 35.2433, region: 'Middle East' },
  { code: 'IL', name: 'Israel', lat: 31.0461, lon: 34.8516, region: 'Middle East' },
  { code: 'IR', name: 'Iran', lat: 32.4279, lon: 53.6880, region: 'Middle East' },
  { code: 'EG', name: 'Egypt', lat: 26.8206, lon: 30.8025, region: 'Middle East' },
  
  // Africa
  { code: 'ZA', name: 'South Africa', lat: -30.5595, lon: 22.9375, region: 'Africa' },
  { code: 'NG', name: 'Nigeria', lat: 9.0820, lon: 8.6753, region: 'Africa' },
  { code: 'KE', name: 'Kenya', lat: -0.0236, lon: 37.9062, region: 'Africa' },
  { code: 'ET', name: 'Ethiopia', lat: 9.1450, lon: 40.4897, region: 'Africa' },
  { code: 'GH', name: 'Ghana', lat: 7.9465, lon: -1.0232, region: 'Africa' },
  { code: 'MA', name: 'Morocco', lat: 31.7917, lon: -7.0926, region: 'Africa' },
  
  // Oceania
  { code: 'AU', name: 'Australia', lat: -25.2744, lon: 133.7751, region: 'Oceania' },
  { code: 'NZ', name: 'New Zealand', lat: -40.9006, lon: 174.8860, region: 'Oceania' }
];

/**
 * Get all countries
 */
export function getAllCountries() {
  return COUNTRIES;
}

/**
 * Get countries by region
 */
export function getCountriesByRegion(region) {
  return COUNTRIES.filter(c => c.region === region);
}

/**
 * Get country by code
 */
export function getCountryByCode(code) {
  return COUNTRIES.find(c => c.code === code);
}

/**
 * Get country by name
 */
export function getCountryByName(name) {
  return COUNTRIES.find(c => c.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get all regions
 */
export function getAllRegions() {
  return [...new Set(COUNTRIES.map(c => c.region))];
}

/**
 * Search countries by name (fuzzy search)
 */
export function searchCountries(query) {
  const lowerQuery = query.toLowerCase();
  return COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(lowerQuery) ||
    c.code.toLowerCase().includes(lowerQuery)
  );
}
