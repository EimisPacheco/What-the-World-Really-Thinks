import mysql from 'mysql2/promise';

// MySQL Configuration - uses environment variables ONLY
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Connection pool
let pool = null;

/**
 * Initialize MySQL connection pool
 */
function getPool() {
  if (!pool) {
    pool = mysql.createPool(MYSQL_CONFIG);
    console.log('✅ MySQL connection pool initialized');
  }
  return pool;
}

/**
 * Write analysis results to MySQL database
 * Deletes old data and inserts new data (keeps only current analysis)
 */
export async function writeToMySQL(tableauData, analysisData) {
  console.log('🗄️  Writing analysis data to MySQL database...');
  
  const connection = await getPool().getConnection();
  
  try {
    // Start transaction
    await connection.beginTransaction();
    
    // DELETE all old data (keeps only the latest analysis)
    console.log('   🗑️  Deleting old data...');
    await connection.query('DELETE FROM world_perspectives_sample');
    console.log('   ✓ Old data cleared');
    
    // INSERT sample data (1 row per country - WIDE FORMAT)
    console.log('   📝 Inserting sample data...');
    await writeSampleData(connection, tableauData.countryData);
    
    // Commit transaction
    await connection.commit();
    
    console.log('✅ MySQL database updated successfully!');
    console.log(`   Sample rows: ${tableauData.countryData.length}`);
    
    return true;
  } catch (error) {
    // Rollback on error
    await connection.rollback();
    console.error('❌ MySQL write error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Write sample data (world_perspectives_sample table)
 * WIDE FORMAT: 1 row per country with separate columns for each percentage
 */
async function writeSampleData(connection, countryData) {
  const query = `
    INSERT INTO world_perspectives_sample (
      AnalysisID, Timestamp, Question, Country, CountryCode,
      Stance, StanceScore, AgreePercent, MixedPercent, DisagreePercent,
      Explanation, CulturalFactor1, CulturalFactor2, CulturalFactor3,
      Latitude, Longitude, Region
    ) VALUES ?
  `;
  
  const values = countryData.map(row => [
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
  ]);
  
  await connection.query(query, [values]);
  console.log(`   ✓ Wrote ${countryData.length} rows to sample table (wide format)`);
}

/**
 * Test database connection
 */
export async function testConnection() {
  console.log('🧪 Testing MySQL connection...');
  
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    // Test query
    const [rows] = await connection.query('SELECT 1 as test');
    connection.release();
    
    console.log('✅ MySQL connection successful!');
    console.log(`   Host: ${MYSQL_CONFIG.host}`);
    console.log(`   Database: ${MYSQL_CONFIG.database}`);
    console.log(`   User: ${MYSQL_CONFIG.user}`);
    
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
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
    console.log('🔌 MySQL connection pool closed');
  }
}