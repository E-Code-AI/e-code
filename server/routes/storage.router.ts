import { projects } from '@shared/schema';
import { and,eq } from 'drizzle-orm';
import { NextFunction,Request,Response,Router } from 'express';
import multer from 'multer';
import path from 'path';
import { db } from '../db';
import { ensureAuthenticated } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { storageService } from '../services/storage.service';
import { createLogger } from '../utils/logger';
import { redactErrorForLog } from '../utils/error-redaction';

const router = Router({ mergeParams: true });
const logger = createLogger('storage-router');

// ────────────────────────────────────────────────────────────────
// Audit logging — structured log entry for every storage mutation
// ────────────────────────────────────────────────────────────────
function auditLog(
  action: string,
  userId: string | number,
  projectId: string | number,
  details: Record<string, unknown>
): void {
  logger.info(`[AUDIT] ${action}`, {
    audit: true,
    action,
    userId,
    projectId,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

// ────────────────────────────────────────────────────────────────
// In-process upload rate limiter — 30 uploads / min / (user × project)
// Keyed on both userId AND projectId so a single user cannot exhaust another
// user's quota by uploading to a shared project, and so per-user limits apply
// even if the same project is accessed by multiple users simultaneously.
// No external dependency; suitable for single-instance dev and low-traffic
// production. Replace with Redis-backed limiter for multi-replica deployments.
// ────────────────────────────────────────────────────────────────
const UPLOAD_RATE_LIMIT = 30;
const UPLOAD_RATE_WINDOW_MS = 60_000;
const uploadRateWindows = new Map<string, number[]>();

function checkUploadRateLimit(userId: string | number, projectId: string | number): void {
  const key = `${userId}:${projectId}`;
  const now = Date.now();
  const timestamps = uploadRateWindows.get(key) ?? [];
  const recent = timestamps.filter(t => now - t < UPLOAD_RATE_WINDOW_MS);
  if (recent.length >= UPLOAD_RATE_LIMIT) {
    throw new Error(
      `Upload rate limit exceeded. Maximum ${UPLOAD_RATE_LIMIT} uploads per minute.`
    );
  }
  recent.push(now);
  uploadRateWindows.set(key, recent);
}

// ────────────────────────────────────────────────────────────────
// MIME / extension validation
// ────────────────────────────────────────────────────────────────

// Extensions blocked unconditionally (high-risk executables / shortcuts).
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.com', '.pif', '.scr',   // Windows PE / self-running executables
  '.lnk', '.url',                   // Windows shell shortcuts
  '.dll', '.sys', '.drv',           // Windows system binaries
  '.bat', '.cmd', '.ps1', '.vbs',   // Windows script runners
  '.msi', '.msp', '.msc',           // Windows installers / management
  '.jar', '.jnlp',                  // Java executables
]);

/**
 * Map of extensions → accepted MIME types.
 * If an extension is in this map, the uploaded MIME type must match one of the
 * listed values (or `application/octet-stream` which multer uses as fallback).
 * Extensions not in this map are accepted with any MIME type (open developer
 * artifacts — source code, binaries, data files, etc.).
 */
const EXT_MIME_MAP: Record<string, string[]> = {
  '.jpg':  ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png':  ['image/png'],
  '.gif':  ['image/gif'],
  '.webp': ['image/webp'],
  '.svg':  ['image/svg+xml', 'text/xml', 'application/xml', 'text/plain'],
  '.pdf':  ['application/pdf'],
  '.mp4':  ['video/mp4'],
  '.mp3':  ['audio/mpeg'],
  '.wav':  ['audio/wav', 'audio/x-wav'],
  '.ogg':  ['audio/ogg', 'video/ogg'],
  '.webm': ['video/webm', 'audio/webm'],
  '.zip':  ['application/zip', 'application/x-zip-compressed'],
  '.html': ['text/html'],
};

function validateMimeMatch(filename: string, mimetype: string): void {
  const ext = path.extname(filename).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new Error(`File type ${ext} is not allowed for upload.`);
  }
  const allowedMimes = EXT_MIME_MAP[ext];
  if (
    allowedMimes &&
    mimetype !== 'application/octet-stream' && // multer fallback — always allow
    !allowedMimes.includes(mimetype)
  ) {
    throw new Error(
      `MIME type mismatch: extension ${ext} does not match reported type ${mimetype}. ` +
      `Expected one of: ${allowedMimes.join(', ')}.`
    );
  }
}

