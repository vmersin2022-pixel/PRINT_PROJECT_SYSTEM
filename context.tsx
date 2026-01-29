import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, AppContextType, Category, Collection, Order, PromoCode, ProductVariant } from './types';
import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial data is kept for fallback/skeleton, but real data comes from DB
const INITIAL_PRODUCTS: Product[] = [];
const INITIAL_COLLECTIONS: Collection[] = [];

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [collections, setCollections] = useState<Collection[]>(INITIAL_COLLECTIONS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  
  // New State
  const [orders, setOrders] = useState<Order[]>([]); // Admin View
  const [userOrders, setUserOrders] = useState<Order[]>([]); // Personal Cabinet View
  const [promocodes, setPromocodes] = useState<PromoCode[]>([]);
  const [activePromo, setActivePromo] = useState<PromoCode | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Helper to parse category string from DB to array
  const parseCategories = (catData: any): Category[] => {
    if (Array.isArray(catData)) return catData;
    if (typeof catData === 'string') {
        if (catData.includes(',')) return catData.split(',').map(s => s.trim()) as Category[];
        return [catData as Category];
    }
    return [];
  };

  // Helper to parse collectionIds from DB
  const parseCollectionIds = (data: any): string[] => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (typeof data === 'string') {
          if (data.trim().startsWith('[')) {
              try { 
                  const parsed = JSON.parse(data);
                  if (Array.isArray(parsed)) return parsed;
              } catch(e) { /* ignore */ }
          }
          if (data.includes(',')) return data.split(',').map((s: string) => s.trim());
          if (data.trim()) return [data.trim()];
      }
      return [];
  };

  // CENTRAL DATA FETCHING FUNCTION
  const refreshData = async () => {
      // 1. Fetch Products
      const { data: prodData, error: prodError } = await supabase.from('products').select('*');
      // 1.1 Fetch Variants
      const { data: varData, error: varError } = await supabase.from('product_variants').select('*');

      if (prodError) {
          console.error("Supabase Product Error:", prodError.message);
      } else if (prodData) {
        const typedProducts = prodData.map((p: any) => {
            const productVariants = varData ? varData.filter((v: any) => v.product_id === p.id) : [];
            return {
                ...p,
                categories: parseCategories(p.categories || p.category),
                collectionIds: parseCollectionIds(p.collectionIds),
                variants: productVariants
            };
        });
        setProducts(typedProducts as Product[]);
      }

      // 2. Fetch Collections
      const { data: colData, error: colError } = await supabase.from('collections').select('*');
      if (colError) {
          console.error("Supabase Collection Error:", colError.message);
      } else if (colData) {
        const typedCollections = colData.map((c: any) => ({
            ...c,
            // Use existing link or fallback to ID-based filter
            link: c.link || `/catalog?collection=${c.id}`
        }));
        setCollections(typedCollections as Collection[]);
      }

      // 3. Fetch Promocodes
      const { data: promoData } = await supabase.from('promocodes').select('*');
      if (promoData) setPromocodes(promoData as PromoCode[]);

      // 4. Fetch Orders (Admin View - RLS protected, usually returns empty for normal users)
      const { data: orderData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (orderData) {
          setOrders(orderData as Order[]);
      } else {
          setOrders([]);
      }

      // 5. Fetch User Orders (Personal Cabinet)
      // We look up orders where customer_info->>email matches current user email
      const currentUser = (await supabase.auth.getSession()).data.session?.user;
      if (currentUser && currentUser.email) {
          const { data: personalOrders } = await supabase
            .from('orders')
            .select('*')
            .filter('customer_info->>email', 'eq', currentUser.email) // JSONB Filtering
            .order('created_at', { ascending: false });
          
          if (personalOrders) {
              setUserOrders(personalOrders as Order[]);
          }
      } else {
          setUserOrders([]);
      }
  };

  // Auth & Initial Load
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      refreshData();
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      // CRITICAL FIX: Clean URL after social login for HashRouter
      if (event === 'SIGNED_IN') {
        // If we have a hash with tokens, clean it by navigating to profile
        if (window.location.hash && window.location.hash.includes('access_token')) {
             // For HashRouter, we manually set the hash to the target route
             window.location.hash = '#/profile';
        }
      }

      // Refresh data when auth state changes (to load userOrders)
      await refreshData();
    });

    // Load Wishlist
    const savedWishlist = localStorage.getItem('print_project_wishlist');
    if (savedWishlist) {
        try {
            setWishlist(JSON.parse(savedWishlist));
        } catch (e) {
            console.error("Failed to parse wishlist");
        }
    }

    return () => subscription.unsubscribe();
  }, []);

  // --- AUTO-APPLY SAVED PROMO ---
  useEffect(() => {
    const savedPromoCode = localStorage.getItem('print_project_promo');
    if (savedPromoCode) {
        applyPromoCode(savedPromoCode);
    }
  }, []);

  const toggleMenu = () => setIsMenuOpen(prev => !prev);
  const toggleCart = () => setIsCartOpen(prev => !prev);

  // --- AUTH METHODS ---
  const loginWithMagicLink = async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
              emailRedirectTo: window.location.origin,
          }
      });
      return { error };
  };

  const loginWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return { error };
  };

  const signupWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });
    return { data, error };
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin // Should result in localhost:3000
        }
    });
    return { error };
  };

  const logout = async () => {
      await supabase.auth.signOut();
      setUser(null);
      setUserOrders([]);
      window.location.href = '/'; // Hard reload/redirect to home
  };

  // --- WISHLIST ---
  const toggleWishlist = (productId: string) => {
      setWishlist(prev => {
          const newState = prev.includes(productId) 
            ? prev.filter(id => id !== productId)
            : [...prev, productId];
          
          localStorage.setItem('print_project_wishlist', JSON.stringify(newState));
          return newState;
      });
  };

  // --- HELPER: Prepare Payload ---
  const prepareProductForDb = (product: Product) => {
      const dbProduct: any = { ...product };
      if (product.categories && product.categories.length > 0) {
          dbProduct.category = product.categories.join(',');
      } else {
          dbProduct.category = '';
      }
      delete dbProduct.categories;
      delete dbProduct.variants;
      
      if (product.collectionIds && Array.isArray(product.collectionIds)) {
          dbProduct.collectionIds = JSON.stringify(product.collectionIds);
      }
      return dbProduct;
  };

  // --- PRODUCTS CRUD ---
  const addProduct = async (product: Product, variants: {size: string, stock: number}[]) => {
    const dbPayload = prepareProductForDb(product);
    const { error } = await supabase.from('products').insert([dbPayload]);
    
    if (!error) {
        if (variants && variants.length > 0) {
            const variantsPayload = variants.map(v => ({
                product_id: product.id,
                size: v.size,
                stock: v.stock
            }));
            await supabase.from('product_variants').insert(variantsPayload);
        }
        await refreshData();
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>, variants?: {size: string, stock: number}[]) => {
    const existing = products.find(p => p.id === id);
    if (!existing) return;

    const merged = { ...existing, ...updates };
    const dbPayload = prepareProductForDb(merged);
    const { error } = await supabase.from('products').update(dbPayload).eq('id', id);

    if (!error && variants) {
        await supabase.from('product_variants').delete().eq('product_id', id);
        
        const variantsPayload = variants.map(v => ({
            product_id: id,
            size: v.size,
            stock: v.stock
        }));
        if(variantsPayload.length > 0) {
            await supabase.from('product_variants').insert(variantsPayload);
        }
    }
    
    if (!error) await refreshData();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) await refreshData();
  };

  // --- COLLECTIONS CRUD ---
  const addCollection = async (collection: Collection) => {
    const newCollection = { ...collection, link: collection.link || `/catalog?collection=${collection.id}` };
    const { error } = await supabase.from('collections').upsert([newCollection]);
    if (!error) await refreshData();
  };

  const deleteCollection = async (id: string) => {
    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (!error) await refreshData();
  };

  // --- CART ---
  const addToCart = (product: Product, size: string, quantity: number = 1) => {
    const variant = product.variants?.find(v => v.size === size);
    if (variant && variant.stock < quantity) {
        alert(`Извините, доступно только ${variant.stock} шт. размера ${size}`);
        return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.selectedSize === size);
      if (existing && variant) {
          if ((existing.quantity + quantity) > variant.stock) {
             alert(`Нельзя добавить больше. На складе всего ${variant.stock} шт.`);
             return prev;
          }
      }
      if (existing) {
        return prev.map(item => 
          (item.id === product.id && item.selectedSize === size)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, selectedSize: size, quantity: quantity }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, size: string) => {
    setCart(prev => prev.filter(item => !(item.id === productId && item.selectedSize === size)));
  };

  const clearCart = () => {
    setCart([]);
    setActivePromo(null);
    localStorage.removeItem('print_project_promo');
  }

  // --- ORDERS LOGIC ---
  const createOrder = async (orderData: Omit<Order, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('orders').insert([orderData]);
      if (error) {
          console.error("Order Create Error:", error);
          alert("ОШИБКА СОЗДАНИЯ ЗАКАЗА: " + error.message);
          return false;
      }
      await refreshData();
      return true;
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (!error) await refreshData();
  };

  // --- PROMOCODES LOGIC ---
  const applyPromoCode = async (code: string) => {
      const cleanCode = code.trim().toUpperCase();
      const { data, error } = await supabase
        .from('promocodes')
        .select('*')
        .eq('code', cleanCode)
        .single();
      
      if (error || !data || !data.is_active) {
          return false;
      }
      
      setActivePromo(data as PromoCode);
      localStorage.setItem('print_project_promo', cleanCode);
      return true;
  };

  const removePromoCode = () => {
      setActivePromo(null);
      localStorage.removeItem('print_project_promo');
  };

  const addPromoCodeDb = async (code: string, percent: number) => {
      await supabase.from('promocodes').insert([{ code: code.toUpperCase(), discount_percent: percent, is_active: true }]);
      await refreshData();
  };

  const togglePromoCodeDb = async (id: string, currentState: boolean) => {
      await supabase.from('promocodes').update({ is_active: !currentState }).eq('id', id);
      await refreshData();
  };

  const deletePromoCodeDb = async (id: string) => {
      await supabase.from('promocodes').delete().eq('id', id);
      await refreshData();
  };


  return (
    <AppContext.Provider value={{
      products,
      collections,
      cart,
      orders,
      userOrders,
      promocodes,
      activePromo,
      wishlist,
      user,
      isMenuOpen,
      isCartOpen,
      toggleMenu,
      toggleCart,
      addToCart,
      removeFromCart,
      clearCart,
      addProduct,
      updateProduct,
      deleteProduct,
      addCollection,
      deleteCollection,
      createOrder,
      updateOrderStatus,
      applyPromoCode,
      removePromoCode,
      addPromoCodeDb,
      togglePromoCodeDb,
      deletePromoCodeDb,
      refreshData,
      toggleWishlist,
      loginWithMagicLink,
      loginWithPassword,
      signupWithPassword,
      loginWithGoogle,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};