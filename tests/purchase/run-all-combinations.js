#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function showHelp() {
  log('\n🚀 Ultrahuman Ring AIR - Comprehensive Testing Runner', 'cyan');
  log('='.repeat(60), 'cyan');
  log('\nUsage:', 'bright');
  log('  node tests/purchase/run-all-combinations.js [options]', 'yellow');
  log('\nOptions:', 'bright');
  log('  all        - Run all 396 combinations (default)', 'green');
  log('  sample     - Run sample of 50 combinations for quick testing', 'green');
  log('  colors     - Run all color combinations only', 'green');
  log('  chargers   - Run all charger combinations only', 'green');
  log('  coverage   - Run all coverage combinations only', 'green');
  log('  help       - Show this help message', 'green');
  log('\nEnvironment Variables:', 'bright');
  log('  WORKERS=4  - Number of parallel workers (default: 4)', 'yellow');
  log('  TIMEOUT=60 - Test timeout in seconds (default: 60)', 'yellow');
  log('  HEADLESS=true - Run in headless mode (default: true)', 'yellow');
  log('\nExamples:', 'bright');
  log('  node tests/purchase/run-all-combinations.js all', 'yellow');
  log('  WORKERS=2 node tests/purchase/run-all-combinations.js sample', 'yellow');
  log('  HEADLESS=false node tests/purchase/run-all-combinations.js colors', 'yellow');
  log('\n' + '='.repeat(60), 'cyan');
}

function getTestConfig(testType) {
  const configs = {
    all: {
      file: 'tests/purchase/all-combinations.spec.ts',
      description: 'All 396 combinations comprehensive test',
      estimatedTime: '45-60 minutes'
    },
    sample: {
      file: 'tests/purchase/final-purchase-tests.spec.ts',
      grep: 'Sample Combinations Testing',
      description: 'Sample 5 combinations test',
      estimatedTime: '2-3 minutes'
    },
    colors: {
      file: 'tests/purchase/final-purchase-tests.spec.ts',
      grep: 'Color-Specific Cost Validation',
      description: 'All color combinations test',
      estimatedTime: '5-8 minutes'
    },
    chargers: {
      file: 'tests/purchase/final-purchase-tests.spec.ts',
      grep: 'Charger Cost Validation',
      description: 'All charger combinations test',
      estimatedTime: '3-5 minutes'
    },
    coverage: {
      file: 'tests/purchase/final-purchase-tests.spec.ts',
      grep: 'Coverage Cost Validation',
      description: 'All coverage combinations test',
      estimatedTime: '3-5 minutes'
    }
  };
  
  return configs[testType] || configs.all;
}

function buildPlaywrightCommand(config, testType) {
  const workers = process.env.WORKERS || '4';
  const timeout = process.env.TIMEOUT || '60000';
  const headless = process.env.HEADLESS !== 'false';
  
  let command = `npx playwright test ${config.file}`;
  
  if (config.grep) {
    command += ` --grep "${config.grep}"`;
  }
  
  command += ` --workers=${workers}`;
  command += ` --timeout=${timeout}`;
  
  if (headless) {
    command += ' --reporter=line';
  } else {
    command += ' --headed';
  }
  
  // Add retry for comprehensive tests
  if (testType === 'all') {
    command += ' --retries=1';
  }
  
  return command;
}

function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';
  
  if (testType === 'help' || testType === '-h' || testType === '--help') {
    showHelp();
    return;
  }
  
  const config = getTestConfig(testType);
  
  log('\n🚀 Starting Comprehensive Testing', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Test Type: ${testType.toUpperCase()}`, 'bright');
  log(`Description: ${config.description}`, 'yellow');
  log(`Estimated Time: ${config.estimatedTime}`, 'yellow');
  log(`Workers: ${process.env.WORKERS || '4'}`, 'yellow');
  log(`Headless: ${process.env.HEADLESS !== 'false' ? 'Yes' : 'No'}`, 'yellow');
  log('='.repeat(60), 'cyan');
  
  const command = buildPlaywrightCommand(config, testType);
  log(`\n🔧 Command: ${command}`, 'blue');
  
  const startTime = Date.now();
  
  try {
    log('\n⏳ Running tests...', 'yellow');
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    const duration = Date.now() - startTime;
    const durationMinutes = (duration / 60000).toFixed(1);
    
    log('\n✅ Tests completed successfully!', 'green');
    log(`⏱️  Total Duration: ${durationMinutes} minutes`, 'green');
    
    // Check if results file exists and show summary
    const resultsFile = 'test-results/all-combinations-results.json';
    if (fs.existsSync(resultsFile)) {
      log('\n📊 Loading test results...', 'cyan');
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      
      log('\n📈 FINAL SUMMARY:', 'bright');
      log(`Total Tests: ${results.summary.totalTests}`, 'blue');
      log(`Passed: ${results.summary.passedTests} (${results.summary.passRate})`, 'green');
      log(`Failed: ${results.summary.failedTests}`, results.summary.failedTests > 0 ? 'red' : 'green');
      log(`Average Duration: ${results.summary.avgDuration}`, 'blue');
      
      if (results.summary.failedTests > 0) {
        log('\n❌ Some tests failed. Check the detailed results file for more information.', 'red');
        log(`📄 Detailed results: ${resultsFile}`, 'yellow');
      } else {
        log('\n🎉 All tests passed! System is ready for production!', 'green');
      }
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const durationMinutes = (duration / 60000).toFixed(1);
    
    log('\n❌ Tests failed or were interrupted', 'red');
    log(`⏱️  Duration before failure: ${durationMinutes} minutes`, 'red');
    log(`Error: ${error.message}`, 'red');
    
    // Still try to show results if available
    const resultsFile = 'test-results/all-combinations-results.json';
    if (fs.existsSync(resultsFile)) {
      log('\n📊 Partial results available:', 'yellow');
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      log(`Tests completed: ${results.summary.totalTests}`, 'blue');
      log(`Passed: ${results.summary.passedTests}`, 'green');
      log(`Failed: ${results.summary.failedTests}`, 'red');
    }
    
    process.exit(1);
  }
}

main();
