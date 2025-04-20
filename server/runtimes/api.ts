/**
 * Runtime API handlers
 * This module provides API handlers for runtime functionality
 */

import { Request, Response } from 'express';
import { storage } from '../storage';
import * as runtimeManager from './runtime-manager';
import * as runtimeHealth from './runtime-health';
import { createLogger } from '../utils/logger';

const logger = createLogger('runtime-api');

/**
 * Get runtime dependencies
 */
export async function getRuntimeDependencies(req: Request, res: Response) {
  try {
    logger.info('Getting runtime dependencies');
    
    const dependencies = await runtimeHealth.checkSystemDependencies();
    
    res.json(dependencies);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error getting runtime dependencies: ${errorMessage}`);
    
    res.status(500).json({
      message: 'Failed to get runtime dependencies',
      error: errorMessage
    });
  }
}

/**
 * Start project runtime
 */
export async function startProjectRuntime(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    logger.info(`Starting runtime for project ${projectId}`);
    
    // Get project details
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Get project files
    const files = await storage.getFilesByProject(projectId);
    if (!files.length) {
      return res.status(400).json({ message: 'No files found in project' });
    }
    
    // Get options from request
    const options: runtimeManager.StartProjectOptions = {
      useNix: req.body.useNix === true,
      port: req.body.port,
      environmentVariables: req.body.environmentVariables
    };
    
    // If Nix is requested, add Nix options
    if (options.useNix && req.body.nixOptions) {
      options.nixOptions = {
        packages: req.body.nixOptions.packages,
        buildInputs: req.body.nixOptions.buildInputs,
        shellHook: req.body.nixOptions.shellHook,
        environmentVariables: req.body.nixOptions.environmentVariables
      };
    }
    
    // Start the project
    const result = await runtimeManager.startProject(project, files, options);
    
    if (!result.success) {
      return res.status(500).json({
        message: 'Failed to start project runtime',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      containerId: result.containerId,
      port: result.port,
      url: `http://localhost:${result.port}`,
      logs: result.logs
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error starting project runtime: ${errorMessage}`);
    
    res.status(500).json({
      message: 'Failed to start project runtime',
      error: errorMessage
    });
  }
}

/**
 * Stop project runtime
 */
export async function stopProjectRuntime(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    logger.info(`Stopping runtime for project ${projectId}`);
    
    // Stop the project
    const result = await runtimeManager.stopProject(projectId);
    
    if (!result) {
      return res.status(500).json({
        message: 'Failed to stop project runtime'
      });
    }
    
    res.json({
      success: true
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error stopping project runtime: ${errorMessage}`);
    
    res.status(500).json({
      message: 'Failed to stop project runtime',
      error: errorMessage
    });
  }
}

/**
 * Get project runtime status
 */
export function getProjectRuntimeStatus(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    logger.info(`Getting runtime status for project ${projectId}`);
    
    // Get runtime status
    const status = runtimeManager.getProjectStatus(projectId);
    
    res.json(status);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error getting project runtime status: ${errorMessage}`);
    
    res.status(500).json({
      message: 'Failed to get project runtime status',
      error: errorMessage
    });
  }
}

/**
 * Execute command in project runtime
 */
export async function executeProjectCommand(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    const { command } = req.body;
    
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ message: 'Command is required' });
    }
    
    logger.info(`Executing command in project ${projectId}: ${command}`);
    
    // Execute the command
    const result = await runtimeManager.executeCommand(projectId, command);
    
    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error executing command: ${errorMessage}`);
    
    res.status(500).json({
      message: 'Failed to execute command',
      error: errorMessage,
      success: false,
      output: `Error: ${errorMessage}`
    });
  }
}

/**
 * Get project runtime logs
 */
export function getProjectRuntimeLogs(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    logger.info(`Getting runtime logs for project ${projectId}`);
    
    // Get runtime status which includes logs
    const status = runtimeManager.getProjectStatus(projectId);
    
    res.json({
      logs: status.logs || []
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error getting project runtime logs: ${errorMessage}`);
    
    res.status(500).json({
      message: 'Failed to get project runtime logs',
      error: errorMessage
    });
  }
}