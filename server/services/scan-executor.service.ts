/**
 * Scan Executor Service
 * Processes security scans asynchronously using the SecurityScanner
 */

import type { SecurityScan,Vulnerability } from '@shared/schema';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SecurityScanner } from '../security/security-scanner';
import type { IStorage } from '../storage';
import { createLogger } from '../utils/logger';
import { getProjectWorkspacePath } from '../utils/project-fs-sync';

const logger = createLogger('scan-executor-service');

interface ScanJob {
  scanId: string;
  projectId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
}

interface ExternalFinding {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'security' | 'privacy' | 'secret' | 'config';
  filePath?: string | null;
  lineNumber?: number | null;
  recommendation?: string | null;
  cwe?: string | null;
  references?: string[] | null;
  packageName?: string | null;
  vulnerableVersion?: string | null;
  fixedVersion?: string | null;
  toolAttribution: string;
}

export class ScanExecutorService {
  private storage: IStorage;
  private scanner: SecurityScanner;
  private processingQueue: Map<string, ScanJob> = new Map();
  private isProcessing: boolean = false;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.scanner = new SecurityScanner();
  }

  private async collectWorkspaceFiles(projectId: string): Promise<Array<{ path: string; content: string }>> {
    const workspacePath = getProjectWorkspacePath(projectId);
    const files: Array<{ path: string; content: string }> = [];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build' || entry.name === '.next' || entry.name === 'coverage') {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }

        const relativePath = path.relative(workspacePath, fullPath);
        try {
          const stat = await fs.stat(fullPath);
          if (stat.size > 1024 * 1024) continue;

          const content = await fs.readFile(fullPath, 'utf8');
          files.push({ path: relativePath, content });
        } catch (error) {
          logger.warn(`[ScanExecutor] Skipping unreadable file ${relativePath}: ${error}`);
        }
      }
    };

    await walk(workspacePath);
    return files;
  }

  private async runCommand(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd,
        env: process.env,
        shell: false,
      });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('close', (exitCode) => resolve({ stdout, stderr, exitCode }));
      child.on('error', (error) => resolve({ stdout, stderr: `${stderr}\n${error.message}`.trim(), exitCode: 1 }));
    });
  }

  private async commandExists(command: string): Promise<boolean> {
    const result = await this.runCommand('sh', ['-lc', `command -v ${command}`], process.cwd());
    return result.exitCode === 0 && !!result.stdout.trim();
  }

  private mapSemgrepSeverity(severity?: string | null): 'critical' | 'high' | 'medium' | 'low' {
    switch ((severity || '').toUpperCase()) {
      case 'ERROR':
        return 'high';
      case 'WARNING':
        return 'medium';
      case 'INFO':
        return 'low';
      default:
        return 'medium';
    }
  }

  private mapSemgrepCheckIdToType(checkId?: string | null): 'security' | 'privacy' | 'secret' | 'config' {
    const normalized = (checkId || '').toLowerCase();
    if (normalized.includes('secret')) return 'secret';
    if (normalized.includes('privacy')) return 'privacy';
    if (normalized.includes('config')) return 'config';
    return 'security';
  }

  private async runSemgrepScan(workspacePath: string): Promise<ExternalFinding[]> {
    const semgrepAvailable = await this.commandExists(process.env.SEMGREP_BIN || 'semgrep');
    if (!semgrepAvailable) {
      return [];
    }

    const rulesPath = path.join(workspacePath, '.ecode-semgrep-rules.yml');
    const semgrepRules = [
      'rules:',
      '  - id: ecode.security.sql-injection-string-concat',
      '    message: Potential SQL injection via string interpolation in query construction.',
      '    severity: ERROR',
      '    languages: [javascript, typescript]',
      '    patterns:',
      '      - pattern-either:',
      '          - pattern: $DB.query(`...${$X}...`)',
      '          - pattern: $DB.query("..." + $X + "...")',
      "          - pattern: $DB.query('...' + $X + '...')",
      '          - pattern: prisma.$QUERYRAWUNSAFE(...)',
      '  - id: ecode.security.xss-innerhtml',
      '    message: Potential XSS risk from dynamic innerHTML assignment.',
      '    severity: ERROR',
      '    languages: [javascript, typescript]',
      '    patterns:',
      '      - pattern: $EL.innerHTML = $VALUE',
      '      - metavariable-pattern:',
      '          metavariable: $VALUE',
      `          pattern-not: "'...'"`,
      '  - id: ecode.security.command-injection',
      '    message: Potential command injection risk in child_process execution.',
      '    severity: ERROR',
      '    languages: [javascript, typescript]',
      '    patterns:',
      '      - pattern-either:',
      '          - pattern: exec($CMD)',
      '          - pattern: execSync($CMD)',
      '          - pattern: spawn($CMD, ...)',
      '      - metavariable-pattern:',
      '          metavariable: $CMD',
      `          pattern-not: "'...'"`,
      '  - id: ecode.security.hardcoded-secret',
      '    message: Hardcoded secret-like value detected.',
      '    severity: ERROR',
      '    languages: [javascript, typescript, python, yaml, json]',
      '    patterns:',
      `      - pattern-regex: (?i)(api[_-]?key|secret|token|password)\\s*[:=]\\s*["'][A-Za-z0-9_\\-\\/\\+=]{12,}["']`,
      '  - id: ecode.security.insecure-random',
      '    message: Math.random is not suitable for security-sensitive randomness.',
      '    severity: WARNING',
      '    languages: [javascript, typescript]',
      '    pattern: Math.random(...)',
    ].join('\n');

    await fs.writeFile(rulesPath, semgrepRules, 'utf8');

    const command = process.env.SEMGREP_BIN || 'semgrep';
    const args = ['scan', '--config', rulesPath, '--json', '--quiet', workspacePath];
    const result = await this.runCommand(command, args, workspacePath);

    try {
      await fs.unlink(rulesPath);
    } catch {}

    if (result.exitCode !== 0 && !result.stdout.trim()) {
      throw new Error(result.stderr || 'Semgrep scan failed');
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(result.stdout || '{}');
    } catch (error) {
      throw new Error(`Failed to parse Semgrep output: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    return (parsed?.results || []).map((finding: any): ExternalFinding => ({
      title: finding.check_id || 'Semgrep finding',
      description: finding.extra?.message || 'Security issue detected by Semgrep.',
      severity: this.mapSemgrepSeverity(finding.extra?.severity),
      type: this.mapSemgrepCheckIdToType(finding.check_id),
      filePath: finding.path || null,
      lineNumber: finding.start?.line || null,
      recommendation: finding.extra?.metadata?.fix || finding.extra?.message || null,
      cwe: Array.isArray(finding.extra?.metadata?.cwe) ? finding.extra.metadata.cwe[0] : finding.extra?.metadata?.cwe || null,
      references: Array.isArray(finding.extra?.metadata?.references) ? finding.extra.metadata.references : null,
      toolAttribution: 'semgrep',
    }));
  }

  private async runHoundDogScan(workspacePath: string): Promise<ExternalFinding[]> {
    const command = process.env.HOUNDDOG_BIN || 'hounddog';
    const houndDogAvailable = await this.commandExists(command);
    if (!houndDogAvailable) {
      return [];
    }

    const result = await this.runCommand(command, ['scan', '--json', workspacePath], workspacePath);
    if (result.exitCode !== 0 && !result.stdout.trim()) {
      throw new Error(result.stderr || 'HoundDog scan failed');
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(result.stdout || '{}');
    } catch (error) {
      throw new Error(`Failed to parse HoundDog output: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    const findings = parsed?.findings || parsed?.issues || parsed?.results || [];
    return findings.map((finding: any): ExternalFinding => ({
      title: finding.title || finding.ruleId || finding.id || 'HoundDog finding',
      description: finding.description || finding.message || 'Privacy issue detected by HoundDog.',
      severity: ['critical', 'high', 'medium', 'low'].includes(String(finding.severity || '').toLowerCase())
        ? String(finding.severity).toLowerCase() as ExternalFinding['severity']
        : 'medium',
      type: 'privacy',
      filePath: finding.filePath || finding.path || null,
      lineNumber: finding.lineNumber || finding.line || finding.location?.start?.line || null,
      recommendation: finding.recommendation || finding.fix || null,
      cwe: finding.cwe || null,
      references: Array.isArray(finding.references) ? finding.references : null,
      toolAttribution: 'hounddog',
    }));
  }

  private async runPrivacyFallbackScan(files: Array<{ path: string; content: string }>): Promise<ExternalFinding[]> {
    const findings: ExternalFinding[] = [];
    const privacyPatterns = [
      {
        title: 'Potential PII logging',
        pattern: /(console\.(log|info|debug)|logger\.(info|debug|warn)|print)\([^)]*(email|phone|ssn|address|dob|birth)/i,
        recommendation: 'Avoid logging personal data or redact it before logging.',
      },
      {
        title: 'Potential client-side storage of personal data',
        pattern: /(localStorage|sessionStorage)\.(setItem)\([^)]*(email|phone|ssn|address|dob|birth|token)/i,
        recommendation: 'Do not persist personal or sensitive data in browser storage without strict justification and protection.',
      },
      {
        title: 'Potential analytics tracking of personal data',
        pattern: /(analytics|track|identify)\([^)]*(email|phone|ssn|address|dob|birth)/i,
        recommendation: 'Review telemetry payloads and avoid sending personal data to analytics providers.',
      },
    ];

    for (const file of files) {
      for (const candidate of privacyPatterns) {
        const match = file.content.match(candidate.pattern);
        if (!match || match.index == null) continue;
        const lineNumber = file.content.slice(0, match.index).split('\n').length;
        findings.push({
          title: candidate.title,
          description: 'Potential privacy issue detected during static analysis.',
          severity: 'medium',
          type: 'privacy',
          filePath: file.path,
          lineNumber,
          recommendation: candidate.recommendation,
          toolAttribution: 'privacy-rules',
        });
      }
    }

    return findings;
  }

  private fingerprintFinding(finding: Pick<ExternalFinding, 'toolAttribution' | 'type' | 'title' | 'filePath' | 'lineNumber' | 'packageName'>): string {
    return [
      finding.toolAttribution,
      finding.type,
      finding.title,
      finding.filePath || '',
      finding.lineNumber || '',
      finding.packageName || '',
    ].join('::');
  }

  private fingerprintVulnerability(vulnerability: Pick<Vulnerability, 'toolAttribution' | 'type' | 'title' | 'filePath' | 'lineNumber' | 'packageName'>): string {
    return [
      vulnerability.toolAttribution || '',
      vulnerability.type,
      vulnerability.title,
      vulnerability.filePath || '',
      vulnerability.lineNumber || '',
      vulnerability.packageName || '',
    ].join('::');
  }

  private async reconcileAndPersistFindings(job: ScanJob, findings: ExternalFinding[]): Promise<number> {
    const existingOpen = (await this.storage.getProjectVulnerabilities(job.projectId, 'open'))
      .filter((vulnerability) => ['semgrep', 'hounddog', 'privacy-rules', 'ecode-scanner'].includes(vulnerability.toolAttribution || ''));

    const existingByFingerprint = new Map(existingOpen.map((vulnerability) => [this.fingerprintVulnerability(vulnerability), vulnerability]));
    const seenFingerprints = new Set<string>();
    let persistedCount = 0;

    for (const finding of findings) {
      const fingerprint = this.fingerprintFinding(finding);
      seenFingerprints.add(fingerprint);
      const existing = existingByFingerprint.get(fingerprint);

      if (existing) {
        await this.storage.updateVulnerability(existing.id, {
          severity: finding.severity,
          description: finding.description,
          recommendation: finding.recommendation,
          cwe: finding.cwe,
          references: finding.references,
          filePath: finding.filePath || null,
          lineNumber: finding.lineNumber || null,
          packageName: finding.packageName || null,
          vulnerableVersion: finding.vulnerableVersion || null,
          fixedVersion: finding.fixedVersion || null,
          status: 'open',
          resolvedAt: null,
        });
        persistedCount++;
        continue;
      }

      await this.storage.createVulnerability({
        scanId: job.scanId,
        projectId: parseInt(job.projectId, 10),
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        type: finding.type,
        status: 'open',
        filePath: finding.filePath || null,
        lineNumber: finding.lineNumber || null,
        recommendation: finding.recommendation || null,
        cwe: finding.cwe || null,
        references: finding.references || null,
        packageName: finding.packageName || null,
        vulnerableVersion: finding.vulnerableVersion || null,
        fixedVersion: finding.fixedVersion || null,
        toolAttribution: finding.toolAttribution,
        isHidden: false,
      });
      persistedCount++;
    }

    for (const vulnerability of existingOpen) {
      const fingerprint = this.fingerprintVulnerability(vulnerability);
      if (seenFingerprints.has(fingerprint)) continue;
      await this.storage.updateVulnerability(vulnerability.id, {
        status: 'fixed',
        resolvedAt: new Date(),
      });
    }

    return persistedCount;
  }

  /**
   * Queue a scan for processing
   */
  async queueScan(scan: SecurityScan): Promise<void> {
    const job: ScanJob = {
      scanId: scan.id,
      projectId: scan.projectId.toString(),
      status: 'queued',
    };

    this.processingQueue.set(scan.id, job);
    logger.info(`[ScanExecutor] Queued scan ${scan.id} for project ${scan.projectId}`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the scan queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.processingQueue.size > 0) {
        // Get next queued job
        const queuedJob = Array.from(this.processingQueue.values()).find(j => j.status === 'queued');
        if (!queuedJob) break;

        await this.executeScan(queuedJob);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single scan
   */
  private async executeScan(job: ScanJob): Promise<void> {
    const startTime = Date.now();
    logger.info(`[ScanExecutor] Starting scan ${job.scanId} for project ${job.projectId}`);

    try {
      // Update status to running
      job.status = 'running';
      await this.storage.updateSecurityScan(job.scanId, {
        status: 'running',
        startedAt: new Date(),
      });
      await this.broadcastScanUpdate(job.scanId);

      const settings = await this.storage.getSecurityScanSettings(job.projectId);
      const workspaceFiles = await this.collectWorkspaceFiles(job.projectId);

      if (!workspaceFiles || workspaceFiles.length === 0) {
        logger.info(`[ScanExecutor] No files found for project ${job.projectId}`);
        await this.completeScan(job, 0, startTime);
        return;
      }

      logger.info(`[ScanExecutor] Scanning ${workspaceFiles.length} workspace files for project ${job.projectId}`);

      const result = await this.scanner.scanProject(parseInt(job.projectId, 10), workspaceFiles);
      const externalFindings: ExternalFinding[] = [];
      const workspacePath = getProjectWorkspacePath(job.projectId);

      if (settings?.securityDetectionEnabled !== false) {
        const semgrepFindings = await this.runSemgrepScan(workspacePath);
        externalFindings.push(...semgrepFindings);
      }

      if (settings?.privacyDetectionEnabled !== false) {
        const houndDogFindings = await this.runHoundDogScan(workspacePath);
        if (houndDogFindings.length > 0) {
          externalFindings.push(...houndDogFindings);
        } else {
          externalFindings.push(...await this.runPrivacyFallbackScan(workspaceFiles));
        }
      }

      const fallbackFindings: ExternalFinding[] = result.issues.map((issue) => ({
        title: issue.title,
        description: issue.description,
        severity: this.mapSeverity(issue.severity),
        type: this.mapCategory(issue.type) as ExternalFinding['type'],
        filePath: issue.file || null,
        lineNumber: issue.line || null,
        recommendation: issue.suggestion || null,
        cwe: null,
        references: null,
        toolAttribution: 'ecode-scanner',
      }));

      const allFindings = [...externalFindings, ...fallbackFindings];
      const dedupedFindings = Array.from(
        new Map(allFindings.map((finding) => [this.fingerprintFinding(finding), finding])).values()
      );

      let vulnerabilityCount = 0;
      if (dedupedFindings.length > 0) {
        vulnerabilityCount = await this.reconcileAndPersistFindings(job, dedupedFindings);
      } else {
        await this.reconcileAndPersistFindings(job, []);
      }

      // Broadcast vulnerability updates
      await this.broadcastVulnerabilityUpdate(job.projectId);

      // Complete the scan
      const summary = dedupedFindings.reduce(
        (acc, finding) => {
          acc[finding.severity]++;
          return acc;
        },
        { critical: 0, high: 0, medium: 0, low: 0 }
      );

      await this.completeScan(job, vulnerabilityCount, startTime, {
        critical: summary.critical,
        high: summary.high,
        medium: summary.medium,
        low: summary.low,
        info: 0,
      });

    } catch (error) {
      logger.error(`[ScanExecutor] Error executing scan ${job.scanId}:`, error);
      
      // Mark scan as failed
      job.status = 'failed';
      await this.storage.updateSecurityScan(job.scanId, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      await this.broadcastScanUpdate(job.scanId);
    } finally {
      // Remove from queue
      this.processingQueue.delete(job.scanId);
    }
  }

  /**
   * Complete a scan successfully
   */
  private async completeScan(
    job: ScanJob,
    vulnerabilityCount: number,
    startTime: number,
    summary?: { critical: number; high: number; medium: number; low: number; info: number }
  ): Promise<void> {
    const duration = Date.now() - startTime;
    
    job.status = 'completed';
    await this.storage.updateSecurityScan(job.scanId, {
      status: 'completed',
      completedAt: new Date(),
      totalVulnerabilities: vulnerabilityCount,
      criticalCount: summary?.critical || 0,
      highCount: summary?.high || 0,
      mediumCount: summary?.medium || 0,
      lowCount: (summary?.low || 0) + (summary?.info || 0),
    });

    logger.info(`[ScanExecutor] Completed scan ${job.scanId}: ${vulnerabilityCount} issues found in ${duration}ms`);
    await this.broadcastScanUpdate(job.scanId);
  }

  /**
   * Map scanner severity to database severity
   */
  private mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': 
      case 'info':
      default: return 'low';
    }
  }

  /**
   * Map scanner issue type to category
   */
  private mapCategory(type: string): string {
    switch (type) {
      case 'secret': return 'secrets';
      case 'vulnerability': return 'security';
      case 'code_quality': return 'code-quality';
      case 'best_practice': return 'best-practices';
      default: return 'security';
    }
  }

  /**
   * Broadcast scan update via WebSocket
   */
  private async broadcastScanUpdate(scanId: string): Promise<void> {
    try {
      const scan = await this.storage.getSecurityScan(scanId);
      if (!scan) return;

      const securityScannerService = (global as any).securityScannerService;
      if (securityScannerService) {
        await securityScannerService.broadcastScanUpdate(scan.projectId.toString(), scan);
      }
    } catch (error) {
      logger.error('[ScanExecutor] Error broadcasting scan update:', error);
    }
  }

  /**
   * Broadcast vulnerability update via WebSocket
   */
  private async broadcastVulnerabilityUpdate(projectId: string): Promise<void> {
    try {
      const securityScannerService = (global as any).securityScannerService;
      if (securityScannerService) {
        // Broadcast that vulnerabilities have changed (clients will refetch)
        const clients = securityScannerService.clients?.get(projectId);
        if (clients) {
          for (const client of clients) {
            if (client.ws.readyState === 1) { // WebSocket.OPEN
              client.ws.send(JSON.stringify({ type: 'vulnerability_update' }));
            }
          }
        }
      }
    } catch (error) {
      logger.error('[ScanExecutor] Error broadcasting vulnerability update:', error);
    }
  }

  /**
   * Get scan queue status
   */
  getQueueStatus(): { queued: number; running: number } {
    let queued = 0;
    let running = 0;
    for (const job of this.processingQueue.values()) {
      if (job.status === 'queued') queued++;
      if (job.status === 'running') running++;
    }
    return { queued, running };
  }
}

let scanExecutorInstance: ScanExecutorService | null = null;

export function getScanExecutor(storage: IStorage): ScanExecutorService {
  if (!scanExecutorInstance) {
    scanExecutorInstance = new ScanExecutorService(storage);
  }
  return scanExecutorInstance;
}

export function setupScanExecutor(storage: IStorage): ScanExecutorService {
  scanExecutorInstance = new ScanExecutorService(storage);
  (global as any).scanExecutor = scanExecutorInstance;
  logger.info('[ScanExecutor] Service initialized');
  return scanExecutorInstance;
}
