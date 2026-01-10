import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import analyzeRouter from './routes/analyze.js';
import countriesRouter from './routes/countries.js';
import { testConnection, writeToMySQL } from './utils/mysqlWriter.js';
import { analyzeQuestion } from './services/perplexity.js';
import { getAllCountries } from './services/geoData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = !!process.env.VERCEL;

// Global validation state
let validation = { allValid: false, mysqlConfigured: false };

// Track last analysis for voice agent polling
let lastAnalysis = {
  timestamp: null,
  countryCount: 0,
  question: null,
  status: 'idle'  // 'idle', 'analyzing', 'complete'
};

// Helper function to map country names to codes
function mapCountryNamesToCodes(countryNames) {
  const allCountries = getAllCountries();
  const namesToCodes = {};

  // Create mapping: normalize name -> code
  allCountries.forEach(country => {
    const normalizedName = country.name.toLowerCase().trim();
    namesToCodes[normalizedName] = country.code;
  });

  // Map input names to codes
  const codes = [];
  const namesArray = Array.isArray(countryNames)
    ? countryNames
    : countryNames.split(',').map(n => n.trim());

  for (const name of namesArray) {
    const normalizedInput = name.toLowerCase().trim();
    const code = namesToCodes[normalizedInput];

    if (code) {
      codes.push(code);
    } else {
      console.warn(`⚠️  Country name not found: "${name}"`);
    }
  }

  return codes;
}

// ===================================
// ENVIRONMENT VARIABLE VALIDATION
// ===================================

async function validateEnvironment() {
  console.log('\n========================================');
  console.log('🔍 ENVIRONMENT VALIDATION');
  console.log('========================================\n');

  const requiredVars = {
    'Perplexity API': {
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY
    },
    'MySQL Database': {
      MYSQL_HOST: process.env.MYSQL_HOST,
      MYSQL_PORT: process.env.MYSQL_PORT,
      MYSQL_USER: process.env.MYSQL_USER,
      MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
      MYSQL_DATABASE: process.env.MYSQL_DATABASE
    }
  };

  let allValid = true;
  let mysqlConfigured = true;

  for (const [category, vars] of Object.entries(requiredVars)) {
    console.log(`📦 ${category}:`);
    
    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined || value === null || value === '') {
        console.log(`   ❌ ${key}: MISSING`);
        allValid = false;
        if (category === 'MySQL Database') {
          mysqlConfigured = false;
        }
      } else {
        // Show redacted value for security
        let displayValue = value;
        
        // Redact sensitive values
        if (key === 'MYSQL_PASSWORD') {
          if (value.length > 8) {
            displayValue = value.substring(0, 3) + '***' + value.substring(value.length - 2);
          } else {
            displayValue = '***';
          }
        } else if (key === 'PERPLEXITY_API_KEY') {
          if (value.length > 20) {
            displayValue = value.substring(0, 10) + '...' + value.substring(value.length - 6);
          } else {
            displayValue = '***' + value.substring(value.length - 4);
          }
        }
        
        console.log(`   ✅ ${key}: ${displayValue}`);
      }
    }
    console.log('');
  }

  // MySQL connection test
  console.log('========================================');
  console.log('🗄️  MYSQL CONNECTION TEST');
  console.log('========================================\n');

  if (mysqlConfigured) {
    try {
      await testConnection();
      console.log('✅ MySQL is READY');
      console.log('   Tableau can connect with Live mode for instant refresh!');
      console.log('');
      console.log(`   Host: ${process.env.MYSQL_HOST}`);
      console.log(`   Database: ${process.env.MYSQL_DATABASE}`);
      console.log(`   User: ${process.env.MYSQL_USER}`);
    } catch (error) {
      console.log('❌ MySQL connection FAILED');
      console.log(`   Error: ${error.message}`);
      console.log('');
      console.log('   Please check:');
      console.log('   1. Database credentials in .env');
      console.log('   2. Network connectivity');
      console.log('   3. Database server is running');
      mysqlConfigured = false;
    }
  } else {
    console.log('❌ MySQL is NOT CONFIGURED');
    console.log('   Missing required environment variables');
    console.log('');
    console.log('   Required variables:');
    console.log('   - MYSQL_HOST:', process.env.MYSQL_HOST ? '✅ SET' : '❌ MISSING');
    console.log('   - MYSQL_PORT:', process.env.MYSQL_PORT ? '✅ SET' : '❌ MISSING');
    console.log('   - MYSQL_USER:', process.env.MYSQL_USER ? '✅ SET' : '❌ MISSING');
    console.log('   - MYSQL_PASSWORD:', process.env.MYSQL_PASSWORD ? '✅ SET' : '❌ MISSING');
    console.log('   - MYSQL_DATABASE:', process.env.MYSQL_DATABASE ? '✅ SET' : '❌ MISSING');
  }

  console.log('\n========================================\n');

  return { allValid, mysqlConfigured };
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from extension directory
app.use(express.static(path.join(__dirname, '../extension')));

