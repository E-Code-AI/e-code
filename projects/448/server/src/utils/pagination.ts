import { ParsedQs } from 'qs';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationQueryInput {
  page?: number | string | null;
  limit?: number | string | null;
}

export interface PaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
  minPage?: number;
  minLimit?: number;
}

export interface PaginationResult {
  offset: number;
  limit: number;
  page: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_LIMIT = 100;
const DEFAULT_MIN_PAGE = 1;
const DEFAULT_MIN_LIMIT = 1;

const isNumericLike = (value: unknown): value is string | number => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') {
    if (value.trim() === '') return false;
    return !Number.isNaN(Number(value));
  }
  return false;
};

const toPositiveInteger = (
  value: unknown,
  fallback: number,
  min: number,
  max?: number
): number => {
  if (!isNumericLike(value)) return fallback;
  const num = Math.floor(Number(value));
  if (!Number.isFinite(num)) return fallback;
  let result = num;
  if (result < min) result = min;
  if (typeof max === 'number' && result > max) result = max;
  return result;
};

export const normalizePaginationParams = (
  input: PaginationQueryInput | ParsedQs | undefined,
  options: PaginationOptions = {}
): PaginationResult => {
  const {
    defaultPage = DEFAULT_PAGE,
    defaultLimit = DEFAULT_LIMIT,
    maxLimit = DEFAULT_MAX_LIMIT,
    minPage = DEFAULT_MIN_PAGE,
    minLimit = DEFAULT_MIN_LIMIT,
  } = options;

  const rawPage =
    (input as PaginationQueryInput | undefined)?.page ??
    (input as ParsedQs | undefined)?.page;
  const rawLimit =
    (input as PaginationQueryInput | undefined)?.limit ??
    (input as ParsedQs | undefined)?.limit;

  const page = toPositiveInteger(rawPage, defaultPage, minPage);
  const limit = toPositiveInteger(rawLimit, defaultLimit, minLimit, maxLimit);

  const offset = (page - 1) * limit;

  return {
    offset,
    limit,
    page,
  };
};

export const buildPaginationMeta = (
  params: PaginationParams,
  totalItems: number
): PaginationMeta => {
  const page = params.page < 1 ? 1 : Math.floor(params.page);
  const limit = params.limit < 1 ? 1 : Math.floor(params.limit);
  const safeTotalItems = totalItems < 0 ? 0 : Math.floor(totalItems);

  const totalPages =
    limit > 0 ? Math.max(1, Math.ceil(safeTotalItems / limit)) : 1;

  const currentPage = Math.min(page, totalPages);

  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const nextPage = hasNextPage ? currentPage + 1 : null;
  const prevPage = hasPrevPage ? currentPage - 1 : null;

  return {
    page: currentPage,
    limit,
    totalItems: safeTotalItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
  };
};

export const getPagination = (
  input: PaginationQueryInput | ParsedQs | undefined,
  totalItems: number,
  options?: PaginationOptions
): PaginationResult & { meta: PaginationMeta } => {
  const { offset, limit, page } = normalizePaginationParams(input, options);
  const meta = buildPaginationMeta({ page, limit }, totalItems);

  return {
    offset,
    limit,
    page: meta.page,
    meta,
  };
};

export const parsePage = (
  value: unknown,
  options?: Pick<PaginationOptions, 'defaultPage' | 'minPage'>
): number => {
  const defaultPage = options?.defaultPage ?? DEFAULT_PAGE;
  const minPage = options?.minPage ?? DEFAULT_MIN_PAGE;
  return toPositiveInteger(value, defaultPage, minPage);
};

export const parseLimit = (
  value: unknown,
  options?: Pick<PaginationOptions, 'defaultLimit' | 'minLimit' | 'maxLimit'>
): number => {
  const defaultLimit = options?.defaultLimit ?? DEFAULT_LIMIT;
  const minLimit = options?.minLimit ?? DEFAULT_MIN_LIMIT;
  const maxLimit = options?.maxLimit ?? DEFAULT_MAX_LIMIT;
  return toPositiveInteger(value, defaultLimit, minLimit, maxLimit);
};