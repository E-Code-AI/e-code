/**
 * Visual edit writer service.
 *
 * Translates a UI-driven "I selected this element and changed these styles"
 * payload into a real source-file mutation:
 *
 *   - The client extracts React's `_debugSource` ({ fileName, lineNumber,
 *     columnNumber }) from the selected element's fiber. Vite's React plugin
 *     emits this by default in dev, so we don't need a custom Babel plugin.
 *   - We parse the JSX/TSX source with @babel/parser, locate the exact
 *     element at the source position, and either
 *       * merge styles into its existing `style={{...}}` prop (creating one
 *         if missing), and/or
 *       * replace its text children when `text` is provided.
 *   - The before/after content is persisted in the `visual_edits` table for
 *     undo/redo without relying on git.
 */

import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import generate from '@babel/generator';
import { storage } from '../storage';
import { db } from '../db';
import { visualEdits, type VisualEdit } from '@shared/schema';
import { and, eq, desc } from 'drizzle-orm';
import { createLogger } from '../utils/logger';

// @babel/traverse default-export quirk under ESM interop.
const traverse: typeof _traverse = (_traverse as any).default ?? _traverse;
const generateCode: any = (generate as any).default ?? generate;

const logger = createLogger('visual-edits-service');

export interface VisualEditRequest {
  projectId: number;
  userId: number;
  /** React dev-source hint extracted from __reactFiber$....._debugSource */
  debugSource?: {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
  };
  /** Fallback locator when _debugSource isn't available. */
  locator?: {
    tagName: string;
    text?: string;
    className?: string;
    id?: string;
  };
  styles?: Record<string, string>;
  text?: string;
}

export interface VisualEditResult {
  edit: VisualEdit;
  before: string;
  after: string;
  filePath: string;
}

const STYLE_KEY_ALLOWLIST = new Set([
  'color',
  'backgroundColor',
  'background',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'textDecoration',
  'textAlign',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'borderRadius',
  'borderWidth',
  'borderColor',
  'borderStyle',
  'opacity',
  'width',
  'height',
  'display',
  'flexDirection',
  'justifyContent',
  'alignItems',
  'gap',
  'lineHeight',
  'letterSpacing',
  'boxShadow',
]);

function filterStyles(raw?: Record<string, string>): Record<string, string> {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== 'string') continue;
    if (!STYLE_KEY_ALLOWLIST.has(k)) continue;
    if (v.length > 200) continue; // defense against pathological inputs
    out[k] = v;
  }
  return out;
}

/**
 * Resolve the repo-relative path the client sees (from _debugSource) to a
 * real row in the `files` table for this project. Paths can arrive as
 * absolute ("/tmp/preview-.../src/App.tsx"), as "src/App.tsx", or even as
 * "/src/App.tsx". We try all three.
 */
async function resolveFile(projectId: number, fileName: string): Promise<{ id: number; path: string; content: string } | null> {
  // Strip any /tmp/preview-<id>/ or /tmp/debug-<id>/ prefix.
  let rel = fileName;
  const prefixMatch = rel.match(/^\/tmp\/(?:preview|debug)-\d+\/(.*)$/);
  if (prefixMatch) rel = prefixMatch[1];
  rel = rel.replace(/^\/+/, '');

  // Try exact match, then try candidates that drop leading "src/" or add it.
  const candidates = Array.from(new Set([rel, rel.startsWith('src/') ? rel.slice(4) : `src/${rel}`]));
  for (const candidate of candidates) {
    const file = await storage.getFileByPath(projectId, candidate);
    if (file && !file.isDirectory) return { id: file.id, path: file.path, content: file.content ?? '' };
  }
  // Last-ditch effort: list all files and find one whose path endsWith rel.
  const all = await storage.getFilesByProject(projectId);
  const match = all.find(f => !f.isDirectory && (f.path === rel || f.path?.endsWith(`/${rel}`) || f.path?.endsWith(rel)));
  if (match) return { id: match.id, path: match.path, content: match.content ?? '' };
  return null;
}

function isJsxLike(filePath: string): boolean {
  return /\.(jsx|tsx|js|mjs|ts)$/i.test(filePath);
}

/**
 * Walk the AST and return the JSXOpeningElement whose source location
 * contains (line, column). Uses Babel's stored `loc` on nodes. Prefers the
 * deepest matching element so nested siblings resolve correctly.
 */
