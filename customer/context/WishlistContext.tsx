'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CustomerProduct } from '@/types/marketplace';
import { wishlistApi } from '@/lib/api';

// LS key for unauthenticated fallback
const LS_KEY = 'ardab_wishlist';

interface WishlistContextType {
  wishlist: CustomerProduct[] & { items: CustomerProduct[] };
  items: CustomerProduct[];
  wishlistCount: number;
  loading: boolean;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: CustomerProduct) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  /** Sync localStorage items to server after login. Call from auth context after token is set. */
  syncToServer: (token: string | null) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CustomerProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverSynced, setServerSynced] = useState(false);

  // Read localStorage on mount (used before auth is known)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  /**
   * Checks if the user is currently authenticated by looking for a JWT in localStorage.
   */
  const isAuthenticated = (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('ardab_customer_jwt');
  };

  /**
   * Persist to localStorage (used both for authenticated and unauthenticated state as fallback).
   */
  const persistLocal = (newItems: CustomerProduct[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(newItems));
    } catch {
      // ignore quota errors
    }
  };

  /**
   * Load wishlist from the backend (when authenticated).
   */
  const loadFromServer = useCallback(async () => {
    try {
      setLoading(true);
      const result = await wishlistApi.getWishlist();
      // Map server items to CustomerProduct shape
      const serverItems: CustomerProduct[] = (result.data || [])
        .filter((i: any) => i.product)
        .map((i: any) => ({
          id: i.product.id,
          name: i.product.name,
          itemCode: i.product.itemCode,
          sellingPrice: i.product.sellingPrice,
          price: i.product.priceEtb ?? Number(i.product.sellingPrice ?? 0),
          unit: i.product.unit,
          status: i.product.status,
          category: i.product.category,
          seller: i.product.seller,
          images: i.product.primaryImage ? [{ url: i.product.primaryImage.url }] : [],
          primaryImage: i.product.primaryImage || null,
        }));
      setItems(serverItems);
      setServerSynced(true);
      // Mirror to localStorage
      try { localStorage.setItem(LS_KEY, JSON.stringify(serverItems)); } catch {}
    } catch {
      // If server fails fall back to local state silently
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Called by CustomerAuthContext after login.
   * Syncs any local wishlist items to the server, then loads the merged server state.
   */
  const syncToServer = useCallback(async (token: string | null) => {
    if (!token) return;
    try {
      // Get current local product IDs
      const localIds = items.map((i) => i.id).filter(Boolean);
      if (localIds.length > 0) {
        await wishlistApi.sync(localIds);
      }
      // Now load the merged server state
      await loadFromServer();
    } catch {
      // ignore — local state remains
    }
  }, [items, loadFromServer]);

  // Load from server when we detect a token is present and haven't synced yet
  useEffect(() => {
    if (!serverSynced && isAuthenticated()) {
      loadFromServer();
    }
  }, [serverSynced, loadFromServer]);

  const isInWishlist = (productId: string) => items.some((i) => i.id === productId);

  const toggleWishlist = async (product: CustomerProduct) => {
    if (isAuthenticated()) {
      try {
        const res = await wishlistApi.toggle(product.id);
        if (res.action === 'added') {
          setItems((prev) => [...prev, product]);
        } else {
          setItems((prev) => prev.filter((i) => i.id !== product.id));
        }
      } catch {
        // Fallback to local toggle
        persistLocal(
          isInWishlist(product.id)
            ? items.filter((i) => i.id !== product.id)
            : [...items, product]
        );
      }
    } else {
      persistLocal(
        isInWishlist(product.id)
          ? items.filter((i) => i.id !== product.id)
          : [...items, product]
      );
    }
  };

  const removeFromWishlist = async (productId: string) => {
    // Optimistic update
    setItems((prev) => prev.filter((i) => i.id !== productId));
    if (isAuthenticated()) {
      try {
        await wishlistApi.remove(productId);
      } catch {
        // If server fails, reload
        await loadFromServer();
      }
    } else {
      persistLocal(items.filter((i) => i.id !== productId));
    }
  };

  const clearWishlist = async () => {
    persistLocal([]);
    if (isAuthenticated()) {
      try {
        await wishlistApi.clear();
      } catch {
        // ignore
      }
    }
  };

  // Provide both array and object-with-items compatibility (matches existing usage)
  const wishlistCompat = Object.assign([...items], { items });

  return (
    <WishlistContext.Provider
      value={{
        wishlist: wishlistCompat as any,
        items,
        wishlistCount: items.length,
        loading,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        syncToServer,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
