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
import { fileVersions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

// @babel/traverse default-export quirk under ESM interop.
const traverse: typeof _traverse = (_traverse as any).default ?? _traverse;
const generateCode: any = (generate as any).default ?? generate;

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
  edit: any;
  before: string;
  after: string;
  filePath: string;
}

function isMissingVisualEditStorage(error: any): boolean {
  const directCode = error?.code;
  const causeCode = error?.cause?.code;
  const message = String(error?.message || '');
  const causeMessage = String(error?.cause?.message || '');

  return (
    directCode === '42P01' ||
    causeCode === '42P01' ||
    /relation .* does not exist/i.test(message) ||
    /relation .* does not exist/i.test(causeMessage)
  );
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

async function resolveFileByLocator(
  projectId: number,
  locator: NonNullable<VisualEditRequest['locator']>,
): Promise<{ id: number; path: string; content: string } | null> {
  const all = await storage.getFilesByProject(projectId);
  const jsxFiles = all.filter(file => !file.isDirectory && isJsxLike(file.path));
  const matches: Array<{ id: number; path: string; content: string }> = [];

  for (const file of jsxFiles) {
    const content = file.content ?? '';
    let ast: t.File;
    try {
      ast = parse(content, {
        sourceType: 'module',
        errorRecovery: true,
        plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'objectRestSpread'],
      });
    } catch {
      continue;
    }

    const element = findJsxElementByHint(ast, locator);
    if (element) {
      matches.push({ id: file.id, path: file.path, content });
      if (matches.length > 1) {
        break;
      }
    }
  }

  if (matches.length !== 1) {
    return null;
  }

  return matches[0];
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

  let resolved: { id: number; path: string; content: string } | null = null;
  if (req.debugSource?.fileName) {
    resolved = await resolveFile(req.projectId, req.debugSource.fileName);
    if (!resolved) {
      throw new Error(`Source file for ${req.debugSource.fileName} not found in project`);
    }
  } else if (req.locator) {
    resolved = await resolveFileByLocator(req.projectId, req.locator);
    if (!resolved) {
      throw new Error('Could not uniquely resolve the selected element to a source file');
    }
  }

  if (!resolved) {
    throw new Error('debugSource.fileName or a unique element locator is required to locate source file');
  }
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

  const [row] = await db.insert(fileVersions).values({
    fileId: resolved.id,
    projectId: req.projectId,
    content: after,
    changeType: 'modified',
    changeSummary: summary,
    userId: req.userId,
    metadata: {
      visualEdit: true,
      status: 'applied',
      filePath: resolved.path,
      beforeContent: before,
      afterContent: after,
      summary,
      styles: changedStyles ? styles : null,
      text: changedText ? req.text : null,
      debugSource: req.debugSource ?? null,
    },
  }).returning();

  return { edit: row, before, after, filePath: resolved.path };
}

async function getLatestVisualEdit(projectId: number, status: 'applied' | 'undone') {
  try {
    const rows = await db.execute(sql`
      SELECT *
      FROM file_versions
      WHERE project_id = ${projectId}
        AND COALESCE(metadata->>'visualEdit', 'false') = 'true'
        AND COALESCE(metadata->>'status', 'applied') = ${status}
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `);

    const resultRows = Array.isArray((rows as any).rows) ? (rows as any).rows : (Array.isArray(rows) ? rows : []);
    return (resultRows[0] as any) ?? null;
  } catch (error) {
    if (isMissingVisualEditStorage(error)) {
      return null;
    }
    throw error;
  }
}

async function updateVisualEditStatus(id: number, status: 'applied' | 'undone') {
  const [updated] = await db.update(fileVersions)
    .set({
      metadata: sql`COALESCE(${fileVersions.metadata}, '{}'::jsonb) || ${JSON.stringify({ status })}::jsonb`,
    })
    .where(eq(fileVersions.id, id))
    .returning();

  return updated;
}

export async function undoLastEdit(projectId: number, userId: number): Promise<any | null> {
  const project = await storage.getProject(projectId);
  if (!project) throw new Error('Project not found');
  const hasAccess = project.ownerId === userId || await storage.isProjectCollaborator(projectId, userId);
  if (!hasAccess) throw new Error('Not authorized');

  const row = await getLatestVisualEdit(projectId, 'applied');
  if (!row) return null;

  const beforeContent = row.metadata?.beforeContent;
  if (typeof beforeContent !== 'string') {
    throw new Error('Visual edit history is missing prior file content');
  }

  await storage.updateFile(row.file_id, { content: beforeContent });
  const updated = await updateVisualEditStatus(row.id, 'undone');
  return updated;
}

export async function redoLastEdit(projectId: number, userId: number): Promise<any | null> {
  const project = await storage.getProject(projectId);
  if (!project) throw new Error('Project not found');
  const hasAccess = project.ownerId === userId || await storage.isProjectCollaborator(projectId, userId);
  if (!hasAccess) throw new Error('Not authorized');

  const row = await getLatestVisualEdit(projectId, 'undone');
  if (!row) return null;

  const afterContent = row.metadata?.afterContent;
  if (typeof afterContent !== 'string') {
    throw new Error('Visual edit history is missing updated file content');
  }

  await storage.updateFile(row.file_id, { content: afterContent });
  const updated = await updateVisualEditStatus(row.id, 'applied');
  return updated;
}

export async function getEditHistory(projectId: number, limit = 20): Promise<any[]> {
  try {
    const rows = await db.execute(sql`
      SELECT
        id,
        file_id,
        project_id,
        change_summary,
        created_at,
        updated_at,
        metadata
      FROM file_versions
      WHERE project_id = ${projectId}
        AND COALESCE(metadata->>'visualEdit', 'false') = 'true'
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}
    `);

    const resultRows = Array.isArray((rows as any).rows) ? (rows as any).rows : (Array.isArray(rows) ? rows : []);
    return resultRows.map((row: any) => ({
      id: row.id,
      fileId: row.file_id,
      projectId: row.project_id,
      filePath: row.metadata?.filePath ?? '',
      summary: row.change_summary ?? row.metadata?.summary ?? 'Visual edit',
      status: row.metadata?.status ?? 'applied',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata ?? {},
    }));
  } catch (error) {
    if (isMissingVisualEditStorage(error)) {
      return [];
    }
    throw error;
  }
}
