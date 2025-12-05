import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 191 }).notNull(),
    name: varchar('name', { length: 191 }).notNull(),
    description: text('description'),
    parentId: integer('parent_id').references(() => categories.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    isActive: boolean('is_active').notNull().default(true),
    isVisibleInMenu: boolean('is_visible_in_menu').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    path: text('path').notNull().default(''),
    depth: integer('depth').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex('categories_slug_unique_idx').on(table.slug),
    parentIdx: index('categories_parent_idx').on(table.parentId),
    pathIdx: index('categories_path_idx').on(table.path),
    depthIdx: index('categories_depth_idx').on(table.depth),
    isActiveIdx: index('categories_is_active_idx').on(table.isActive),
    isVisibleInMenuIdx: index('categories_is_visible_in_menu_idx').on(
      table.isVisibleInMenu,
    ),
  }),
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export const buildCategoryPath = (parentPath: string | null, slug: string): string => {
  if (!parentPath || parentPath.trim() === '') {
    return `/undefined`;
  }
  const normalizedParent = parentPath.endsWith('/')
    ? parentPath.slice(0, -1)
    : parentPath;
  return `undefined/undefined`;
};

export const computeCategoryDepthFromPath = (path: string): number => {
  if (!path || path === '/') return 0;
  return path.split('/').filter(Boolean).length;
};

export const sortCategoriesByHierarchy = (categoriesList: Category[]): Category[] => {
  return [...categoriesList].sort((a, b) => {
    if (a.path === b.path) {
      return a.sortOrder - b.sortOrder || a.id - b.id;
    }
    return a.path.localeCompare(b.path);
  });
};

export const buildCategoryTree = (categoriesList: Category[]): CategoryTreeNode[] => {
  const nodesById = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  for (const category of categoriesList) {
    nodesById.set(category.id, { ...category, children: [] });
  }

  for (const node of nodesById.values()) {
    if (node.parentId && nodesById.has(node.parentId)) {
      const parent = nodesById.get(node.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortRecursive(node.children);
      }
    }
  };

  sortRecursive(roots);
  return roots;
};

export const flattenCategoryTree = (tree: CategoryTreeNode[]): Category[] => {
  const result: Category[] = [];
  const traverse = (nodes: CategoryTreeNode[]) => {
    for (const node of nodes) {
      const { children, ...category } = node;
      result.push(category as Category);
      if (children && children.length > 0) {
        traverse(children);
      }
    }
  };
  traverse(tree);
  return result;
};

export const findCategoryInTreeBySlug = (
  tree: CategoryTreeNode[],
  slug: string,
): CategoryTreeNode | null => {
  const stack: CategoryTreeNode[] = [...tree];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.slug === slug) return node;
    if (node.children && node.children.length > 0) {
      stack.push(...node.children);
    }
  }
  return null;
};

export const findCategoryInTreeById = (
  tree: CategoryTreeNode[],
  id: number,
): CategoryTreeNode | null => {
  const stack: CategoryTreeNode[] = [...tree];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.id === id) return node;
    if (node.children && node.children.length > 0) {
      stack.push(...node.children);
    }
  }
  return null;
};

export const getCategoryAncestorsFromPath = (
  categoriesList: Category[],
  category: Category,
): Category[] => {
  if (!category.path) return [];
  const segments = category.path.split('/').filter(Boolean);
  if (segments.length <= 1) return [];

  const ancestorSlugs = segments.slice(0, -1);
  const slugToCategory = new Map<string, Category>();
  for (const c of categoriesList) {
    slugToCategory.set(c.slug, c);
  }

  const ancestors: Category[] = [];
  for (const slug of ancestorSlugs) {
    const ancestor = slugToCategory.get(slug);
    if (ancestor) {
      ancestors.push(ancestor);
    }
  }
  return ancestors;
};

export const isCategoryActive = (category: Category | null | undefined): boolean => {
  return !!category && category.isActive === true;
};

export const isCategoryVisibleInMenu = (
  category: Category | null | undefined,
): boolean => {
  return !!category && category.isVisibleInMenu === true && category.isActive === true;
};