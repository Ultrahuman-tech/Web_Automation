#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const LANGUAGES = ['en', 'ja', 'de', 'th'];
const COUNTRIES = ['in', 'us', 'ae', 'at', 'global'];
const WORKERS = 10;
const HEADLESS = true; // Headless mode
const TEST_FILE = 'tests/purchase/comprehensive-multi-language.spec.ts';

// Results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  startTime: Date.now(),
  details: []
};

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function runTestForLanguageAndCountry(language, country) {
  const testId = `${language.toUpperCase()}-${country.toUpperCase()}`;
  log(`🚀 Starting comprehensive test: ${testId}`);
  
  const startTime = Date.now();
  
  try {
    // Set environment variables and run test
    const command = `LANGUAGE=${language} COUNTRY=${country} npx playwright test ${TEST_FILE} --workers=${WORKERS} ${HEADLESS ? '' : '--headed'}`;
    
    log(`📋 Command: ${command}`);
    
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 1800000 // 30 minutes timeout per test (330 combinations)
    });
    
    const duration = Date.now() - startTime;
    const success = output.includes('passed') && !output.includes('failed');
    
    results.total++;
    if (success) {
      results.passed++;
      log(`✅ PASSED: ${testId} (${Math.round(duration/1000/60)}m ${Math.round((duration/1000)%60)}s)`);
    } else {
      results.failed++;
      log(`❌ FAILED: ${testId} (${Math.round(duration/1000/60)}m ${Math.round((duration/1000)%60)}s)`);
    }
    
    results.details.push({
      language,
      country,
      testId,
      success,
      duration,
      output: output.slice(-1000) // Last 1000 chars for debugging
    });
    
    return success;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    results.total++;
    results.failed++;
    
    log(`❌ ERROR: ${testId} (${Math.round(duration/1000/60)}m ${Math.round((duration/1000)%60)}s) - ${error.message}`);
    
    results.details.push({
      language,
      country,
      testId,
      success: false,
      duration,
      error: error.message,
      output: error.stdout || error.stderr || ''
    });
    
    return false;
  }
}

function saveResults() {
  const resultsFile = `test-results/comprehensive-multi-language-${Date.now()}.json`;
  const resultsDir = path.dirname(resultsFile);
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const finalResults = {
    ...results,
    endTime: Date.now(),
    totalDuration: results.endTime - results.startTime,
    summary: {
      totalTests: results.total,
      passed: results.passed,
      failed: results.failed,
      successRate: `${Math.round((results.passed / results.total) * 100)}%`
    }
  };
  
  fs.writeFileSync(resultsFile, JSON.stringify(finalResults, null, 2));
  log(`💾 Results saved to: ${resultsFile}`);
  
  return finalResults;
}

function printSummary(finalResults) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE MULTI-LANGUAGE TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Language-Country Combinations: ${finalResults.summary.totalTests}`);
  console.log(`Passed: ${finalResults.summary.passed} (${finalResults.summary.successRate})`);
  console.log(`Failed: ${finalResults.summary.failed}`);
  console.log(`Total Duration: ${Math.round(finalResults.totalDuration / 1000 / 60)} minutes`);
  console.log(`Total Tests Run: ${finalResults.summary.totalTests * 330} individual combinations`);
  
  console.log('\n📈 Results by Language:');
  const languageStats = {};
  LANGUAGES.forEach(lang => {
    const langResults = results.details.filter(r => r.language === lang);
    const passed = langResults.filter(r => r.success).length;
    const total = langResults.length;
    languageStats[lang] = `${passed}/${total} (${Math.round((passed/total)*100)}%)`;
  });
  
  Object.entries(languageStats).forEach(([lang, stats]) => {
    console.log(`  ${lang.toUpperCase()}: ${stats}`);
  });
  
  console.log('\n📈 Results by Country:');
  const countryStats = {};
  COUNTRIES.forEach(country => {
    const countryResults = results.details.filter(r => r.country === country);
    const passed = countryResults.filter(r => r.success).length;
    const total = countryResults.length;
    countryStats[country] = `${passed}/${total} (${Math.round((passed/total)*100)}%)`;
  });
  
  Object.entries(countryStats).forEach(([country, stats]) => {
    console.log(`  ${country.toUpperCase()}: ${stats}`);
  });
  
  console.log('\n❌ Failed Tests:');
  const failedTests = results.details.filter(r => !r.success);
  if (failedTests.length === 0) {
    console.log('  🎉 All tests passed!');
  } else {
    failedTests.forEach(test => {
      console.log(`  ${test.testId}: ${test.error || 'Test failed'}`);
    });
  }
  
  console.log('\n📊 Test Coverage Summary:');
  console.log(`  English: 330 combinations × 5 countries = 1,650 tests`);
  console.log(`  Japanese: 330 combinations × 5 countries = 1,650 tests`);
  console.log(`  German: 330 combinations × 5 countries = 1,650 tests`);
  console.log(`  Thai: 330 combinations × 5 countries = 1,650 tests`);
  console.log(`  Total: 6,600 comprehensive tests`);
  
  console.log('='.repeat(80));
}

async function main() {
  log('🌟 Starting comprehensive multi-language testing with ALL COMBINATIONS');
  log(`📋 Configuration:`);
  log(`  Languages: ${LANGUAGES.join(', ')}`);
  log(`  Countries: ${COUNTRIES.join(', ')}`);
  log(`  Workers: ${WORKERS}`);
  log(`  Mode: ${HEADLESS ? 'Headless' : 'Headful'}`);
  log(`  Test File: ${TEST_FILE}`);
  log(`  Combinations per Language-Country: 330`);
  log(`  Total Language-Country Combinations: ${LANGUAGES.length * COUNTRIES.length}`);
  log(`  Total Individual Tests: ${LANGUAGES.length * COUNTRIES.length * 330}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('🚀 RUNNING ALL LANGUAGE-COUNTRY COMBINATIONS');
  console.log('='.repeat(80));
  
  // Run all combinations
  for (const language of LANGUAGES) {
    for (const country of COUNTRIES) {
      const success = runTestForLanguageAndCountry(language, country);
      
      // Add delay between tests to avoid overwhelming the system
      if (language !== LANGUAGES[LANGUAGES.length - 1] || country !== COUNTRIES[COUNTRIES.length - 1]) {
        log('⏳ Waiting 10 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
  
  // Save and display results
  const finalResults = saveResults();
  printSummary(finalResults);
  
  // Exit with appropriate code
  process.exit(finalResults.summary.failed > 0 ? 1 : 0);
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n⚠️  Process interrupted. Saving current results...');
  const finalResults = saveResults();
  printSummary(finalResults);
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\n⚠️  Process terminated. Saving current results...');
  const finalResults = saveResults();
  printSummary(finalResults);
  process.exit(1);
});

main().catch(error => {
  log(`💥 Fatal error: ${error.message}`);
  process.exit(1);
});
