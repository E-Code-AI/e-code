import { Router, Request, Response, NextFunction } from "express";
import { body, param, query, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";

type SupportedLanguage = "javascript" | "typescript" | "python" | "ruby" | "go";

interface SandboxJobRequest {
  language: SupportedLanguage;
  code: string;
  stdin?: string;
  timeoutMs?: number;
  memoryLimitMb?: number;
}

interface SandboxJobStatus {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  result?: {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    durationMs: number | null;
  };
  error?: string;
}

interface SandboxService {
  submitJob: (job: SandboxJobRequest) => Promise<{ id: string }>;
  getJobStatus: (id: string) => Promise<SandboxJobStatus | null>;
  listJobs?: (options?: {
    limit?: number;
    status?: SandboxJobStatus["status"];
  }) => Promise<SandboxJobStatus[]>;
}

interface SandboxRoutesOptions {
  sandboxService: SandboxService;
  maxCodeLength?: number;
  maxTimeoutMs?: number;
  defaultTimeoutMs?: number;
  maxMemoryLimitMb?: number;
  defaultMemoryLimitMb?: number;
}

const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  "javascript",
  "typescript",
  "python",
  "ruby",
  "go",
];

const DEFAULT_MAX_CODE_LENGTH = 100_000;
const DEFAULT_MAX_TIMEOUT_MS = 15_000;
const DEFAULT_DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_MEMORY_LIMIT_MB = 512;
const DEFAULT_DEFAULT_MEMORY_LIMIT_MB = 256;

function createValidationErrorResponse(req: Request, res: Response): void {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return;
  }

  res.status(400).json({
    error: "ValidationError",
    message: "Invalid request payload",
    details: errors.array().map((err) => ({
      field: err.param,
      message: err.msg,
      location: err.location,
    })),
  });
}

function asyncHandler<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
>(
  fn: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createSandboxRouter(options: SandboxRoutesOptions): Router {
  const router = Router();

  const {
    sandboxService,
    maxCodeLength = DEFAULT_MAX_CODE_LENGTH,
    maxTimeoutMs = DEFAULT_MAX_TIMEOUT_MS,
    defaultTimeoutMs = DEFAULT_DEFAULT_TIMEOUT_MS,
    maxMemoryLimitMb = DEFAULT_MAX_MEMORY_LIMIT_MB,
    defaultMemoryLimitMb = DEFAULT_DEFAULT_MEMORY_LIMIT_MB,
  } = options;

  router.post(
    "/jobs",
    [
      body("language")
        .exists()
        .withMessage("language is required")
        .bail()
        .isString()
        .withMessage("language must be a string")
        .bail()
        .custom((value) => SUPPORTED_LANGUAGES.includes(value))
        .withMessage(
          `language must be one of: undefined`,
        ),
      body("code")
        .exists()
        .withMessage("code is required")
        .bail()
        .isString()
        .withMessage("code must be a string")
        .bail()
        .isLength({ min: 1 })
        .withMessage("code must not be empty")
        .bail()
        .isLength({ max: maxCodeLength })
        .withMessage(`code must not exceed undefined characters`),
      body("stdin")
        .optional()
        .isString()
        .withMessage("stdin must be a string"),
      body("timeoutMs")
        .optional()
        .isInt({ min: 1 })
        .withMessage("timeoutMs must be a positive integer")
        .bail()
        .custom((value) => Number(value) <= maxTimeoutMs)
        .withMessage(`timeoutMs must not exceed undefined ms`),
      body("memoryLimitMb")
        .optional()
        .isInt({ min: 16 })
        .withMessage("memoryLimitMb must be an integer >= 16")
        .bail()
        .custom((value) => Number(value) <= maxMemoryLimitMb)
        .withMessage(`memoryLimitMb must not exceed undefined MB`),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      if (!validationResult(req).isEmpty()) {
        return createValidationErrorResponse(req, res);
      }

      const {
        language,
        code,
        stdin,
        timeoutMs: rawTimeoutMs,
        memoryLimitMb: rawMemoryLimitMb,
      } = req.body as Partial<SandboxJobRequest>;

      const timeoutMs =
        typeof rawTimeoutMs === "number"
          ? Math.min(rawTimeoutMs, maxTimeoutMs)
          : defaultTimeoutMs;

      const memoryLimitMb =
        typeof rawMemoryLimitMb === "number"
          ? Math.min(rawMemoryLimitMb, maxMemoryLimitMb)
          : defaultMemoryLimitMb;

      const jobRequest: SandboxJobRequest = {
        language: language as SupportedLanguage,
        code: code as string,
        stdin,
        timeoutMs,
        memoryLimitMb,
      };

      const jobId = uuidv4();

      const { id } = await sandboxService.submitJob(jobRequest);

      res.status(202).json({
        id: id || jobId,
        status: "queued",
        createdAt: new Date().toISOString(),
      });
    }),
  );

  router.get(
    "/jobs/:id",
    [
      param("id")
        .exists()
        .withMessage("id is required")
        .bail()
        .isString()
        .withMessage("id must be a string")
        .bail()
        .isLength({ min: 1 })
        .withMessage("id must not be empty"),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      if (!validationResult(req).isEmpty()) {
        return createValidationErrorResponse(req, res);
      }

      const { id } = req.params;

      const status = await sandboxService.getJobStatus(id);

      if (!status) {
        return res.status(404).json({
          error: "NotFound",
          message: `Job with id 'undefined' not found`,
        });
      }

      res.json(status);
    }),
  );

  router.get(
    "/jobs",
    [
      query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be an integer between 1 and 100"),
      query("status")
        .optional()
        .isString()
        .withMessage("status must be a string")
        .bail()
        .custom((value) =>
          ["queued", "running", "completed", "failed", "cancelled"].includes(
            value,
          ),
        )
        .withMessage(
          "status must be one of: queued, running, completed, failed, cancelled",
        ),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      if (!validationResult(req).isEmpty()) {
        return createValidationErrorResponse(req, res);
      }

      if (!sandboxService.listJobs) {
        return res.status(405).json({
          error: "NotSupported",
          message: "Listing jobs is not supported by this service",
        });
      }

      const limit = req.query.limit
        ? Number.parseInt(req.query.limit as string, 10)
        : 20;

      const status = req.query.status as SandboxJobStatus["status"] | undefined;

      const jobs = await sandboxService.listJobs({
        limit,
        status,
      });

      res.json({
        items: jobs,
        count: jobs.length,
      });
    }),
  );

  return router;
}

export default createSandboxRouter;