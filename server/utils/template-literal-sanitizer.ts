/**
 * Template Literal Sanitizer
 * 
 * Finite state machine tokenizer for handling ${...} in JSON strings
 * Implements stack-based capture with UUID sentinels for safe parsing
 * 
 * Algorithm:
 * 1. Single-pass character scan maintaining JSON string state
 * 2. Track backslash parity for escape detection
 * 3. Stack-based capture of ${...} expressions with nested context tracking
 * 4. UUID-based sentinels to avoid collision with user content
 * 5. Structural restoration after jsonc parsing
 */

import { randomUUID } from 'crypto';

interface CapturedTemplate {
  original: string;
  sentinel: string;
  startIndex: number;
  endIndex: number;
}

interface TokenizerState {
  insideJsonString: boolean;
  backslashParity: number; // 0 = even, 1 = odd
  templateStack: Array<{
    startIndex: number;
    braceDepth: number;
    inBacktick: boolean;
    inSingleQuote: boolean;
    inDoubleQuote: boolean;
  }>;
}

/**
 * Helper: Check if ${ at given index is escaped by literal backslashes
 * In JSON strings, \\ encodes a single \, so we need to count literal backslashes
 * 
 * @param str - The JSON string
 * @param dollarIndex - Index of the $ character
 * @returns true if ${  is escaped by an odd number of LITERAL backslashes
 */
function hasEscapingLiteralBackslash(str: string, dollarIndex: number): boolean {
  // Count contiguous raw backslashes before $
  let rawBackslashCount = 0;
  let checkIndex = dollarIndex - 1;
  
  while (checkIndex >= 0 && str[checkIndex] === '\\') {
    rawBackslashCount++;
    checkIndex--;
  }
  
  // Convert raw backslash count to literal backslash count
  // In JSON: \\ → \ (each pair becomes one literal)
  const literalBackslashCount = Math.floor(rawBackslashCount / 2);
  
  // Also check if there's an odd leftover raw backslash (escape of the $)
  const hasOddRawBackslash = rawBackslashCount % 2 === 1;
  
  // ${ is escaped if:
  // 1. Odd number of literal backslashes before it, OR
  // 2. Odd raw backslash count (which means the $ itself is JSON-escaped)
  return literalBackslashCount % 2 === 1 || hasOddRawBackslash;
}

/**
 * Capture and replace template literals with UUID sentinels
 * Uses finite state machine for accurate JSON string tracking
 */
export function replaceTemplateLiterals(jsonString: string): {
  processed: string;
  templates: CapturedTemplate[];
} {
  const templates: CapturedTemplate[] = [];
  const result: string[] = [];
  
  const state: TokenizerState = {
    insideJsonString: false,
    backslashParity: 0,
    templateStack: []
  };
  
  let i = 0;
  
  while (i < jsonString.length) {
    const char = jsonString[i];
    const nextChar = i + 1 < jsonString.length ? jsonString[i + 1] : '';
    
    // Track backslash parity for escape detection
    if (char === '\\') {
      state.backslashParity = 1 - state.backslashParity;
      result.push(char);
      i++;
      continue;
    }
    
    // Non-backslash character: reset parity
    const isEscaped = state.backslashParity === 1;
    state.backslashParity = 0;
    
    // Track JSON string boundaries (only at top level, not inside template captures)
    if (state.templateStack.length === 0) {
      if (char === '"' && !isEscaped) {
        state.insideJsonString = !state.insideJsonString;
        result.push(char);
        i++;
        continue;
      }
    }
    
    // Detect ${ inside JSON string (only if not escaped and not already capturing)
    if (state.insideJsonString && state.templateStack.length === 0 && 
        char === '$' && nextChar === '{' && !isEscaped) {
      
      // Check if ${ is escaped by literal backslashes (accounting for JSON encoding)
      if (hasEscapingLiteralBackslash(jsonString, i)) {
        // Escaped ${  - skip capture
        result.push(char);
        i++;
        continue;
      }
      
      // Start template literal capture
      const capture = captureTemplateLiteralWithStack(jsonString, i);
      
      if (capture) {
        // Generate UUID-based sentinel
        const sentinel = `__TL_${randomUUID().replace(/-/g, '_')}__`;
        
        templates.push({
          original: capture.expression,
          sentinel,
          startIndex: i,
          endIndex: capture.endIndex
        });
        
        // Add sentinel to result
        result.push(sentinel);
        
        // Skip past captured expression
        i = capture.endIndex;
        continue;
      }
    }
    
    // Regular character
    result.push(char);
    i++;
  }
  
  return { 
    processed: result.join(''), 
    templates 
  };
}

/**
 * Stack-based template literal capture with full nested context tracking
 * Handles escaped characters, nested templates, and quotes inside expressions
 */
function captureTemplateLiteralWithStack(
  str: string,
  startIndex: number
): { expression: string; endIndex: number } | null {
  // Verify we're at ${
  if (str[startIndex] !== '$' || str[startIndex + 1] !== '{') {
    return null;
  }
  
  let braceDepth = 0;
  let backslashParity = 0;
  let inBacktick = false;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let i = startIndex + 1; // Start after $
  
  while (i < str.length) {
    const char = str[i];
    
    // Track backslash parity
    if (char === '\\') {
      backslashParity = 1 - backslashParity;
      i++;
      continue;
    }
    
    const isEscaped = backslashParity === 1;
    backslashParity = 0;
    
    // Track string state (quotes and backticks)
    if (!isEscaped) {
      // Backtick handling (template strings)
      if (char === '`' && !inSingleQuote && !inDoubleQuote) {
        inBacktick = !inBacktick;
      }
      // Single quote handling
      else if (char === "'" && !inBacktick && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      }
      // Double quote handling
      else if (char === '"' && !inBacktick && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      }
    }
    
    // Only count braces outside of all string types and not escaped
    const inAnyString = inBacktick || inSingleQuote || inDoubleQuote;
    if (!inAnyString && !isEscaped) {
      if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        
        // Found matching closing brace
        if (braceDepth === 0) {
          const expression = str.substring(startIndex, i + 1);
          return { expression, endIndex: i + 1 };
        }
        
        // Underflow check
        if (braceDepth < 0) {
          return null; // Malformed expression
        }
      }
    }
    
    i++;
  }
  
  // No matching closing brace found
  return null;
}

/**
 * Restore template literals from UUID sentinels in parsed JSON object
 * Uses structural replacement to avoid regex issues with overlapping content
 */
export function restoreTemplateLiterals(
  obj: any,
  templates: CapturedTemplate[]
): any {
  // Base case: string value
  if (typeof obj === 'string') {
    let result = obj;
    
    // Replace sentinels with original expressions
    // Process in reverse order to avoid index shifting issues
    for (let i = templates.length - 1; i >= 0; i--) {
      const { original, sentinel } = templates[i];
      // Use split/join for exact replacement (avoids regex escaping issues)
      result = result.split(sentinel).join(original);
    }
    
    return result;
  }
  
  // Recursive case: array
  if (Array.isArray(obj)) {
    return obj.map(item => restoreTemplateLiterals(item, templates));
  }
  
  // Recursive case: object
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = restoreTemplateLiterals(value, templates);
    }
    return result;
  }
  
  // Primitive types (number, boolean, null)
  return obj;
}