// ────────────────────────────────────────────────────────────────
// Virus-scan hook — stub interface for a real AV scanner.
// In production: replace with ClamAV, VirusTotal API, or similar.
// Throw an Error with a descriptive message if a threat is found.
// ────────────────────────────────────────────────────────────────
async function virusScanHook(buffer: Buffer, filename: string): Promise<void> {
  // Stub — always passes in dev/test.
  // Production integration point:
  //   const result = await clamavScan(buffer);
  //   if (result.isInfected) throw new Error(`Threat detected in ${filename}: ${result.viruses}`);
  void buffer; void filename;
}

// ────────────────────────────────────────────────────────────────
// Multer — memory storage, 50 MB per file
// ────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return cb(new Error(`File type not allowed: ${ext}`));
    }
    cb(null, true);
  },
});

/**
 * uploadMiddleware wraps multer so that fileFilter rejection errors (blocked
 * extensions, oversized files) surface as HTTP 400/413 rather than the default
 * Express 500 error handler.
 */
function uploadMiddleware(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // multer.MulterError covers LIMIT_FILE_SIZE etc.; plain Error covers fileFilter rejections
      const status = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: msg });
    }
    next();
  });
}

/**
 * GET /public/:path(*)
 * Unauthenticated download for objects that have been marked public.
 * Must be registered BEFORE ensureAuthenticated so it bypasses auth middleware.
 * Replit/GCS and S3 backends: streams the object if its ACL permits public-read.
 * Local backend: checks in-memory public-key registry.
 */
router.get('/public/:path(*)', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const filePath = req.params.path;

    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const fullPath = validateAndResolveStoragePath(projectId, filePath);

    // For GCS/S3 backends: redirect unconditionally to the backend-native public
    // URL. The backend enforces its own persistent ACL — this is durable across
    // process restarts and multi-instance deployments without any registry check.
    const nativeUrl = storageService.getBackendPublicUrl(fullPath);
    if (nativeUrl) {
      return res.redirect(302, nativeUrl);
    }

    // Local backend (dev-only): enforce the in-memory visibility registry.
    // The local backend has no network-layer ACL so we must check ourselves.
    if (!storageService.isPublic(fullPath)) {
      return res.status(403).json({ error: 'Object is not publicly accessible' });
    }

    const { stream, totalSize } = await storageService.downloadStream(fullPath);
    const filename = path.basename(filePath);
    const contentType = getContentType(filename);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(totalSize));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return stream.pipe(res);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (error.message?.includes('not found') || error.message?.includes('No such')) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(403).json({ error: 'Object is not publicly accessible' });
  }
});

router.use(ensureAuthenticated);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  return next();
});

async function verifyProjectOwnership(userId: number | string, projectId: number | string): Promise<boolean> {
  try {
    const userIdNum = typeof userId === 'number' ? userId : parseInt(String(userId), 10);
    const projectIdNum = typeof projectId === 'number' ? projectId : parseInt(String(projectId), 10);
    
    if (isNaN(userIdNum) || isNaN(projectIdNum) || userIdNum <= 0 || projectIdNum <= 0) {
      return false;
    }
    
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectIdNum),
        eq(projects.ownerId, userIdNum)
      )
    });
    return !!project;
  } catch (error) {
    logger.error('Project ownership verification failed', { userId, projectId, error });
    return false;
  }
}

function getProjectStoragePrefix(projectId: string | number): string {
  return `projects/${projectId}/storage`;
}

function validateAndResolveStoragePath(projectId: string | number, userPath: string): string {
  const prefix = getProjectStoragePrefix(projectId);
  const normalized = path.posix.normalize(userPath).replace(/^\/+/, '');
  if (normalized.includes('..') || normalized.startsWith('/')) {
    throw new Error('Invalid path: directory traversal is not allowed');
  }
  const fullPath = `${prefix}/${normalized}`;
  if (!fullPath.startsWith(prefix + '/')) {
    throw new Error('Invalid path: escapes project storage boundary');
  }
  return fullPath;
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.zip': 'application/zip',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  contentType?: string;
  lastModified?: string;
  isPublic?: boolean;
  children?: TreeNode[];
}

