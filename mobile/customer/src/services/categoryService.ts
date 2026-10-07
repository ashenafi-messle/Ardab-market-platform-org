// ==============================================================================
// Ardab Market - Mobile Customer Category Service
// ==============================================================================
// Provides real hierarchical category data from backend customer-mobile catalog API.
// No fake or mock categories. Database is the single source of truth.
// ==============================================================================

import { apiFetch } from '@/constants/api';
import { resolveCategoryIcon } from '@/utils/categoryIcon';

export interface CategoryNode {
  id: string;
  name: string;
  nameAmharic?: string;
  slug: string;
  icon?: string;
  image?: string;
  imageUrl?: string;
  latestProductImage?: string;
  bannerImage?: string;
  parentId?: string | null;
  productCount: number;
  featured?: boolean;
  children: CategoryNode[];
}

export const DEFAULT_CATEGORY_TREE: CategoryNode[] = [];

// In-memory cache for fast, zero-delay subsequent category navigations
let cachedTree: CategoryNode[] | null = null;

export const categoryService = {
  /**
   * Returns whether category tree is already cached in memory
   */
  hasCachedTree(): boolean {
    return cachedTree !== null && cachedTree.length > 0;
  },

  /**
   * Synchronously returns cached category tree if available
   */
  getCachedTree(): CategoryNode[] | null {
    return cachedTree;
  },

  /**
   * Fetches the category tree from the live backend catalog endpoint.
   * If live backend is reachable and returns categories, maps them cleanly.
   */
  async getCategoryTree(forceRefresh = false): Promise<CategoryNode[]> {
    if (cachedTree && !forceRefresh && cachedTree.length > 0) {
      return cachedTree;
    }

    try {
      // Primary: customer-mobile domain, fallback: customer/catalog
      let res = await apiFetch('/customer-mobile/categories/tree');
      if (!res.ok) {
        res = await apiFetch('/customer/catalog/categories/tree');
      }

      if (res.ok && res.data) {
        const rawTree = res.data.data || res.data;
        if (Array.isArray(rawTree) && rawTree.length > 0) {
          const mapNode = (node: any): CategoryNode => {
            const effectiveImg = (node.latestProductImage || node.imageUrl || node.image || '').trim();
            return {
              id: node.id,
              name: node.name,
              nameAmharic: node.nameAmharic || node.name,
              slug: node.slug || node.id,
              icon: resolveCategoryIcon(node.icon, 'grid-outline'),
              image: effectiveImg,
              imageUrl: effectiveImg || undefined,
              latestProductImage: node.latestProductImage || undefined,
              bannerImage: effectiveImg || undefined,
              parentId: node.parentId || null,
              productCount: node.productCount || 0,
              featured: Boolean(node.featured),
              children: Array.isArray(node.children)
                ? node.children
                    .filter((child: any) => !child.name?.toLowerCase().includes('review categor'))
                    .map(mapNode)
                : [],
            };
          };
          const mapped = rawTree
            .filter((node: any) => !node.name?.toLowerCase().includes('review categor'))
            .map(mapNode);
          cachedTree = mapped;
          return mapped;
        }
      }
    } catch {
      // Offline / error
    }

    cachedTree = [];
    return [];
  },

  /**
   * Fetches active top-level / root categories
   */
  async getRootCategories(): Promise<CategoryNode[]> {
    try {
      let res = await apiFetch('/customer-mobile/categories?root=true');
      if (!res.ok) {
        res = await apiFetch('/customer/catalog/categories?root=true');
      }

      if (res.ok && res.data) {
        const list = res.data.data || res.data;
        if (Array.isArray(list) && list.length > 0) {
          return list
            .filter((item: any) => !item.name?.toLowerCase().includes('review categor'))
            .map((item: any) => {
              const effectiveImg = (item.latestProductImage || item.imageUrl || item.image || '').trim();
              return {
                id: item.id,
                name: item.name,
                nameAmharic: item.nameAmharic || item.name,
                slug: item.slug || item.id,
                icon: resolveCategoryIcon(item.icon, 'grid-outline'),
                image: effectiveImg,
                imageUrl: effectiveImg || undefined,
                latestProductImage: item.latestProductImage || undefined,
                bannerImage: effectiveImg || undefined,
                parentId: null,
                productCount: item.productCount || 0,
                children: [],
              };
            });
        }
      }
    } catch {
      // fallback to top-level of cached tree
    }
    const tree = await this.getCategoryTree();
    return tree.map((node) => ({ ...node, children: [] }));
  },

  /**
   * Fetches single category details by ID
   */
  async getCategoryById(id: string): Promise<CategoryNode | null> {
    try {
      let res = await apiFetch(`/customer-mobile/categories/${id}`);
      if (!res.ok) {
        res = await apiFetch(`/customer/catalog/categories/${id}`);
      }

      if (res.ok && res.data?.data) {
        const c = res.data.data;
        const effectiveImg = (c.latestProductImage || c.imageUrl || c.image || '').trim();
        return {
          id: c.id,
          name: c.name,
          nameAmharic: c.nameAmharic || c.name,
          slug: c.slug || c.id,
          icon: resolveCategoryIcon(c.icon, 'grid-outline'),
          image: effectiveImg,
          imageUrl: effectiveImg || undefined,
          latestProductImage: c.latestProductImage || undefined,
          bannerImage: effectiveImg || undefined,
          parentId: c.parentId || null,
          productCount: c.productCount || 0,
          children: Array.isArray(c.children) ? c.children : [],
        };
      }
    } catch {
      // fallback
    }
    const tree = await this.getCategoryTree();
    return this.findCategory(tree, id);
  },

  /**
   * Fetches server-calculated descendant IDs for a category
   */
  async getCategoryDescendants(id: string): Promise<string[]> {
    try {
      let res = await apiFetch(`/customer-mobile/categories/${id}/descendants`);
      if (!res.ok) {
        res = await apiFetch(`/customer/catalog/categories/${id}/descendants`);
      }

      if (res.ok && res.data?.data?.descendantIds) {
        return res.data.data.descendantIds;
      }
    } catch {
      // fallback
    }
    const tree = await this.getCategoryTree();
    return this.getAllDescendantIds(tree, id);
  },

  /**
   * Finds any category node by ID in the tree
   */
  findCategory(tree: CategoryNode[], id: string): CategoryNode | null {
    for (const node of tree) {
      if (node.id === id) return node;
      if (node.children && node.children.length > 0) {
        const found = this.findCategory(node.children, id);
        if (found) return found;
      }
    }
    return null;
  },

  /**
   * Builds the ancestry path from root to target category
   * e.g. [Fashion, Men, Shirts]
   */
  getAncestryPath(tree: CategoryNode[], targetId: string, currentPath: CategoryNode[] = []): CategoryNode[] | null {
    for (const node of tree) {
      const newPath = [...currentPath, node];
      if (node.id === targetId) {
        return newPath;
      }
      if (node.children && node.children.length > 0) {
        const childPath = this.getAncestryPath(node.children, targetId, newPath);
        if (childPath) return childPath;
      }
    }
    return null;
  },

  /**
   * Returns an array of IDs of the category itself and all its descendant subcategories
   * Critical for product filtering at parent levels.
   */
  getAllDescendantIds(tree: CategoryNode[], categoryId: string): string[] {
    const target = this.findCategory(tree, categoryId);
    if (!target) return [categoryId];

    const ids: string[] = [target.id];
    const collect = (node: CategoryNode) => {
      for (const child of node.children) {
        ids.push(child.id);
        collect(child);
      }
    };
    collect(target);
    return ids;
  },

  /**
   * Search categories across all levels by name or Amharic name
   */
  searchCategories(tree: CategoryNode[], query: string): { category: CategoryNode; path: CategoryNode[] }[] {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const results: { category: CategoryNode; path: CategoryNode[] }[] = [];

    const traverse = (nodes: CategoryNode[], currentPath: CategoryNode[]) => {
      for (const node of nodes) {
        const newPath = [...currentPath, node];
        const nameMatches = node.name.toLowerCase().includes(cleanQuery);
        const amharicMatches = node.nameAmharic && node.nameAmharic.includes(query.trim());

        if (nameMatches || amharicMatches) {
          results.push({ category: node, path: newPath });
        }

        if (node.children && node.children.length > 0) {
          traverse(node.children, newPath);
        }
      }
    };

    traverse(tree, []);
    return results;
  },

  /**
   * Convenience aliases matching requirement specification
   */
  async getCategories(root = false): Promise<CategoryNode[]> {
    return root ? this.getRootCategories() : this.getCategoryTree();
  },

  async getCategory(id: string): Promise<CategoryNode | null> {
    return this.getCategoryById(id);
  },
};

export const getCategories = (root = false) => categoryService.getCategories(root);
export const getCategory = (id: string) => categoryService.getCategory(id);
