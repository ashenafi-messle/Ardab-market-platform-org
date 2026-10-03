import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, CartItem, Order, UserProfile, Address } from '@/types';
import { CITIES } from '@/constants/mockData';
import { Language, getLanguage, setLanguage as setI18nLanguage, subscribeLanguage, initLanguage, t, formatPrice, TranslationKey } from '@/localization';
import { useAuth, AuthProvider } from '@/context/AuthContext';
import { secureStorage } from '@/services/secureStorage';
import { productService } from '@/services/productService';
import { wishlistApi } from '@/services/wishlistApi';
import { addressApi } from '@/services/addressApi';
import { profileApi } from '@/services/profileApi';

export { useAuth, AuthProvider };

interface AppContextType {
  // Language & Localization
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
  formatPrice: (amount: number, customCurrency?: string) => string;

  // Location / City
  currentCity: string;
  setCity: (city: string) => void;
  availableCities: string[];

  // Auth / User
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (emailOrPhone: string) => void;
  logout: () => Promise<void>;
  updateUser: (data: Partial<UserProfile>) => Promise<any>;

  // Cart
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedAttributes?: Record<string, string>) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  toggleCartItemSelect: (productId: string) => void;
  selectAllCartItems: (selected: boolean) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  cartTotal: number;

  // Wishlist
  wishlistProductIds: string[];
  wishlistProducts: Product[];
  toggleWishlist: (product: Product) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refreshWishlist: () => Promise<void>;

  // Orders
  orders: Order[];
  placeOrder: (paymentMethod: string, address: Address) => Order;
  cancelLocalOrder: (orderId: string, reason?: string) => void;

  // Saved addresses
  addresses: Address[];
  addAddress: (address: Omit<Address, 'id'>) => Promise<void>;
  updateAddress: (id: string, address: Partial<Address>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  refreshAddresses: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_CART_KEY = 'ardab_cart_items';
const STORAGE_WISHLIST_KEY = 'ardab_wishlist_ids';
const STORAGE_WISHLIST_MAP_KEY = 'ardab_wishlist_map';
const STORAGE_ORDERS_KEY = 'ardab_saved_orders';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>(getLanguage());
  const [currentCity, setCurrentCity] = useState<string>('Gondar');
  const [wishlistProductIds, setWishlistProductIds] = useState<string[]>([]);
  const [wishlistMap, setWishlistMap] = useState<Record<string, Product>>({});
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Initial cart starts empty (populated only from user actions or secure storage)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const auth = useAuth();

  const loadAddresses = useCallback(async () => {
    if (auth.isAuthenticated) {
      try {
        const realAddresses = await addressApi.getAddresses();
        setAddresses(realAddresses);
      } catch (err) {
        console.warn('[store] loadAddresses failed:', err);
      }
    } else {
      setAddresses([]);
    }
  }, [auth.isAuthenticated]);

  const loadWishlist = useCallback(async () => {
    if (auth.isAuthenticated) {
      try {
        const realWishlist = await wishlistApi.getWishlist();
        if (Array.isArray(realWishlist)) {
          setWishlistProductIds(realWishlist.map((p) => p.id));
          const map: Record<string, Product> = {};
          realWishlist.forEach((p) => {
            map[p.id] = p;
          });
          setWishlistMap(map);
        }
      } catch (err) {
        console.warn('[store] loadWishlist failed:', err);
      }
    }
  }, [auth.isAuthenticated]);

  // Load backend data whenever authentication state changes
  useEffect(() => {
    loadAddresses();
    loadWishlist();
  }, [loadAddresses, loadWishlist]);

  // Restore persisted state on mount
  useEffect(() => {
    initLanguage().then((saved) => {
      setLangState(saved);
    });

    // Background restore persisted cart, wishlist & orders without blocking UI
    (async () => {
      try {
        const [savedCart, savedWishlistIds, savedWishlistMap, savedOrders] = await Promise.all([
          secureStorage.getItem(STORAGE_CART_KEY),
          secureStorage.getItem(STORAGE_WISHLIST_KEY),
          secureStorage.getItem(STORAGE_WISHLIST_MAP_KEY),
          secureStorage.getItem(STORAGE_ORDERS_KEY),
        ]);

        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCartItems(parsed);
          }
        }
        if (savedWishlistIds) {
          const parsedIds = JSON.parse(savedWishlistIds);
          if (Array.isArray(parsedIds)) {
            setWishlistProductIds(parsedIds);
          }
        }
        if (savedWishlistMap) {
          const parsedMap = JSON.parse(savedWishlistMap);
          if (parsedMap && typeof parsedMap === 'object') {
            setWishlistMap((prev) => ({ ...prev, ...parsedMap }));
          }
        }
        if (savedOrders) {
          const parsedOrders = JSON.parse(savedOrders);
          if (Array.isArray(parsedOrders) && parsedOrders.length > 0) {
            setOrders(parsedOrders);
          }
        }
      } catch {
        // Silently preserve in-memory defaults
      }
    })();

    return subscribeLanguage((lang) => setLangState(lang));
  }, []);

  const changeLanguage = (lang: Language) => {
    setI18nLanguage(lang);
    setLangState(lang);
  };

  const login = (emailOrPhone: string) => {
    auth.login(emailOrPhone, 'password123').catch(() => {});
  };

  const logout = async () => {
    await auth.logout();
    // Clear customer-specific cached state from memory and storage
    setCartItems([]);
    setOrders([]);
    setWishlistProductIds([]);
    setWishlistMap({});
    setAddresses([]);
    secureStorage.deleteItem(STORAGE_CART_KEY).catch(() => {});
    secureStorage.deleteItem(STORAGE_ORDERS_KEY).catch(() => {});
    secureStorage.deleteItem(STORAGE_WISHLIST_KEY).catch(() => {});
    secureStorage.deleteItem(STORAGE_WISHLIST_MAP_KEY).catch(() => {});
  };

  const updateUser = async (data: Partial<UserProfile>) => {
    if (auth.user) {
      try {
        const updated = await profileApi.updateProfile({
          fullName: data.fullName,
          city: data.city,
          deliveryZone: (data as any).deliveryZone || (data as any).subcity,
          profileImageUrl: data.avatarUrl,
        });
        if (updated) {
          const newUser: UserProfile = {
            ...auth.user,
            fullName: updated.fullName,
            city: updated.city,
            avatarUrl: updated.profileImageUrl || updated.avatarUrl,
          };
          await auth.updateUser(newUser);
          return updated;
        }
      } catch (err) {
        console.warn('[store] updateUser failed:', err);
        throw err;
      }
    }
  };

  // Cart operations
  const addToCart = (product: Product, quantity = 1, selectedAttributes?: Record<string, string>) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: `cart-${Date.now()}`,
            product,
            quantity,
            selected: true,
            selectedAttributes,
          },
        ];
      }
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const toggleCartItemSelect = (productId: string) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAllCartItems = (selected: boolean) => {
    setCartItems((prev) => prev.map((item) => ({ ...item, selected })));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const selectedCartItems = cartItems.filter((item) => item.selected);
  const cartSubtotal = selectedCartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const cartDelivery = selectedCartItems.length > 0 ? 150 : 0;
  const cartTotal = cartSubtotal + cartDelivery;

  // Automatically sync cart to storage
  useEffect(() => {
    if (cartItems.length > 0) {
      secureStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cartItems)).catch(() => {});
    }
  }, [cartItems]);

  // Automatically sync orders to storage
  useEffect(() => {
    if (orders.length > 0) {
      secureStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders)).catch(() => {});
    }
  }, [orders]);

  // Wishlist operations (optimistic update with server sync and rollback)
  const toggleWishlist = async (product: Product) => {
    const isFav = wishlistProductIds.includes(product.id);
    const prevIds = [...wishlistProductIds];
    const prevMap = { ...wishlistMap };

    const newIds = isFav
      ? wishlistProductIds.filter((id) => id !== product.id)
      : [...wishlistProductIds, product.id];

    // Optimistic UI update
    setWishlistProductIds(newIds);
    setWishlistMap((prev) => ({ ...prev, [product.id]: product }));
    secureStorage.setItem(STORAGE_WISHLIST_KEY, JSON.stringify(newIds)).catch(() => {});

    try {
      const res = await wishlistApi.toggleWishlist(product.id);
      if (res.inWishlist && !newIds.includes(product.id)) {
        setWishlistProductIds((curr) => [...curr, product.id]);
      } else if (!res.inWishlist && newIds.includes(product.id)) {
        setWishlistProductIds((curr) => curr.filter((id) => id !== product.id));
      }
    } catch (err) {
      // Rollback on server failure
      console.warn('[store] toggleWishlist server sync failed, rolling back:', err);
      setWishlistProductIds(prevIds);
      setWishlistMap(prevMap);
      secureStorage.setItem(STORAGE_WISHLIST_KEY, JSON.stringify(prevIds)).catch(() => {});
    }
  };

  const isInWishlist = (productId: string) => wishlistProductIds.includes(productId);

  const refreshWishlist = async () => {
    await loadWishlist();
  };

  // Derives full product list for wishlist strictly from real products
  const wishlistProducts = wishlistProductIds
    .map((id) => wishlistMap[id])
    .filter(Boolean) as Product[];

  // Orders
  const placeOrder = (paymentMethod: string, address: Address): Order => {
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `ARD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      items: selectedCartItems.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        price: item.product.price,
        selectedAttributes: item.selectedAttributes,
      })),
      subtotal: cartSubtotal,
      deliveryFee: cartDelivery,
      discount: 0,
      total: cartTotal,
      totalAmount: cartTotal,
      totalEtb: cartTotal,
      shippingAddress: address,
      paymentMethod,
      paymentStatus: 'PENDING',
      estimatedDelivery: 'Estimated tomorrow by 5:00 PM',
      trackingSteps: [
        {
          title: 'Order Placed',
          description: 'Your order was successfully verified and registered.',
          timestamp: 'Just now',
          completed: true,
          current: true,
        },
        {
          title: 'Order Processing',
          description: 'Merchant preparing goods for dispatch',
          completed: false,
          current: false,
        },
        {
          title: 'Out for Delivery',
          description: 'Courier en route to your specified address',
          completed: false,
          current: false,
        },
        {
          title: 'Delivered',
          description: 'Recipient delivery confirmed',
          completed: false,
          current: false,
        },
      ],
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    secureStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updatedOrders)).catch(() => {});
    // Remove checked-out items from cart
    setCartItems((prev) => prev.filter((item) => !item.selected));
    return newOrder;
  };

  const cancelLocalOrder = (orderId: string, reason?: string) => {
    setOrders((prev) => {
      const updated = prev.map((o) => {
        if (o.id === orderId || o.orderNumber === orderId) {
          return {
            ...o,
            status: 'CANCELLED' as const,
            canCancel: false,
            cancelledReason: reason || 'Cancelled by customer',
            cancelledAt: new Date().toISOString(),
          };
        }
        return o;
      });
      secureStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const addAddress = async (addr: Omit<Address, 'id'>) => {
    await addressApi.createAddress({
      label: addr.subcity ? `${addr.city} Address` : 'Home',
      fullName: addr.fullName,
      phone: addr.phone,
      city: addr.city,
      subcity: addr.subcity,
      deliveryZone: addr.subcity,
      specificAddress: addr.specificAddress,
      addressLine: addr.specificAddress,
      isDefault: addr.isDefault,
    });
    await loadAddresses();
  };

  const updateAddress = async (id: string, addrData: Partial<Address>) => {
    await addressApi.updateAddress(id, {
      fullName: addrData.fullName,
      phone: addrData.phone,
      city: addrData.city,
      subcity: addrData.subcity,
      deliveryZone: addrData.subcity,
      specificAddress: addrData.specificAddress,
      addressLine: addrData.specificAddress,
      isDefault: addrData.isDefault,
    });
    await loadAddresses();
  };

  const deleteAddress = async (id: string) => {
    await addressApi.deleteAddress(id);
    await loadAddresses();
  };

  const setDefaultAddress = async (id: string) => {
    await addressApi.setDefaultAddress(id);
    await loadAddresses();
  };

  const refreshAddresses = async () => {
    await loadAddresses();
  };

  return (
    <AppContext.Provider
      value={{
        language,
        changeLanguage,
        t: (k, p) => t(k, p),
        formatPrice: (amt, curr) => formatPrice(amt, curr),
        currentCity,
        setCity: setCurrentCity,
        availableCities: CITIES,
        user: auth.user,
        isAuthenticated: auth.isAuthenticated,
        login,
        logout,
        updateUser,
        cartItems,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        toggleCartItemSelect,
        selectAllCartItems,
        clearCart,
        cartCount,
        cartSubtotal,
        cartTotal,
        wishlistProductIds,
        wishlistProducts,
        toggleWishlist,
        isInWishlist,
        refreshWishlist,
        orders,
        placeOrder,
        cancelLocalOrder,
        addresses,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        refreshAddresses,
      }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