// Add Permissions-Policy headers
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'microphone=(self), screen-wake-lock=(self)');
  res.setHeader('Feature-Policy', "microphone 'self'; screen-wake-lock 'self'");
  next();
});

// API Routes
app.use('/api/analyze', analyzeRouter);
app.use('/api/countries', countriesRouter);

// ========================================
// NEW: VOICE INTEGRATION ENDPOINT
// ========================================

/**
 * Voice Analysis Endpoint
 * Receives voice commands from ElevenLabs and triggers analysis
 * Calls the same analysis logic as the analyze button
 */
app.post('/api/voice-analyze', async (req, res) => {
  console.log('\n========================================');
  console.log('🎤 VOICE AGENT ENDPOINT CALLED');
  console.log('========================================');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Full Request Body:', JSON.stringify(req.body, null, 2));
  console.log('Query Parameters:', req.query);

  try {
    let question;

    // Handle ElevenLabs format: {command_type: "analyze", command_value: "question text"}
    if (req.body.command_type && req.body.command_value) {
      question = req.body.command_value;
      console.log('✅ Format: ElevenLabs (command_type + command_value)');
    }
    // Handle direct format: {question: "..."}
    else if (req.body.question) {
      question = req.body.question;
      console.log('✅ Format: Direct (question field)');
    }
    // Handle nested parameters
    else if (req.body.parameters && req.body.parameters.question) {
      question = req.body.parameters.question;
      console.log('✅ Format: Nested (parameters.question)');
    }
    else {
      console.error('❌ ERROR: No question found in request body');
      console.error('   Available fields:', Object.keys(req.body));
      console.log('========================================\n');
      return res.status(400).json({
        ok: false,
        error: 'No question provided'
      });
    }

    console.log('📝 Extracted Question:', question);

    // Mark analysis as in progress
    lastAnalysis = {
      timestamp: new Date().toISOString(),
      countryCount: 0,
      question: question,
      status: 'analyzing'
    };
    console.log('📊 Status: ANALYZING (voice agent will show this)');

    // Parse countries parameter
    const analysisId = 'current';
    let countries = req.query.countries || req.body.countries || 'ALL';

    console.log('\n🌍 COUNTRIES PARAMETER:');
    console.log('   Raw input:', countries);

    // Handle country names from voice agent (map names to codes)
    if (countries && countries !== 'ALL' && typeof countries === 'string') {
      // Check if it looks like country names (contains spaces or multiple words)
      // Country codes are typically 2 letters, so if we see longer strings, assume names
      const items = countries.split(',').map(c => c.trim());
      const hasNames = items.some(item => item.length > 3 || item.includes(' '));

      if (hasNames) {
        console.log('   Format: COUNTRY NAMES (from voice agent)');
        console.log('   Names:', items.join(', '));
        console.log('   Mapping names to codes...');

        const codes = mapCountryNamesToCodes(countries);

        if (codes.length === 0) {
          console.error('   ❌ No valid countries found! Using ALL instead.');
          countries = 'ALL';
        } else {
          console.log('   ✅ Mapped to codes:', codes.join(', '));
          countries = codes;
        }
      } else {
        console.log('   Format: COUNTRY CODES (direct)');
        countries = items;
      }
    }

    // Log final countries selection
    if (countries === 'ALL') {
      console.log('   Mode: ALL COUNTRIES');
      console.log('   Will analyze: All 52 countries in database');
    } else if (Array.isArray(countries)) {
      console.log('   Mode: SELECTED COUNTRIES');
      console.log('   Count:', countries.length);
      console.log('   Codes:', countries.join(', '));
    }

    console.log('\n🔄 CALLING analyzeQuestion() - SYNCHRONOUS (like analyze button)');
    console.log('   Function: analyzeQuestion(analysisId, question, countries)');
    console.log('   Parameters:');
    console.log('     - analysisId:', analysisId);
    console.log('     - question:', question);
    console.log('     - countries:', typeof countries === 'object' ? JSON.stringify(countries) : countries);
    console.log('   Timeout: 60 seconds (vercel.json maxDuration)');

    const startTime = Date.now();

    // SYNCHRONOUS: Wait for analysis to complete (exactly like analyze button)
    const result = await analyzeQuestion(analysisId, question, countries);

    const analysisTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ analyzeQuestion() COMPLETED');
    console.log('   Duration:', analysisTime, 'seconds');
    console.log('   Countries analyzed:', result.data.countries.length);
    console.log('   Global Truth Index:', result.data.globalTruthIndex);
    console.log('   Classification:', result.data.classification);

    // Update last analysis tracker for voice agent polling
    lastAnalysis = {
      timestamp: new Date().toISOString(),
      countryCount: result.data.countries.length,
      question: question,
      status: 'complete'
    };
    console.log('   Updated lastAnalysis timestamp:', lastAnalysis.timestamp);
    console.log('   Status: COMPLETE (voice agent will show success)');

    // Automatically write to MySQL database for Tableau
    console.log('\n💾 CALLING writeToMySQL()...');
    console.log('   Function: writeToMySQL(tableauData, summaryData)');
    console.log('   Tableau rows to write:', result.tableauData.countryData.length);

    try {
      await writeToMySQL(result.tableauData, result.data);
      console.log('✅ writeToMySQL() COMPLETED');
      console.log('   MySQL database updated successfully');
      console.log('   Tableau Live connection can now see new data!');
    } catch (mysqlError) {
      console.error('❌ writeToMySQL() FAILED');
      console.error('   Error:', mysqlError.message);
      console.error('   Stack:', mysqlError.stack);
    }

    console.log('\n📤 SENDING RESPONSE TO CLIENT');
    console.log('   Status: 200 OK');
    console.log('   Response size:', JSON.stringify(result).length, 'bytes');

    // Return complete result (exactly like analyze button)
    const response = {
      ok: true,
      analysisId: 'current',
      status: 'complete',
      data: result.data,
      tableauData: result.tableauData,
      message: `Analysis complete! ${result.data.countries.length} countries analyzed. Dashboard will auto-refresh.`,
      debug: {
        source: 'voice-agent',
        countriesMode: countries === 'ALL' ? 'all' : 'selected',
        countriesCount: result.data.countries.length,
        analysisTime: analysisTime + 's'
      }
    };

    console.log('========================================');
    console.log('✅ VOICE AGENT REQUEST COMPLETE');
    console.log('========================================\n');

    res.json(response);

  } catch (error) {
    console.error('\n========================================');
    console.error('❌ VOICE AGENT ERROR');
    console.error('========================================');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('========================================\n');

    res.status(500).json({
      ok: false,
      error: error.message || 'Failed to analyze question',
      debug: {
        source: 'voice-agent',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Voice System Health Check
 */
app.get('/api/voice-status', (req, res) => {
  res.json({
    ok: true,
    message: 'Voice analysis system online',
    timestamp: new Date().toISOString()
  });
});

/**
 * Last Analysis Endpoint - for voice agent polling
 * Returns timestamp and details of the most recent analysis
 */
app.get('/api/last-analysis', (req, res) => {
  res.json({
    ok: true,
    ...lastAnalysis  // Spread the fields directly into response
  });
});

// ========================================
// EXISTING ENDPOINTS (No changes)
// ========================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'Ask the World Anything API running',
    mysqlConfigured: validation.mysqlConfigured,
    environmentValid: validation.allValid
  });
});

// Environment status endpoint
app.get('/api/status', (req, res) => {
  const status = {
    server: 'running',
    database: validation.mysqlConfigured ? 'MySQL (Live)' : 'Not configured',
    perplexityApi: !!process.env.PERPLEXITY_API_KEY,
    config: {
      mysqlHost: process.env.MYSQL_HOST || 'NOT SET',
      mysqlDatabase: process.env.MYSQL_DATABASE || 'NOT SET',
      mysqlUser: process.env.MYSQL_USER || 'NOT SET',
      mysqlPasswordPresent: !!process.env.MYSQL_PASSWORD
    }
  };
  
  res.json(status);
});

// Serve extension pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../extension/index.html'));
});

