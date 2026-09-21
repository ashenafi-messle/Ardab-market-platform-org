'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CustomerProduct } from '@/types/marketplace';

interface WishlistContextType {
  wishlist: CustomerProduct[] & { items: CustomerProduct[] };
  items: CustomerProduct[];
  wishlistCount: number;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: CustomerProduct) => void;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<CustomerProduct[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ardab_wishlist');
      if (saved) {
        setWishlist(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveWishlist = (items: CustomerProduct[]) => {
    setWishlist(items);
    localStorage.setItem('ardab_wishlist', JSON.stringify(items));
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some((item) => item.id === productId);
  };

  const toggleWishlist = (product: CustomerProduct) => {
    if (isInWishlist(product.id)) {
      saveWishlist(wishlist.filter((item) => item.id !== product.id));
    } else {
      saveWishlist([...wishlist, product]);
    }
  };

  const removeFromWishlist = (productId: string) => {
    saveWishlist(wishlist.filter((item) => item.id !== productId));
  };

  const clearWishlist = () => {
    saveWishlist([]);
  };

  // Provide both array and object-with-items compatibility
  const wishlistCompat = Object.assign([...wishlist], { items: wishlist });

  return (
    <WishlistContext.Provider
      value={{
        wishlist: wishlistCompat as any,
        items: wishlist,
        wishlistCount: wishlist.length,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
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
