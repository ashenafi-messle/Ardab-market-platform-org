import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, Order, UserProfile, Address } from '@/types';
import { MOCK_PRODUCTS, MOCK_ORDERS, MOCK_USER, MOCK_ADDRESSES, CITIES } from '@/constants/mockData';
import { Language, getLanguage, setLanguage as setI18nLanguage, subscribeLanguage, initLanguage, t, formatPrice, TranslationKey } from '@/localization';
import { useAuth, AuthProvider } from '@/context/AuthContext';

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
  updateUser: (data: Partial<UserProfile>) => void;

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
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;

  // Orders
  orders: Order[];
  placeOrder: (paymentMethod: string, address: Address) => Order;

  // Saved addresses
  addresses: Address[];
  addAddress: (address: Omit<Address, 'id'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>(getLanguage());
  const [currentCity, setCurrentCity] = useState<string>('Gondar');
  const [wishlistProductIds, setWishlistProductIds] = useState<string[]>([
    'prod-yirgacheffe-coffee',
    'prod-habesha-kemis',
  ]);
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);

  // Initial cart with 2 realistic items
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 'cart-1',
      product: MOCK_PRODUCTS[0], // Magna Teff
      quantity: 1,
      selected: true,
      selectedAttributes: { 'Packaging': '25kg Sack' },
    },
    {
      id: 'cart-2',
      product: MOCK_PRODUCTS[3], // Berbere
      quantity: 2,
      selected: true,
      selectedAttributes: { 'Heat Level': 'Medium Spicy' },
    },
  ]);

  const auth = useAuth();

  useEffect(() => {
    initLanguage().then((saved) => {
      setLangState(saved);
    });
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
    // Clear customer-specific cached state from memory
    setCartItems([]);
    setOrders([]);
  };

  const updateUser = (data: Partial<UserProfile>) => {
    if (auth.user) {
      auth.createPasswordAndAccount({ city: data.city || auth.user.city, password: '' }).catch(() => {});
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

  // Wishlist operations
  const toggleWishlist = (product: Product) => {
    setWishlistProductIds((prev) =>
      prev.includes(product.id)
        ? prev.filter((id) => id !== product.id)
        : [...prev, product.id]
    );
  };

  const isInWishlist = (productId: string) => wishlistProductIds.includes(productId);

  const wishlistProducts = MOCK_PRODUCTS.filter((p) => wishlistProductIds.includes(p.id));

  // Orders
  const placeOrder = (paymentMethod: string, address: Address): Order => {
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `ARD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      status: 'CONFIRMED',
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
      shippingAddress: address,
      paymentMethod,
      paymentStatus: paymentMethod === 'Cash on Delivery' ? 'PENDING' : 'PAID',
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

    setOrders((prev) => [newOrder, ...prev]);
    // Remove checked-out items from cart
    setCartItems((prev) => prev.filter((item) => !item.selected));
    return newOrder;
  };

  const addAddress = (addr: Omit<Address, 'id'>) => {
    const newAddr: Address = {
      ...addr,
      id: `addr-${Date.now()}`,
    };
    setAddresses((prev) => [newAddr, ...prev]);
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
        orders,
        placeOrder,
        addresses,
        addAddress,
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
