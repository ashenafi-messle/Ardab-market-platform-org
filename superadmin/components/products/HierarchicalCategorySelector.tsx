'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Category, CategoryPathItem } from '@/types/product';
import { categoriesApi } from '@/lib/api';

interface HierarchicalCategorySelectorProps {
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string, categoryPath: CategoryPathItem[]) => void;
  disabled?: boolean;
}

export default function HierarchicalCategorySelector({
  selectedCategoryId,
  onSelectCategory,
  disabled = false,
}: HierarchicalCategorySelectorProps) {
  const [tree, setTree] = useState<Category[]>([]);
  const [allCategoriesMap, setAllCategoriesMap] = useState<Map<string, Category>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected category IDs array per level: [level0_id, level1_id, level2_id, ...]
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

  // 1. Fetch category tree from backend
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    Promise.all([categoriesApi.getTree('ACTIVE'), categoriesApi.getAll()])
      .then(([treeRes, flatRes]) => {
        if (!isMounted) return;
        setTree(treeRes);

        const map = new Map<string, Category>();
        flatRes.forEach((c) => map.set(c.id, c));
        // Also ensure all tree nodes are indexed
        const indexNode = (node: Category) => {
          map.set(node.id, node);
          if (node.children) node.children.forEach(indexNode);
        };
        treeRes.forEach(indexNode);
        setAllCategoriesMap(map);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load category tree:', err);
        setError('Failed to load marketplace categories.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Synchronize selectedLevels whenever selectedCategoryId or map changes
  useEffect(() => {
    if (allCategoriesMap.size === 0) return;

    if (!selectedCategoryId) {
      setSelectedLevels([]);
      return;
    }

    // Build ancestry path from map
    const path: string[] = [];
    let curId: string | null | undefined = selectedCategoryId;
    const visited = new Set<string>();

    while (curId && !visited.has(curId)) {
      visited.add(curId);
      path.unshift(curId);
      const cat = allCategoriesMap.get(curId);
      curId = cat?.parentId;
    }

    setSelectedLevels(path);
  }, [selectedCategoryId, allCategoriesMap]);

  // Compute options available at each level
  // Level 0: Roots
  // Level 1: Children of selectedLevels[0]
  // Level 2: Children of selectedLevels[1], etc.
  const levelsData = useMemo(() => {
    const levels: { level: number; label: string; options: Category[]; selectedId: string }[] = [];

    // Level 0 (Root categories)
    levels.push({
      level: 0,
      label: 'Category (Root)',
      options: tree,
      selectedId: selectedLevels[0] || '',
    });

    // Subsequent levels
    for (let i = 0; i < selectedLevels.length; i++) {
      const parentId = selectedLevels[i];
      const parentNode = allCategoriesMap.get(parentId);
      if (parentNode && parentNode.children && parentNode.children.length > 0) {
        levels.push({
          level: i + 1,
          label: i === 0 ? 'Subcategory' : `Subcategory (Level ${i + 2})`,
          options: parentNode.children,
          selectedId: selectedLevels[i + 1] || '',
        });
      }
    }

    return levels;
  }, [tree, allCategoriesMap, selectedLevels]);

  // Handle selection at level N
  const handleSelectLevel = (levelIndex: number, newCatId: string) => {
    if (!newCatId) {
      // User cleared selection at this level -> stop at previous level if any
      const newSelectedLevels = selectedLevels.slice(0, levelIndex);
      setSelectedLevels(newSelectedLevels);

      const effectiveId = newSelectedLevels[newSelectedLevels.length - 1] || '';
      const pathItems: CategoryPathItem[] = newSelectedLevels.map((id) => {
        const cat = allCategoriesMap.get(id);
        return {
          id,
          name: cat?.name || '',
          slug: cat?.slug || '',
          isActive: cat?.isActive,
        };
      });
      onSelectCategory(effectiveId, pathItems);
      return;
    }

    // User picked a category at levelIndex
    // Keep up to levelIndex, set newCatId, and clear any subsequent levels
    const newSelectedLevels = [...selectedLevels.slice(0, levelIndex), newCatId];
    setSelectedLevels(newSelectedLevels);

    // Build CategoryPathItem[]
    const pathItems: CategoryPathItem[] = newSelectedLevels.map((id) => {
      const cat = allCategoriesMap.get(id);
      return {
        id,
        name: cat?.name || '',
        slug: cat?.slug || '',
        isActive: cat?.isActive,
      };
    });

    // The user can stop at any level! Effective category is the newly picked one.
    onSelectCategory(newCatId, pathItems);
  };

  // Breadcrumb display string
  const currentPathDisplay = useMemo(() => {
    if (selectedLevels.length === 0) return null;
    return selectedLevels
      .map((id) => allCategoriesMap.get(id)?.name || '')
      .filter(Boolean)
      .join(' / ');
  }, [selectedLevels, allCategoriesMap]);

  if (isLoading) {
    return (
      <div className="p-2 bg-light rounded-2 border text-muted small d-flex align-items-center gap-2">
        <span className="spinner-border spinner-border-sm text-success" role="status"></span>
        <span>Loading dynamic categories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning py-2 px-3 small d-flex align-items-center justify-content-between mb-0">
        <span>{error}</span>
        <button
          type="button"
          className="btn btn-sm btn-link text-dark p-0"
          onClick={() => {
            setIsLoading(true);
            categoriesApi.getTree('ACTIVE').then(setTree).finally(() => setIsLoading(false));
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="hierarchical-category-selector">
      {/* Dynamic Cascading Selectors */}
      <div className="d-flex flex-column gap-2">
        {levelsData.map(({ level, label, options, selectedId }) => (
          <div key={level} className="category-level-row">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <label className="form-label mb-0 small fw-semibold text-secondary" style={{ fontSize: '0.75rem' }}>
                {label} {level === 0 && <span className="text-danger">*</span>}
              </label>
              {level > 0 && selectedId && (
                <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>
                  Selected
                </span>
              )}
            </div>
            <select
              className="form-select form-select-sm"
              disabled={disabled}
              value={selectedId}
              onChange={(e) => handleSelectLevel(level, e.target.value)}
            >
              <option value="">
                {level === 0 ? '-- Select Category --' : `-- Stop at current level or choose subcategory --`}
              </option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                  {opt.children && opt.children.length > 0 ? ` (${opt.children.length} sub)` : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Selected Category Breadcrumb Path Indicator */}
      {currentPathDisplay && (
        <div className="mt-2 p-2 bg-light rounded-2 border d-flex align-items-start gap-2">
          <i className="bi bi-diagram-3-fill text-success mt-1" style={{ fontSize: '0.85rem' }}></i>
          <div className="flex-grow-1 min-w-0">
            <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
              Selected Category Hierarchy Path:
            </div>
            <div className="fw-bold text-dark text-truncate small" style={{ fontSize: '0.78rem' }}>
              {currentPathDisplay}
            </div>
          </div>
          <span className="badge badge-success-soft mt-1" style={{ fontSize: '0.65rem' }}>
            Level {selectedLevels.length}
          </span>
        </div>
      )}

      <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
        You can stop at any level or drill down to specific subcategories.
      </div>
    </div>
  );
}
