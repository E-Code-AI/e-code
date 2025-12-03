/**
 * TypeScript ScriptElementKind to Monaco SymbolKind Mapping
 * 
 * This module provides a comprehensive mapping between TypeScript's NavigationTree
 * kinds and Monaco Editor's SymbolKind enum for consistent symbol representation.
 * 
 * Based on:
 * - TypeScript compiler ScriptElementKind enum
 * - VS Code symbol kind mappings
 * - Monaco Editor SymbolKind enum (26 values: 0-25)
 */

import type * as monaco from 'monaco-editor';
import { getMonaco, type Monaco } from './monaco-cdn-loader';

/**
 * Symbol kind numeric values (matching Monaco SymbolKind enum)
 * Using constants to avoid runtime dependency on Monaco
 */
export const SymbolKindValues = {
  File: 0,
  Module: 1,
  Namespace: 2,
  Package: 3,
  Class: 4,
  Method: 5,
  Property: 6,
  Field: 7,
  Constructor: 8,
  Enum: 9,
  Interface: 10,
  Function: 11,
  Variable: 12,
  Constant: 13,
  String: 14,
  Number: 15,
  Boolean: 16,
  Array: 17,
  Object: 18,
  Key: 19,
  Null: 20,
  EnumMember: 21,
  Struct: 22,
  Event: 23,
  Operator: 24,
  TypeParameter: 25,
} as const;

/**
 * Comprehensive mapping of TypeScript ScriptElementKind values to Monaco SymbolKind.
 * Includes both camelCase and space-separated variants for maximum compatibility.
 */
