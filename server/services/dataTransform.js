import { getAllCountries } from './geoData.js';

/**
 * Ensure a value is a string (handle arrays, nested arrays, etc.)
 */
function ensureString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    // If it's an array, join with commas or take first element
    return value.map(v => ensureString(v)).filter(Boolean).join(', ');
  }
  return String(value);
}

/**
 * Transform Perplexity results to Tableau-friendly format
 * Now includes all 3 stance percentages (Agree, Mixed, Disagree)
 */
export function transformToTableauFormat(analysisId, question, perplexityResult) {
  // Format timestamp as "YYYY-MM-DD HH:MM:SS" to match Tableau CSV format
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');
  
  // Format 1: Country-level data (for map and cards)
  const countryData = perplexityResult.countries.map((country, index) => {
    const geoData = getAllCountries().find(c => 
      c.name === country.country || c.code === country.countryCode
    );

    // Warn if geo data not found
    if (!geoData) {
      console.warn(`⚠️  Country "${country.country}" (${country.countryCode}) not found in geo database`);
    }

    // Ensure all required fields are present and valid
    const row = {
      AnalysisID: analysisId,
      Timestamp: timestamp,
      Question: question,
      Country: country.country,
      CountryCode: country.countryCode || geoData?.code || 'XX',
      Stance: country.stance, // Must be: Agree, Mixed, or Disagree
      StanceScore: Math.round(country.stanceScore), // Integer 0-100
      StanceNumeric: getStanceNumeric(country.stance),
      // NEW: All 3 stance percentages
      AgreePercent: country.agreePercent || 0,
      MixedPercent: country.mixedPercent || 0,
      DisagreePercent: country.disagreePercent || 0,
      Explanation: country.explanation || '',
      CulturalFactor1: ensureString(country.culturalFactors[0]),
      CulturalFactor2: ensureString(country.culturalFactors[1]),
      CulturalFactor3: ensureString(country.culturalFactors[2]),
      Latitude: geoData?.lat || 0,
      Longitude: geoData?.lon || 0,
      Region: geoData?.region || 'Unknown'
    };
    
    // Validate row data
    validateCountryRow(row, index);
    
    return row;
  });

  // Format 2: Summary/aggregate data
  const aggregates = calculateAggregates(perplexityResult.countries);
  
  const summaryData = {
    AnalysisID: analysisId,
    Timestamp: timestamp,
    Question: question,
    GlobalTruthIndex: perplexityResult.globalTruthIndex,
    Classification: getClassification(perplexityResult.globalTruthIndex),
    Summary: perplexityResult.summary,
    TotalCountries: aggregates.totalCountries,
    CountriesAgree: aggregates.countriesAgree,
    CountriesMixed: aggregates.countriesMixed,
    CountriesDisagree: aggregates.countriesDisagree,
    PercentAgree: aggregates.percentAgree,
    PercentMixed: aggregates.percentMixed,
    PercentDisagree: aggregates.percentDisagree
  };

  console.log(`✅ Transformed ${countryData.length} countries to Tableau format`);
  console.log(`   Timestamp format: ${timestamp}`);
  console.log(`   Sample row:`, countryData[0]);

  return {
    countryData,
    summaryData,
    // Combined format for single data source if needed
    combined: {
      summary: summaryData,
      countries: countryData
    }
  };
}

/**
 * Validate country row data for Tableau compatibility
 */
