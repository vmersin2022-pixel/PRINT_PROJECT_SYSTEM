
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, CartItem, AppContextType, Category, Collection, Order, PromoCode, ProductVariant, UserProfile, TelegramUser, OrderStatus } from './types';
import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial data is kept for fallback/skeleton, but real data comes from DB
const INITIAL_PRODUCTS: Product[] = [];
const INITIAL_COLLECTIONS: Collection[] = [];

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [collections, setCollections] = useState<Collection[]>(INITIAL_COLLECTIONS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true); // START AS TRUE
  
  // New State
  const [orders, setOrders] = useState<Order[]>([]); // Admin View
  const [userOrders, setUserOrders] = useState<Order[]>([]); // Personal Cabinet View
  const [promocodes, setPromocodes] = useState<PromoCode[]>([]);
  const [activePromo, setActivePromo] = useState<PromoCode | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]); // Admin Users List

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

  // --- 1. FETCH PUBLIC DATA (PRODUCTS, COLLECTIONS) ---
  // Only runs once on mount, or when explicitly requested (e.g. admin updates)
  const fetchPublicData = async () => {
      try {
          const productPromise = supabase.from('products').select('*');
          const variantPromise = supabase.from('product_variants').select('*');
          const collectionPromise = supabase.from('collections').select('*');
          const promoPromise = supabase.from('promocodes').select('*');

          const [prodRes, varRes, colRes, promoRes] = await Promise.all([
              productPromise, variantPromise, collectionPromise, promoPromise
          ]);

          if (prodRes.error) {
              console.error("Supabase Product Error:", prodRes.error.message);
          } else if (prodRes.data) {
              const varData = varRes.data || [];
              const typedProducts = prodRes.data.map((p: any) => {
                  const productVariants = varData.filter((v: any) => v.product_id === p.id);
                  return {
                      ...p,
                      categories: parseCategories(p.categories || p.category),
                      collectionIds: parseCollectionIds(p.collectionIds),
                      variants: productVariants
                  };
              });
              setProducts(typedProducts as Product[]);
          }

          if (colRes.data) {
              const typedCollections = colRes.data.map((c: any) => ({
                  ...c,
                  link: c.link || `/catalog?collection=${c.id}`
              }));
              setCollections(typedCollections as Collection[]);
          }

          if (promoRes.data) setPromocodes(promoRes.data as PromoCode[]);
      } catch (err: any) {
          // Ignore AbortError which happens during rapid auth redirects
          if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
          console.error("Fetch Public Data Error:", err);
      }
  };

  // --- 2. FETCH USER PRIVATE DATA ---
  // Runs when user logs in
  const fetchUserData = async (currentUser: User) => {
      try {
          // 1. Fetch User's personal orders
          // Logic: fetch if user_id matches OR if email matches (fallback)
          const { data: personalOrders, error: personalError } = await supabase
              .from('orders')
              .select('*')
              .or(`user_id.eq.${currentUser.id},customer_info->>email.eq.${currentUser.email}`)
              .order('created_at', { ascending: false });
          
          if (!personalError && personalOrders) {
              setUserOrders(personalOrders as Order[]);
          } else if (personalError) {
              console.error("Personal Orders Error:", personalError);
          }

          // 2. Fetch Admin Data (Try to fetch all orders)
          // RLS will block this if not admin, but we just ignore the error usually or handle it
          const { data: allOrders, error: orderError } = await supabase
              .from('orders')
              .select('*')
              .order('created_at', { ascending: false });
          
          if (!orderError && allOrders) {
              setOrders(allOrders as Order[]);
              
              // If successful (Admin), try fetching users
              const { data: userData } = await supabase
                  .from('profiles')
                  .select('*')
                  .order('created_at', { ascending: false });
              if (userData) setAllUsers(userData as UserProfile[]);
          }
      } catch (err: any) {
          // CRITICAL: Catch AbortError here too
          if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
          console.error("Fetch User Data Error:", err);
      }
  };

  const clearUserData = () => {
      setUserOrders([]);
      setOrders([]);
      setAllUsers([]);
  }

  // Wrapper for manual refresh from Admin panel
  const refreshData = async () => {
      await fetchPublicData();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          await fetchUserData(session.user);
      }
  };

  // --- INITIALIZATION EFFECT ---
  useEffect(() => {
    let mounted = true;

    const init = async () => {
        // 1. Start fetching public data immediately
        await fetchPublicData();
        
        // 2. Check if we are potentially in a Magic Link flow (Hash present)
        // If hash exists, we SKIP manual session check and wait for onAuthStateChange
        const isHashAuth = window.location.hash && (
            window.location.hash.includes('access_token') || 
            window.location.hash.includes('type=magiclink') ||
            window.location.hash.includes('type=recovery')
        );

        if (!isHashAuth) {
            // Normal load (not a redirect from email)
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user && mounted) {
                setUser(session.user);
                await fetchUserData(session.user);
            }
            if (mounted) setIsSessionLoading(false); 
        } 
        // If isHashAuth is true, we simply wait. Listener below will catch 'SIGNED_IN'.
    };

    init();

    // 3. Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          
          // CRITICAL FIX: Add delay to allow URL hash clearing and avoid AbortError
          setTimeout(async () => {
             if (mounted) {
                 await fetchUserData(session.user);
                 setIsSessionLoading(false);
             }
          }, 500); 

      } else if (event === 'SIGNED_OUT') {
          setUser(null);
          clearUserData();
          setIsSessionLoading(false);
      } else if (event === 'INITIAL_SESSION') {
          // Handle case where session is restored from local storage
          if (session) {
             setUser(session.user);
             await fetchUserData(session.user);
          }
          setIsSessionLoading(false);
      }
    });

    // Load Wishlist
    const savedWishlist = localStorage.getItem('print_project_wishlist');
    if (savedWishlist) {
        try {
            setWishlist(JSON.parse(savedWishlist));
        } catch (e) { console.error("Failed to parse wishlist"); }
    }

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
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
              // Explicitly set redirect to origin to handle localhost vs prod correctly
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
        password,
        options: {
            emailRedirectTo: window.location.origin,
        }
    });
    return { data, error };
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });
    return { error };
  };

  const loginWithTelegram = async (telegramUser: TelegramUser) => {
      try {
          const { data, error } = await supabase.functions.invoke('telegram-login', {
              body: telegramUser
          });

          if (error) throw new Error('Ошибка соединения с сервером авторизации.');

          if (!data?.session) {
              throw new Error('Сервер не вернул сессию. Проверьте конфигурацию.');
          }

          const { error: sessionError } = await supabase.auth.setSession(data.session);
          
          if (sessionError) throw sessionError;

          return { error: null };
      } catch (err: any) {
          return { error: err };
      }
  };

  const logout = async () => {
      setUser(null);
      clearUserData();
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("SignOut error:", e);
      }
      navigate('/', { replace: true });
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
        await fetchPublicData(); // Only refresh public data
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
    
    if (!error) await fetchPublicData();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) await fetchPublicData();
  };

  // --- COLLECTIONS CRUD ---
  const addCollection = async (collection: Collection) => {
    const newCollection = { ...collection, link: collection.link || `/catalog?collection=${collection.id}` };
    const { error } = await supabase.from('collections').upsert([newCollection]);
    if (!error) await fetchPublicData();
  };

  const deleteCollection = async (id: string) => {
    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (!error) await fetchPublicData();
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

  // --- ORDERS LOGIC (WITH INVENTORY UPDATE) ---
  const createOrder = async (orderData: Omit<Order, 'id' | 'created_at'>) => {
      // 0. Get Current Session User
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || null;

      // 1. Create the Order with user_id attached
      const payload = {
          ...orderData,
          user_id: currentUserId, // CRITICAL: Link order to user
      };

      const { error: orderError } = await supabase.from('orders').insert([payload]);
      
      if (orderError) {
          console.error("Order Create Error:", orderError);
          alert("ОШИБКА СОЗДАНИЯ ЗАКАЗА: " + orderError.message);
          return false;
      }

      // 2. Decrement Stock for each item
      for (const item of orderData.order_items) {
          // Find the variant needed
          const variant = products
              .find(p => p.id === item.id)
              ?.variants?.find(v => v.size === item.selectedSize);

          if (variant) {
              const newStock = Math.max(0, variant.stock - item.quantity);
              
              // Update variant in DB
              await supabase
                  .from('product_variants')
                  .update({ stock: newStock })
                  .eq('id', variant.id);
          }
      }

      // 3. Refresh Data
      await fetchPublicData();
      if (session?.user) {
          await fetchUserData(session.user);
      }
      
      return true;
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (!error && user) await fetchUserData(user);
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
      await fetchPublicData();
  };

  const togglePromoCodeDb = async (id: string, currentState: boolean) => {
      await supabase.from('promocodes').update({ is_active: !currentState }).eq('id', id);
      await fetchPublicData();
  };

  const deletePromoCodeDb = async (id: string) => {
      await supabase.from('promocodes').delete().eq('id', id);
      await fetchPublicData();
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
      allUsers,
      wishlist,
      user,
      isSessionLoading, // EXPORTED
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
      loginWithTelegram, // EXPORTED
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
