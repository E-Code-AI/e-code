/**
 * Template Literal Sanitizer
 * 
 * Implements brace-balanced placeholder pipeline for handling ${...} in JSON strings
 * without corrupting the JSON syntax or the template literal content.
 * 
 * Algorithm:
 * 1. Character-by-character scan tracking whether we're inside a JSON string literal
 * 2. When inside string, detect unescaped ${
 * 3. Use brace counter to capture full ${...} expression (supports nested braces)
 * 4. Replace captured expression with safe indexed sentinel
 * 5. After parsing, restore sentinels back to original ${...} expressions
 */

interface CapturedTemplate {
  original: string;
  sentinel: string;
}

/**
 * Capture and replace template literals with safe sentinels
 * Only processes ${...} that appear inside JSON string values
 */
export function replaceTemplateLiterals(jsonString: string): {
  processed: string;
  templates: CapturedTemplate[];
} {
  const templates: CapturedTemplate[] = [];
  let result = '';
  let inString = false;
  let escaped = false;
  let i = 0;
  
  while (i < jsonString.length) {
    const char = jsonString[i];
    const nextChar = i + 1 < jsonString.length ? jsonString[i + 1] : '';
    
    // Count preceding backslashes to determine if current position is escaped
    let backslashCount = 0;
    let checkIndex = i - 1;
    while (checkIndex >= 0 && jsonString[checkIndex] === '\\') {
      backslashCount++;
      checkIndex--;
    }
    const isEscaped = backslashCount % 2 === 1;
    
    // Track string boundaries
    if (char === '"' && !isEscaped) {
      inString = !inString;
      result += char;
      i++;
      continue;
    }
    
    // Look for ${ inside string literals (only if not escaped)
    if (inString && char === '$' && nextChar === '{' && !isEscaped) {
      // Found template literal start - capture full expression
      const capture = captureTemplateLiteral(jsonString, i);
      
      if (capture) {
        // Create sentinel
        const sentinel = `__TEMPLATE_LITERAL_${templates.length}__`;
        templates.push({
          original: capture.expression,
          sentinel
        });
        
        // Add sentinel to result
        result += sentinel;
        
        // Skip past captured expression
        i = capture.endIndex;
        continue;
      }
    }
    
    // Regular character
    result += char;
    i++;
  }
  
  return { processed: result, templates };
}

/**
 * Capture template literal expression with brace balancing
 * Starts at $ in ${...} and captures until matching closing brace
 */
function captureTemplateLiteral(
  str: string,
  startIndex: number
): { expression: string; endIndex: number } | null {
  // Verify we're at ${
  if (str[startIndex] !== '$' || str[startIndex + 1] !== '{') {
    return null;
  }
  
  let braceDepth = 0;
  let i = startIndex + 1; // Start after $
  let inBacktickString = false;
  let inSingleQuoteString = false;
  let inDoubleQuoteString = false;
  
  while (i < str.length) {
    const char = str[i];
    
    // Count preceding backslashes to determine if current position is escaped
    let backslashCount = 0;
    let checkIndex = i - 1;
    while (checkIndex >= 0 && str[checkIndex] === '\\') {
      backslashCount++;
      checkIndex--;
    }
    const isEscaped = backslashCount % 2 === 1;
    
    // Handle string boundaries (skip braces inside strings)
    if (!isEscaped) {
      if (char === '`') {
        inBacktickString = !inBacktickString;
      } else if (char === "'" && !inBacktickString && !inDoubleQuoteString) {
        inSingleQuoteString = !inSingleQuoteString;
      } else if (char === '"' && !inBacktickString && !inSingleQuoteString) {
        inDoubleQuoteString = !inDoubleQuoteString;
      }
    }
    
    // Only count braces outside of any string type and not escaped
    const inAnyString = inBacktickString || inSingleQuoteString || inDoubleQuoteString;
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
      }
    }
    
    i++;
  }
  
  // No matching closing brace found
  return null;
}

/**
 * Restore template literals from sentinels in parsed JSON object
 * Recursively walks AST and replaces sentinels with original ${...} expressions
 */
export function restoreTemplateLiterals(
  obj: any,
  templates: CapturedTemplate[]
): any {
  // Base case: string value
  if (typeof obj === 'string') {
    let result = obj;
    
    // Replace all sentinels with original expressions
    templates.forEach(({ original, sentinel }) => {
      result = result.replace(new RegExp(sentinel, 'g'), original);
    });
    
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