function validateCountryRow(row, index) {
  // Check all required fields are present
  const requiredFields = [
    'AnalysisID', 'Timestamp', 'Question', 'Country', 'CountryCode',
    'Stance', 'StanceScore', 'Explanation', 'Latitude', 'Longitude', 'Region'
  ];
  
  for (const field of requiredFields) {
    if (row[field] === undefined || row[field] === null) {
      throw new Error(`Row ${index}: Missing required field '${field}'`);
    }
  }
  
  // Validate specific field types and values
  if (!['Agree', 'Mixed', 'Disagree'].includes(row.Stance)) {
    throw new Error(`Row ${index} (${row.Country}): Invalid Stance '${row.Stance}'. Must be Agree, Mixed, or Disagree`);
  }
  
  if (typeof row.StanceScore !== 'number' || row.StanceScore < 0 || row.StanceScore > 100) {
    throw new Error(`Row ${index} (${row.Country}): Invalid StanceScore '${row.StanceScore}'. Must be 0-100`);
  }
  
  // Validate percentages sum to approximately 100
  const percentSum = row.AgreePercent + row.MixedPercent + row.DisagreePercent;
  if (Math.abs(percentSum - 100) > 2) {
    console.warn(`⚠️  Row ${index} (${row.Country}): Percentages sum to ${percentSum}, expected 100`);
  }
  
  // Timestamp format validation (YYYY-MM-DD HH:MM:SS)
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(row.Timestamp)) {
    throw new Error(`Row ${index}: Invalid Timestamp format '${row.Timestamp}'. Expected YYYY-MM-DD HH:MM:SS`);
  }
}

/**
 * Convert stance to numeric value for calculations
 */
function getStanceNumeric(stance) {
  switch (stance) {
    case 'Agree': return 1;
    case 'Mixed': return 0;
    case 'Disagree': return -1;
    default: return 0;
  }
}

/**
 * Calculate aggregate statistics
 */
function calculateAggregates(countries) {
  const total = countries.length;
  const agree = countries.filter(c => c.stance === 'Agree').length;
  const mixed = countries.filter(c => c.stance === 'Mixed').length;
  const disagree = countries.filter(c => c.stance === 'Disagree').length;

  return {
    totalCountries: total,
    countriesAgree: agree,
    countriesMixed: mixed,
    countriesDisagree: disagree,
    percentAgree: Math.round((agree / total) * 100),
    percentMixed: Math.round((mixed / total) * 100),
    percentDisagree: Math.round((disagree / total) * 100)
  };
}

/**
 * Get classification based on global truth index
 */
function getClassification(globalTruthIndex) {
  if (globalTruthIndex >= 80) return 'Widely Accepted';
  if (globalTruthIndex >= 60) return 'Generally Agreed';
  if (globalTruthIndex >= 40) return 'Moderately Contested';
  if (globalTruthIndex >= 20) return 'Mostly Contested';
  return 'Widely Disputed';
}

/**
 * Export data as CSV (for download feature)
 */
export function exportAsCSV(tableauData) {
  const headers = Object.keys(tableauData.countryData[0]);
  const rows = tableauData.countryData.map(row => 
    headers.map(header => {
      const value = row[header];
      // Escape values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Format for Tableau Web Data Connector
 */
export function formatForWDC(tableauData) {
  return {
    schema: {
      id: "askTheWorldData",
      alias: "What the World Really Thinks - Analysis Data",
      columns: [
        { id: "AnalysisID", dataType: "string" },
        { id: "Timestamp", dataType: "datetime" },
        { id: "Question", dataType: "string" },
        { id: "Country", dataType: "string" },
        { id: "CountryCode", dataType: "string" },
        { id: "Stance", dataType: "string" },
        { id: "StanceScore", dataType: "int" },
        { id: "StanceNumeric", dataType: "int" },
        { id: "AgreePercent", dataType: "int" },
        { id: "MixedPercent", dataType: "int" },
        { id: "DisagreePercent", dataType: "int" },
        { id: "Explanation", dataType: "string" },
        { id: "CulturalFactor1", dataType: "string" },
        { id: "CulturalFactor2", dataType: "string" },
        { id: "CulturalFactor3", dataType: "string" },
        { id: "Latitude", dataType: "float" },
        { id: "Longitude", dataType: "float" },
        { id: "Region", dataType: "string" }
      ]
    },
    data: tableauData.countryData
  };
}