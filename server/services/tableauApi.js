/**
 * Tableau REST API Integration
 * Triggers data source refresh on Tableau Cloud after analysis completes
 */

const TABLEAU_SERVER_URL = process.env.TABLEAU_SERVER_URL; // e.g., https://prod-useast-b.online.tableau.com
const TABLEAU_SITE_NAME = process.env.TABLEAU_SITE_NAME;   // Your site name
const TABLEAU_TOKEN_NAME = process.env.TABLEAU_TOKEN_NAME; // Personal Access Token name
const TABLEAU_TOKEN_SECRET = process.env.TABLEAU_TOKEN_SECRET; // Personal Access Token secret
const TABLEAU_DATASOURCE_ID = process.env.TABLEAU_DATASOURCE_ID; // Data source ID to refresh
const TABLEAU_WORKBOOK_ID = process.env.TABLEAU_WORKBOOK_ID; // Workbook ID to refresh (for embedded data sources)

let authToken = null;
let siteId = null;
let tokenExpiry = null;

/**
 * Check if Tableau integration is configured
 */
export function isTableauConfigured() {
  return !!(TABLEAU_SERVER_URL && TABLEAU_SITE_NAME && TABLEAU_TOKEN_NAME && TABLEAU_TOKEN_SECRET);
}

/**
 * Sign in to Tableau Cloud using Personal Access Token
 */
async function signIn() {
  // Check if we have a valid token
  if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
    return { authToken, siteId };
  }

  console.log('🔐 Signing in to Tableau Cloud...');

  const signInUrl = `${TABLEAU_SERVER_URL}/api/3.19/auth/signin`;
  
  const body = {
    credentials: {
      personalAccessTokenName: TABLEAU_TOKEN_NAME,
      personalAccessTokenSecret: TABLEAU_TOKEN_SECRET,
      site: {
        contentUrl: TABLEAU_SITE_NAME
      }
    }
  };

  try {
    const response = await fetch(signInUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tableau sign-in failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    authToken = data.credentials.token;
    siteId = data.credentials.site.id;
    // Token valid for 2 hours, refresh after 1.5 hours
    tokenExpiry = Date.now() + (90 * 60 * 1000);

    console.log('✅ Signed in to Tableau Cloud');
    console.log(`   Site ID: ${siteId}`);
    
    return { authToken, siteId };
  } catch (error) {
    console.error('❌ Tableau sign-in error:', error.message);
    throw error;
  }
}

/**
 * Get data source ID by name (if not configured in env)
 */
async function getDataSourceByName(name) {
  const { authToken, siteId } = await signIn();
  
  const url = `${TABLEAU_SERVER_URL}/api/3.19/sites/${siteId}/datasources?filter=name:eq:${encodeURIComponent(name)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Tableau-Auth': authToken,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get data source: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.datasources && data.datasources.datasource && data.datasources.datasource.length > 0) {
    return data.datasources.datasource[0].id;
  }
  
  return null;
}

/**
 * Refresh a data source on Tableau Cloud
 */
async function refreshDataSource(datasourceId) {
  const { authToken, siteId } = await signIn();
  
  console.log(`🔄 Refreshing Tableau data source: ${datasourceId}`);
  
  const url = `${TABLEAU_SERVER_URL}/api/3.19/sites/${siteId}/datasources/${datasourceId}/refresh`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Tableau-Auth': authToken,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh data source: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`✅ Data source refresh triggered: ${datasourceId}`);
  
  return data;
}

/**
 * Refresh a workbook on Tableau Cloud (refreshes all embedded data sources)
 */
async function refreshWorkbook(workbookId) {
  const { authToken, siteId } = await signIn();
  
  console.log(`🔄 Refreshing Tableau workbook: ${workbookId}`);
  
  const url = `${TABLEAU_SERVER_URL}/api/3.19/sites/${siteId}/workbooks/${workbookId}/refresh`;
  
  // Tableau REST API requires a request body (even if empty)
  const body = {
    workbook: {}
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Tableau-Auth': authToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh workbook: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`✅ Workbook refresh triggered: ${workbookId}`);
  console.log(`   This will refresh all embedded data sources in the workbook`);
  
  return data;
}

/**
 * Refresh all configured data sources
 */
export async function refreshTableauDataSources() {
  if (!isTableauConfigured()) {
    console.log('⚠️ Tableau REST API not configured - skipping refresh');
    return false;
  }

  try {
    // PRIORITY 1: If workbook ID is configured, refresh the workbook
    // This is the best approach for embedded data sources
    if (TABLEAU_WORKBOOK_ID) {
      console.log('📊 Workbook ID configured - refreshing workbook (recommended for embedded data sources)');
      await refreshWorkbook(TABLEAU_WORKBOOK_ID);
      return true;
    }

    // PRIORITY 2: If specific data source ID is configured, refresh it
    if (TABLEAU_DATASOURCE_ID) {
      console.log('📊 Data source ID configured - refreshing data source');
      await refreshDataSource(TABLEAU_DATASOURCE_ID);
      return true;
    }

    // PRIORITY 3: Try to find data sources by name
    console.log('🔍 No IDs configured - searching for data sources by name...');
    const sampleDsId = await getDataSourceByName('world-perspectives-sample');
    const detailedDsId = await getDataSourceByName('world-perspectives-detailed');

    if (sampleDsId) {
      await refreshDataSource(sampleDsId);
    }
    
    if (detailedDsId) {
      await refreshDataSource(detailedDsId);
    }

    if (!sampleDsId && !detailedDsId) {
      console.warn('⚠️ No matching data sources found on Tableau Cloud');
      console.warn('   Your data sources might be embedded in a workbook.');
      console.warn('   Add TABLEAU_WORKBOOK_ID to .env to refresh the workbook instead.');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Tableau refresh error:', error.message);
    return false;
  }
}

/**
 * Sign out from Tableau (cleanup)
 */
export async function signOut() {
  if (!authToken || !siteId) return;

  try {
    const url = `${TABLEAU_SERVER_URL}/api/3.19/auth/signout`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'X-Tableau-Auth': authToken
      }
    });
    
    authToken = null;
    siteId = null;
    tokenExpiry = null;
    
    console.log('👋 Signed out from Tableau Cloud');
  } catch (error) {
    console.error('Error signing out:', error.message);
  }
}