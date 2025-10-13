// Test script for the application
const BASE_URL = 'https://cursor-amber-nine.vercel.app';

async function testEndpoint(url, method = 'GET', body = null) {
  try {
    console.log(`\n🧪 Testing: ${method} ${url}`);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.text();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response:`, data.substring(0, 500) + (data.length > 500 ? '...' : ''));
    
    return { status: response.status, data };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { status: 'ERROR', error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting application tests...\n');
  
  // Test 1: Health check
  await testEndpoint(`${BASE_URL}/api/v1/health`);
  
  // Test 2: DynamoDB debug
  await testEndpoint(`${BASE_URL}/api/v1/test-dynamo`);
  
  // Test 3: Settings GET
  await testEndpoint(`${BASE_URL}/api/v1/settings`);
  
  // Test 4: Pairs GET
  await testEndpoint(`${BASE_URL}/api/v1/pairs`);
  
  // Test 5: Settings PUT
  await testEndpoint(`${BASE_URL}/api/v1/settings`, 'PUT', {
    hl: 'fr',
    gl: 'fr'
  });
  
  // Test 6: Pairs POST
  await testEndpoint(`${BASE_URL}/api/v1/pairs`, 'POST', {
    pairs: [{
      keyword: 'test keyword',
      url: 'https://example.com'
    }]
  });
  
  console.log('\n✅ Tests completed!');
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  runTests();
} else {
  // Browser environment
  runTests();
}
