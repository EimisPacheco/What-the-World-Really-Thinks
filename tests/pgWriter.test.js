import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSampleInsert, SAMPLE_COLUMN_COUNT } from '../server/utils/pgWriter.js';

// A complete wide-format row as produced by dataTransform.transformToTableauFormat
function sampleRow(overrides = {}) {
  return {
    AnalysisID: 'current',
    Timestamp: '2026-06-27 22:00:00',
    Question: 'Coffee is better than tea',
    Country: 'United States',
    CountryCode: 'US',
    Stance: 'Agree',
    StanceScore: 65,
    AgreePercent: 55,
    MixedPercent: 30,
    DisagreePercent: 15,
    Explanation: 'Cultural preference for coffee.',
    CulturalFactor1: 'History',
    CulturalFactor2: 'Economy',
    CulturalFactor3: 'Social',
    Latitude: 37.0902,
    Longitude: -95.7129,
    Region: 'North America',
    ...overrides
  };
}

test('column count is the expected 17 wide-format columns', () => {
  assert.equal(SAMPLE_COLUMN_COUNT, 17);
});

test('returns null when there is nothing to insert', () => {
  assert.equal(buildSampleInsert(undefined), null);
  assert.equal(buildSampleInsert(null), null);
  assert.equal(buildSampleInsert([]), null);
});

test('single row → 17 placeholders $1..$17 and 17 values in column order', () => {
  const { text, values } = buildSampleInsert([sampleRow()]);

  // One tuple with $1..$17
  assert.match(text, /VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10, \$11, \$12, \$13, \$14, \$15, \$16, \$17\)$/);
  // Quoted, case-preserving column list
  assert.match(text, /INSERT INTO world_perspectives_sample \("AnalysisID", "Timestamp", /);

  assert.equal(values.length, 17);
  // Spot-check ordering matches the column list
  assert.equal(values[0], 'current');        // AnalysisID
  assert.equal(values[3], 'United States');   // Country
  assert.equal(values[4], 'US');              // CountryCode
  assert.equal(values[6], 65);                // StanceScore
  assert.equal(values[16], 'North America');  // Region
});

test('multi-row placeholders continue numbering across rows (no collisions)', () => {
  const { text, values } = buildSampleInsert([
    sampleRow({ Country: 'United States', CountryCode: 'US' }),
    sampleRow({ Country: 'Canada', CountryCode: 'CA' })
  ]);

  // 2 rows * 17 cols = 34 values, placeholders $1..$34
  assert.equal(values.length, 34);
  assert.match(text, /\(\$1, .* \$17\), \(\$18, .* \$34\)$/);
  // Second row's values start at index 17
  assert.equal(values[17], 'current');     // row 2 AnalysisID
  assert.equal(values[20], 'Canada');      // row 2 Country
  assert.equal(values[21], 'CA');          // row 2 CountryCode
});

test('missing percentages default to 0 (migration-safe)', () => {
  const row = sampleRow();
  delete row.AgreePercent;
  delete row.MixedPercent;
  delete row.DisagreePercent;

  const { values } = buildSampleInsert([row]);
  assert.equal(values[7], 0);  // AgreePercent
  assert.equal(values[8], 0);  // MixedPercent
  assert.equal(values[9], 0);  // DisagreePercent
});
