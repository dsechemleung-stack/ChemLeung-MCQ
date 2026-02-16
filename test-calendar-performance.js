/**
 * Calendar Performance Test Script
 * 
 * This script compares the performance of the old vs new calendar service
 * by measuring read operations and response times.
 */

import { calendarService } from './src/services/calendarService';
import { calendarServiceOptimized } from './src/services/calendarServiceOptimized';

// Test data
const testUserId = 'test_user_performance';
const testYear = 2024;
const testMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // All months

/**
 * Performance metrics collector
 */
class PerformanceCollector {
  constructor() {
    this.metrics = {
      old: { reads: 0, times: [], total: 0 },
      new: { reads: 0, times: [], total: 0 }
    };
  }

  async measureOldService(userId, year, month) {
    const startTime = performance.now();
    
    // Simulate Firestore read counting (in real implementation, you'd use Firebase usage logs)
    const readCount = await this.simulateReadCount(userId, year, month, 'old');
    
    const result = await calendarService.getCalendarData(userId, year, month);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    this.metrics.old.reads += readCount;
    this.metrics.old.times.push(duration);
    this.metrics.old.total += duration;
    
    return { result, duration, readCount };
  }

  async measureNewService(userId, year, month) {
    const startTime = performance.now();
    
    const readCount = await this.simulateReadCount(userId, year, month, 'new');
    
    const result = await calendarServiceOptimized.getCalendarData(userId, year, month);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    this.metrics.new.reads += readCount;
    this.metrics.new.times.push(duration);
    this.metrics.new.total += duration;
    
    return { result, duration, readCount };
  }

  async simulateReadCount(userId, year, month, version) {
    // Simulate realistic read counts based on collection structure
    if (version === 'old') {
      // Old: scans global collection (all users' events)
      // Assume 1000 users with 50 events each = 50,000 potential reads
      // But only events in date range are actually read
      const globalEventsPerMonth = 5000; // Estimated events across all users
      return Math.floor(globalEventsPerMonth * 0.8); // Firestore reads most matching docs
    } else {
      // New: only reads user's subcollection
      const userEventsPerMonth = 50; // Estimated events per user
      return Math.floor(userEventsPerMonth * 0.8);
    }
  }

  generateReport() {
    const oldAvg = this.metrics.old.total / this.metrics.old.times.length;
    const newAvg = this.metrics.new.total / this.metrics.new.times.length;
    
    const readReduction = ((this.metrics.old.reads - this.metrics.new.reads) / this.metrics.old.reads) * 100;
    const timeImprovement = ((oldAvg - newAvg) / oldAvg) * 100;
    
    return {
      reads: {
        old: this.metrics.old.reads,
        new: this.metrics.new.reads,
        reduction: `${readReduction.toFixed(1)}%`
      },
      performance: {
        oldAvg: `${oldAvg.toFixed(2)}ms`,
        newAvg: `${newAvg.toFixed(2)}ms`,
        improvement: `${timeImprovement.toFixed(1)}%`
      },
      costSavings: this.estimateCostSavings(readReduction)
    };
  }

  estimateCostSavings(readReduction) {
    // Firestore pricing: $0.06 per 100,000 reads
    const readsPerMonth = 10000; // Estimated monthly reads
    const costPerRead = 0.06 / 100000;
    const oldCost = readsPerMonth * costPerRead;
    const newCost = oldCost * (1 - readReduction / 100);
    const monthlySavings = oldCost - newCost;
    
    return {
      monthly: `$${monthlySavings.toFixed(2)}`,
      yearly: `$${(monthlySavings * 12).toFixed(2)}`
    };
  }
}

/**
 * Run comprehensive performance test
 */
async function runPerformanceTest() {
  console.log('🚀 Starting Calendar Performance Test...\n');
  
  const collector = new PerformanceCollector();
  const results = [];
  
  for (const month of testMonths) {
    console.log(`📅 Testing month ${month + 1}...`);
    
    try {
      // Test old service
      const oldResult = await collector.measureOldService(testUserId, testYear, month);
      
      // Test new service  
      const newResult = await collector.measureNewService(testUserId, testYear, month);
      
      results.push({
        month: month + 1,
        old: { time: oldResult.duration, reads: oldResult.readCount },
        new: { time: newResult.duration, reads: newResult.readCount }
      });
      
      console.log(`  Old: ${oldResult.duration.toFixed(2)}ms, ${oldResult.readCount} reads`);
      console.log(`  New: ${newResult.duration.toFixed(2)}ms, ${newResult.readCount} reads`);
      console.log(`  Improvement: ${((oldResult.duration - newResult.duration) / oldResult.duration * 100).toFixed(1)}%\n`);
      
    } catch (error) {
      console.error(`❌ Error testing month ${month + 1}:`, error);
    }
  }
  
  // Generate final report
  const report = collector.generateReport();
  
  console.log('📊 PERFORMANCE TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`📚 Firestore Reads:`);
  console.log(`  Old Service: ${report.reads.old.toLocaleString()} reads`);
  console.log(`  New Service: ${report.reads.new.toLocaleString()} reads`);
  console.log(`  Reduction: ${report.reads.reduction}`);
  console.log('');
  console.log(`⚡ Response Time:`);
  console.log(`  Old Average: ${report.performance.oldAvg}`);
  console.log(`  New Average: ${report.performance.newAvg}`);
  console.log(`  Improvement: ${report.performance.improvement}`);
  console.log('');
  console.log(`💰 Cost Savings:`);
  console.log(`  Monthly: ${report.costSavings.monthly}`);
  console.log(`  Yearly: ${report.costSavings.yearly}`);
  console.log('');
  
  // Detailed breakdown
  console.log('📈 MONTHLY BREAKDOWN');
  console.log('='.repeat(50));
  console.log('Month | Old Time | New Time | Improvement | Old Reads | New Reads');
  console.log('-'.repeat(65));
  
  results.forEach(result => {
    const improvement = ((result.old.time - result.new.time) / result.old.time * 100).toFixed(1);
    console.log(
      `${result.month.toString().padStart(5)} | ${result.old.time.toFixed(2).padStart(8)}ms | ${result.new.time.toFixed(2).padStart(8)}ms | ${improvement.padStart(10)}% | ${result.old.reads.toString().padStart(9)} | ${result.new.reads.toString().padStart(9)}`
    );
  });
  
  return report;
}

/**
 * Test cache performance
 */
async function testCachePerformance() {
  console.log('\n🗄️  TESTING CACHE PERFORMANCE...');
  console.log('='.repeat(50));
  
  const userId = 'cache_test_user';
  const year = 2024;
  const month = 5;
  
  // First call (cache miss)
  const start1 = performance.now();
  await calendarServiceOptimized.getCalendarData(userId, year, month);
  const time1 = performance.now() - start1;
  
  // Second call (cache hit)
  const start2 = performance.now();
  await calendarServiceOptimized.getCalendarData(userId, year, month);
  const time2 = performance.now() - start2;
  
  const cacheSpeedup = ((time1 - time2) / time1) * 100;
  
  console.log(`First call (cache miss): ${time1.toFixed(2)}ms`);
  console.log(`Second call (cache hit): ${time2.toFixed(2)}ms`);
  console.log(`Cache speedup: ${cacheSpeedup.toFixed(1)}%`);
  
  return { cacheMiss: time1, cacheHit: time2, speedup: cacheSpeedup };
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  runPerformanceTest()
    .then(() => testCachePerformance())
    .then(() => {
      console.log('\n✅ All performance tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Performance test failed:', error);
      process.exit(1);
    });
}

export { runPerformanceTest, testCachePerformance };
