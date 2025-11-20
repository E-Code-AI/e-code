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

import * as monaco from 'monaco-editor';

/**
 * Comprehensive mapping of TypeScript ScriptElementKind values to Monaco SymbolKind.
 * Includes both camelCase and space-separated variants for maximum compatibility.
 */
export const TS_KIND_TO_MONACO_SYMBOL: Record<string, number> = {
  // ============================================================================
  // DECLARATIONS
  // ============================================================================
  
  // Classes
  'class': monaco.languages.SymbolKind.Class,
  'classElement': monaco.languages.SymbolKind.Class,
  'class element': monaco.languages.SymbolKind.Class,
  'localClass': monaco.languages.SymbolKind.Class,
  'localClassElement': monaco.languages.SymbolKind.Class,
  'local class': monaco.languages.SymbolKind.Class,
  'local class element': monaco.languages.SymbolKind.Class,
  
  // Interfaces & Types
  'interface': monaco.languages.SymbolKind.Interface,
  'interfaceElement': monaco.languages.SymbolKind.Interface,
  'interface element': monaco.languages.SymbolKind.Interface,
  'type': monaco.languages.SymbolKind.Interface,
  'typeElement': monaco.languages.SymbolKind.Interface,
  'type element': monaco.languages.SymbolKind.Interface,
  'typeAlias': monaco.languages.SymbolKind.Interface,
  'type alias': monaco.languages.SymbolKind.Interface,
  
  // Enums
  'enum': monaco.languages.SymbolKind.Enum,
  'enumElement': monaco.languages.SymbolKind.Enum,
  'enum element': monaco.languages.SymbolKind.Enum,
  'enumMember': monaco.languages.SymbolKind.EnumMember,
  'enumMemberElement': monaco.languages.SymbolKind.EnumMember,
  'enum member': monaco.languages.SymbolKind.EnumMember,
  'enum member element': monaco.languages.SymbolKind.EnumMember,
  
  // ============================================================================
  // MODULES & NAMESPACES
  // ============================================================================
  
  'module': monaco.languages.SymbolKind.Module,
  'moduleElement': monaco.languages.SymbolKind.Module,
  'module element': monaco.languages.SymbolKind.Module,
  'namespace': monaco.languages.SymbolKind.Namespace,
  'script': monaco.languages.SymbolKind.Module,
  'scriptElement': monaco.languages.SymbolKind.Module,
  'script element': monaco.languages.SymbolKind.Module,
  'externalModuleName': monaco.languages.SymbolKind.Module,
  'external module name': monaco.languages.SymbolKind.Module,
  'directory': monaco.languages.SymbolKind.Module,
  
  // ============================================================================
  // FUNCTIONS & METHODS
  // ============================================================================
  
  // Functions
  'function': monaco.languages.SymbolKind.Function,
  'functionElement': monaco.languages.SymbolKind.Function,
  'function element': monaco.languages.SymbolKind.Function,
  'localFunction': monaco.languages.SymbolKind.Function,
  'localFunctionElement': monaco.languages.SymbolKind.Function,
  'local function': monaco.languages.SymbolKind.Function,
  'local function element': monaco.languages.SymbolKind.Function,
  
  // Methods
  'method': monaco.languages.SymbolKind.Method,
  'memberFunction': monaco.languages.SymbolKind.Method,
  'memberFunctionElement': monaco.languages.SymbolKind.Method,
  'member function': monaco.languages.SymbolKind.Method,
  'member function element': monaco.languages.SymbolKind.Method,
  
  // Constructors
  'constructor': monaco.languages.SymbolKind.Constructor,
  'constructorImplementation': monaco.languages.SymbolKind.Constructor,
  'constructorImplementationElement': monaco.languages.SymbolKind.Constructor,
  'constructor implementation': monaco.languages.SymbolKind.Constructor,
  'constructor implementation element': monaco.languages.SymbolKind.Constructor,
  
  // Accessors (VS Code treats as properties)
  'getter': monaco.languages.SymbolKind.Property,
  'setter': monaco.languages.SymbolKind.Property,
  'getAccessor': monaco.languages.SymbolKind.Property,
  'setAccessor': monaco.languages.SymbolKind.Property,
  'get accessor': monaco.languages.SymbolKind.Property,
  'set accessor': monaco.languages.SymbolKind.Property,
  'memberGetAccessor': monaco.languages.SymbolKind.Property,
  'memberSetAccessor': monaco.languages.SymbolKind.Property,
  'memberGetAccessorElement': monaco.languages.SymbolKind.Property,
  'memberSetAccessorElement': monaco.languages.SymbolKind.Property,
  'member get accessor': monaco.languages.SymbolKind.Property,
  'member set accessor': monaco.languages.SymbolKind.Property,
  'member get accessor element': monaco.languages.SymbolKind.Property,
  'member set accessor element': monaco.languages.SymbolKind.Property,
  'accessor': monaco.languages.SymbolKind.Property,
  'memberAccessorVariable': monaco.languages.SymbolKind.Property,
  'memberAccessorVariableElement': monaco.languages.SymbolKind.Property,
  'member accessor variable': monaco.languages.SymbolKind.Property,
  'member accessor variable element': monaco.languages.SymbolKind.Property,
  
  // ============================================================================
  // PROPERTIES & FIELDS
  // ============================================================================
  
  'property': monaco.languages.SymbolKind.Property,
  'memberVariable': monaco.languages.SymbolKind.Property,
  'memberVariableElement': monaco.languages.SymbolKind.Property,
  'member variable': monaco.languages.SymbolKind.Property,
  'member variable element': monaco.languages.SymbolKind.Property,
  'field': monaco.languages.SymbolKind.Field,
  
  // JSX
  'JSX attribute': monaco.languages.SymbolKind.Property,
  'JSXAttribute': monaco.languages.SymbolKind.Property,
  'jsxAttribute': monaco.languages.SymbolKind.Property,
  
  // ============================================================================
  // VARIABLES & CONSTANTS
  // ============================================================================
  
  'var': monaco.languages.SymbolKind.Variable,
  'variable': monaco.languages.SymbolKind.Variable,
  'variableElement': monaco.languages.SymbolKind.Variable,
  'variable element': monaco.languages.SymbolKind.Variable,
  'localVar': monaco.languages.SymbolKind.Variable,
  'localVariable': monaco.languages.SymbolKind.Variable,
  'localVariableElement': monaco.languages.SymbolKind.Variable,
  'local var': monaco.languages.SymbolKind.Variable,
  'local variable': monaco.languages.SymbolKind.Variable,
  'local variable element': monaco.languages.SymbolKind.Variable,
  
  'let': monaco.languages.SymbolKind.Variable,
  'letElement': monaco.languages.SymbolKind.Variable,
  'let element': monaco.languages.SymbolKind.Variable,
  
  'const': monaco.languages.SymbolKind.Constant,
  'constElement': monaco.languages.SymbolKind.Constant,
  'const element': monaco.languages.SymbolKind.Constant,
  
  'parameter': monaco.languages.SymbolKind.Variable,
  'parameterElement': monaco.languages.SymbolKind.Variable,
  'parameter element': monaco.languages.SymbolKind.Variable,
  
  // Type Parameters
  'typeParameter': monaco.languages.SymbolKind.TypeParameter,
  'typeParameterElement': monaco.languages.SymbolKind.TypeParameter,
  'type parameter': monaco.languages.SymbolKind.TypeParameter,
  'type parameter element': monaco.languages.SymbolKind.TypeParameter,
  
  // ============================================================================
  // SIGNATURES (VS Code maps all to Method for consistency)
  // ============================================================================
  
  'call': monaco.languages.SymbolKind.Method,
  'callSignature': monaco.languages.SymbolKind.Method,
  'callSignatureElement': monaco.languages.SymbolKind.Method,
  'call signature': monaco.languages.SymbolKind.Method,
  'call signature element': monaco.languages.SymbolKind.Method,
  
  'index': monaco.languages.SymbolKind.Method,
  'indexSignature': monaco.languages.SymbolKind.Method,
  'indexSignatureElement': monaco.languages.SymbolKind.Method,
  'index signature': monaco.languages.SymbolKind.Method,
  'index signature element': monaco.languages.SymbolKind.Method,
  
  'construct': monaco.languages.SymbolKind.Method,
  'constructSignature': monaco.languages.SymbolKind.Method,
  'constructSignatureElement': monaco.languages.SymbolKind.Method,
  'construct signature': monaco.languages.SymbolKind.Method,
  'construct signature element': monaco.languages.SymbolKind.Method,
  
  // ============================================================================
  // PRIMITIVES & SPECIAL TYPES
  // ============================================================================
  
  'string': monaco.languages.SymbolKind.String,
  'number': monaco.languages.SymbolKind.Number,
  'boolean': monaco.languages.SymbolKind.Boolean,
  'array': monaco.languages.SymbolKind.Array,
  'object': monaco.languages.SymbolKind.Object,
  
  // ============================================================================
  // MISCELLANEOUS
  // ============================================================================
  
  // Keywords & Special
  'keyword': monaco.languages.SymbolKind.Key,
  'warning': monaco.languages.SymbolKind.Variable,
  'unknown': monaco.languages.SymbolKind.Variable,
  
  // Aliases & Labels
  'alias': monaco.languages.SymbolKind.Variable,
  'label': monaco.languages.SymbolKind.Variable,
  
  // Primitives
  'primitiveType': monaco.languages.SymbolKind.Variable,
  'primitive type': monaco.languages.SymbolKind.Variable,
  
  // JSDoc Link Components
  'link': monaco.languages.SymbolKind.String,
  'linkName': monaco.languages.SymbolKind.String,
  'link name': monaco.languages.SymbolKind.String,
  'linkText': monaco.languages.SymbolKind.String,
  'link text': monaco.languages.SymbolKind.String,
  
  // String literals
  'stringLiteral': monaco.languages.SymbolKind.String,
  'string literal': monaco.languages.SymbolKind.String,
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
  return monaco.languages.SymbolKind.Variable;
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
