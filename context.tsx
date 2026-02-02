
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  const [orders, setOrders] = useState<Order[]>([]); // Admin View (Deprecated for direct access, used via components now)
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
          if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
          console.error("Fetch Public Data Error:", err);
      }
  };

  // --- 2. FETCH USER PRIVATE DATA ---
  const fetchUserData = async (currentUser: User) => {
      try {
          const { data: profile } = await supabase
              .from('profiles')
              .select('current_cart, favorites')
              .eq('id', currentUser.id)
              .single();

          if (profile) {
              if (profile.current_cart && Array.isArray(profile.current_cart) && profile.current_cart.length > 0) {
                  setCart(profile.current_cart as CartItem[]);
              }
              if (profile.favorites && Array.isArray(profile.favorites) && profile.favorites.length > 0) {
                  setWishlist(profile.favorites as string[]);
              }
          }

          const { data: personalOrders, error: personalError } = await supabase
              .from('orders')
              .select('*')
              .or(`user_id.eq.${currentUser.id},customer_info->>email.eq.${currentUser.email}`)
              .order('created_at', { ascending: false });
          
          if (!personalError && personalOrders) {
              setUserOrders(personalOrders as Order[]);
          }
          
          // NOTE: We do NOT fetch all orders here anymore for Admin scalability.
          // Admin components will fetch their own data.
      } catch (err: any) {
          if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
          console.error("Fetch User Data Error:", err);
      }
  };

  const clearUserData = () => {
      setUserOrders([]);
      setOrders([]);
      setAllUsers([]);
  }

  const refreshData = async () => {
      await fetchPublicData();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          await fetchUserData(session.user);
      }
  };

  // --- 3. SYNC CART TO SUPABASE (DEBOUNCED) ---
  useEffect(() => {
      if (!user) return;
      const syncCartToDb = async () => {
          try {
              await supabase.from('profiles').update({
                  current_cart: cart,
                  cart_updated_at: new Date().toISOString()
              }).eq('id', user.id);
          } catch (e) {
              console.error("Failed to sync cart", e);
          }
      };
      const timeoutId = setTimeout(syncCartToDb, 2000); 
      return () => clearTimeout(timeoutId);
  }, [cart, user]);

  // --- 4. SYNC WISHLIST TO SUPABASE (DEBOUNCED) ---
  useEffect(() => {
      if (!user) return;
      const syncWishlistToDb = async () => {
          try {
              await supabase.from('profiles').update({
                  favorites: wishlist
              }).eq('id', user.id);
          } catch (e) {
              console.error("Failed to sync wishlist", e);
          }
      };
      const timeoutId = setTimeout(syncWishlistToDb, 2000);
      return () => clearTimeout(timeoutId);
  }, [wishlist, user]);


  // --- INITIALIZATION EFFECT ---
  useEffect(() => {
    let mounted = true;
    const init = async () => {
        await fetchPublicData();
        const isHashAuth = window.location.hash && (
            window.location.hash.includes('access_token') || 
            window.location.hash.includes('type=magiclink')
        );
        if (!isHashAuth) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && mounted) {
                setUser(session.user);
                await fetchUserData(session.user);
            }
            if (mounted) setIsSessionLoading(false); 
        } 
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
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
          if (session) {
             setUser(session.user);
             await fetchUserData(session.user);
          }
          setIsSessionLoading(false);
      }
    });
    if (!user) {
        const savedWishlist = localStorage.getItem('print_project_wishlist');
        if (savedWishlist) {
            try { setWishlist(JSON.parse(savedWishlist)); } catch (e) {}
        }
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
          options: { emailRedirectTo: window.location.origin }
      });
      return { error };
  };

  const loginWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signupWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin }
    });
    return { data, error };
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    return { error };
  };

  const loginWithTelegram = async (telegramUser: TelegramUser) => {
      try {
          const { data, error } = await supabase.functions.invoke('telegram-login', {
              body: telegramUser
          });
          if (error) throw new Error('Ошибка соединения с сервером авторизации.');
          if (!data?.session) throw new Error('Сервер не вернул сессию.');
          const { error: sessionError } = await supabase.auth.setSession(data.session);
          if (sessionError) throw sessionError;
          return { error: null };
      } catch (err: any) {
          return { error: err };
      }
  };

  const loginWithVKCode = async (code: string) => {
      try {
          const { data, error } = await supabase.functions.invoke('vk-login', {
              body: { 
                  code,
                  redirect_uri: window.location.origin + '/vk-callback'
              }
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          if (data?.url) {
              window.location.href = data.url;
          }
          return { error: null };
      } catch (err: any) {
          return { error: err };
      }
  };

  const logout = async () => {
      setUser(null);
      clearUserData();
      setCart([]);
      setWishlist([]);
      localStorage.removeItem('print_project_wishlist');
      try { await supabase.auth.signOut(); } catch (e) { console.error("SignOut error:", e); }
      navigate('/', { replace: true });
  };

  const toggleWishlist = (productId: string) => {
      setWishlist(prev => {
          const newState = prev.includes(productId) 
            ? prev.filter(id => id !== productId)
            : [...prev, productId];
          localStorage.setItem('print_project_wishlist', JSON.stringify(newState));
          return newState;
      });
  };

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
        await fetchPublicData();
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

  const clearCart = async () => {
    setCart([]);
    setActivePromo(null);
    localStorage.removeItem('print_project_promo');
    if (user) {
        await supabase.from('profiles').update({ current_cart: [] }).eq('id', user.id);
    }
  }

  // --- ORDERS LOGIC (SECURED) ---
  const createOrder = async (orderData: Omit<Order, 'id' | 'created_at'>) => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || null;

      // 1. RE-VERIFY PRICES AND STOCK SERVER-SIDE (Simulated here via fresh fetch)
      // We fetch products directly from DB to ensure prices are not spoofed
      const { data: dbProducts } = await supabase.from('products').select('id, price');
      
      let verifiedSubtotal = 0;
      const verifiedItems = orderData.order_items.map(item => {
          const dbItem = dbProducts?.find(p => p.id === item.id);
          const realPrice = dbItem ? dbItem.price : item.price;
          verifiedSubtotal += realPrice * item.quantity;
          return { ...item, price: realPrice }; // Update with real price
      });

      // 2. Re-calculate Promo
      let discountAmount = 0;
      if (activePromo) {
          if (activePromo.discount_type === 'fixed') {
              discountAmount = activePromo.discount_value;
          } else {
              const value = activePromo.discount_value || activePromo.discount_percent;
              discountAmount = Math.round(verifiedSubtotal * (value / 100));
          }
      }
      discountAmount = Math.min(discountAmount, verifiedSubtotal);
      
      // Fixed delivery costs (could also be fetched from config)
      const deliveryPrice = orderData.customer_info.deliveryMethod === 'cdek_door' ? 550 : 350;
      const verifiedTotal = verifiedSubtotal - discountAmount + deliveryPrice;

      // 3. Create Payload
      const payload = {
          ...orderData,
          total_price: verifiedTotal, // Override with verified total
          order_items: verifiedItems, // Override with verified items
          user_id: currentUserId,
          customer_info: {
              ...orderData.customer_info,
              discountAmount: discountAmount // Save calculated discount for history
          }
      };

      const { error: orderError } = await supabase.from('orders').insert([payload]);
      
      if (orderError) {
          console.error("Order Create Error:", orderError);
          alert("ОШИБКА СОЗДАНИЯ ЗАКАЗА: " + orderError.message);
          return false;
      }

      // 4. Decrement Stock
      for (const item of orderData.order_items) {
          const variant = products
              .find(p => p.id === item.id)
              ?.variants?.find(v => v.size === item.selectedSize);

          if (variant) {
              const newStock = Math.max(0, variant.stock - item.quantity);
              await supabase
                  .from('product_variants')
                  .update({ stock: newStock })
                  .eq('id', variant.id);
          }
      }

      if (currentUserId) {
          await supabase.from('profiles').update({ current_cart: [] }).eq('id', currentUserId);
      }

      await fetchPublicData();
      if (session?.user) {
          await fetchUserData(session.user);
      }
      
      return true;
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (!error && user) await fetchUserData(user); // Only fetch user orders, admin handles its own
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

  const addPromoCodeDb = async (code: string, value: number, type: 'percent' | 'fixed') => {
      await supabase.from('promocodes').insert([{ 
          code: code.toUpperCase(), 
          discount_percent: value, 
          discount_value: value,
          discount_type: type,
          is_active: true 
      }]);
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
      isSessionLoading, 
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
      loginWithTelegram,
      loginWithVKCode,
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
