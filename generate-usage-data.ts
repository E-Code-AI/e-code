/**
 * Generate comprehensive usage data for testing
 */

import { db } from './server/db';
import { projects, files, usageTracking, users } from '@shared/schema';
import { resourceMonitor } from './server/services/resource-monitor';
import { stripeBillingService } from './server/services/stripe-billing-service';
import * as fs from 'fs';
import * as path from 'path';

async function generateUsageData() {
  console.log('🚀 Generating comprehensive usage data...\n');

  try {
    // Test users to generate data for
    const testUsers = [
      { id: 1, name: 'admin', projects: 3, highUsage: true },
      { id: 2, name: 'testuser', projects: 2, highUsage: false }
    ];

    for (const testUser of testUsers) {
      console.log(`\n👤 Generating data for user: ${testUser.name}`);
      
      // Create multiple projects per user
      for (let i = 0; i < testUser.projects; i++) {
        const projectName = `${testUser.name}-project-${i + 1}`;
        console.log(`\n📁 Creating project: ${projectName}`);
        
        // Create project
        const [project] = await db.insert(projects).values({
          name: projectName,
          description: `Test project ${i + 1} for ${testUser.name}`,
          ownerId: testUser.id,
          language: ['javascript', 'python', 'typescript'][i % 3] as any,
          visibility: 'private',
          views: Math.floor(Math.random() * 1000),
          likes: Math.floor(Math.random() * 100),
          forks: Math.floor(Math.random() * 50),
          runs: Math.floor(Math.random() * 500),
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        // Start monitoring
        await resourceMonitor.startProjectMonitoring(project.id, testUser.id);

        // Generate CPU usage
        console.log('   ⚡ Generating CPU usage...');
        const cpuIntensity = testUser.highUsage ? 10000000 : 5000000;
        const startTime = Date.now();
        let result = 0;
        for (let j = 0; j < cpuIntensity; j++) {
          result += Math.sqrt(j) * Math.sin(j);
        }
        const cpuTime = (Date.now() - startTime) / 1000;
        console.log(`   ✓ CPU: ${cpuTime.toFixed(2)}s`);

        // Generate storage usage
        console.log('   💾 Generating storage usage...');
        const projectDir = path.join(process.cwd(), 'projects', project.id.toString());
        if (!fs.existsSync(projectDir)) {
          fs.mkdirSync(projectDir, { recursive: true });
        }

        const fileCount = testUser.highUsage ? 10 : 5;
        let totalSize = 0;
        
        for (let j = 0; j < fileCount; j++) {
          const fileSize = (Math.random() * 100 + 20) * 1024; // 20-120 KB
          const fileName = `file-${j}.${['js', 'py', 'css', 'json'][j % 4]}`;
          const fileContent = 'x'.repeat(Math.floor(fileSize));
          
          fs.writeFileSync(path.join(projectDir, fileName), fileContent);
          
          await db.insert(files).values({
            projectId: project.id,
            name: fileName,
            path: `/${fileName}`,
            content: fileContent,
            isDirectory: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          totalSize += fileSize;
        }
        console.log(`   ✓ Storage: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

        // Generate bandwidth usage (simulated)
        console.log('   🌐 Simulating bandwidth usage...');
        const bandwidthMB = testUser.highUsage ? 
          Math.random() * 500 + 100 : // 100-600 MB
          Math.random() * 100 + 10;   // 10-110 MB
        
        const now = new Date();
        const billingStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const billingEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        await db.insert(usageTracking).values({
          userId: testUser.id,
          metricType: 'bandwidth',
          value: bandwidthMB / 1024, // Convert to GB
          unit: 'GB',
          timestamp: now,
          billingPeriodStart: billingStart,
          billingPeriodEnd: billingEnd
        });
        console.log(`   ✓ Bandwidth: ${bandwidthMB.toFixed(0)} MB`);

        // Generate deployment usage
        console.log('   🚀 Simulating deployments...');
        const deployments = testUser.highUsage ? 
          Math.floor(Math.random() * 10) + 5 : // 5-15 deployments
          Math.floor(Math.random() * 3) + 1;   // 1-4 deployments
        
        await db.insert(usageTracking).values({
          userId: testUser.id,
          metricType: 'deployment',
          value: deployments,
          unit: 'deployment',
          timestamp: now,
          billingPeriodStart: billingStart,
          billingPeriodEnd: billingEnd
        });
        console.log(`   ✓ Deployments: ${deployments}`);

        // Generate AI agent requests
        console.log('   🤖 Simulating AI agent requests...');
        const aiRequests = testUser.highUsage ? 
          Math.floor(Math.random() * 100) + 50 : // 50-150 requests
          Math.floor(Math.random() * 20) + 5;    // 5-25 requests
        
        await db.insert(usageTracking).values({
          userId: testUser.id,
          metricType: 'agentRequests',
          value: aiRequests,
          unit: 'request',
          timestamp: now,
          billingPeriodStart: billingStart,
          billingPeriodEnd: billingEnd
        });
        console.log(`   ✓ AI Requests: ${aiRequests}`);

        // Generate database operations
        console.log('   🗄️ Simulating database operations...');
        const dbOps = testUser.highUsage ? 
          Math.floor(Math.random() * 50) + 20 : // 20-70 operations
          Math.floor(Math.random() * 10) + 2;   // 2-12 operations
        
        await db.insert(usageTracking).values({
          userId: testUser.id,
          metricType: 'database_storage',
          value: dbOps * 0.01, // Each op = 0.01 GB
          unit: 'GB',
          timestamp: now,
          billingPeriodStart: billingStart,
          billingPeriodEnd: billingEnd
        });
        console.log(`   ✓ Database: ${dbOps} operations`);

        // Stop monitoring to save metrics
        await resourceMonitor.stopProjectMonitoring(project.id);
        
        // Report to Stripe
        console.log('   📊 Reporting to Stripe...');
        await stripeBillingService.reportUsage(testUser.id, 'agentRequests', aiRequests);
        await stripeBillingService.reportUsage(testUser.id, 'compute', cpuTime);
        await stripeBillingService.reportUsage(testUser.id, 'storage', totalSize / 1024 / 1024 / 1024); // GB
        await stripeBillingService.reportUsage(testUser.id, 'bandwidth', bandwidthMB / 1024); // GB
        await stripeBillingService.reportUsage(testUser.id, 'deployments', deployments);
        
        console.log(`   ✅ Project ${projectName} completed!`);

        // Small delay between projects
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Generate historical data for better charts
    console.log('\n📈 Generating historical data...');
    const now = new Date();
    
    for (let daysAgo = 30; daysAgo >= 0; daysAgo -= 3) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      
      for (const testUser of testUsers) {
        // Generate varying usage patterns
        const multiplier = 1 + (Math.sin(daysAgo / 5) * 0.3); // Creates wave pattern
        
        const histBillingStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const histBillingEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        await db.insert(usageTracking).values([
          {
            userId: testUser.id,
            metricType: 'compute_cpu',
            value: (Math.random() * 10 + 5) * multiplier,
            unit: 'seconds',
            timestamp: date,
            billingPeriodStart: histBillingStart,
            billingPeriodEnd: histBillingEnd
          },
          {
            userId: testUser.id,
            metricType: 'storage',
            value: (Math.random() * 0.5 + 0.1) * multiplier,
            unit: 'GB',
            timestamp: date,
            billingPeriodStart: histBillingStart,
            billingPeriodEnd: histBillingEnd
          },
          {
            userId: testUser.id,
            metricType: 'bandwidth',
            value: (Math.random() * 2 + 0.5) * multiplier,
            unit: 'GB',
            timestamp: date,
            billingPeriodStart: histBillingStart,
            billingPeriodEnd: histBillingEnd
          },
          {
            userId: testUser.id,
            metricType: 'agentRequests',
            value: Math.floor((Math.random() * 50 + 10) * multiplier),
            unit: 'request',
            timestamp: date,
            billingPeriodStart: histBillingStart,
            billingPeriodEnd: histBillingEnd
          }
        ]);
      }
    }

    console.log('\n🎉 Data generation complete!');
    console.log('\n📊 Summary:');
    
    // Get usage summary
    const usageSummary = await db.select().from(usageTracking)
      .orderBy(usageTracking.timestamp);
    
    const summary: Record<string, number> = {};
    usageSummary.forEach(usage => {
      const key = `${usage.metricType} (${usage.unit})`;
      summary[key] = (summary[key] || 0) + parseFloat(usage.value.toString());
    });
    
    Object.entries(summary).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value.toFixed(2)}`);
    });
    
    console.log(`\n   Total records: ${usageSummary.length}`);
    console.log('\n✅ Check the Admin Usage page at /admin/usage to see all the data!');

  } catch (error) {
    console.error('❌ Error generating data:', error);
  }

  process.exit(0);
}

// Run the generator
generateUsageData();