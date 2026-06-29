import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformToTableauFormat, exportAsCSV } from '../server/services/dataTransform.js';

function perplexityResult() {
  return {
    globalTruthIndex: 72,
    summary: 'Most analyzed countries lean toward agreement.',
    countries: [
      {
        country: 'United States',
        countryCode: 'US',
        stance: 'Agree',
        stanceScore: 65.4,           // should round to 65
        agreePercent: 55,
        mixedPercent: 30,
        disagreePercent: 15,
        explanation: 'Coffee culture, runs on caffeine.',
        culturalFactors: ['History', 'Economy', 'Social life']
      },
      {
        country: 'Canada',
        countryCode: 'CA',
        stance: 'Mixed',
        stanceScore: 50,
        agreePercent: 40,
        mixedPercent: 35,
        disagreePercent: 25,
        explanation: 'Split between coffee and tea regions.',
        culturalFactors: [['British', 'roots'], 'Climate']  // nested array exercises ensureString
      }
    ]
  };
}

test('transforms each country into a wide-format row with geo enrichment', () => {
  const { countryData } = transformToTableauFormat('current', 'Coffee is better than tea', perplexityResult());

  assert.equal(countryData.length, 2);

  const us = countryData[0];
  assert.equal(us.Country, 'United States');
  assert.equal(us.StanceScore, 65);                 // Math.round(65.4)
  assert.equal(us.Region, 'North America');         // pulled from geoData
  assert.equal(us.Latitude, 37.0902);
  assert.equal(us.Longitude, -95.7129);
  assert.equal(us.CulturalFactor1, 'History');
});

test('ensureString flattens nested cultural-factor arrays', () => {
  const { countryData } = transformToTableauFormat('current', 'Q', perplexityResult());
  // Canada's first factor was ['British','roots'] → "British, roots"
  assert.equal(countryData[1].CulturalFactor1, 'British, roots');
  assert.equal(countryData[1].CulturalFactor2, 'Climate');
});

test('summary aggregates count stances and classify the index', () => {
  const { summaryData } = transformToTableauFormat('current', 'Q', perplexityResult());
  assert.equal(summaryData.TotalCountries, 2);
  assert.equal(summaryData.CountriesAgree, 1);
  assert.equal(summaryData.CountriesMixed, 1);
  assert.equal(summaryData.Classification, 'Generally Agreed'); // 72 → 60-79 band
});

test('Timestamp uses the Tableau "YYYY-MM-DD HH:MM:SS" format', () => {
  const { countryData } = transformToTableauFormat('current', 'Q', perplexityResult());
  assert.match(countryData[0].Timestamp, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test('invalid stance is rejected (guards bad Perplexity output)', () => {
  const bad = perplexityResult();
  bad.countries[0].stance = 'Yes';
  assert.throws(() => transformToTableauFormat('current', 'Q', bad), /Invalid Stance/);
});

test('exportAsCSV escapes commas and quotes', () => {
  const tableauData = transformToTableauFormat('current', 'Q', perplexityResult());
  const csv = exportAsCSV(tableauData);
  const lines = csv.split('\n');
  assert.equal(lines.length, 3);                    // header + 2 rows
  assert.ok(lines[0].startsWith('AnalysisID,'));
  // Canada explanation has no comma, but the nested-array factor "British, roots" must be quoted
  assert.ok(csv.includes('"British, roots"'));
});
