
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, CartItem, AppContextType, Category, Collection, Order, PromoCode, ProductVariant, UserProfile, TelegramUser, OrderStatus, SiteConfig, Article } from './types';
import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial data is kept for fallback/skeleton, but real data comes from DB
const INITIAL_PRODUCTS: Product[] = [];
const INITIAL_COLLECTIONS: Collection[] = [];

// UX: Friendly Error Messages for RPC responses
const RPC_ERROR_MAPPING: Record<string, string> = {
    'Insufficient stock': 'К сожалению, выбранный размер только что закончился.',
    'Variant not found': 'Ошибка данных: вариант товара не найден.',
    'Promo code usage limit reached': 'Лимит использования этого промокода исчерпан.',
    'Order amount too low for this promo code': 'Сумма заказа недостаточна для применения промокода.',
    'Promo code is for VIP only': 'Этот промокод доступен только для VIP клиентов (Whales).',
    'Not enough points': 'На вашем счету недостаточно баллов.',
    'Cannot pay more than 50% with points': 'Баллами можно оплатить не более 50% от суммы заказа.',
    'Product not found': 'Один из товаров больше недоступен.',
    'default': 'Произошла ошибка при оформлении заказа. Пожалуйста, обратитесь в поддержку.'
};

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [collections, setCollections] = useState<Collection[]>(INITIAL_COLLECTIONS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true); // START AS TRUE
  
  // New State
  const [orders, setOrders] = useState<Order[]>([]); // Admin View
  const [userOrders, setUserOrders] = useState<Order[]>([]); // Personal Cabinet View
  const [promocodes, setPromocodes] = useState<PromoCode[]>([]);
  const [activePromo, setActivePromo] = useState<PromoCode | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]); 
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null); // HEADLESS CMS
  const [articles, setArticles] = useState<Article[]>([]); // NEW: Articles

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

  // --- 1. FETCH PUBLIC DATA (PRODUCTS, COLLECTIONS, CONFIG, ARTICLES) ---
  const fetchPublicData = async () => {
      try {
          // SECURITY: STRICT SELECT to prevent 'cost_price' leakage to public client
          // We explicitly list fields instead of using '*'
          const productPromise = supabase.from('products')
            .select('id, name, price, description, images, category, collection_ids, is_new, is_hidden, is_vip_only, release_date');
            
          const variantPromise = supabase.from('product_variants').select('product_id, size, stock'); // Only needed fields
          const collectionPromise = supabase.from('collections').select('*');
          const promoPromise = supabase.from('promocodes').select('*');
          const configPromise = supabase.from('site_config').select('*').single(); 
          const articlesPromise = supabase.from('articles').select('*').order('published_at', { ascending: false });

          const [prodRes, varRes, colRes, promoRes, configRes, artRes] = await Promise.all([
              productPromise, variantPromise, collectionPromise, promoPromise, configPromise, articlesPromise
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
                      collectionIds: p.collection_ids || [], 
                      isNew: p.is_new,
                      isHidden: p.is_hidden,
                      isVipOnly: p.is_vip_only,
                      // cost_price is deliberately excluded here
                      releaseDate: p.release_date, 
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
          
          if (configRes.data) setSiteConfig(configRes.data as SiteConfig);

          if (artRes.data) setArticles(artRes.data as Article[]);

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
              .select('*')
              .eq('id', currentUser.id)
              .single();

          if (profile) {
              setUserProfile(profile as UserProfile);
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
      } catch (err: any) {
          console.error("Fetch User Data Error:", err);
      }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
      if (!user) return;
      try {
          // SECURITY NOTE: RLS Policies on the backend MUST prevent updating 'loyalty_points' or 'role' here.
          // This call should only succeed for safe fields (address, phone, name).
          const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);
          if (error) throw error;
          setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      } catch (e) {
          console.error("Profile update failed", e);
          throw e;
      }
  }

  // --- CMS UPDATE ---
  const updateSiteConfig = async (config: Partial<SiteConfig>) => {
      try {
          const { error } = await supabase
            .from('site_config')
            .update(config)
            .eq('id', 1);
          
          if (error) throw error;
          // Refresh to get latest
          const { data } = await supabase.from('site_config').select('*').single();
          if (data) setSiteConfig(data as SiteConfig);
      } catch (e) {
          console.error("Failed to update config", e);
          throw e;
      }
  };

  const clearUserData = () => {
      setUserOrders([]);
      setOrders([]);
      setAllUsers([]);
      setUserProfile(null);
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
      const dbProduct: any = { 
          ...product,
          is_new: product.isNew,
          is_hidden: product.isHidden,
          is_vip_only: product.isVipOnly, // MAP VIP
          cost_price: product.cost_price, // MAP COGS
          collection_ids: product.collectionIds,
          release_date: product.releaseDate
      };
      
      delete dbProduct.isNew;
      delete dbProduct.isHidden;
      delete dbProduct.isVipOnly;
      delete dbProduct.collectionIds;
      delete dbProduct.categories;
      delete dbProduct.variants;
      delete dbProduct.releaseDate;

      if (product.categories && product.categories.length > 0) {
          dbProduct.category = product.categories.join(',');
      } else {
          dbProduct.category = '';
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

  // --- ORDERS LOGIC (SECURED ATOMIC RPC) ---
  const createOrder = async (orderData: Omit<Order, 'id' | 'created_at'>, pointsUsed: number = 0) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
          alert("Пожалуйста, войдите в систему");
          return false;
      }

      // Simplified items array for RPC
      const itemsPayload = orderData.order_items.map(item => ({
          id: item.id,
          selectedSize: item.selectedSize,
          quantity: item.quantity,
          name: item.name // Added for error reporting in SQL
      }));

      const deliveryPayload = orderData.customer_info;
      const promoCode = activePromo ? activePromo.code : null;

      try {
          // CALL ATOMIC RPC
          const { data, error } = await supabase.rpc('create_new_order', {
              p_items: itemsPayload,
              p_delivery_info: deliveryPayload,
              p_payment_method: orderData.payment_method,
              p_promo_code: promoCode,
              p_points_used: pointsUsed
          });

          if (error) throw error;

          if (data && data.success) {
              await fetchPublicData();
              await fetchUserData(session.user);
              return true;
          } else {
              // RPC Custom Error Handling
              // Check if the error message is in our map, otherwise generic default
              const rawError = data?.error || 'Unknown server error';
              const userMessage = Object.entries(RPC_ERROR_MAPPING).find(([key]) => rawError.includes(key))?.[1] || rawError;
              
              alert("ОШИБКА: " + userMessage);
              return false;
          }

      } catch (err: any) {
          console.error("Atomic Order Create Error:", err);
          
          // Network or System errors
          const rawError = err.message || 'Unknown error';
          const userMessage = Object.entries(RPC_ERROR_MAPPING).find(([key]) => rawError.includes(key))?.[1] || RPC_ERROR_MAPPING['default'];
          
          alert(userMessage);
          return false;
      }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus, trackingNumber?: string) => {
      const updates: any = { status };
      if (trackingNumber !== undefined) updates.tracking_number = trackingNumber;
      
      const { error } = await supabase.from('orders').update(updates).eq('id', id);
      if (!error && user) await fetchUserData(user); 
  };

  // --- PAY FOR ORDER (SIMULATION) ---
  const payForOrder = async (orderId: string): Promise<boolean> => {
      try {
          // In a real app, this would redirect to a gateway.
          // Here we just update the status to 'paid'.
          const { error } = await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId);
          if (error) throw error;
          
          if (user) await fetchUserData(user);
          return true;
      } catch (e: any) {
          alert("Ошибка оплаты: " + e.message);
          return false;
      }
  };

  const applyPromoCode = async (code: string): Promise<{success: boolean, message?: string}> => {
      const cleanCode = code.trim().toUpperCase();
      const { data, error } = await supabase.from('promocodes').select('*').eq('code', cleanCode).single();
      if (error || !data) return { success: false, message: 'Промокод не найден' };
      const promo = data as PromoCode;
      
      if (!promo.is_active) return { success: false, message: 'Промокод отключен' };
      
      // Strict undefined check logic fix
      const hasUsageLimit = typeof promo.usage_limit === 'number';
      if (hasUsageLimit && promo.usage_limit !== undefined && promo.usage_count >= promo.usage_limit) {
          return { success: false, message: 'Лимит использования исчерпан' };
      }
      
      const currentSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      if (promo.min_order_amount > 0 && currentSubtotal < promo.min_order_amount) return { success: false, message: `Работает от ${promo.min_order_amount} ₽` };
      
      // Dynamic VIP Check
      if (promo.target_audience === 'vip_only') {
          const spent = userProfile?.total_spent || 0;
          const threshold = siteConfig?.vip_threshold || 15000;
          if (spent < threshold) return { success: false, message: 'Только для VIP клиентов' };
      }
      
      if (promo.target_audience === 'new_users') {
          if (userOrders.length > 0) return { success: false, message: 'Только для новых клиентов' };
      }
      setActivePromo(promo);
      localStorage.setItem('print_project_promo', cleanCode);
      return { success: true };
  };

  const removePromoCode = () => {
      setActivePromo(null);
      localStorage.removeItem('print_project_promo');
  };

  const addPromoCodeDb = async (promo: Partial<PromoCode>) => {
      await supabase.from('promocodes').insert([{ 
          code: promo.code?.toUpperCase() || 'UNKNOWN', 
          discount_value: promo.discount_value || 0,
          discount_type: promo.discount_type || 'percent',
          is_active: true,
          // Explicit null check for DB strictness
          usage_limit: typeof promo.usage_limit === 'number' ? promo.usage_limit : null, 
          min_order_amount: promo.min_order_amount || 0,
          target_audience: promo.target_audience || 'all'
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
      userProfile,
      siteConfig,
      articles, // EXPOSED
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
      payForOrder, // NEW
      applyPromoCode,
      removePromoCode,
      addPromoCodeDb,
      togglePromoCodeDb,
      deletePromoCodeDb,
      refreshData,
      updateSiteConfig,
      toggleWishlist,
      loginWithMagicLink,
      loginWithPassword,
      signupWithPassword,
      loginWithGoogle,
      loginWithTelegram,
      loginWithVKCode,
      logout,
      updateUserProfile
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
