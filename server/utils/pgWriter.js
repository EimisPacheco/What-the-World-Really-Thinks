import pg from 'pg';

const { Pool } = pg;

// Aurora PostgreSQL Configuration - uses environment variables ONLY
const PG_CONFIG = {
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Aurora requires TLS; the cluster uses an AWS-managed cert chain.
  ssl: { rejectUnauthorized: false }
};

// Connection pool
let pool = null;

/**
 * Initialize PostgreSQL (Aurora) connection pool
 */
function getPool() {
  if (!pool) {
    pool = new Pool(PG_CONFIG);
    console.log('✅ Aurora PostgreSQL connection pool initialized');
  }
  return pool;
}

// Wide-format columns (1 row per country) - order matters for the INSERT
const COLUMNS = [
  'AnalysisID', 'Timestamp', 'Question', 'Country', 'CountryCode',
  'Stance', 'StanceScore', 'AgreePercent', 'MixedPercent', 'DisagreePercent',
  'Explanation', 'CulturalFactor1', 'CulturalFactor2', 'CulturalFactor3',
  'Latitude', 'Longitude', 'Region'
];

/**
 * Write analysis results to Aurora PostgreSQL
 * Deletes old data and inserts new data (keeps only current analysis)
 */
export async function writeToPostgres(tableauData, analysisData) {
  console.log('🗄️  Writing analysis data to Aurora PostgreSQL...');

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // DELETE all old data (keeps only the latest analysis)
    console.log('   🗑️  Deleting old data...');
    await client.query('DELETE FROM world_perspectives_sample');
    console.log('   ✓ Old data cleared');

    // INSERT sample data (1 row per country - WIDE FORMAT)
    console.log('   📝 Inserting sample data...');
    await writeSampleData(client, tableauData.countryData);

    await client.query('COMMIT');

    console.log('✅ Aurora PostgreSQL updated successfully!');
    console.log(`   Sample rows: ${tableauData.countryData.length}`);

    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Aurora PostgreSQL write error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Build a parameterized multi-row INSERT for the wide-format sample table.
 * Pure function (no DB I/O) so it can be unit-tested: returns { text, values }
 * with numbered ($N) placeholders, one tuple per country row.
 * Returns null when there is nothing to insert.
 */
export function buildSampleInsert(countryData) {
  if (!countryData || countryData.length === 0) {
    return null;
  }

  const colList = COLUMNS.map(c => `"${c}"`).join(', ');
  const values = [];
  const rowPlaceholders = [];

  countryData.forEach((row, i) => {
    const base = i * COLUMNS.length;
    const placeholders = COLUMNS.map((_, j) => `$${base + j + 1}`);
    rowPlaceholders.push(`(${placeholders.join(', ')})`);

    values.push(
      row.AnalysisID,
      row.Timestamp,
      row.Question,
      row.Country,
      row.CountryCode,
      row.Stance,
      row.StanceScore,
      row.AgreePercent || 0,
      row.MixedPercent || 0,
      row.DisagreePercent || 0,
      row.Explanation,
      row.CulturalFactor1,
      row.CulturalFactor2,
      row.CulturalFactor3,
      row.Latitude,
      row.Longitude,
      row.Region
    );
  });

  const text = `INSERT INTO world_perspectives_sample (${colList}) VALUES ${rowPlaceholders.join(', ')}`;
  return { text, values };
}

/**
 * Write sample data (world_perspectives_sample table)
 * WIDE FORMAT: 1 row per country with separate columns for each percentage.
 */
async function writeSampleData(client, countryData) {
  const insert = buildSampleInsert(countryData);
  if (!insert) {
    console.log('   ⚠️  No country data to write');
    return;
  }

  await client.query(insert.text, insert.values);
  console.log(`   ✓ Wrote ${countryData.length} rows to sample table (wide format)`);
}

// Number of columns per row - exported for tests
export const SAMPLE_COLUMN_COUNT = COLUMNS.length;

/**
 * Test database connection
 */
export async function testConnection() {
  console.log('🧪 Testing Aurora PostgreSQL connection...');

  try {
    const client = await getPool().connect();
    const { rows } = await client.query('SELECT 1 as test');
    client.release();

    console.log('✅ Aurora PostgreSQL connection successful!');
    console.log(`   Host: ${PG_CONFIG.host}`);
    console.log(`   Database: ${PG_CONFIG.database}`);
    console.log(`   User: ${PG_CONFIG.user}`);

    return true;
  } catch (error) {
    console.error('❌ Aurora PostgreSQL connection failed:', error.message);
    throw error;
  }
}

/**
 * Close connection pool (cleanup)
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔌 Aurora PostgreSQL connection pool closed');
  }
}
