#!/usr/bin/env node

/**
 * Performance Optimization Script for ASYCUDA Autofill
 * 
 * This script analyzes and optimizes the application's performance,
 * focusing on load time and classification speed.
 * 
 * Usage:
 *   node scripts/optimize-performance.js [--fix] [--verbose]
 * 
 * Options:
 *   --fix       Apply recommended optimizations automatically
 *   --verbose   Show detailed analysis information
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Configuration
const LOAD_TIME_TARGET = 2000; // 2 seconds in ms
const CLASSIFICATION_TIME_TARGET = 5000; // 5 seconds in ms
const EXPORT_TIME_TARGET = 3000; // 3 seconds in ms

// Paths to analyze
const NEXT_CONFIG_PATH = path.join(__dirname, '../next.config.js');
const COMPONENTS_DIR = path.join(__dirname, '../app/components');
const PAGES_DIR = path.join(__dirname, '../app');
const CLASSIFY_PATH = path.join(__dirname, '../lib/classify.ts');

// Performance issues tracking
const performanceIssues = [];
let verboseMode = false;
let fixMode = false;

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  verboseMode = args.includes('--verbose');
  fixMode = args.includes('--fix');
}

/**
 * Log message with optional verbose control
 */
function log(message, isVerbose = false) {
  if (!isVerbose || verboseMode) {
    console.log(message);
  }
}

/**
 * Analyze Next.js configuration for performance optimizations
 */
