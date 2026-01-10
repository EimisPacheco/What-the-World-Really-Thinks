import { getAllCountries } from './geoData.js';
import { transformToTableauFormat } from './dataTransform.js';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Validate API key on startup
if (!PERPLEXITY_API_KEY) {
  console.error('❌ CRITICAL: PERPLEXITY_API_KEY not found in environment variables!');
  console.error('   Please set PERPLEXITY_API_KEY in your .env file');
} else {
  console.log('✅ Perplexity API key found');
  console.log(`   Key format: ${PERPLEXITY_API_KEY.substring(0, 10)}...${PERPLEXITY_API_KEY.substring(PERPLEXITY_API_KEY.length - 4)}`);
  console.log(`   Key length: ${PERPLEXITY_API_KEY.length} characters`);
}

/**
 * Build prompt for Perplexity API - FORCES ALL 3 STANCES
 */
function buildPerplexityPrompt(question, countries) {
  // Different prompts for ALL vs specific countries
  if (countries === 'ALL') {
    // Global analysis - request as many countries as possible
    return `Analyze the following claim from a global perspective: "${question}"

Analyze how this claim is viewed around the world. Provide a COMPREHENSIVE GLOBAL analysis by including AS MANY COUNTRIES AS POSSIBLE from ALL regions:
- North America (USA, Canada, Mexico, etc.)
- South America (Brazil, Argentina, Chile, Colombia, Peru, Venezuela, etc.)
- Europe (UK, France, Germany, Italy, Spain, Russia, Poland, Netherlands, Sweden, etc.)
- Asia (China, India, Japan, South Korea, Indonesia, Thailand, Vietnam, Philippines, Pakistan, Bangladesh, etc.)
- Middle East (Saudi Arabia, UAE, Iran, Turkey, Israel, Egypt, etc.)
- Africa (Nigeria, South Africa, Kenya, Ethiopia, Egypt, Morocco, Ghana, etc.)
- Oceania (Australia, New Zealand, etc.)

IMPORTANT: Include as many diverse countries as you can from each region. Do NOT limit yourself - the more countries, the better the analysis.

IMPORTANT: Be truthful to facts and cultural realities. Do not force artificial disagreement where none exists.

For each country, provide:
1. The DOMINANT stance based on actual cultural context: "Agree", "Mixed", or "Disagree"
2. A stance score from 0-100 (0=strongly disagree, 50=mixed, 100=strongly agree)
3. THREE percentage breakdowns that MUST sum to 100 (even if some are 0%):
   - agreePercent: percentage of population/sentiment that agrees
   - mixedPercent: percentage with mixed or uncertain views
   - disagreePercent: percentage that disagrees
   - Every country must have non-zero values for at least 2 of the 3 percentages
4. A brief explanation specific to that country's culture (2 sentence)
5. 2-3 key cultural factors (short phrases)

Also provide:
- A global truth index (0-100) representing the average stance across all countries analyzed
- A brief overall summary (1-2 sentences)

Format your response as valid JSON only (no markdown, no code blocks):
{
  "globalTruthIndex": <0-100>,
  "summary": "<overall summary>",
  "countries": [
    {
      "country": "United States",
      "countryCode": "US",
      "stance": "Agree|Mixed|Disagree",
      "stanceScore": <0-100>,
      "agreePercent": <0-100>,
      "mixedPercent": <0-100>,
      "disagreePercent": <0-100>,
      "explanation": "...",
      "culturalFactors": ["factor1", "factor2", "factor3"]
    }
  ]
}

CRITICAL RULES - FAILURE TO FOLLOW WILL CAUSE SYSTEM ERROR:
- Include AS MANY COUNTRIES AS POSSIBLE (aim for 20-40+ countries from diverse regions)
- Your response MUST be ONLY the JSON object - NO other text
- NO conversational language like "I appreciate" or "I need to clarify"
- NO explanations, apologies, or preambles before or after the JSON
- Start your response IMMEDIATELY with { and end with }
- agreePercent + mixedPercent + disagreePercent MUST equal 100 for each country
- ALWAYS include all 3 percentages (agreePercent, mixedPercent, disagreePercent) even if some are 0%
- COMPLETE the entire JSON - do not truncate - include all countries you analyze`;
  } else {
    // Specific countries selected
    const countryList = countries.map(code => {
      const country = getAllCountries().find(c => c.code === code || c.name === code);
      return country ? country.name : code;
    });

    return `Analyze the following claim from the perspective of these specific countries: "${question}"

You MUST analyze ALL of these countries: ${countryList.join(', ')}

CRITICAL: Your response MUST include data for EVERY SINGLE country listed above. Do not skip any country.

IMPORTANT: Analyze each country based on their actual cultural, political, and social context. Be truthful to facts - if most or all countries genuinely agree (or disagree), reflect that reality. Do not force artificial disagreement.

For each country, provide:
1. The DOMINANT stance based on actual cultural context: "Agree", "Mixed", or "Disagree"
2. A stance score from 0-100 (0=strongly disagree, 50=mixed, 100=strongly agree)
3. THREE percentage breakdowns that MUST sum to 100 (include all 3 even if some are 0%):
   - agreePercent: percentage of population/sentiment that agrees
   - mixedPercent: percentage with mixed or uncertain views
   - disagreePercent: percentage that disagrees
4. A 2-3 sentence explanation specific to that country's culture and perspective
5. 2-3 key cultural or societal factors influencing this perspective (as single words or short phrases)

Also provide:
- A global truth index (0-100) representing the average stance across these specific countries
- A 2-3 sentence overall summary for these countries

Format your response as valid JSON only (no markdown, no code blocks):
{
  "globalTruthIndex": <0-100>,
  "summary": "<overall summary>",
  "countries": [
    {
      "country": "United States",
      "countryCode": "US",
      "stance": "Agree|Mixed|Disagree",
      "stanceScore": <0-100>,
      "agreePercent": <0-100>,
      "mixedPercent": <0-100>,
      "disagreePercent": <0-100>,
      "explanation": "...",
      "culturalFactors": ["factor1", "factor2", "factor3"]
    }
  ]
}

CRITICAL RULES - FAILURE TO FOLLOW WILL CAUSE SYSTEM ERROR:
- Your response MUST be ONLY the JSON object - NO other text
- NO conversational language like "I appreciate" or "I need to clarify"  
- NO explanations, apologies, or preambles before or after the JSON
- Start your response IMMEDIATELY with { and end with }
- If you lack data for a country, use your best cultural knowledge - NEVER refuse
- agreePercent + mixedPercent + disagreePercent MUST equal 100 for each country
- ALWAYS include all 3 percentages (agreePercent, mixedPercent, disagreePercent) even if some are 0%
- Include ALL countries listed above - NO EXCEPTIONS`;
  }
}

