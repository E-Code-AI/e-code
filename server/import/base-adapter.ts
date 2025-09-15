import { EventEmitter } from 'events';
import { storage } from '../storage';
import { ImportAdapter, ImportOptions, ImportProgress, ImportResult, ImportTelemetry } from './types';

export abstract class BaseImportAdapter extends EventEmitter implements ImportAdapter {
  protected importType: string;
  
  constructor(importType: string) {
    super();
    this.importType = importType;
  }

  abstract prepare(options: ImportOptions): Promise<{ valid: boolean; errors?: string[] }>;
  abstract validate(options: ImportOptions): Promise<{ valid: boolean; errors?: string[] }>;
  abstract import(options: ImportOptions): Promise<ImportResult>;

  getType(): string {
    return this.importType;
  }

  async reportProgress(importId: string, progress: ImportProgress): Promise<void> {
    try {
      // Update import record with progress
      await storage.updateProjectImport(parseInt(importId), {
        metadata: {
          progress: {
            stage: progress.stage,
            progress: progress.progress,
            message: progress.message,
            timestamp: progress.timestamp
          }
        }
      });
      
      // Emit progress event for real-time updates
      this.emit('progress', { importId, progress });
    } catch (error) {
      console.error('Error reporting import progress:', error);
    }
  }

  protected async createImportRecord(options: ImportOptions): Promise<any> {
    return await storage.createProjectImport({
      projectId: options.projectId,
      userId: options.userId,
      type: this.importType,
      url: options.url || `${this.importType}-import`,
      status: 'processing',
      metadata: options.metadata || {}
    });
  }

  protected async updateImportRecord(importId: string, updates: any): Promise<void> {
    await storage.updateProjectImport(parseInt(importId), updates);
  }

  protected async handleImportError(importId: string, error: Error): Promise<void> {
    await this.updateImportRecord(importId, {
      status: 'failed',
      error: error.message,
      completedAt: new Date()
    });
    
    this.emit('error', { importId, error });
  }

  protected async trackTelemetry(telemetry: ImportTelemetry): Promise<void> {
    try {
      // Emit telemetry event for collection
      this.emit('telemetry', telemetry);
      
      // Log telemetry for debugging
      console.log('Import telemetry:', {
        type: telemetry.importType,
        success: telemetry.success,
        duration: `${telemetry.duration}ms`,
        artifacts: telemetry.artifactCounts
      });
    } catch (error) {
      console.error('Error tracking import telemetry:', error);
    }
  }

  protected generateProgressStages(stages: string[]): { [key: string]: number } {
    const stageProgress: { [key: string]: number } = {};
    const progressPerStage = 100 / stages.length;
    
    stages.forEach((stage, index) => {
      stageProgress[stage] = Math.round((index + 1) * progressPerStage);
    });
    
    return stageProgress;
  }
}