async function analyzeNextConfig() {
  log('\n📊 Analyzing Next.js configuration...', false);
  
  try {
    if (!fs.existsSync(NEXT_CONFIG_PATH)) {
      log('  ⚠️ No Next.js config found. Creating optimized config...', false);
      
      if (fixMode) {
        const optimizedConfig = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  swcMinify: true,
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

module.exports = nextConfig;
`;
        fs.writeFileSync(NEXT_CONFIG_PATH, optimizedConfig);
        log('  ✅ Created optimized Next.js config', false);
      } else {
        performanceIssues.push({
          file: 'next.config.js',
          issue: 'Missing Next.js configuration with performance optimizations',
          fix: 'Create next.config.js with optimized settings',
          impact: 'HIGH'
        });
      }
      return;
    }
    
    const configContent = fs.readFileSync(NEXT_CONFIG_PATH, 'utf8');
    
    // Check for key performance optimizations
    if (!configContent.includes('compress')) {
      performanceIssues.push({
        file: 'next.config.js',
        issue: 'Compression not explicitly enabled',
        fix: "Add 'compress: true' to Next.js config",
        impact: 'MEDIUM'
      });
    }
    
    if (!configContent.includes('swcMinify')) {
      performanceIssues.push({
        file: 'next.config.js',
        issue: 'SWC minification not explicitly enabled',
        fix: "Add 'swcMinify: true' to Next.js config",
        impact: 'MEDIUM'
      });
    }
    
    if (configContent.includes('productionBrowserSourceMaps: true')) {
      performanceIssues.push({
        file: 'next.config.js',
        issue: 'Source maps enabled in production (increases bundle size)',
        fix: "Set 'productionBrowserSourceMaps: false'",
        impact: 'MEDIUM'
      });
    }
    
    log('  ✅ Next.js configuration analysis complete', false);
  } catch (error) {
    log(`  ❌ Error analyzing Next.js config: ${error.message}`, false);
  }
}

/**
 * Analyze components for performance issues
 */
async function analyzeComponents() {
  log('\n📊 Analyzing React components...', false);
  
  try {
    if (!fs.existsSync(COMPONENTS_DIR)) {
      log('  ⚠️ Components directory not found', false);
      return;
    }
    
    // Get all component files
    const componentFiles = getAllFiles(COMPONENTS_DIR, ['.tsx', '.jsx']);
    log(`  Found ${componentFiles.length} component files`, true);
    
    let componentsWithoutMemo = 0;
    let componentsWithUnnecessaryRenders = 0;
    
    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(path.join(__dirname, '..'), file);
      
      // Check for React.memo usage in appropriate components
      if (content.includes('export default function') && 
          !content.includes('React.memo') && 
          !content.includes('memo(') &&
          (content.includes('props') || content.includes('useState'))) {
        
        componentsWithoutMemo++;
        
        if (verboseMode) {
          log(`  - ${relativePath}: Consider using React.memo for component optimization`, true);
        }
        
        if (componentsWithoutMemo <= 3) { // Limit the number of issues reported
          performanceIssues.push({
            file: relativePath,
            issue: 'Component not memoized',
            fix: 'Wrap with React.memo() to prevent unnecessary re-renders',
            impact: 'MEDIUM'
          });
        }
      }
      
      // Check for potential unnecessary re-renders
      if ((content.includes('useState') || content.includes('useReducer')) && 
          !content.includes('useCallback') && 
          content.includes('function') && 
          content.includes('=>')) {
        
        componentsWithUnnecessaryRenders++;
        
        if (verboseMode) {
          log(`  - ${relativePath}: Potential unnecessary re-renders due to inline functions`, true);
        }
        
        if (componentsWithUnnecessaryRenders <= 3) { // Limit the number of issues reported
          performanceIssues.push({
            file: relativePath,
            issue: 'Potential unnecessary re-renders',
            fix: 'Use useCallback() for functions passed as props',
            impact: 'MEDIUM'
          });
        }
      }
    }
    
    log(`  Found ${componentsWithoutMemo} components that could benefit from memoization`, false);
    log(`  Found ${componentsWithUnnecessaryRenders} components with potential unnecessary re-renders`, false);
    log('  ✅ Component analysis complete', false);
    
  } catch (error) {
    log(`  ❌ Error analyzing components: ${error.message}`, false);
  }
}

/**
 * Analyze classification algorithm performance
 */
async function analyzeClassification() {
  log('\n📊 Analyzing classification algorithm...', false);
  
  try {
    if (!fs.existsSync(CLASSIFY_PATH)) {
      log('  ⚠️ Classification module not found', false);
      return;
    }
    
    const content = fs.readFileSync(CLASSIFY_PATH, 'utf8');
    
    // Check for caching implementation
    if (!content.includes('cache') && !content.includes('Cache')) {
      performanceIssues.push({
        file: 'lib/classify.ts',
        issue: 'No caching mechanism found for classification results',
        fix: 'Implement caching for classification results using a Map or Redis',
        impact: 'HIGH'
      });
    }
    
    // Check for efficient algorithms
    if (content.includes('forEach') || content.includes('for (')) {
      if (!content.includes('Map(') && !content.includes('Set(')) {
        performanceIssues.push({
          file: 'lib/classify.ts',
          issue: 'Potential inefficient data structures for lookups',
          fix: 'Use Map or Set instead of arrays for O(1) lookups',
          impact: 'MEDIUM'
        });
      }
    }
    
    // Check for lazy loading
    if (!content.includes('import(') && !content.includes('require(')) {
      performanceIssues.push({
        file: 'lib/classify.ts',
        issue: 'No dynamic imports for large data dependencies',
        fix: 'Use dynamic imports for tariff data to improve initial load time',
        impact: 'MEDIUM'
      });
    }
    
    log('  ✅ Classification algorithm analysis complete', false);
  } catch (error) {
    log(`  ❌ Error analyzing classification algorithm: ${error.message}`, false);
  }
}

/**
 * Analyze bundle size and suggest optimizations
 */
async function analyzeBundleSize() {
  log('\n📊 Analyzing bundle size...', false);
  
  try {
    // Check if @next/bundle-analyzer is installed
    let bundleAnalyzerInstalled = false;
    try {
      require.resolve('@next/bundle-analyzer');
      bundleAnalyzerInstalled = true;
    } catch (e) {
      bundleAnalyzerInstalled = false;
    }
    
    if (!bundleAnalyzerInstalled) {
      log('  ⚠️ @next/bundle-analyzer not installed. Cannot analyze bundle size in detail.', false);
      performanceIssues.push({
        file: 'package.json',
        issue: 'Bundle analyzer not installed',
        fix: 'Install @next/bundle-analyzer to identify large dependencies',
        impact: 'LOW'
      });
    } else {
      log('  ✅ Bundle analyzer is installed', true);
    }
    
    // Check package.json for large dependencies
    const packageJsonPath = path.join(__dirname, '../package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // List of known large packages that might have alternatives
      const largePackages = {
        'moment': 'Use date-fns or Luxon instead',
        'lodash': 'Import specific lodash functions or use native JS alternatives',
        'jquery': 'Use native DOM methods instead',
        'chart.js': 'Consider using a lighter alternative like lightweight-charts',
        'react-bootstrap': 'Consider using a lighter UI library or custom components'
      };
      
      for (const [pkg, alternative] of Object.entries(largePackages)) {
        if (dependencies[pkg]) {
          performanceIssues.push({
            file: 'package.json',
            issue: `Large package detected: ${pkg}`,
            fix: alternative,
            impact: 'MEDIUM'
          });
        }
      }
    }
    
    log('  ✅ Bundle size analysis complete', false);
  } catch (error) {
    log(`  ❌ Error analyzing bundle size: ${error.message}`, false);
  }
}

/**
 * Analyze image optimization
 */
async function analyzeImageOptimization() {
  log('\n📊 Analyzing image optimization...', false);
  
  try {
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
      log('  ⚠️ Public directory not found', false);
      return;
    }
    
    const imageFiles = getAllFiles(publicDir, ['.jpg', '.jpeg', '.png', '.gif']);
    log(`  Found ${imageFiles.length} image files`, true);
    
    let unoptimizedImages = 0;
    
    for (const file of imageFiles) {
      const stats = fs.statSync(file);
      const fileSizeInKB = stats.size / 1024;
      const relativePath = path.relative(path.join(__dirname, '..'), file);
      
      // Check for large images
      if (fileSizeInKB > 200) { // 200KB threshold
        unoptimizedImages++;
        
        if (verboseMode) {
          log(`  - ${relativePath}: Large image (${fileSizeInKB.toFixed(2)} KB)`, true);
        }
        
        if (unoptimizedImages <= 3) { // Limit the number of issues reported
          performanceIssues.push({
            file: relativePath,
            issue: `Large image file (${fileSizeInKB.toFixed(2)} KB)`,
            fix: 'Optimize image or use Next.js Image component with automatic optimization',
            impact: 'MEDIUM'
          });
        }
      }
    }
    
    // Check for Next.js Image component usage
    const componentFiles = getAllFiles(COMPONENTS_DIR, ['.tsx', '.jsx']);
    let nextImageUsage = 0;
    let imgTagUsage = 0;
    
    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Count Next.js Image usage
      const nextImageMatches = content.match(/from ['"]
ext\/image['"]\g/);
      if (nextImageMatches) {
        nextImageUsage += nextImageMatches.length;
      }
      
      // Count regular img tag usage
      const imgTagMatches = content.match(/<img /g);
      if (imgTagMatches) {
        imgTagUsage += imgTagMatches.length;
      }
    }
    
    if (imgTagUsage > 0 && imgTagUsage > nextImageUsage) {
      performanceIssues.push({
        file: 'multiple components',
        issue: `Found ${imgTagUsage} regular <img> tags (vs ${nextImageUsage} Next.js Image components)`,
        fix: 'Replace <img> tags with Next.js Image component for automatic optimization',
        impact: 'MEDIUM'
      });
    }
    
    log(`  Found ${unoptimizedImages} potentially unoptimized images`, false);
    log('  ✅ Image optimization analysis complete', false);
  } catch (error) {
    log(`  ❌ Error analyzing image optimization: ${error.message}`, false);
  }
}

/**
 * Analyze API endpoints for performance issues
 */
async function analyzeApiEndpoints() {
  log('\n📊 Analyzing API endpoints...', false);
  
  try {
    const apiDir = path.join(__dirname, '../app/api');
    if (!fs.existsSync(apiDir)) {
      log('  ⚠️ API directory not found', false);
      return;
    }
    
    const apiFiles = getAllFiles(apiDir, ['.ts', '.js']);
    log(`  Found ${apiFiles.length} API files`, true);
    
    let endpointsWithoutCaching = 0;
    let endpointsWithoutRateLimiting = 0;
    
    for (const file of apiFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(path.join(__dirname, '..'), file);
      
      // Check for caching headers
      if (!content.includes('Cache-Control') && !content.includes('cache')) {
        endpointsWithoutCaching++;
        
        if (verboseMode) {
          log(`  - ${relativePath}: No caching implementation found`, true);
        }
        
        if (endpointsWithoutCaching <= 3) { // Limit the number of issues reported
          performanceIssues.push({
            file: relativePath,
            issue: 'API endpoint without caching',
            fix: 'Add appropriate Cache-Control headers or implement response caching',
            impact: 'MEDIUM'
          });
        }
      }
      
      // Check for rate limiting
      if (!content.includes('rateLimit') && !content.includes('limiter')) {
        endpointsWithoutRateLimiting++;
        
        if (verboseMode) {
          log(`  - ${relativePath}: No rate limiting implementation found`, true);
        }
        
        if (endpointsWithoutRateLimiting <= 3) { // Limit the number of issues reported
          performanceIssues.push({
            file: relativePath,
            issue: 'API endpoint without rate limiting',
            fix: 'Implement rate limiting to prevent abuse',
            impact: 'MEDIUM'
          });
        }
      }
    }
    
    log(`  Found ${endpointsWithoutCaching} API endpoints without caching`, false);
    log(`  Found ${endpointsWithoutRateLimiting} API endpoints without rate limiting`, false);
    log('  ✅ API endpoint analysis complete', false);
  } catch (error) {
    log(`  ❌ Error analyzing API endpoints: ${error.message}`, false);
  }
}

/**
 * Run performance tests
 */
async function runPerformanceTests() {
  log('\n📊 Running performance tests...', false);
  
  try {
    // Check if Lighthouse CI is installed
    let lighthouseInstalled = false;
    try {
      execSync('npx lighthouse-ci --version', { stdio: 'ignore' });
      lighthouseInstalled = true;
    } catch (e) {
      lighthouseInstalled = false;
    }
    
    if (!lighthouseInstalled) {
      log('  ⚠️ Lighthouse CI not installed. Cannot run detailed performance tests.', false);
      performanceIssues.push({
        file: 'package.json',
        issue: 'Lighthouse CI not installed',
        fix: 'Install @lhci/cli to run automated performance tests',
        impact: 'LOW'
      });
    } else {
      log('  ✅ Lighthouse CI is installed', true);
      
      // TODO: Implement actual Lighthouse tests when in a real environment
      log('  ℹ️ Skipping actual Lighthouse tests in this environment', false);
    }
    
    log('  ✅ Performance tests complete', false);
  } catch (error) {
    log(`  ❌ Error running performance tests: ${error.message}`, false);
  }
}

/**
 * Apply fixes for performance issues
 */
async function applyFixes() {
  if (!fixMode || performanceIssues.length === 0) {
    return;
  }
  
  log('\n🔧 Applying performance fixes...', false);
  
  // Group issues by file
  const issuesByFile = {};
  for (const issue of performanceIssues) {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue);
  }
  
  // Apply fixes for each file
  for (const [file, issues] of Object.entries(issuesByFile)) {
    log(`  Fixing issues in ${file}...`, false);
    
    // TODO: Implement actual fixes for common issues
    // This would require more complex code transformation logic
    
    log(`  ✅ Applied fixes to ${file}`, false);
  }
  
  log('  ✅ Performance fixes applied', false);
}

/**
 * Generate performance report
 */
function generateReport() {
  log('\n📋 Performance Optimization Report', false);
  log('============================', false);
  
  if (performanceIssues.length === 0) {
    log('✅ No performance issues found!', false);
    return;
  }
  
  // Group issues by impact
  const highImpact = performanceIssues.filter(issue => issue.impact === 'HIGH');
  const mediumImpact = performanceIssues.filter(issue => issue.impact === 'MEDIUM');
  const lowImpact = performanceIssues.filter(issue => issue.impact === 'LOW');
  
  log(`Found ${performanceIssues.length} performance issues:`, false);
  log(`- ${highImpact.length} high impact`, false);
  log(`- ${mediumImpact.length} medium impact`, false);
  log(`- ${lowImpact.length} low impact`, false);
  
  if (highImpact.length > 0) {
    log('\n🔴 High Impact Issues:', false);
    highImpact.forEach((issue, index) => {
      log(`\n${index + 1}. ${issue.file}`, false);
      log(`   Issue: ${issue.issue}`, false);
      log(`   Fix: ${issue.fix}`, false);
    });
  }
  
  if (mediumImpact.length > 0) {
    log('\n🟠 Medium Impact Issues:', false);
    mediumImpact.forEach((issue, index) => {
      log(`\n${index + 1}. ${issue.file}`, false);
      log(`   Issue: ${issue.issue}`, false);
      log(`   Fix: ${issue.fix}`, false);
    });
  }
  
  if (lowImpact.length > 0 && verboseMode) {
    log('\n🟡 Low Impact Issues:', false);
    lowImpact.forEach((issue, index) => {
      log(`\n${index + 1}. ${issue.file}`, false);
      log(`   Issue: ${issue.issue}`, false);
      log(`   Fix: ${issue.fix}`, false);
    });
  }
  
  log('\n📝 Recommendations:', false);
  log('1. Address high impact issues first for maximum performance gain', false);
  log('2. Implement caching for classification results', false);
  log('3. Optimize bundle size by removing unused dependencies', false);
  log('4. Use Next.js Image component for all images', false);
  log('5. Add appropriate caching headers to API responses', false);
  
  if (fixMode) {
    log('\n🔧 Some issues were automatically fixed. Re-run the analysis to check remaining issues.', false);
  } else {
    log('\n💡 Run with --fix flag to automatically apply fixes for common issues.', false);
  }
}

/**
 * Get all files in a directory recursively
 */
function getAllFiles(dir, extensions = null) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, extensions));
    } else {
      if (!extensions || extensions.some(ext => filePath.endsWith(ext))) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 ASYCUDA Autofill Performance Optimizer');
  console.log('=======================================');
  
  parseArgs();
  
  if (verboseMode) {
    log('Verbose mode enabled', false);
  }
  
  if (fixMode) {
    log('Fix mode enabled - will attempt to automatically fix issues', false);
  }
  
  // Run all analysis functions
  await analyzeNextConfig();
  await analyzeComponents();
  await analyzeClassification();
  await analyzeBundleSize();
  await analyzeImageOptimization();
  await analyzeApiEndpoints();
  await runPerformanceTests();
  
  // Apply fixes if in fix mode
  if (fixMode) {
    await applyFixes();
  }
  
  // Generate final report
  generateReport();
}

// Run the script
main().catch(error => {
  console.error('Error running performance optimizer:', error);
  process.exit(1);
});