function buildFileTree(
  files: Array<{ key: string; size: number; contentType: string; lastModified: Date; isPublic?: boolean }>,
  prefix: string
): TreeNode[] {
  const tree: TreeNode[] = [];
  const folderMap = new Map<string, TreeNode>();

  for (const file of files) {
    const relativePath = file.key.replace(prefix + '/', '');
    if (!relativePath) continue;

    const parts = relativePath.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isLast) {
        const node: TreeNode = {
          name: part,
          path: relativePath,
          type: 'file',
          size: file.size,
          contentType: file.contentType,
          lastModified: file.lastModified.toISOString(),
          // isPublic comes from listFiles() which reads durable backend state
          // (GCS custom metadata or S3 sidecar index) — correct after restarts.
          isPublic: file.isPublic ?? false,
        };

        if (parentPath) {
          const parent = folderMap.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(node);
          }
        } else {
          tree.push(node);
        }
      } else {
        if (!folderMap.has(currentPath)) {
          const folderNode: TreeNode = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: [],
          };
          folderMap.set(currentPath, folderNode);

          if (parentPath) {
            const parent = folderMap.get(parentPath);
            if (parent && parent.children) {
              parent.children.push(folderNode);
            }
          } else {
            tree.push(folderNode);
          }
        }
      }
    }
  }

  const sortTree = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    }).map(node => {
      if (node.children) {
        node.children = sortTree(node.children);
      }
      return node;
    });
  };

  return sortTree(tree);
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const isOwner = await verifyProjectOwnership(userId, projectId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const prefix = getProjectStoragePrefix(projectId);
    const files = await storageService.listFiles(prefix);
    // isPublic on each StorageObject comes from durable backend state
    // (GCS custom metadata / S3 sidecar index / local in-memory registry).
    const tree = buildFileTree(files, prefix);
    const stats = await storageService.getStorageStats(prefix);

    const MAX_STORAGE = 1024 * 1024 * 1024;
    const usagePercent = (stats.totalSize / MAX_STORAGE) * 100;

    res.json({
      files: tree,
      stats: {
        totalSize: stats.totalSize,
        totalSizeFormatted: formatFileSize(stats.totalSize),
        fileCount: stats.fileCount,
        maxStorage: MAX_STORAGE,
        maxStorageFormatted: formatFileSize(MAX_STORAGE),
        usagePercent: Math.min(usagePercent, 100),
      }
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to list storage files:', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload', uploadMiddleware, async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user?.id;
    const filePath = req.body.path || '';
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const isOwner = await verifyProjectOwnership(userId, projectId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Rate-limit: 30 uploads / minute / (user × project)
    try {
      checkUploadRateLimit(userId, projectId);
    } catch (e) {
      return res.status(429).json({ error: (e as Error).message });
    }

    // MIME / extension validation — reject spoofed or forbidden file types
    try {
      validateMimeMatch(req.file.originalname, req.file.mimetype);
    } catch (e) {
      return res.status(400).json({ error: (e as Error).message });
    }

    // Virus scan (stub — wire real scanner in production)
    try {
      await virusScanHook(req.file.buffer, req.file.originalname);
    } catch (e) {
      auditLog('upload.threat_detected', userId, projectId, { filename: req.file.originalname });
      return res.status(422).json({ error: (e as Error).message });
    }

    // Quota enforcement: reject before writing if it would exceed the project limit
    const MAX_UPLOAD_STORAGE = 1024 * 1024 * 1024; // 1 GB
    const prefix = getProjectStoragePrefix(projectId);
    const currentStats = await storageService.getStorageStats(prefix);
    if (currentStats.totalSize + req.file.size > MAX_UPLOAD_STORAGE) {
      return res.status(413).json({
        error: `Storage quota exceeded. Using ${formatFileSize(currentStats.totalSize)} of ${formatFileSize(MAX_UPLOAD_STORAGE)}. Free up space before uploading.`,
        used: currentStats.totalSize,
        limit: MAX_UPLOAD_STORAGE,
      });
    }

    const fileName = req.file.originalname.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const relativePath = filePath ? `${filePath}/${fileName}` : fileName;
    const fullPath = validateAndResolveStoragePath(projectId, relativePath);
    
    const contentType = req.file.mimetype || getContentType(fileName);

    // Upload private by default — use PATCH /:path/visibility to make public
    const result = await storageService.uploadFile(fullPath, req.file.buffer, {
      contentType,
    });

    auditLog('upload', userId, projectId, { path: fullPath, size: req.file.size, contentType });

    res.status(201).json({
      key: result.key,
      path: fullPath.replace(`${prefix}/`, ''),
      size: result.size,
      sizeFormatted: formatFileSize(result.size),
      contentType: result.contentType,
      lastModified: result.lastModified,
      url: `/api/projects/${projectId}/storage/${encodeURIComponent(fullPath.replace(`${prefix}/`, ''))}/download`,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to upload file:', redactErrorForLog(error));
    res.status(error.message.includes('not allowed') ? 400 : 500).json({ error: error.message });
  }
});

router.post('/folder', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user?.id;
    const { name, parentPath } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const isOwner = await verifyProjectOwnership(userId, projectId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const sanitizedName = name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const relativePath = parentPath
      ? `${parentPath}/${sanitizedName}/.placeholder`
      : `${sanitizedName}/.placeholder`;
    const folderPath = validateAndResolveStoragePath(projectId, relativePath);

    await storageService.uploadFile(folderPath, Buffer.from(''), {
      contentType: 'text/plain',
    });

    logger.info(`Folder created: ${folderPath}`, { projectId, userId });

    res.status(201).json({
      path: parentPath ? `${parentPath}/${sanitizedName}` : sanitizedName,
      name: sanitizedName,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to create folder:', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

router.get('/:path(*)/download', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const filePath = req.params.path;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const isOwner = await verifyProjectOwnership(userId, projectId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fullPath = validateAndResolveStoragePath(projectId, filePath);
    const filename = path.basename(filePath);
    const contentType = getContentType(filePath);

    const rangeHeader = req.headers.range;

    // True streaming download — never buffer the full file in process memory
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        // HEAD-only size lookup — does NOT open a data stream
        const totalSize = await storageService.getObjectSize(fullPath);
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
        if (start < 0 || start >= totalSize || end >= totalSize || start > end) {
          res.set('Content-Range', `bytes */${totalSize}`);
          return res.status(416).end();
        }
        // Open exactly one stream covering only the requested byte range
        const { stream } = await storageService.downloadStream(fullPath, { start, end });
        res.set({
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(end - start + 1),
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        });
        res.status(206);
        return stream.pipe(res);
      }
    }

    const { stream, totalSize } = await storageService.downloadStream(fullPath);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(totalSize),
      'Accept-Ranges': 'bytes',
    });
    return stream.pipe(res);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to download file:', redactErrorForLog(error));
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/:path(*)/url', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const filePath = req.params.path;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const isOwner = await verifyProjectOwnership(userId, projectId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const fullPath = validateAndResolveStoragePath(projectId, filePath);

    const url = await storageService.getSignedUrl(fullPath, 3600, 'read');

    res.json({ url, expiresIn: 3600 });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to get signed URL:', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /folder/:path(*)
 * Recursively delete all objects under a virtual folder prefix.
 * MUST be registered BEFORE DELETE /:path(*) so Express does not shadow it.
 * Separate endpoint from DELETE /:path(*) to make the intent explicit and
 * avoid accidental recursive deletes on misrouted file paths.
 */
router.delete('/folder/:path(*)', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const folderPath = req.params.path;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const isOwner = await verifyProjectOwnership(userId, projectId);
    if (!isOwner) return res.status(403).json({ error: 'Access denied' });

    const fullPrefix = validateAndResolveStoragePath(projectId, folderPath);

    const { deletedCount } = await storageService.deleteFolder(fullPrefix);
    auditLog('delete.folder', userId, projectId, { path: fullPrefix, deletedCount });

    res.json({ message: `Folder deleted (${deletedCount} objects removed)`, deletedCount });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to delete folder:', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /:path(*)
 * Delete a single storage object.
 * Registered AFTER DELETE /folder/:path(*) so folder paths are not shadowed.
 */
router.delete('/:path(*)', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const filePath = req.params.path;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const isOwner = await verifyProjectOwnership(userId, projectId);
    if (!isOwner) return res.status(403).json({ error: 'Access denied' });

    const fullPath = validateAndResolveStoragePath(projectId, filePath);

    await storageService.deleteFile(fullPath);
    auditLog('delete.file', userId, projectId, { path: fullPath });

    res.json({ message: 'File deleted successfully' });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to delete file:', redactErrorForLog(error));
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /:path(*)/move
 * Move/rename an object within the same project's storage.
 * Body: { destination: string }  — relative path within project storage
 */
router.post('/:path(*)/move', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const sourcePath = req.params.path;
    const { destination } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const isOwner = await verifyProjectOwnership(userId, projectId);
    if (!isOwner) return res.status(403).json({ error: 'Access denied' });

    if (!destination || typeof destination !== 'string') {
      return res.status(400).json({ error: 'destination is required' });
    }

    const srcKey = validateAndResolveStoragePath(projectId, sourcePath);
    const dstKey = validateAndResolveStoragePath(projectId, destination);
    const prefix = getProjectStoragePrefix(projectId);

    if (req.body.isFolder === true) {
      // Folder rename/move: recursively move all objects under srcKey prefix
      const { movedCount } = await storageService.renameFolder(srcKey, dstKey);
      auditLog('rename.folder', userId, projectId, { src: srcKey, dst: dstKey, movedCount });
      return res.json({ path: dstKey.replace(`${prefix}/`, ''), movedCount });
    }

    const result = await storageService.moveFile(srcKey, dstKey);
    auditLog('rename.file', userId, projectId, { src: srcKey, dst: dstKey });

    res.json({
      key: result.key,
      path: result.key.replace(`${prefix}/`, ''),
      size: result.size,
      contentType: result.contentType,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to move file:', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /:path(*)/visibility
 * Persist public/private ACL for a storage object.
 * Body: { public: boolean }
 * - GCS (replit): makePublic() / makePrivate()
 * - S3: PutObjectAcl with 'public-read' / 'private'
 * - local: in-memory registry
 */
router.patch('/:path(*)/visibility', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const filePath = req.params.path;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const isOwner = await verifyProjectOwnership(userId, projectId);
    if (!isOwner) return res.status(403).json({ error: 'Access denied' });

    if (typeof req.body.public !== 'boolean') {
      return res.status(400).json({ error: '`public` (boolean) is required in body' });
    }

    const fullPath = validateAndResolveStoragePath(projectId, filePath);
    await storageService.setObjectVisibility(fullPath, req.body.public);
    auditLog('visibility.change', userId, projectId, { path: fullPath, public: req.body.public });

    res.json({
      path: filePath,
      public: req.body.public,
      publicUrl: req.body.public
        ? `/api/projects/${projectId}/storage/public/${filePath}`
        : null,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to update visibility:', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /:path(*)/copy
 * Copy an object to a new destination within the same project's storage.
 * Body: { destination: string }  — relative path within project storage
 */
router.post('/:path(*)/copy', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const sourcePath = req.params.path;
    const { destination } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const isOwner = await verifyProjectOwnership(userId, projectId);
    if (!isOwner) return res.status(403).json({ error: 'Access denied' });

    if (!destination || typeof destination !== 'string') {
      return res.status(400).json({ error: 'destination is required' });
    }

    const srcKey = validateAndResolveStoragePath(projectId, sourcePath);
    const dstKey = validateAndResolveStoragePath(projectId, destination);

    const result = await storageService.copyFile(srcKey, dstKey);
    const prefix = getProjectStoragePrefix(projectId);
    auditLog('copy.file', userId, projectId, { src: srcKey, dst: dstKey });

    res.status(201).json({
      key: result.key,
      path: result.key.replace(`${prefix}/`, ''),
      size: result.size,
      contentType: result.contentType,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to copy file:', redactErrorForLog(error));
    res.status(500).json({ error: error.message });
  }
});

export default router;