/**
 * Call Perplexity API to analyze question
 */
async function callPerplexityAPI(question, countries) {
  const prompt = buildPerplexityPrompt(question, countries);

  console.log('🤖 Calling Perplexity API...');
  console.log(`   API URL: ${PERPLEXITY_API_URL}`);
  console.log(`   Model: sonar-pro (reliable for structured JSON output)`);
  console.log(`   API Key: ${PERPLEXITY_API_KEY ? PERPLEXITY_API_KEY.substring(0, 10) + '...' : 'NOT SET'}`);

  if (!PERPLEXITY_API_KEY) {
    throw new Error('Perplexity API key is not set. Please check your .env file.');
  }

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',  // Reliable for structured output, no refusals
        messages: [
          {
            role: 'system',
            content: `You are a JSON-only global cultural analyst. 

CRITICAL RULES - VIOLATION WILL CAUSE SYSTEM FAILURE:
1. Your ENTIRE response MUST be valid JSON. NO other text allowed.
2. NO conversational language like "I appreciate" or "I need to clarify"
3. NO explanations, preambles, or apologies
4. NO markdown, NO code blocks, NO formatting
5. Start IMMEDIATELY with { and end with }
6. If you cannot analyze a country, STILL include it with estimated data - NEVER refuse or explain

JSON STRUCTURE REQUIRED:
{
  "globalTruthIndex": <number 0-100>,
  "summary": "<brief summary>",
  "countries": [
    {
      "country": "<name>",
      "countryCode": "<ISO code>",
      "stance": "Agree|Mixed|Disagree",
      "stanceScore": <0-100>,
      "agreePercent": <0-100>,
      "mixedPercent": <0-100>,
      "disagreePercent": <0-100>,
      "explanation": "<2-3 sentences>",
      "culturalFactors": ["<factor1>", "<factor2>", "<factor3>"]
    }
  ]
}

Your analysis MUST include countries from ALL THREE stance categories (Agree, Mixed, Disagree).

REMEMBER: Output ONLY the JSON object. Any other text will cause parsing failure.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 8000  // Allow for large responses with many countries
      })
    });

    console.log(`   Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 401) {
        console.error('❌ API KEY ERROR: 401 Unauthorized');
        console.error('   This usually means:');
        console.error('   1. API key is invalid or expired');
        console.error('   2. API key is not activated');
        console.error('   3. API key format is incorrect');
        console.error(`   Current key: ${PERPLEXITY_API_KEY.substring(0, 10)}...`);
        throw new Error(`Invalid Perplexity API key. Please verify your API key is correct and active.`);
      }
      
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Extract content from response
    let content = data.choices[0].message.content;
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // AGGRESSIVE: Extract JSON object if surrounded by other text
    // Find first { and last } - this handles any prefix/suffix text
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      content = content.substring(firstBrace, lastBrace + 1);
    }
    
    console.log('✅ Perplexity API response received');
    
    // Parse JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', content.substring(0, 200));
      throw new Error(`Invalid JSON response from Perplexity: ${parseError.message}`);
    }
    
    // Validate and fix response structure
    validateAndFixPerplexityResponse(parsedData);
    
    return parsedData;
    
  } catch (error) {
    console.error('❌ Perplexity API call failed:', error);
    throw new Error(`Failed to analyze question: ${error.message}`);
  }
}

