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
  log('\n🌍 Ultrahuman Ring AIR - Multi-Country Testing Runner', 'cyan');
  log('='.repeat(60), 'cyan');
  log('\nUsage:', 'bright');
  log('  node tests/purchase/run-multi-country.js [options]', 'yellow');
  log('\nOptions:', 'bright');
  log('  all        - Run all countries (in, us, ae, at, global)', 'green');
  log('  in         - Run India only', 'green');
  log('  us         - Run United States only', 'green');
  log('  ae         - Run UAE only', 'green');
  log('  at         - Run Austria only', 'green');
  log('  global     - Run Global only', 'green');
  log('\nEnvironment Variables:', 'bright');
  log('  WORKERS    - Number of workers (default: 4)', 'yellow');
  log('  HEADLESS   - Run in headless mode (default: true)', 'yellow');
  log('  TIMEOUT    - Test timeout in ms (default: 60000)', 'yellow');
  log('\nExamples:', 'bright');
  log('  node tests/purchase/run-multi-country.js all', 'green');
  log('  WORKERS=5 node tests/purchase/run-multi-country.js us', 'green');
  log('  HEADLESS=false node tests/purchase/run-multi-country.js in', 'green');
  log('='.repeat(60), 'cyan');
}

const countries = {
  in: { name: 'India', url: 'https://ultrahuman.com/ring/buy/in/' },
  us: { name: 'United States', url: 'https://ultrahuman.com/ring/buy/us/' },
  ae: { name: 'UAE', url: 'https://ultrahuman.com/ring/buy/ae/' },
  at: { name: 'Austria', url: 'https://ultrahuman.com/ring/buy/at/' },
  global: { name: 'Global', url: 'https://ultrahuman.com/ring/buy/global/' }
};

function buildPlaywrightCommand(country) {
  const workers = process.env.WORKERS || '4';
  const timeout = process.env.TIMEOUT || '60000';
  const headless = process.env.HEADLESS !== 'false';
  
  let command = `COUNTRY=${country} npx playwright test tests/purchase/all-combinations.spec.ts`;
  command += ` --workers=${workers}`;
  command += ` --timeout=${timeout}`;
  
  if (headless) {
    command += ' --reporter=line';
  } else {
    command += ' --headed';
  }
  
  return command;
}

function runCountryTest(country) {
  const countryInfo = countries[country];
  if (!countryInfo) {
    log(`❌ Unknown country: ${country}`, 'red');
    return false;
  }
  
  log(`\n🌍 Testing ${countryInfo.name} (${country.toUpperCase()})`, 'cyan');
  log('='.repeat(50), 'cyan');
  log(`URL: ${countryInfo.url}`, 'blue');
  
  const command = buildPlaywrightCommand(country);
  log(`🔧 Command: ${command}`, 'yellow');
  
  try {
    log('⏳ Running tests...', 'bright');
    const startTime = Date.now();
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    log(`✅ ${countryInfo.name} tests completed successfully!`, 'green');
    log(`⏱️  Duration: ${duration} minutes`, 'blue');
    
    return true;
  } catch (error) {
    const duration = ((Date.now() - Date.now()) / 1000 / 60).toFixed(1);
    log(`❌ ${countryInfo.name} tests failed!`, 'red');
    log(`⏱️  Duration: ${duration} minutes`, 'blue');
    return false;
  }
}

function runAllCountries() {
  log('\n🌍 Running tests for ALL countries', 'bright');
  log('='.repeat(60), 'cyan');
  
  const results = {};
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const [countryCode, countryInfo] of Object.entries(countries)) {
    const success = runCountryTest(countryCode);
    results[countryCode] = { success, name: countryInfo.name };
    
    if (success) {
      totalPassed++;
    } else {
      totalFailed++;
    }
    
    // Add a small delay between countries
    if (countryCode !== 'global') {
      log('\n⏳ Waiting 5 seconds before next country...', 'yellow');
      execSync('sleep 5', { stdio: 'inherit' });
    }
  }
  
  // Final summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 FINAL MULTI-COUNTRY TEST RESULTS', 'bright');
  log('='.repeat(60), 'cyan');
  
  for (const [countryCode, result] of Object.entries(results)) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const color = result.success ? 'green' : 'red';
    log(`${status} ${result.name} (${countryCode.toUpperCase()})`, color);
  }
  
  log(`\n📈 Summary: ${totalPassed} passed, ${totalFailed} failed`, 'bright');
  log('='.repeat(60), 'cyan');
  
  return totalFailed === 0;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const testType = args[0].toLowerCase();
  
  log('\n🚀 Starting Multi-Country Testing', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Test Type: ${testType.toUpperCase()}`, 'bright');
  log(`Workers: ${process.env.WORKERS || '4'}`, 'blue');
  log(`Headless: ${process.env.HEADLESS !== 'false'}`, 'blue');
  log('='.repeat(60), 'cyan');
  
  let success = false;
  
  if (testType === 'all') {
    success = runAllCountries();
  } else if (countries[testType]) {
    success = runCountryTest(testType);
  } else {
    log(`❌ Unknown test type: ${testType}`, 'red');
    showHelp();
    process.exit(1);
  }
  
  process.exit(success ? 0 : 1);
}

main();
