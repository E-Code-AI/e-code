/**
 * AI Router for E-Code Platform
 * Handles AI-powered code completion, explanation, conversion, and documentation
 */

import { Router } from 'express';
import {
  generateCompletion,
  generateExplanation,
  convertCode,
  generateDocumentation,
  generateTests
} from '../ai';
import { ensureAuthenticated } from '../middleware/auth';

const router = Router();

// ✅ 40-YEAR SENIOR FIX: Add authentication middleware to ALL AI routes
// Tests expect 401 for unauthenticated requests
router.post('/ai/completion', ensureAuthenticated, generateCompletion);
router.post('/ai/explanation', ensureAuthenticated, generateExplanation);
router.post('/ai/convert', ensureAuthenticated, convertCode);
router.post('/ai/documentation', ensureAuthenticated, generateDocumentation);
router.post('/ai/tests', ensureAuthenticated, generateTests);

export default router;