/**
 * Validate and fix Perplexity response structure
 * Ensures all 3 stances have valid percentages
 */
function validateAndFixPerplexityResponse(data) {
  // Check required top-level fields
  if (typeof data.globalTruthIndex !== 'number') {
    throw new Error('Missing or invalid globalTruthIndex in response');
  }
  
  if (typeof data.summary !== 'string' || !data.summary.trim()) {
    throw new Error('Missing or invalid summary in response');
  }
  
  if (!Array.isArray(data.countries) || data.countries.length === 0) {
    throw new Error('Missing or empty countries array in response');
  }
  
  // Track stance distribution
  const stanceDistribution = { Agree: 0, Mixed: 0, Disagree: 0 };
  
  // Validate each country entry
  const validCountries = [];
  const invalidCountries = [];
  
  data.countries.forEach((country, index) => {
    try {
      if (!country.country || typeof country.country !== 'string') {
        throw new Error(`Missing country name`);
      }
      
      if (!country.countryCode || typeof country.countryCode !== 'string') {
        throw new Error(`Missing country code`);
      }
      
      if (!['Agree', 'Mixed', 'Disagree'].includes(country.stance)) {
        throw new Error(`Invalid stance: ${country.stance}`);
      }
      
      if (typeof country.stanceScore !== 'number' || country.stanceScore < 0 || country.stanceScore > 100) {
        throw new Error(`Invalid stanceScore: ${country.stanceScore}`);
      }
      
      if (!country.explanation || typeof country.explanation !== 'string') {
        throw new Error(`Missing explanation`);
      }
      
      if (!Array.isArray(country.culturalFactors) || country.culturalFactors.length === 0) {
        throw new Error(`Missing cultural factors`);
      }
      
      // Validate and fix percentage fields
      let agreePercent = typeof country.agreePercent === 'number' ? country.agreePercent : null;
      let mixedPercent = typeof country.mixedPercent === 'number' ? country.mixedPercent : null;
      let disagreePercent = typeof country.disagreePercent === 'number' ? country.disagreePercent : null;
      
      // If percentages are missing, calculate from stanceScore
      if (agreePercent === null || mixedPercent === null || disagreePercent === null) {
        const calculated = calculatePercentagesFromStance(country.stance, country.stanceScore);
        agreePercent = calculated.agreePercent;
        mixedPercent = calculated.mixedPercent;
        disagreePercent = calculated.disagreePercent;
      }
      
      // Ensure percentages sum to 100
      const total = agreePercent + mixedPercent + disagreePercent;
      if (Math.abs(total - 100) > 1) {
        // Normalize to 100
        const factor = 100 / total;
        agreePercent = Math.round(agreePercent * factor);
        mixedPercent = Math.round(mixedPercent * factor);
        disagreePercent = 100 - agreePercent - mixedPercent;
      }
      
      // Allow 0% values - show the truth!
      // Do NOT force minimum 1% - if a stance is truly 0%, show it as 0%
      
      // Update country with fixed percentages
      country.agreePercent = agreePercent;
      country.mixedPercent = mixedPercent;
      country.disagreePercent = disagreePercent;
      
      // Track stance distribution
      stanceDistribution[country.stance]++;
      
      // Country is valid
      validCountries.push(country);
      
    } catch (err) {
      console.warn(`⚠️  Skipping invalid country at index ${index} (${country.country || 'unknown'}): ${err.message}`);
      invalidCountries.push({ index, country: country.country, error: err.message });
    }
  });
  
  // Replace countries array with only valid countries
  data.countries = validCountries;
  
  if (invalidCountries.length > 0) {
    console.log(`⚠️  Skipped ${invalidCountries.length} invalid countries`);
  }
  
  if (validCountries.length === 0) {
    throw new Error(`No valid countries in response`);
  }
  
  // Log stance distribution
  console.log(`📊 Stance distribution: Agree=${stanceDistribution.Agree}, Mixed=${stanceDistribution.Mixed}, Disagree=${stanceDistribution.Disagree}`);
  
  // Note: We do NOT force stance diversity - the data should reflect reality
  // If all countries agree, that's a valid result!
  
  // Global Truth Index = Percentage of countries with DOMINANT stance
  // This matches the highest bar in the bar chart
  const totalCountries = validCountries.length;
  const agreePercent = Math.round((stanceDistribution.Agree / totalCountries) * 100);
  const mixedPercent = Math.round((stanceDistribution.Mixed / totalCountries) * 100);
  const disagreePercent = Math.round((stanceDistribution.Disagree / totalCountries) * 100);
  
  // Global Truth Index = the HIGHEST percentage (dominant consensus)
  const calculatedGlobalTruthIndex = Math.max(agreePercent, mixedPercent, disagreePercent);
  
  console.log(`   📊 Stance percentages: Agree=${agreePercent}%, Mixed=${mixedPercent}%, Disagree=${disagreePercent}%`);
  console.log(`   🎯 Global Truth Index (dominant %): ${calculatedGlobalTruthIndex}%`);
  
  // Update Global Truth Index to match calculation
  if (data.globalTruthIndex !== calculatedGlobalTruthIndex) {
    console.log(`   ⚙️  Adjusting Global Truth Index: ${data.globalTruthIndex} → ${calculatedGlobalTruthIndex}`);
    data.globalTruthIndex = calculatedGlobalTruthIndex;
  }
  
  console.log('✅ Response validation passed:', validCountries.length, 'countries');
}

