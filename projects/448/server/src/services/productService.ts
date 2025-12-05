import { PrismaClient, Prisma, Product, Category } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export type SortDirection = 'asc' | 'desc';

export type ProductSortField =
  | 'name'
  | 'price'
  | 'createdAt'
  | 'updatedAt'
  | 'popularity'
  | 'rating';

export interface ProductSearchFilters {
  query?: string;
  categoryIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  attributes?: Record<string, string | number | boolean | Array<string | number | boolean>>;
  tags?: string[];
  isActive?: boolean;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface SortOptions {
  sortBy?: ProductSortField;
  sortDirection?: SortDirection;
}

export interface ProductSearchOptions {
  filters?: ProductSearchFilters;
  pagination?: PaginationOptions;
  sort?: SortOptions;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InventoryAwareProduct extends Product {
  availableQuantity: number;
  isInStock: boolean;
}

export interface ProductWithRelations extends Product {
  category: Category | null;
  tags: { id: string; name: string }[];
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function normalizePagination(pagination?: PaginationOptions): Required<PaginationOptions> {
  const page = pagination?.page && pagination.page > 0 ? pagination.page : DEFAULT_PAGE;
  let pageSize =
    pagination?.pageSize && pagination.pageSize > 0 ? pagination.pageSize : DEFAULT_PAGE_SIZE;

  if (pageSize > MAX_PAGE_SIZE) {
    pageSize = MAX_PAGE_SIZE;
  }

  return { page, pageSize };
}

function buildProductWhereClause(filters?: ProductSearchFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (!filters) {
    return where;
  }

  if (typeof filters.isActive === 'boolean') {
    where.isActive = filters.isActive;
  } else {
    where.isActive = true;
  }

  if (filters.query && filters.query.trim().length > 0) {
    const q = filters.query.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    where.categoryId = { in: filters.categoryIds };
  }

  if (typeof filters.minPrice === 'number' || typeof filters.maxPrice === 'number') {
    where.price = {};
    if (typeof filters.minPrice === 'number') {
      where.price.gte = filters.minPrice;
    }
    if (typeof filters.maxPrice === 'number') {
      where.price.lte = filters.maxPrice;
    }
  }

  if (filters.tags && filters.tags.length > 0) {
    where.tags = {
      some: {
        name: {
          in: filters.tags,
          mode: 'insensitive',
        },
      },
    };
  }

  if (filters.attributes && Object.keys(filters.attributes).length > 0) {
    const attributeConditions: Prisma.ProductWhereInput[] = [];

    for (const [key, value] of Object.entries(filters.attributes)) {
      if (Array.isArray(value)) {
        attributeConditions.push({
          attributes: {
            path: [key],
            array_contains: value,
          } as unknown as Prisma.InputJsonValue,
        });
      } else {
        attributeConditions.push({
          attributes: {
            path: [key],
            equals: value,
          } as unknown as Prisma.InputJsonValue,
        });
      }
    }

    if (attributeConditions.length > 0) {
      where.AND = where.AND ? [...(where.AND as Prisma.ProductWhereInput[]), ...attributeConditions] : attributeConditions;
    }
  }

  if (filters.inStockOnly) {
    where.inventoryQuantity = {
      gt: 0,
    };
  }

  return where;
}

function buildOrderBy(sort?: SortOptions): Prisma.ProductOrderByWithRelationInput[] {
  const orderBy: Prisma.ProductOrderByWithRelationInput[] = [];

  const direction: SortDirection = sort?.sortDirection ?? 'asc';
  const sortBy: ProductSortField = sort?.sortBy ?? 'name';

  switch (sortBy) {
    case 'price':
      orderBy.push({ price: direction });
      break;
    case 'createdAt':
      orderBy.push({ createdAt: direction });
      break;
    case 'updatedAt':
      orderBy.push({ updatedAt: direction });
      break;
    case 'popularity':
      orderBy.push({ popularityScore: direction as Prisma.SortOrder });
      break;
    case 'rating':
      orderBy.push({ averageRating: direction as Prisma.SortOrder });
      break;
    case 'name':
    default:
      orderBy.push({ name: direction });
      break;
  }

  if (sortBy !== 'name') {
    orderBy.push({ name: 'asc' });
  }

  return orderBy;
}

export async function searchProducts(
  options: ProductSearchOptions = {}
): Promise<PaginatedResult<ProductWithRelations>> {
  const { filters, pagination, sort } = options;
  const { page, pageSize } = normalizePagination(pagination);

  const where = buildProductWhereClause(filters);
  const orderBy = buildOrderBy(sort);

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        tags: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getProductById(id: string): Promise<ProductWithRelations> {
  if (!id) {
    throw new ValidationError('Product ID is required');
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      tags: true,
    },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return product;
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations> {
  if (!slug) {
    throw new ValidationError('Product slug is required');
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      tags: true,
    },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return product;
}

export async function getInventoryAwareProductById(id: string): Promise<InventoryAwareProduct> {
  const product = await prisma.product.findUnique({
    where: { id, isActive: true },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const availableQuantity = product.inventoryQuantity ?? 0;
  const isInStock = availableQuantity > 0;

  return {
    ...product,
    availableQuantity,
    isInStock,
  };
}

export async function listFeaturedProducts(limit = 10): Promise<ProductWithRelations[]> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isFeatured: true,
    },
    orderBy: [
      { featuredOrder: 'asc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    include: {
      category: true,
      tags: true,
    },
  });

  return products;
}

export async function listBestSellers(limit = 10): Promise<ProductWithRelations[]> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    orderBy: [
      { salesCount: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    include: {
      category: true,
      tags: true,
    },
  });

  return products;
}

export async function listRelatedProducts(
  productId: string,
  limit = 8
): Promise<ProductWithRelations[]> {
  const baseProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true, tags: true },
  });

  if (!baseProduct) {
    throw new NotFoundError('Product not found');
  }

  const tagIds = baseProduct.tags.map((t) => t.id);

  const relatedByTags = await prisma.product.findMany({
    where: {
      id: { not: productId },
      isActive: true,
      tags: {
        some: {
          id: { in: tagIds },
        },
      },
    },
    include: {
      category: true,
      tags