export const TS_KIND_TO_MONACO_SYMBOL: Record<string, number> = {
  // ============================================================================
  // DECLARATIONS
  // ============================================================================
  
  // Classes
  'class': SymbolKindValues.Class,
  'classElement': SymbolKindValues.Class,
  'class element': SymbolKindValues.Class,
  'localClass': SymbolKindValues.Class,
  'localClassElement': SymbolKindValues.Class,
  'local class': SymbolKindValues.Class,
  'local class element': SymbolKindValues.Class,
  
  // Interfaces & Types
  'interface': SymbolKindValues.Interface,
  'interfaceElement': SymbolKindValues.Interface,
  'interface element': SymbolKindValues.Interface,
  'type': SymbolKindValues.Interface,
  'typeElement': SymbolKindValues.Interface,
  'type element': SymbolKindValues.Interface,
  'typeAlias': SymbolKindValues.Interface,
  'type alias': SymbolKindValues.Interface,
  
  // Enums
  'enum': SymbolKindValues.Enum,
  'enumElement': SymbolKindValues.Enum,
  'enum element': SymbolKindValues.Enum,
  'enumMember': SymbolKindValues.EnumMember,
  'enumMemberElement': SymbolKindValues.EnumMember,
  'enum member': SymbolKindValues.EnumMember,
  'enum member element': SymbolKindValues.EnumMember,
  
  // ============================================================================
  // MODULES & NAMESPACES
  // ============================================================================
  
  'module': SymbolKindValues.Module,
  'moduleElement': SymbolKindValues.Module,
  'module element': SymbolKindValues.Module,
  'namespace': SymbolKindValues.Namespace,
  'script': SymbolKindValues.Module,
  'scriptElement': SymbolKindValues.Module,
  'script element': SymbolKindValues.Module,
  'externalModuleName': SymbolKindValues.Module,
  'external module name': SymbolKindValues.Module,
  'directory': SymbolKindValues.Module,
  
  // ============================================================================
  // FUNCTIONS & METHODS
  // ============================================================================
  
  // Functions
  'function': SymbolKindValues.Function,
  'functionElement': SymbolKindValues.Function,
  'function element': SymbolKindValues.Function,
  'localFunction': SymbolKindValues.Function,
  'localFunctionElement': SymbolKindValues.Function,
  'local function': SymbolKindValues.Function,
  'local function element': SymbolKindValues.Function,
  
  // Methods
  'method': SymbolKindValues.Method,
  'memberFunction': SymbolKindValues.Method,
  'memberFunctionElement': SymbolKindValues.Method,
  'member function': SymbolKindValues.Method,
  'member function element': SymbolKindValues.Method,
  
  // Constructors
  'constructor': SymbolKindValues.Constructor,
  'constructorImplementation': SymbolKindValues.Constructor,
  'constructorImplementationElement': SymbolKindValues.Constructor,
  'constructor implementation': SymbolKindValues.Constructor,
  'constructor implementation element': SymbolKindValues.Constructor,
  
  // Accessors (VS Code treats as properties)
  'getter': SymbolKindValues.Property,
  'setter': SymbolKindValues.Property,
  'getAccessor': SymbolKindValues.Property,
  'setAccessor': SymbolKindValues.Property,
  'get accessor': SymbolKindValues.Property,
  'set accessor': SymbolKindValues.Property,
  'memberGetAccessor': SymbolKindValues.Property,
  'memberSetAccessor': SymbolKindValues.Property,
  'memberGetAccessorElement': SymbolKindValues.Property,
  'memberSetAccessorElement': SymbolKindValues.Property,
  'member get accessor': SymbolKindValues.Property,
  'member set accessor': SymbolKindValues.Property,
  'member get accessor element': SymbolKindValues.Property,
  'member set accessor element': SymbolKindValues.Property,
  'accessor': SymbolKindValues.Property,
  'memberAccessorVariable': SymbolKindValues.Property,
  'memberAccessorVariableElement': SymbolKindValues.Property,
  'member accessor variable': SymbolKindValues.Property,
  'member accessor variable element': SymbolKindValues.Property,
  
  // ============================================================================
  // PROPERTIES & FIELDS
  // ============================================================================
  
  'property': SymbolKindValues.Property,
  'memberVariable': SymbolKindValues.Property,
  'memberVariableElement': SymbolKindValues.Property,
  'member variable': SymbolKindValues.Property,
  'member variable element': SymbolKindValues.Property,
  'field': SymbolKindValues.Field,
  
  // JSX
  'JSX attribute': SymbolKindValues.Property,
  'JSXAttribute': SymbolKindValues.Property,
  'jsxAttribute': SymbolKindValues.Property,
  
  // ============================================================================
  // VARIABLES & CONSTANTS
  // ============================================================================
  
  'var': SymbolKindValues.Variable,
  'variable': SymbolKindValues.Variable,
  'variableElement': SymbolKindValues.Variable,
  'variable element': SymbolKindValues.Variable,
  'localVar': SymbolKindValues.Variable,
  'localVariable': SymbolKindValues.Variable,
  'localVariableElement': SymbolKindValues.Variable,
  'local var': SymbolKindValues.Variable,
  'local variable': SymbolKindValues.Variable,
  'local variable element': SymbolKindValues.Variable,
  
  'let': SymbolKindValues.Variable,
  'letElement': SymbolKindValues.Variable,
  'let element': SymbolKindValues.Variable,
  
  'const': SymbolKindValues.Constant,
  'constElement': SymbolKindValues.Constant,
  'const element': SymbolKindValues.Constant,
  
  'parameter': SymbolKindValues.Variable,
  'parameterElement': SymbolKindValues.Variable,
  'parameter element': SymbolKindValues.Variable,
  
  // Type Parameters
  'typeParameter': SymbolKindValues.TypeParameter,
  'typeParameterElement': SymbolKindValues.TypeParameter,
  'type parameter': SymbolKindValues.TypeParameter,
  'type parameter element': SymbolKindValues.TypeParameter,
  
  // ============================================================================
  // SIGNATURES (VS Code maps all to Method for consistency)
  // ============================================================================
  
  'call': SymbolKindValues.Method,
  'callSignature': SymbolKindValues.Method,
  'callSignatureElement': SymbolKindValues.Method,
  'call signature': SymbolKindValues.Method,
  'call signature element': SymbolKindValues.Method,
  
  'index': SymbolKindValues.Method,
  'indexSignature': SymbolKindValues.Method,
  'indexSignatureElement': SymbolKindValues.Method,
  'index signature': SymbolKindValues.Method,
  'index signature element': SymbolKindValues.Method,
  
  'construct': SymbolKindValues.Method,
  'constructSignature': SymbolKindValues.Method,
  'constructSignatureElement': SymbolKindValues.Method,
  'construct signature': SymbolKindValues.Method,
  'construct signature element': SymbolKindValues.Method,
  
  // ============================================================================
  // PRIMITIVES & SPECIAL TYPES
  // ============================================================================
  
  'string': SymbolKindValues.String,
  'number': SymbolKindValues.Number,
  'boolean': SymbolKindValues.Boolean,
  'array': SymbolKindValues.Array,
  'object': SymbolKindValues.Object,
  
  // ============================================================================
  // MISCELLANEOUS
  // ============================================================================
  
  // Keywords & Special
  'keyword': SymbolKindValues.Key,
  'warning': SymbolKindValues.Variable,
  'unknown': SymbolKindValues.Variable,
  
  // Aliases & Labels
  'alias': SymbolKindValues.Variable,
  'label': SymbolKindValues.Variable,
  
  // Primitives
  'primitiveType': SymbolKindValues.Variable,
  'primitive type': SymbolKindValues.Variable,
  
  // JSDoc Link Components
  'link': SymbolKindValues.String,
  'linkName': SymbolKindValues.String,
  'link name': SymbolKindValues.String,
  'linkText': SymbolKindValues.String,
  'link text': SymbolKindValues.String,
  
  // String literals
  'stringLiteral': SymbolKindValues.String,
  'string literal': SymbolKindValues.String,
};

