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
  log('\n🌍 Ultrahuman Ring AIR - Multi-Language Testing Runner', 'cyan');
  log('='.repeat(60), 'cyan');
  log('\nUsage:', 'bright');
  log('  node tests/purchase/run-multi-language.js [options]', 'yellow');
  log('\nOptions:', 'bright');
  log('  all        - Run all languages for all countries', 'green');
  log('  en         - Run English only', 'green');
  log('  ja         - Run Japanese only', 'green');
  log('  de         - Run German only', 'green');
  log('  th         - Run Thai only', 'green');
  log('  country    - Run specific country (in, us, ae, at, global)', 'green');
  log('  language   - Run specific language (en, ja, de, th)', 'green');
  log('\nEnvironment Variables:', 'bright');
  log('  WORKERS    - Number of workers (default: 4)', 'yellow');
  log('  HEADLESS   - Run in headless mode (default: true)', 'yellow');
  log('  TIMEOUT    - Test timeout in ms (default: 60000)', 'yellow');
  log('\nExamples:', 'bright');
  log('  node tests/purchase/run-multi-language.js all', 'green');
  log('  node tests/purchase/run-multi-language.js en', 'green');
  log('  node tests/purchase/run-multi-language.js ja', 'green');
  log('  COUNTRY=us node tests/purchase/run-multi-language.js en', 'green');
  log('  WORKERS=5 node tests/purchase/run-multi-language.js all', 'green');
  log('='.repeat(60), 'cyan');
}

const languages = {
  en: { name: 'English', flag: '🇺🇸' },
  ja: { name: 'Japanese', flag: '🇯🇵' },
  de: { name: 'German', flag: '🇩🇪' },
  th: { name: 'Thai', flag: '🇹🇭' }
};

const countries = {
  in: { name: 'India', flag: '🇮🇳' },
  us: { name: 'United States', flag: '🇺🇸' },
  ae: { name: 'UAE', flag: '🇦🇪' },
  at: { name: 'Austria', flag: '🇦🇹' },
  global: { name: 'Global', flag: '🌐' }
};

function buildPlaywrightCommand(language, country) {
  const workers = process.env.WORKERS || '4';
  const timeout = process.env.TIMEOUT || '60000';
  const headless = process.env.HEADLESS !== 'false';
  
  let command = `LANGUAGE=${language} COUNTRY=${country} npx playwright test tests/purchase/all-combinations.spec.ts`;
  command += ` --workers=${workers}`;
  command += ` --timeout=${timeout}`;
  
  if (headless) {
    command += ' --reporter=line';
  } else {
    command += ' --headed';
  }
  
  return command;
}

function runLanguageCountryTest(language, country) {
  const languageInfo = languages[language];
  const countryInfo = countries[country];
  
  if (!languageInfo || !countryInfo) {
    log(`❌ Unknown language or country: ${language}/${country}`, 'red');
    return false;
  }
  
  log(`\n${languageInfo.flag} ${countryInfo.flag} Testing ${languageInfo.name} - ${countryInfo.name}`, 'cyan');
  log('='.repeat(50), 'cyan');
  
  const command = buildPlaywrightCommand(language, country);
  log(`🔧 Command: ${command}`, 'yellow');
  
  try {
    log('⏳ Running tests...', 'bright');
    const startTime = Date.now();
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    log(`✅ ${languageInfo.name} - ${countryInfo.name} tests completed successfully!`, 'green');
    log(`⏱️  Duration: ${duration} minutes`, 'blue');
    
    return true;
  } catch (error) {
    const duration = ((Date.now() - Date.now()) / 1000 / 60).toFixed(1);
    log(`❌ ${languageInfo.name} - ${countryInfo.name} tests failed!`, 'red');
    log(`⏱️  Duration: ${duration} minutes`, 'blue');
    return false;
  }
}

function runAllLanguages() {
  log('\n🌍 Running tests for ALL languages and countries', 'bright');
  log('='.repeat(60), 'cyan');
  
  const results = {};
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const [languageCode, languageInfo] of Object.entries(languages)) {
    results[languageCode] = {};
    
    for (const [countryCode, countryInfo] of Object.entries(countries)) {
      const success = runLanguageCountryTest(languageCode, countryCode);
      results[languageCode][countryCode] = { success, name: countryInfo.name };
      
      if (success) {
        totalPassed++;
      } else {
        totalFailed++;
      }
      
      // Add a small delay between tests
      if (countryCode !== 'global') {
        log('\n⏳ Waiting 3 seconds before next test...', 'yellow');
        execSync('sleep 3', { stdio: 'inherit' });
      }
    }
  }
  
  // Final summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 FINAL MULTI-LANGUAGE TEST RESULTS', 'bright');
  log('='.repeat(60), 'cyan');
  
  for (const [languageCode, languageResults] of Object.entries(results)) {
    const languageInfo = languages[languageCode];
    log(`\n${languageInfo.flag} ${languageInfo.name}:`, 'bright');
    
    for (const [countryCode, result] of Object.entries(languageResults)) {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const color = result.success ? 'green' : 'red';
      log(`  ${status} ${result.name} (${countryCode.toUpperCase()})`, color);
    }
  }
  
  log(`\n📈 Summary: ${totalPassed} passed, ${totalFailed} failed`, 'bright');
  log('='.repeat(60), 'cyan');
  
  return totalFailed === 0;
}

function runSingleLanguage(language) {
  const languageInfo = languages[language];
  if (!languageInfo) {
    log(`❌ Unknown language: ${language}`, 'red');
    return false;
  }
  
  log(`\n${languageInfo.flag} Running tests for ${languageInfo.name} only`, 'bright');
  log('='.repeat(60), 'cyan');
  
  const results = {};
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const [countryCode, countryInfo] of Object.entries(countries)) {
    const success = runLanguageCountryTest(language, countryCode);
    results[countryCode] = { success, name: countryInfo.name };
    
    if (success) {
      totalPassed++;
    } else {
      totalFailed++;
    }
    
    // Add a small delay between countries
    if (countryCode !== 'global') {
      log('\n⏳ Waiting 3 seconds before next country...', 'yellow');
      execSync('sleep 3', { stdio: 'inherit' });
    }
  }
  
  // Summary for single language
  log('\n' + '='.repeat(60), 'cyan');
  log(`📊 ${languageInfo.name} Test Results`, 'bright');
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
  
  log('\n🚀 Starting Multi-Language Testing', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Test Type: ${testType.toUpperCase()}`, 'bright');
  log(`Workers: ${process.env.WORKERS || '4'}`, 'blue');
  log(`Headless: ${process.env.HEADLESS !== 'false'}`, 'blue');
  log('='.repeat(60), 'cyan');
  
  let success = false;
  
  if (testType === 'all') {
    success = runAllLanguages();
  } else if (languages[testType]) {
    success = runSingleLanguage(testType);
  } else {
    log(`❌ Unknown test type: ${testType}`, 'red');
    showHelp();
    process.exit(1);
  }
  
  process.exit(success ? 0 : 1);
}

main();
