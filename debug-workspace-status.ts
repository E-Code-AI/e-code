/**
 * Workspace Connection & Progress Diagnostic Script
 *
 * This script checks the database to see if the backend is making progress
 * on planning or executing workflows, even when the workspace appears stuck.
 */

import { dbPool } from './server/db';
import { createLogger } from './server/utils/logger';

const logger = createLogger('workspace-diagnostic');

interface DiagnosticResults {
  timestamp: Date;
  databaseConnected: boolean;
  recentSessions: any[];
  buildExecutions: any[];
  agentPlans: any[];
  agentWorkflows: any[];
  fileOperations: any[];
  activeConnections: any;
}

async function runDiagnostics(): Promise<DiagnosticResults> {
  const results: DiagnosticResults = {
    timestamp: new Date(),
    databaseConnected: false,
    recentSessions: [],
    buildExecutions: [],
    agentPlans: [],
    agentWorkflows: [],
    fileOperations: [],
    activeConnections: null,
  };

  try {
    // Check database connection
    const healthCheck = await dbPool.healthCheck();
    results.databaseConnected = healthCheck.status === 'healthy';
    results.activeConnections = healthCheck.details?.poolStats;

    if (!results.databaseConnected) {
      logger.error('Database is not healthy:', healthCheck.details);
      return results;
    }

    logger.info('Database connection healthy', results.activeConnections);

    // Query 1: Recent agent sessions (last 1 hour)
    const sessionsQuery = await dbPool.query(`
      SELECT
        id,
        "userId",
        "projectId",
        model,
        "isActive",
        "autonomousMode",
        "startedAt",
        "endedAt",
        "totalTokensUsed",
        "totalOperations",
        context,
        metadata
      FROM "agentSessions"
      WHERE "startedAt" > NOW() - INTERVAL '1 hour'
      ORDER BY "startedAt" DESC
      LIMIT 10
    `);
    results.recentSessions = sessionsQuery.rows;
    logger.info(`Found ${sessionsQuery.rows.length} recent agent sessions`);

    // Query 2: Build executions with current progress
    const buildExecutionsQuery = await dbPool.query(`
      SELECT
        id,
        "projectId",
        "conversationId",
        "planId",
        status,
        "currentTaskId",
        "currentTaskIndex",
        progress,
        "totalTasks",
        "executionLog",
        error,
        metadata,
        "startedAt",
        "completedAt",
        "createdAt"
      FROM "buildExecutions"
      WHERE "createdAt" > NOW() - INTERVAL '1 hour'
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);
    results.buildExecutions = buildExecutionsQuery.rows;
    logger.info(`Found ${buildExecutionsQuery.rows.length} build executions`);

    // Query 3: Agent plans
    const plansQuery = await dbPool.query(`
      SELECT
        id,
        "sessionId",
        "planId",
        goal,
        tasks,
        "estimatedTime",
        status,
        metadata,
        "createdAt",
        "updatedAt"
      FROM "agentPlans"
      WHERE "createdAt" > NOW() - INTERVAL '1 hour'
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);
    results.agentPlans = plansQuery.rows;
    logger.info(`Found ${plansQuery.rows.length} agent plans`);

    // Query 4: Agent workflows
    const workflowsQuery = await dbPool.query(`
      SELECT
        id,
        "sessionId",
        name,
        description,
        steps,
        "currentStep",
        status,
        progress,
        result,
        error,
        checkpoints,
        "startedAt",
        "completedAt",
        "createdAt"
      FROM "agentWorkflows"
      WHERE "createdAt" > NOW() - INTERVAL '1 hour'
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);
    results.agentWorkflows = workflowsQuery.rows;
    logger.info(`Found ${workflowsQuery.rows.length} agent workflows`);

    // Query 5: File operations
    const fileOpsQuery = await dbPool.query(`
      SELECT
        id,
        "sessionId",
        "operationType",
        "filePath",
        status,
        error,
        "executedAt",
        "createdAt"
      FROM "fileOperations"
      WHERE "createdAt" > NOW() - INTERVAL '1 hour'
      ORDER BY "createdAt" DESC
      LIMIT 20
    `);
    results.fileOperations = fileOpsQuery.rows;
    logger.info(`Found ${fileOpsQuery.rows.length} file operations`);

  } catch (error) {
    logger.error('Error running diagnostics:', error);
  }

  return results;
}

function formatResults(results: DiagnosticResults): void {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         WORKSPACE CONNECTION & PROGRESS DIAGNOSTIC             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`Timestamp: ${results.timestamp.toISOString()}\n`);

  // Database Connection Status
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('DATABASE CONNECTION');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log(`Status: ${results.databaseConnected ? '✅ CONNECTED' : '❌ DISCONNECTED'}`);
  if (results.activeConnections) {
    console.log(`Pool Stats: ${JSON.stringify(results.activeConnections, null, 2)}`);
  }
  console.log('');

  // Recent Agent Sessions
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('RECENT AGENT SESSIONS (Last 1 hour)');
  console.log('─────────────────────────────────────────────────────────────────');
  if (results.recentSessions.length === 0) {
    console.log('⚠️  No recent agent sessions found');
  } else {
    results.recentSessions.forEach((session, idx) => {
      console.log(`\nSession ${idx + 1}:`);
      console.log(`  ID: ${session.id}`);
      console.log(`  Project ID: ${session.projectId}`);
      console.log(`  Model: ${session.model}`);
      console.log(`  Active: ${session.isActive ? '✅ YES' : '❌ NO'}`);
      console.log(`  Autonomous: ${session.autonomousMode ? 'YES' : 'NO'}`);
      console.log(`  Started: ${session.startedAt}`);
      console.log(`  Ended: ${session.endedAt || 'Still running'}`);
      console.log(`  Tokens Used: ${session.totalTokensUsed || 0}`);
      console.log(`  Operations: ${session.totalOperations || 0}`);
      if (session.context?.workingDirectory) {
        console.log(`  Working Dir: ${session.context.workingDirectory}`);
      }
    });
  }
  console.log('');

  // Build Executions
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('BUILD EXECUTIONS (Workflow Progress)');
  console.log('─────────────────────────────────────────────────────────────────');
  if (results.buildExecutions.length === 0) {
    console.log('⚠️  No build executions found');
  } else {
    results.buildExecutions.forEach((build, idx) => {
      console.log(`\nExecution ${idx + 1}:`);
      console.log(`  ID: ${build.id}`);
      console.log(`  Project ID: ${build.projectId}`);
      console.log(`  Plan ID: ${build.planId || 'N/A'}`);
      console.log(`  Status: ${build.status.toUpperCase()}`);
      console.log(`  Progress: ${build.progress || 0}% (${build.currentTaskIndex || 0}/${build.totalTasks || 0} tasks)`);
      console.log(`  Current Task: ${build.currentTaskId || 'None'}`);
      console.log(`  Started: ${build.startedAt || 'Not started'}`);
      console.log(`  Completed: ${build.completedAt || 'In progress'}`);
      if (build.error) {
        console.log(`  ❌ Error: ${build.error}`);
      }
      if (build.executionLog && build.executionLog.length > 0) {
        console.log(`  Execution Log (last 3 entries):`);
        build.executionLog.slice(-3).forEach((log: any) => {
          console.log(`    - [${log.timestamp}] ${log.status}: ${log.message || log.taskId}`);
        });
      }
    });
  }
  console.log('');

  // Agent Plans
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('AGENT PLANS');
  console.log('─────────────────────────────────────────────────────────────────');
  if (results.agentPlans.length === 0) {
    console.log('⚠️  No agent plans found');
  } else {
    results.agentPlans.forEach((plan, idx) => {
      console.log(`\nPlan ${idx + 1}:`);
      console.log(`  ID: ${plan.planId}`);
      console.log(`  Session ID: ${plan.sessionId}`);
      console.log(`  Goal: ${plan.goal}`);
      console.log(`  Status: ${plan.status.toUpperCase()}`);
      console.log(`  Tasks: ${plan.tasks?.length || 0}`);
      console.log(`  Estimated Time: ${plan.estimatedTime || 'N/A'}`);
      console.log(`  Created: ${plan.createdAt}`);
      if (plan.tasks && plan.tasks.length > 0) {
        console.log(`  Task Summary:`);
        plan.tasks.slice(0, 3).forEach((task: any, taskIdx: number) => {
          console.log(`    ${taskIdx + 1}. ${task.description || task.name || 'Unnamed task'}`);
        });
        if (plan.tasks.length > 3) {
          console.log(`    ... and ${plan.tasks.length - 3} more tasks`);
        }
      }
    });
  }
  console.log('');

  // Agent Workflows
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('AGENT WORKFLOWS');
  console.log('─────────────────────────────────────────────────────────────────');
  if (results.agentWorkflows.length === 0) {
    console.log('⚠️  No agent workflows found');
  } else {
    results.agentWorkflows.forEach((workflow, idx) => {
      console.log(`\nWorkflow ${idx + 1}:`);
      console.log(`  ID: ${workflow.id}`);
      console.log(`  Name: ${workflow.name}`);
      console.log(`  Description: ${workflow.description || 'N/A'}`);
      console.log(`  Status: ${workflow.status.toUpperCase()}`);
      console.log(`  Progress: ${workflow.progress || 0}%`);
      console.log(`  Current Step: ${workflow.currentStep || 0}/${workflow.steps?.length || 0}`);
      console.log(`  Started: ${workflow.startedAt || 'Not started'}`);
      console.log(`  Completed: ${workflow.completedAt || 'In progress'}`);
      if (workflow.error) {
        console.log(`  ❌ Error: ${workflow.error}`);
      }
    });
  }
  console.log('');

  // File Operations
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('FILE OPERATIONS (Last 20)');
  console.log('─────────────────────────────────────────────────────────────────');
  if (results.fileOperations.length === 0) {
    console.log('⚠️  No file operations found - THIS IS THE ISSUE!');
    console.log('   If workflows are running but no files are being created,');
    console.log('   there may be a disconnect between planning and execution.');
  } else {
    const operationsByStatus = results.fileOperations.reduce((acc: any, op: any) => {
      acc[op.status] = (acc[op.status] || 0) + 1;
      return acc;
    }, {});
    console.log(`Summary: ${JSON.stringify(operationsByStatus)}\n`);

    results.fileOperations.slice(0, 10).forEach((op, idx) => {
      const statusIcon = op.status === 'completed' ? '✅' :
                        op.status === 'failed' ? '❌' :
                        op.status === 'in_progress' ? '🔄' : '⏳';
      console.log(`${idx + 1}. ${statusIcon} ${op.operationType.toUpperCase()}: ${op.filePath}`);
      console.log(`   Status: ${op.status} | Time: ${op.executedAt || op.createdAt}`);
      if (op.error) {
        console.log(`   Error: ${op.error}`);
      }
    });
  }
  console.log('');

  // Summary & Recommendations
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('SUMMARY & RECOMMENDATIONS');
  console.log('═════════════════════════════════════════════════════════════════');

  const issues = [];
  const recommendations = [];

  if (!results.databaseConnected) {
    issues.push('❌ Database connection failed');
    recommendations.push('1. Check DATABASE_URL environment variable');
    recommendations.push('2. Verify database server is running');
  }

  if (results.recentSessions.length === 0) {
    issues.push('⚠️  No recent agent sessions');
    recommendations.push('3. Check if workspace bootstrap is completing');
    recommendations.push('4. Review workspace initialization logs');
  }

  if (results.buildExecutions.length === 0) {
    issues.push('⚠️  No build executions found');
    recommendations.push('5. Check if plan generation is working');
    recommendations.push('6. Review workspace-bootstrap-router logs');
  }

  if (results.buildExecutions.some((b: any) => b.status === 'pending')) {
    issues.push('⚠️  Build executions stuck in pending state');
    recommendations.push('7. Check if workflow executor is running');
    recommendations.push('8. Review agent-progress-service logs');
  }

  if (results.fileOperations.length === 0 && results.buildExecutions.length > 0) {
    issues.push('❌ CRITICAL: Workflows exist but no file operations!');
    recommendations.push('9. Check if file operation execution is failing');
    recommendations.push('10. Review file-operation-service logs');
    recommendations.push('11. Verify workspace container has write permissions');
  }

  if (issues.length === 0) {
    console.log('✅ No major issues detected!');
    console.log('   However, workspace may still have connection issues.');
    console.log('   Check WebSocket connection logs for details.');
  } else {
    console.log('Issues Found:');
    issues.forEach((issue) => console.log(`  ${issue}`));
    console.log('');
    console.log('Recommendations:');
    recommendations.forEach((rec) => console.log(`  ${rec}`));
  }

  console.log('\n═════════════════════════════════════════════════════════════════\n');
}

// Main execution
async function main() {
  console.log('Starting workspace diagnostics...\n');

  try {
    const results = await runDiagnostics();
    formatResults(results);

    // Exit gracefully
    await dbPool.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error during diagnostics:', error);
    console.error('❌ Diagnostic script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { runDiagnostics, formatResults };