/**
 * Set to track unknown TypeScript kinds encountered at runtime.
 * Only populated in development mode for telemetry/debugging.
 */
const unknownKinds = new Set<string>();

/**
 * Convert TypeScript ScriptElementKind to Monaco SymbolKind.
 * 
 * @param tsKind - TypeScript NavigationTree kind string
 * @param enableTelemetry - Enable dev-mode telemetry for unknown kinds (default: true in dev)
 * @returns Monaco SymbolKind enum value
 * 
 * @example
 * ```typescript
 * const kind = mapTsKindToMonacoSymbol('function'); // Returns SymbolKind.Function (11)
 * const kind2 = mapTsKindToMonacoSymbol('getAccessor'); // Returns SymbolKind.Property (6)
 * ```
 */
export function mapTsKindToMonacoSymbol(
  tsKind: string,
  enableTelemetry: boolean = import.meta.env.DEV
): number {
  const mapped = TS_KIND_TO_MONACO_SYMBOL[tsKind];
  
  if (mapped !== undefined) {
    return mapped;
  }
  
  // Unknown kind - track in development for future mapping improvements
  if (enableTelemetry && !unknownKinds.has(tsKind)) {
    unknownKinds.add(tsKind);
    console.warn(
      `[TS-Kind-Map] Unknown TypeScript kind: "${tsKind}"\n` +
      `Please report this to improve symbol coverage.\n` +
      `Defaulting to SymbolKind.Variable (12).`
    );
    
    // Optional: Send telemetry event for analytics
    if (import.meta.env.DEV) {
      console.debug('[TS-Kind-Map] All unknown kinds so far:', Array.from(unknownKinds));
    }
  }
  
  // Safe fallback
  return SymbolKindValues.Variable;
}

/**
 * Get all unknown TypeScript kinds encountered at runtime.
 * Useful for testing and debugging symbol coverage.
 * 
 * @returns Array of unknown kind strings
 */
export function getUnknownKinds(): string[] {
  return Array.from(unknownKinds);
}

/**
 * Clear the unknown kinds tracking set.
 * Useful for testing.
 */
export function clearUnknownKinds(): void {
  unknownKinds.clear();
}

/**
 * Get total count of mapped TypeScript kinds.
 * 
 * @returns Number of mapped kinds
 */
export function getMappedKindCount(): number {
  return Object.keys(TS_KIND_TO_MONACO_SYMBOL).length;
}