/**
 * Calculate all 3 percentages from stance and stanceScore
 * Ensures realistic distribution with non-zero values
 */
function calculatePercentagesFromStance(stance, stanceScore) {
  let agreePercent, mixedPercent, disagreePercent;
  
  if (stance === 'Agree') {
    // High agree percentage
    agreePercent = Math.max(40, Math.min(80, stanceScore));
    const remaining = 100 - agreePercent;
    mixedPercent = Math.round(remaining * 0.6);
    disagreePercent = remaining - mixedPercent;
  } else if (stance === 'Disagree') {
    // High disagree percentage
    disagreePercent = Math.max(40, Math.min(80, 100 - stanceScore));
    const remaining = 100 - disagreePercent;
    mixedPercent = Math.round(remaining * 0.6);
    agreePercent = remaining - mixedPercent;
  } else { // Mixed
    // Balanced distribution
    mixedPercent = Math.max(35, Math.min(60, Math.abs(stanceScore - 50) + 35));
    const remaining = 100 - mixedPercent;
    agreePercent = Math.round(remaining * (stanceScore / 100));
    disagreePercent = remaining - agreePercent;
  }
  
  // Ensure minimum 5% for each to maintain visibility
  if (agreePercent < 5) { agreePercent = 5; }
  if (mixedPercent < 5) { mixedPercent = 5; }
  if (disagreePercent < 5) { disagreePercent = 5; }
  
  // Normalize to 100
  const total = agreePercent + mixedPercent + disagreePercent;
  if (total !== 100) {
    const factor = 100 / total;
    agreePercent = Math.round(agreePercent * factor);
    mixedPercent = Math.round(mixedPercent * factor);
    disagreePercent = 100 - agreePercent - mixedPercent;
  }
  
  return { agreePercent, mixedPercent, disagreePercent };
}

/**
 * Main analysis function
 */
export async function analyzeQuestion(analysisId, question, countries) {
  try {
    console.log(`🔬 Starting analysis: ${analysisId}`);

    // Call Perplexity API
    const perplexityResult = await callPerplexityAPI(question, countries);

    console.log(`📊 Analysis complete: ${analysisId}`);
    console.log(`   Global Truth Index: ${perplexityResult.globalTruthIndex}`);
    console.log(`   Countries analyzed: ${perplexityResult.countries.length}`);

    // Transform to Tableau format
    const tableauData = transformToTableauFormat(analysisId, question, perplexityResult);

    // Calculate aggregates
    const aggregates = calculateAggregates(perplexityResult.countries);

    const result = {
      status: 'complete',
      progress: { current: 1, total: 1, percent: 100 },
      data: {
        question,
        globalTruthIndex: perplexityResult.globalTruthIndex,
        classification: getClassification(perplexityResult.globalTruthIndex),
        summary: perplexityResult.summary,
        countries: perplexityResult.countries,
        aggregates
      },
      tableauData,
      completedAt: new Date().toISOString()
    };

    console.log(`✨ Analysis ${analysisId} completed`);

    return result;

  } catch (error) {
    console.error(`❌ Analysis failed: ${analysisId}`, error);
    throw error;
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