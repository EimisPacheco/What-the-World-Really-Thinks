import express from 'express';
import { analyzeQuestion } from '../services/perplexity.js';
import { writeToMySQL } from '../utils/mysqlWriter.js';

const router = express.Router();

// POST /api/analyze - Submit a new analysis request and wait for result
router.post('/', async (req, res) => {
  try {
    const { question, countries } = req.body;

    if (!question) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Question is required' 
      });
    }

    // ALWAYS use "current" as the ID - overwrites previous analysis
    const analysisId = 'current';
    
    console.log(`📝 New analysis request: ${analysisId}`);
    console.log(`   Question: ${question}`);
    console.log(`   Countries: ${countries === 'ALL' ? 'All countries' : countries.length + ' selected'}`);

    // SYNCHRONOUS: Wait for analysis to complete
    const result = await analyzeQuestion(analysisId, question, countries);

    // Automatically write to MySQL database for Tableau
    try {
      await writeToMySQL(result.tableauData, result.data);
      console.log('✅ MySQL database updated - Tableau can now see new data!');
      console.log('');
      console.log('🎯 For LIVE connection: Tableau updates automatically');
      console.log('   Just call refreshAsync() in the extension');
      console.log('');
    } catch (mysqlError) {
      console.error('⚠️  MySQL write failed:', mysqlError.message);
    }

    // Return complete result
    res.json({
      ok: true,
      analysisId: 'current',
      status: 'complete',
      data: result.data,
      tableauData: result.tableauData
    });

  } catch (error) {
    console.error('Error submitting analysis:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Failed to submit analysis'
    });
  }
});

export default router;