function findJsxElementAt(ast: t.File, line: number, column: number): t.JSXElement | null {
  let best: t.JSXElement | null = null;
  let bestSpan = Number.POSITIVE_INFINITY;
  traverse(ast, {
    JSXElement(pathNode) {
      const loc = pathNode.node.loc;
      if (!loc) return;
      // _debugSource gives the 1-based line and 1-based column of the opening
      // `<`. Babel's loc.start.column is 0-based.
      const startLine = loc.start.line;
      const startCol = loc.start.column + 1;
      if (startLine === line && startCol === column) {
        best = pathNode.node;
        pathNode.skip();
        return;
      }
      // Fallback: element that contains the point.
      if (
        (loc.start.line < line || (loc.start.line === line && startCol <= column)) &&
        (loc.end.line > line || (loc.end.line === line && loc.end.column + 1 >= column))
      ) {
        const span = (loc.end.line - loc.start.line) * 200 + (loc.end.column - loc.start.column);
        if (span < bestSpan) {
          best = pathNode.node;
          bestSpan = span;
        }
      }
    },
  });
  return best;
}

/**
 * Heuristic fallback when _debugSource isn't available: find the element in
 * the file whose tag matches and whose inner text or id/class is the closest
 * match. Deliberately conservative — we bail out if more than one element
 * matches.
 */
function findJsxElementByHint(ast: t.File, locator: VisualEditRequest['locator']): t.JSXElement | null {
  if (!locator) return null;
  const tag = locator.tagName.toLowerCase();
  const matches: t.JSXElement[] = [];
  traverse(ast, {
    JSXElement(pathNode) {
      const open = pathNode.node.openingElement;
      const nameNode = open.name;
      let tagName = '';
      if (t.isJSXIdentifier(nameNode)) tagName = nameNode.name;
      else if (t.isJSXMemberExpression(nameNode)) tagName = 'member';
      if (!tagName) return;
      if (tagName.toLowerCase() !== tag) return;

      if (locator.id) {
        const idAttr = open.attributes.find(a => t.isJSXAttribute(a) && a.name.name === 'id');
        if (!idAttr || !t.isJSXAttribute(idAttr)) return;
        const v = idAttr.value;
        if (!t.isStringLiteral(v) || v.value !== locator.id) return;
      }

      if (locator.text) {
        const textNodes = pathNode.node.children.filter(c => t.isJSXText(c)) as t.JSXText[];
        const joined = textNodes.map(n => n.value.trim()).join(' ').trim();
        if (!joined.includes(locator.text.trim())) return;
      }
      matches.push(pathNode.node);
    },
  });
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Merge `styles` into the element's existing `style={{...}}` attribute.
 * Creates the attribute if absent. Leaves unrelated props untouched.
 */
function mergeStyles(element: t.JSXElement, styles: Record<string, string>): boolean {
  if (!Object.keys(styles).length) return false;
  const open = element.openingElement;

  let styleAttr = open.attributes.find(
    (a): a is t.JSXAttribute => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name) && a.name.name === 'style'
  );

  let styleObject: t.ObjectExpression;

  if (!styleAttr) {
    styleObject = t.objectExpression([]);
    styleAttr = t.jsxAttribute(
      t.jsxIdentifier('style'),
      t.jsxExpressionContainer(styleObject),
    );
    open.attributes.push(styleAttr);
  } else {
    const val = styleAttr.value;
    if (t.isJSXExpressionContainer(val) && t.isObjectExpression(val.expression)) {
      styleObject = val.expression;
    } else {
      styleObject = t.objectExpression([]);
      styleAttr.value = t.jsxExpressionContainer(styleObject);
    }
  }

  for (const [rawKey, rawVal] of Object.entries(styles)) {
    const existing = styleObject.properties.find(
      (p): p is t.ObjectProperty =>
        t.isObjectProperty(p) &&
        ((t.isIdentifier(p.key) && p.key.name === rawKey) ||
         (t.isStringLiteral(p.key) && p.key.value === rawKey))
    );
    const valueNode = t.stringLiteral(rawVal);
    if (existing) {
      existing.value = valueNode;
    } else {
      styleObject.properties.push(t.objectProperty(t.identifier(rawKey), valueNode));
    }
  }
  return true;
}

/**
 * Replace the text children of an element with a single JSXText node. Leaves
 * any JSX element children alone — we only touch text.
 */
function replaceText(element: t.JSXElement, newText: string): boolean {
  const hasTextOnly = element.children.every(c => t.isJSXText(c) || t.isJSXExpressionContainer(c));
  if (!hasTextOnly) return false;
  element.children = [t.jsxText(newText)];
  return true;
}

