import { ParsedQs } from 'qs';

export type SortDirection = 'asc' | 'desc';

export interface SortField {
  field: string;
  direction: SortDirection;
}

export interface PriceRange {
  min?: number;
  max?: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface ProductFilterCriteria {
  search?: string;
  categoryIds?: string[];
  brandIds?: string[];
  tags?: string[];
  price?: PriceRange;
  inStock?: boolean;
  isActive?: boolean;
  ratingMin?: number;
  ratingMax?: number;
  createdFrom?: Date;
  createdTo?: Date;
  updatedFrom?: Date;
  updatedTo?: Date;
}

export interface ParsedFilterParams {
  filters: ProductFilterCriteria;
  sort: SortField[];
  pagination: PaginationParams;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const SORT_DIRECTION_VALUES: SortDirection[] = ['asc', 'desc'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] | undefined {
  if (value == null) return undefined;

  if (Array.isArray(value)) {
    const arr = value
      .map((v) => (v != null ? String(v).trim() : ''))
      .filter((v) => v.length > 0);
    return arr.length ? arr : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.includes(',')) {
      const arr = trimmed
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
      return arr.length ? arr : undefined;
    }
    return [trimmed];
  }

  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (value == null) return undefined;

  if (typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    return toBoolean(value[0]);
  }

  const str = String(value).trim().toLowerCase();
  if (!str) return undefined;

  if (['true', '1', 'yes', 'y', 'on'].includes(str)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(str)) return false;

  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (value == null) return undefined;

  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    return toNumber(value[0]);
  }

  const num = Number(value);
  if (Number.isNaN(num)) return undefined;
  return num;
}

function toPositiveInt(value: unknown): number | undefined {
  const num = toNumber(value);
  if (num == null) return undefined;
  if (!Number.isInteger(num) || num <= 0) return undefined;
  return num;
}

function toDate(value: unknown): Date | undefined {
  if (value == null) return undefined;

  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    return toDate(value[0]);
  }

  const str = String(value).trim();
  if (!str) return undefined;

  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function parsePriceRange(value: unknown): PriceRange | undefined {
  if (value == null) return undefined;

  if (isObject(value)) {
    const min = toNumber(value.min);
    const max = toNumber(value.max);
    const range: PriceRange = {};
    if (typeof min === 'number' && min >= 0) range.min = min;
    if (typeof max === 'number' && max >= 0) range.max = max;
    if (range.min == null && range.max == null) return undefined;
    return range;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    return parsePriceRange(value[0]);
  }

  const str = String(value).trim();
  if (!str) return undefined;

  if (str.includes('-')) {
    const [minStr, maxStr] = str.split('-').map((s) => s.trim());
    const min = minStr ? toNumber(minStr) : undefined;
    const max = maxStr ? toNumber(maxStr) : undefined;
    const range: PriceRange = {};
    if (typeof min === 'number' && min >= 0) range.min = min;
    if (typeof max === 'number' && max >= 0) range.max = max;
    if (range.min == null && range.max == null) return undefined;
    return range;
  }

  const num = toNumber(str);
  if (typeof num === 'number' && num >= 0) {
    return { min: num, max: num };
  }

  return undefined;
}

function parseSort(value: unknown): SortField[] {
  if (value == null) return [];

  const raw: string[] = [];

  if (Array.isArray(value)) {
    for (const v of value) {
      if (v == null) continue;
      const s = String(v).trim();
      if (!s) continue;
      raw.push(...s.split(',').map((p) => p.trim()).filter(Boolean));
    }
  } else if (typeof value === 'string') {
    const s = value.trim();
    if (s) {
      raw.push(...s.split(',').map((p) => p.trim()).filter(Boolean));
    }
  } else {
    const s = String(value).trim();
    if (s) {
      raw.push(...s.split(',').map((p) => p.trim()).filter(Boolean));
    }
  }

  const result: SortField[] = [];

  for (const token of raw) {
    if (!token) continue;

    let field = token;
    let direction: SortDirection = 'asc';

    if (token.startsWith('-')) {
      field = token.slice(1);
      direction = 'desc';
    } else if (token.startsWith('+')) {
      field = token.slice(1);
      direction = 'asc';
    } else if (token.includes(':')) {
      const [f, d] = token.split(':').map((p) => p.trim());
      if (!f) continue;
      field = f;
      const dir = d.toLowerCase();
      if (SORT_DIRECTION_VALUES.includes(dir as SortDirection)) {
        direction = dir as SortDirection;
      }
    }

    field = field.trim();
    if (!field) continue;

    result.push({ field, direction });
  }

  return result;
}

function parsePagination(query: ParsedQs): PaginationParams {
  const page = toPositiveInt(query.page) ?? DEFAULT_PAGE;
  const limitRaw = toPositiveInt(query.limit) ?? DEFAULT_LIMIT;
  const limit = Math.min(limitRaw, MAX_LIMIT);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function parseRatingRange(query: ParsedQs): { ratingMin?: number; ratingMax?: number } {
  const ratingMin = toNumber(query.ratingMin ?? query.rating_min);
  const ratingMax = toNumber(query.ratingMax ?? query.rating_max);

  const result: { ratingMin?: number; ratingMax?: number } = {};

  if (typeof ratingMin === 'number' && ratingMin >= 0) {
    result.ratingMin = ratingMin;
  }

  if (typeof ratingMax === 'number' && ratingMax >= 0) {
    result.ratingMax = ratingMax;
  }

  return result;
}

function parseDateRange(
  fromValue: unknown,
  toValue: unknown
): { from?: Date; to?: Date } {
  const from = toDate(fromValue);
  const to = toDate(toValue);

  const result: { from?: Date; to?: Date } = {};
  if (from) result.from = from;
  if (to) result.to = to;

  return result;
}

export function parseProductFilters(query: ParsedQs): ParsedFilterParams {
  const search =
    typeof query.search === 'string' && query.search.trim().length > 0
      ? query.search.trim()
      : undefined;

  const categoryIds =
    toStringArray(query.categoryIds ?? query.category_ids ?? query.category) ??
    undefined;

  const brandIds =
    toStringArray(query.brandIds ?? query.brand_ids ?? query.brand) ?? undefined;

  const tags = toStringArray(query.tags ?? query.tag) ?? undefined;

  const price =
    parsePriceRange(
      (query.price as unknown) ??
        (query.priceRange as unknown) ??
        (query.price_range as unknown)
    ) ?? undefined;

  const inStock =
    toBoolean(query.inStock ?? query.in_stock ?? query.stock) ?? undefined;

  const isActive =
    toBoolean(query.isActive ?? query.is_active ?? query.active) ?? undefined;

  const { ratingMin