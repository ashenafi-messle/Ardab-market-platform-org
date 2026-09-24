// ==============================================================================
// Ardab Market - Mobile Customer useCategories Hook
// ==============================================================================
// Reusable hook providing unified hierarchical category data, loading state,
// error state, and refresh triggers across the entire application.

import { useState, useEffect, useCallback } from 'react';
import { CategoryNode, categoryService, DEFAULT_CATEGORY_TREE } from '@/services/categoryService';

export function useCategories() {
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>(DEFAULT_CATEGORY_TREE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await categoryService.getCategoryTree(forceRefresh);
      setCategoryTree(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load categories');
      setCategoryTree(DEFAULT_CATEGORY_TREE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories(false);
  }, [loadCategories]);

  const refreshCategories = useCallback(() => {
    return loadCategories(true);
  }, [loadCategories]);

  return {
    categories: categoryTree,
    categoryTree,
    isLoading,
    error,
    refreshCategories,
    findCategory: (id: string) => categoryService.findCategory(categoryTree, id),
    getAncestryPath: (id: string) => categoryService.getAncestryPath(categoryTree, id),
    getAllDescendantIds: (id: string) => categoryService.getAllDescendantIds(categoryTree, id),
    searchCategories: (query: string) => categoryService.searchCategories(categoryTree, query),
  };
}