export async function applyVisualEdit(req: VisualEditRequest): Promise<VisualEditResult> {
  const project = await storage.getProject(req.projectId);
  if (!project) throw new Error('Project not found');
  const hasAccess = await storage.isProjectCollaborator(req.projectId, req.userId);
  if (!hasAccess) throw new Error('Not authorized to edit this project');

  const styles = filterStyles(req.styles);
  if (!Object.keys(styles).length && !req.text) {
    throw new Error('Nothing to apply');
  }

  let filePath: string | null = null;
  if (req.debugSource?.fileName) filePath = req.debugSource.fileName;
  if (!filePath) throw new Error('debugSource.fileName required to locate source file');

  const resolved = await resolveFile(req.projectId, filePath);
  if (!resolved) throw new Error(`Source file for ${filePath} not found in project`);
  if (!isJsxLike(resolved.path)) throw new Error(`File ${resolved.path} is not a JSX-capable source file`);

  const before = resolved.content;

  let ast: t.File;
  try {
    ast = parse(before, {
      sourceType: 'module',
      errorRecovery: true,
      plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
    });
  } catch (err: any) {
    throw new Error(`Failed to parse ${resolved.path}: ${err.message}`);
  }

  let element: t.JSXElement | null = null;
  if (req.debugSource) {
    element = findJsxElementAt(ast, req.debugSource.lineNumber, req.debugSource.columnNumber);
  }
  if (!element && req.locator) {
    element = findJsxElementByHint(ast, req.locator);
  }
  if (!element) throw new Error('Could not locate the target element in source');

  const changedStyles = mergeStyles(element, styles);
  const changedText = typeof req.text === 'string' ? replaceText(element, req.text) : false;
  if (!changedStyles && !changedText) throw new Error('No applicable changes');

  const { code: after } = generateCode(ast, {
    retainLines: true,
    jsescOption: { minimal: true },
  }, before);

  if (after === before) throw new Error('Generated source identical to original');

  // Persist file content; let downstream listeners (preview-sync) react.
  await storage.updateFile(resolved.id, { content: after });

  const parts: string[] = [];
  if (changedStyles) parts.push(`styles(${Object.keys(styles).join(', ')})`);
  if (changedText) parts.push('text');
  const summary = `Visual edit ${parts.join(' + ')} on ${resolved.path}`;

  const [row] = await db.insert(visualEdits).values({
    projectId: req.projectId,
    userId: req.userId,
    fileId: resolved.id,
    filePath: resolved.path,
    beforeContent: before,
    afterContent: after,
    summary,
    metadata: {
      styles: changedStyles ? styles : null,
      text: changedText ? req.text : null,
      debugSource: req.debugSource ?? null,
    },
    status: 'applied',
  }).returning();

  return { edit: row, before, after, filePath: resolved.path };
}

export async function undoLastEdit(projectId: number, userId: number): Promise<VisualEdit | null> {
  const project = await storage.getProject(projectId);
  if (!project) throw new Error('Project not found');
  const hasAccess = await storage.isProjectCollaborator(projectId, userId);
  if (!hasAccess) throw new Error('Not authorized');

  const rows = await db.select().from(visualEdits)
    .where(and(eq(visualEdits.projectId, projectId), eq(visualEdits.status, 'applied')))
    .orderBy(desc(visualEdits.createdAt))
    .limit(1);
  if (!rows.length) return null;
  const row = rows[0];

  await storage.updateFile(row.fileId, { content: row.beforeContent });
  const [updated] = await db.update(visualEdits)
    .set({ status: 'undone', updatedAt: new Date() })
    .where(eq(visualEdits.id, row.id))
    .returning();
  return updated;
}

export async function redoLastEdit(projectId: number, userId: number): Promise<VisualEdit | null> {
  const project = await storage.getProject(projectId);
  if (!project) throw new Error('Project not found');
  const hasAccess = await storage.isProjectCollaborator(projectId, userId);
  if (!hasAccess) throw new Error('Not authorized');

  const rows = await db.select().from(visualEdits)
    .where(and(eq(visualEdits.projectId, projectId), eq(visualEdits.status, 'undone')))
    .orderBy(desc(visualEdits.updatedAt))
    .limit(1);
  if (!rows.length) return null;
  const row = rows[0];

  await storage.updateFile(row.fileId, { content: row.afterContent });
  const [updated] = await db.update(visualEdits)
    .set({ status: 'applied', updatedAt: new Date() })
    .where(eq(visualEdits.id, row.id))
    .returning();
  return updated;
}

export async function getEditHistory(projectId: number, limit = 20): Promise<VisualEdit[]> {
  return db.select().from(visualEdits)
    .where(eq(visualEdits.projectId, projectId))
    .orderBy(desc(visualEdits.createdAt))
    .limit(limit);
}
