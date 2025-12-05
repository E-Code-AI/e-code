import { Request, Response, NextFunction } from "express";
import { ParsedQs } from "qs";

interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

interface HistoryFilters {
  userId?: string;
  type?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

interface HistoryItem {
  id: string;
  userId: string;
  type: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

interface HistorySearchResult {
  items: HistoryItem[];
  total: number;
  page: number;
  limit: number;
}

interface HistoryService {
  searchHistory: (
    filters: HistoryFilters,
    pagination: PaginationParams
  ) => Promise<HistorySearchResult>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const parseNumber = (
  value: string | string[] | ParsedQs | ParsedQs[] | undefined,
  fallback: number
): number => {
  if (value === undefined) return fallback;
  const str = Array.isArray(value) ? String(value[0]) : String(value);
  const parsed = Number.parseInt(str, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const parseLimit = (
  value: string | string[] | ParsedQs | ParsedQs[] | undefined
): number => {
  const limit = parseNumber(value, DEFAULT_LIMIT);
  return Math.min(limit, MAX_LIMIT);
};

const parseDate = (
  value: string | string[] | ParsedQs | ParsedQs[] | undefined
): Date | undefined => {
  if (!value) return undefined;
  const str = Array.isArray(value) ? String(value[0]) : String(value);
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const parseString = (
  value: string | string[] | ParsedQs | ParsedQs[] | undefined
): string | undefined => {
  if (!value) return undefined;
  const str = Array.isArray(value) ? String(value[0]) : String(value);
  return str.trim() || undefined;
};

const buildPagination = (req: Request): PaginationParams => {
  const page = parseNumber(req.query.page, DEFAULT_PAGE);
  const limit = parseLimit(req.query.limit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const buildFilters = (req: Request): HistoryFilters => {
  const userId = parseString(req.query.userId);
  const type = parseString(req.query.type);
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  const search = parseString(req.query.search);

  return { userId, type, from, to, search };
};

const formatHistoryItem = (item: HistoryItem) => ({
  id: item.id,
  userId: item.userId,
  type: item.type,
  action: item.action,
  metadata: item.metadata ?? null,
  createdAt: item.createdAt.toISOString(),
});

const formatHistoryResponse = (result: HistorySearchResult) => ({
  data: result.items.map(formatHistoryItem),
  pagination: {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / result.limit)),
  },
});

export const createHistoryController = (historyService: HistoryService) => {
  const getHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
      try {
        const pagination = buildPagination(req);
        const filters = buildFilters(req);

        const result = await historyService.searchHistory(filters, pagination);

        res.status(200).json(formatHistoryResponse(result));
      } catch (error) {
        next(error);
      }
    };

  const getUserHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
      try {
        const pagination = buildPagination(req);
        const filters = buildFilters(req);
        const userId = req.params.userId || parseString(req.query.userId);

        if (!userId) {
          res.status(400).json({
            error: "Missing userId parameter",
          });
          return;
        }

        const result = await historyService.searchHistory(
          { ...filters, userId },
          pagination
        );

        res.status(200).json(formatHistoryResponse(result));
      } catch (error) {
        next(error);
      }
    };

  return {
    getHistory,
    getUserHistory,
  };
};

export type HistoryController = ReturnType<typeof createHistoryController>;