'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CustomerProduct, CartItem } from '@/types/marketplace';

interface CartContextType {
  items: CartItem[];
  cart: { items: CartItem[]; total: number };
  itemCount: number;
  subtotal: number;
  addToCart: (product: CustomerProduct, quantity?: number, selectedAttributes?: Record<string, string>) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}


const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ardab_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveCart = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem('ardab_cart', JSON.stringify(newItems));
  };

  const addToCart = (product: CustomerProduct, quantity: number = 1, selectedAttributes?: Record<string, string>) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += quantity;
      if (selectedAttributes) {
        updated[existingIndex].selectedAttributes = selectedAttributes;
      }
      saveCart(updated);
    } else {
      saveCart([...items, { productId: product.id, product, quantity, selectedAttributes }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const updated = items.map((item) => (item.productId === productId ? { ...item, quantity } : item));
    saveCart(updated);
  };

  const removeFromCart = (productId: string) => {
    const updated = items.filter((item) => item.productId !== productId);
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + Number(item.product.sellingPrice) * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        cart: { items, total: subtotal },
        itemCount,
        subtotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );

}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
