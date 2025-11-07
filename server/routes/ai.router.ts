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

const router = Router();

router.post('/ai/completion', generateCompletion);
router.post('/ai/explanation', generateExplanation);
router.post('/ai/convert', convertCode);
router.post('/ai/documentation', generateDocumentation);
router.post('/ai/tests', generateTests);

export default router;
