#!/usr/bin/env node

// Production entry point for deployment
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

// Set production environment if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Import and start the server
async function startServer() {
  try {
    console.log('Starting production server...');
    console.log('Environment:', process.env.NODE_ENV);
    
    // Import the compiled server
    const serverPath = process.env.NODE_ENV === 'production' 
      ? './dist/server/index.js' 
      : './server/index.ts';
    
    await import(serverPath);
  } catch (error) {
    console.error('Failed to start server:', error);
    // Don't exit immediately to help with debugging
    if (process.env.NODE_ENV !== 'production') {
      console.error('Stack trace:', error.stack);
    }
    // Exit with error code after a delay
    setTimeout(() => process.exit(1), 1000);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();