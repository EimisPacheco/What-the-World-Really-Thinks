import express from 'express';
import { getAllCountries, getCountriesByRegion } from '../services/geoData.js';

const router = express.Router();

// GET /api/countries - Get all available countries
router.get('/', (req, res) => {
  try {
    const { region } = req.query;

    let countries;
    if (region) {
      countries = getCountriesByRegion(region);
    } else {
      countries = getAllCountries();
    }

    res.json({
      ok: true,
      total: countries.length,
      countries
    });

  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch countries'
    });
  }
});

// GET /api/countries/regions - Get list of regions
router.get('/regions', (req, res) => {
  try {
    const regions = [
      'North America',
      'South America',
      'Europe',
      'Asia',
      'Africa',
      'Oceania',
      'Middle East'
    ];

    res.json({
      ok: true,
      regions
    });

  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch regions'
    });
  }
});

export default router;