app.get('/voice', (req, res) => {
  res.sendFile(path.join(__dirname, '../extension/voice.html'));
});

// Initialize environment validation and optionally start the server
const ready = (async () => {
  validation = await validateEnvironment();
  
  if (!isVercel) {
    app.listen(PORT, () => {
      console.log('========================================');
      console.log('🌍 ASK THE WORLD ANYTHING - SERVER READY');
      console.log('========================================\n');
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Tableau Extension: http://localhost:${PORT}/`);
      console.log(`🎤 Voice Agent: http://localhost:${PORT}/voice`);
      console.log(`🔍 Status Check: http://localhost:${PORT}/api/status`);
      console.log(`🗣️  Voice API: http://localhost:${PORT}/api/voice-analyze`);
      console.log('\n========================================\n');
      
      if (!validation.mysqlConfigured) {
        console.log('⚠️  WARNING: MySQL not configured');
        console.log('   Dashboard will NOT update!');
        console.log('   Check your .env file and restart the server.\n');
      } else {
        console.log('✅ All systems ready!');
        console.log('   MySQL: Connected');
        console.log('   Tableau: Use Live connection for instant refresh');
        console.log('   Voice: Ready for ElevenLabs integration\n');
      }
    });
  } else {
    console.log('Vercel deployment detected - running in serverless mode.');
  }

  return validation;
})();

export { ready };
export default app;
