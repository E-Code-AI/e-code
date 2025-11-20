/**
 * Unit Tests for TypeScript Kind Mapping Module
 * Tests comprehensive TypeScript ScriptElementKind → Monaco SymbolKind mappings
 */

import { testRunner } from '../../setup/test-runner';
import * as monaco from 'monaco-editor';
import {
  mapTsKindToMonacoSymbol,
  getUnknownKinds,
  clearUnknownKinds,
  getMappedKindCount,
  TS_KIND_TO_MONACO_SYMBOL,
} from '../../../client/src/lib/ts-kind-map';

testRunner.registerSuite('TypeScript Kind Mapping - Core Mappings', {
  beforeEach: () => {
    clearUnknownKinds();
  },
  
  tests: [
    {
      name: 'maps class kinds correctly',
      fn: () => {
        expect(mapTsKindToMonacoSymbol('class', false)).toBe(monaco.languages.SymbolKind.Class);
        expect(mapTsKindToMonacoSymbol('localClass', false)).toBe(monaco.languages.SymbolKind.Class);
        expect(mapTsKindToMonacoSymbol('local class', false)).toBe(monaco.languages.SymbolKind.Class);
      },
    },
    {
      name: 'maps interface and type alias correctly',
      fn: () => {
        expect(mapTsKindToMonacoSymbol('interface', false)).toBe(monaco.languages.SymbolKind.Interface);
        expect(mapTsKindToMonacoSymbol('type', false)).toBe(monaco.languages.SymbolKind.Interface);
        expect(mapTsKindToMonacoSymbol('typeAlias', false)).toBe(monaco.languages.SymbolKind.Interface);
        expect(mapTsKindToMonacoSymbol('type alias', false)).toBe(monaco.languages.SymbolKind.Interface);
      },
    },
    {
      name: 'maps enum kinds correctly',
      fn: () => {
        expect(mapTsKindToMonacoSymbol('enum', false)).toBe(monaco.languages.SymbolKind.Enum);
        expect(mapTsKindToMonacoSymbol('enumMember', false)).toBe(monaco.languages.SymbolKind.EnumMember);
        expect(mapTsKindToMonacoSymbol('enum member', false)).toBe(monaco.languages.SymbolKind.EnumMember);
      },
    },
    {
      name: 'maps function kinds correctly',
      fn: () => {
        expect(mapTsKindToMonacoSymbol('function', false)).toBe(monaco.languages.SymbolKind.Function);
        expect(mapTsKindToMonacoSymbol('localFunction', false)).toBe(monaco.languages.SymbolKind.Function);
        expect(mapTsKindToMonacoSymbol('local function', false)).toBe(monaco.languages.SymbolKind.Function);
      },
    },
    {
      name: 'maps method and constructor correctly',
      fn: () => {
        expect(mapTsKindToMonacoSymbol('method', false)).toBe(monaco.languages.SymbolKind.Method);
        expect(mapTsKindToMonacoSymbol('constructor', false)).toBe(monaco.languages.SymbolKind.Constructor);
      },
    },
    {
      name: 'maps accessor kinds to Property for VS Code parity',
      fn: () => {
        expect(mapTsKindToMonacoSymbol('getter', false)).toBe(monaco.languages.SymbolKind.Property);
        expect(mapTsKindToMonacoSymbol('setter', false)).toBe(monaco.languages.SymbolKind.Property);
        expect(mapTsKindToMonacoSymbol('getAccessor', false)).toBe(monaco.languages.SymbolKind.Property);
        expect(mapTsKindToMonacoSymbol('setAccessor', false)).toBe(monaco.languages.SymbolKind.Property);
      },
    },
    {
      name: 'maps ALL signature kinds to Method for VS Code parity',
      fn: () => {
        expect(mapTsKindToMonacoSymbol('call', false)).toBe(monaco.languages.SymbolKind.Method);
        expect(mapTsKindToMonacoSymbol('callSignature', false)).toBe(monaco.languages.SymbolKind.Method);
        expect(mapTsKindToMonacoSymbol('call signature', false)).toBe(monaco.languages.SymbolKind.Method);
        expect(mapTsKindToMonacoSymbol('index', false)).toBe(monaco.languages.SymbolKind.Method);
        expect(mapTsKindToMonacoSymbol('indexSignature', false)).toBe(monaco.languages.SymbolKind.Method);
        expect(mapTsKindToMonacoSymbol('construct', false)).toBe(monaco.languages.SymbolKind.Method);
        expect(mapTsKindToMonacoSymbol('constructSignature', false)).toBe(monaco.languages.SymbolKind.Method);
      },
    },
    {
      name: 'maps variable kinds correctly',
      fn: () => {
        expect(mapTsKindToMonacoSymbol('var', false)).toBe(monaco.languages.SymbolKind.Variable);
        expect(mapTsKindToMonacoSymbol('let', false)).toBe(monaco.languages.SymbolKind.Variable);
        expect(mapTsKindToMonacoSymbol('const', false)).toBe(monaco.languages.SymbolKind.Constant);
        expect(mapTsKindToMonacoSymbol('parameter', false)).toBe(monaco.languages.SymbolKind.Variable);
      },
    },
    {
      name: 'maps type parameter correctly',
      fn: () => {
        expect(mapTsKindToMonacoSymbol('typeParameter', false)).toBe(monaco.languages.SymbolKind.TypeParameter);
        expect(mapTsKindToMonacoSymbol('type parameter', false)).toBe(monaco.languages.SymbolKind.TypeParameter);
      },
    },
    {
      name: 'maps module and namespace correctly',
      fn: () => {
        expect(mapTsKindToMonacoSymbol('module', false)).toBe(monaco.languages.SymbolKind.Module);
        expect(mapTsKindToMonacoSymbol('namespace', false)).toBe(monaco.languages.SymbolKind.Namespace);
        expect(mapTsKindToMonacoSymbol('script', false)).toBe(monaco.languages.SymbolKind.Module);
      },
    },
    {
      name: 'maps primitive types correctly',
      fn: () => {
        expect(mapTsKindToMonacoSymbol('string', false)).toBe(monaco.languages.SymbolKind.String);
        expect(mapTsKindToMonacoSymbol('number', false)).toBe(monaco.languages.SymbolKind.Number);
        expect(mapTsKindToMonacoSymbol('boolean', false)).toBe(monaco.languages.SymbolKind.Boolean);
      },
    },
  ],
});

testRunner.registerSuite('TypeScript Kind Mapping - Fallback & Telemetry', {
  beforeEach: () => {
    clearUnknownKinds();
  },
  
  tests: [
    {
      name: 'falls back to Variable for unknown kinds',
      fn: () => {
        expect(mapTsKindToMonacoSymbol('unknownKind', false)).toBe(monaco.languages.SymbolKind.Variable);
      },
    },
    {
      name: 'tracks unknown kinds when telemetry enabled',
      fn: () => {
        mapTsKindToMonacoSymbol('unknownKind1', true);
        mapTsKindToMonacoSymbol('unknownKind2', true);
        mapTsKindToMonacoSymbol('unknownKind1', true); // Duplicate
        
        const unknowns = getUnknownKinds();
        expect(unknowns).toContain('unknownKind1');
        expect(unknowns).toContain('unknownKind2');
        expect(unknowns.length).toBe(2);
      },
    },
    {
      name: 'does not track unknown kinds when telemetry disabled',
      fn: () => {
        mapTsKindToMonacoSymbol('unknownKind', false);
        expect(getUnknownKinds()).not.toContain('unknownKind');
      },
    },
    {
      name: 'clears unknown kinds tracking',
      fn: () => {
        mapTsKindToMonacoSymbol('unknown1', true);
        expect(getUnknownKinds().length).toBe(1);
        
        clearUnknownKinds();
        expect(getUnknownKinds().length).toBe(0);
      },
    },
  ],
});

testRunner.registerSuite('TypeScript Kind Mapping - Coverage Validation', {
  tests: [
    {
      name: 'has comprehensive mapping coverage (100+ kinds)',
      fn: () => {
        const count = getMappedKindCount();
        expect(count).toBeGreaterThan(100);
      },
    },
    {
      name: 'handles both camelCase and space-separated variants',
      fn: () => {
        const variants = [
          ['localClass', 'local class'],
          ['typeAlias', 'type alias'],
          ['enumMember', 'enum member'],
          ['callSignature', 'call signature'],
        ];

        variants.forEach(([camelCase, spaced]) => {
          const camelResult = mapTsKindToMonacoSymbol(camelCase, false);
          const spacedResult = mapTsKindToMonacoSymbol(spaced, false);
          expect(camelResult).toBe(spacedResult);
        });
      },
    },
    {
      name: 'exports mapping object for direct access',
      fn: () => {
        expect(TS_KIND_TO_MONACO_SYMBOL).toBeDefined();
        expect(typeof TS_KIND_TO_MONACO_SYMBOL).toBe('object');
        expect(TS_KIND_TO_MONACO_SYMBOL['class']).toBe(monaco.languages.SymbolKind.Class);
      },
    },
  ],
});
