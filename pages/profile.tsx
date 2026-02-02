
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context';
import FancyButton from '../components/ui/FancyButton';
import ProductCard from '../components/ui/ProductCard';
import { LogOut, Package, Mail, Loader2, Clock, CheckCircle, Lock, AlertTriangle, Send, Smartphone, MapPin, Repeat, Truck, Star, Settings, RefreshCw, Heart, MessageCircle, Sparkles, Bell, Radio, Crown } from 'lucide-react';
import { Order, OrderStatus, Product } from '../types';
import AddressInput from '../components/ui/AddressInput';
import { getImageUrl } from '../utils';
import { supabase } from '../supabaseClient';

// --- HELPER: ORDER STATUS PROGRESS BAR ---
const OrderProgress: React.FC<{ status: OrderStatus; tracking?: string }> = ({ status, tracking }) => {
    // 0: New, 1: Paid, 2: Assembly, 3: Shipping, 4: Completed
    const steps = ['new', 'paid', 'assembly', 'shipping', 'completed'];
    const currentStepIndex = steps.indexOf(status);
    const isCancelled = status === 'cancelled';

    if (isCancelled) {
        return (
            <div className="bg-red-50 border border-red-200 p-3 rounded flex items-center gap-2 text-red-700 font-mono text-xs">
                <AlertTriangle size={16} /> ЗАКАЗ ОТМЕНЕН
            </div>
        );
    }

    return (
        <div className="mt-4">
            <div className="flex justify-between text-[10px] font-mono uppercase text-zinc-400 mb-2">
                <span className={currentStepIndex >= 0 ? 'text-black font-bold' : ''}>Принят</span>
                <span className={currentStepIndex >= 2 ? 'text-black font-bold' : ''}>Сборка</span>
                <span className={currentStepIndex >= 3 ? 'text-black font-bold' : ''}>Доставка</span>
                <span className={currentStepIndex >= 4 ? 'text-black font-bold' : ''}>Вручен</span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden flex">
                {steps.slice(0, 4).map((s, idx) => (
                    <div 
                        key={s} 
                        className={`flex-1 border-r border-white last:border-0 transition-all duration-500 ${idx < currentStepIndex ? 'bg-black' : idx === currentStepIndex ? 'bg-blue-600 animate-pulse' : 'bg-transparent'}`} 
                    />
                ))}
            </div>
            {/* Tracking Link */}
            {status === 'shipping' && tracking && (
                <div className="mt-4">
                    <a 
                        href={`https://www.cdek.ru/ru/tracking?order_id=${tracking}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 font-jura font-bold text-xs uppercase hover:bg-blue-700 transition-colors"
                    >
                        <Truck size={14} /> Отследить посылку ({tracking})
                    </a>
                </div>
            )}
        </div>
    );
};

// --- HELPER: COUNTDOWN TIMER ---
const CountdownTimer: React.FC<{ targetDate: string }> = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(targetDate) - +new Date();
            if (difference > 0) {
                return {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                };
            }
            return null;
        };

        // Initial calc
        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    if (!timeLeft) return <div className="text-red-500 font-bold uppercase">LIVE NOW</div>;

    return (
        <div className="flex gap-2 text-white font-mono text-sm">
            <div className="bg-black/50 p-1 min-w-[30px] text-center">{timeLeft.days}D</div>:
            <div className="bg-black/50 p-1 min-w-[30px] text-center">{timeLeft.hours}H</div>:
            <div className="bg-black/50 p-1 min-w-[30px] text-center">{timeLeft.minutes}M</div>
        </div>
    );
};

const ProfilePage: React.FC = () => {
  const { user, userProfile, isSessionLoading, userOrders, loginWithMagicLink, loginWithPassword, signupWithPassword, loginWithGoogle, logout, addToCart, updateUserProfile, products, wishlist, refreshData } = useApp();
  
  // Auth Modes: 'login', 'register', 'magic'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'magic'>('login');
  const [activeTab, setActiveTab] = useState<'orders' | 'drops' | 'wishlist' | 'settings'>('orders');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscriptions State
  const [subscribedProductIds, setSubscribedProductIds] = useState<string[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
      firstName: '',
      lastName: '',
      phone: '',
      city: '',
      address: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Auto-refresh data on mount to ensure bonuses and orders are up to date
  useEffect(() => {
      if (user) {
          refreshData();
          fetchSubscriptions();
      }
  }, [user]);

  // Initialize Settings Form from Profile
  useEffect(() => {
      if (userProfile?.shipping_info) {
          setSettingsForm({
              firstName: userProfile.shipping_info.firstName || '',
              lastName: userProfile.shipping_info.lastName || '',
              phone: userProfile.shipping_info.phone || '',
              city: userProfile.shipping_info.city || '',
              address: userProfile.shipping_info.address || ''
          });
      }
  }, [userProfile]);

  // Fetch Subscriptions
  const fetchSubscriptions = async () => {
      if (!user) return;
      try {
          const { data } = await supabase
            .from('product_subscriptions')
            .select('product_id')
            .eq('user_id', user.id);
          
          if (data) {
              setSubscribedProductIds(data.map(sub => sub.product_id));
          }
      } catch (e) {
          console.error("Failed to fetch subs", e);
      }
  };

  // Subscribe Handler
  const handleSubscribe = async (productId: string) => {
      if (!user) return;
      
      // 1. Check if user has Telegram ID linked (Assuming it's in profile)
      // NOTE: For now, if no TG ID, we just warn them or link to bot.
      if (!userProfile?.telegram_id) {
          alert('Для получения уведомлений необходимо привязать Telegram. \n\nПожалуйста, запустите нашего бота.');
          window.open('https://t.me/print_project_shop_bot', '_blank');
          return;
      }

      setSubLoading(true);
      try {
          // Optimistic update
          const isSubscribed = subscribedProductIds.includes(productId);
          
          if (isSubscribed) {
              // Unsubscribe
              await supabase.from('product_subscriptions').delete().match({ user_id: user.id, product_id: productId });
              setSubscribedProductIds(prev => prev.filter(id => id !== productId));
          } else {
              // Subscribe
              await supabase.from('product_subscriptions').insert({ 
                  user_id: user.id, 
                  product_id: productId,
                  telegram_id: userProfile.telegram_id 
              });
              setSubscribedProductIds(prev => [...prev, productId]);
          }
      } catch (e) {
          console.error("Sub error", e);
          alert("Ошибка подписки");
      } finally {
          setSubLoading(false);
      }
  };

  // --- UPCOMING DROPS FILTER ---
  const upcomingDrops = useMemo(() => {
      return products.filter(p => p.releaseDate && new Date(p.releaseDate) > new Date());
  }, [products]);

  // --- RECOMMENDATION ENGINE (STYLE MAP) ---
  const recommendations = useMemo(() => {
      // 1. Collect bought IDs and Collections
      const boughtIds = new Set<string>();
      const boughtCollections = new Set<string>();

      userOrders.forEach(order => {
          order.order_items.forEach(item => {
              boughtIds.add(item.id);
              // Find live product data to get collections, as cart item snapshot might be partial
              const liveProduct = products.find(p => p.id === item.id);
              if (liveProduct && liveProduct.collectionIds) {
                  liveProduct.collectionIds.forEach(c => boughtCollections.add(c));
              }
          });
      });

      // 2. Filter Products
      let matches = products.filter(p => {
          if (p.isHidden) return false;
          if (p.releaseDate && new Date(p.releaseDate) > new Date()) return false; // Hide unreleased from recommendations
          if (boughtIds.has(p.id)) return false; // Already bought
          
          // Logic: Match collection OR "fresh_drop" if user has no history
          if (boughtCollections.size > 0) {
              return p.collectionIds?.some(c => boughtCollections.has(c));
          } else {
              // If no history, show fresh drops
              return p.categories?.includes('fresh_drop');
          }
      });

      // 3. Fallback: If matches are too few, fill with generic popular items (e.g. fresh drop)
      if (matches.length < 4) {
          const fresh = products.filter(p => 
              p.categories?.includes('fresh_drop') && 
              !p.isHidden && 
              !boughtIds.has(p.id) &&
              !matches.includes(p) &&
              (!p.releaseDate || new Date(p.releaseDate) <= new Date())
          );
          matches = [...matches, ...fresh];
      }

      // 4. Return top 5 unique
      return Array.from(new Set(matches)).slice(0, 5);
  }, [userOrders, products]);

  // Prepare Wishlist Items
  const likedProducts = useMemo(() => {
      return products.filter(p => wishlist.includes(p.id));
  }, [wishlist, products]);

  const handleManualRefresh = async () => {
      setIsRefreshing(true);
      await refreshData();
      setTimeout(() => setIsRefreshing(false), 500);
  };

  // --- AUTH HANDLERS ---
  const handleGoogleLogin = async () => {
      setLoading(true);
      const { error } = await loginWithGoogle();
      if (error) setMessage({ type: 'error', text: error.message });
  };

  const handleDeepLinkLogin = () => {
      const botName = 'print_project_shop_bot';
      const startPayload = 'login_web'; 
      const tgUrl = `https://t.me/${botName}?start=${startPayload}`;
      window.open(tgUrl, '_blank');
      setMessage({
          type: 'success',
          text: 'МЫ ОТКРЫЛИ TELEGRAM. НАЖМИТЕ "ЗАПУСТИТЬ" (START) В ЧАТЕ С БОТОМ, ЧТОБЫ ПОЛУЧИТЬ КНОПКУ ДЛЯ ВХОДА.'
      });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) return;
      setMessage(null);
      setLoading(true);
      
      let successRedirect = false;

      try {
          if (authMode === 'magic') {
              const { error } = await loginWithMagicLink(email);
              if (error) throw error;
              setMessage({ type: 'success', text: `Ссылка отправлена на ${email}. Проверьте почту (и спам).` });
          } 
          else if (authMode === 'login') {
              if (!password) { setMessage({type: 'error', text: 'Введите пароль'}); setLoading(false); return; }
              const { error } = await loginWithPassword(email, password);
              if (error) throw error;
          } 
          else if (authMode === 'register') {
              if (!password) { setMessage({type: 'error', text: 'Придумайте пароль'}); setLoading(false); return; }
              const { data, error } = await signupWithPassword(email, password);
              if (error) throw error; 
              if (data?.session) successRedirect = true;
              else if (data?.user) setMessage({ type: 'success', text: `АККАУНТ СОЗДАН! ПОДТВЕРДИТЕ ПОЧТУ.` });
          }
      } catch (error: any) {
          setMessage({ type: 'error', text: error.message || 'Ошибка авторизации' });
      } finally {
          if (!successRedirect) setLoading(false);
      }
  };

  // --- USER ACTIONS ---
  const handleRepeatOrder = (order: Order) => {
      if(!confirm('Добавить все доступные товары из этого заказа в корзину?')) return;
      
      let addedCount = 0;
      let issuesCount = 0;
      
      order.order_items.forEach(item => {
          // 1. Find LIVE product data (price, stock, visibility)
          const liveProduct = products.find(p => p.id === item.id);
          
          if (liveProduct && !liveProduct.isHidden) {
              // 2. Check Stock for specific size
              const variant = liveProduct.variants?.find(v => v.size === item.selectedSize);
              // Fallback for simple products without variants (if any)
              const stock = variant ? variant.stock : 10; 

              if (stock >= item.quantity) {
                  addToCart(liveProduct, item.selectedSize, item.quantity);
                  addedCount++;
              } else {
                  issuesCount++;
              }
          } else {
              issuesCount++;
          }
      });

      if (addedCount > 0) {
          alert(`Успешно добавлено товаров: ${addedCount}.${issuesCount > 0 ? ` Не удалось добавить: ${issuesCount} (нет в наличии)` : ''}`);
      } else {
          alert('К сожалению, эти товары закончились или сняты с продажи.');
      }
  };

  const handleSupport = (orderId: string) => {
      const botUsername = 'your_support_username'; // ЗАМЕНИТЬ НА РЕАЛЬНЫЙ ЮЗЕРНЕЙМ ПОДДЕРЖКИ ИЛИ БОТА
      const text = `Привет! 👋 У меня вопрос по заказу #${orderId.slice(0,8)}. \n\n[Опишите вашу проблему...]`;
      window.open(`https://t.me/${botUsername}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingSettings(true);
      try {
          await updateUserProfile({
              shipping_info: settingsForm
          });
          alert('Данные сохранены! Теперь они будут подставляться в заказ.');
      } catch (e) {
          alert('Ошибка сохранения');
      } finally {
          setIsSavingSettings(false);
      }
  };

  if (isSessionLoading) {
      return (
          <div className="min-h-screen pt-24 pb-12 bg-white flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
              <p className="font-mono text-xs text-zinc-400 uppercase">ПРОВЕРКА ДОСТУПА...</p>
          </div>
      );
  }

  // --- GUEST VIEW (LOGIN) ---
  if (!user) {
      return (
        <div className="min-h-screen pt-24 pb-12 bg-white flex flex-col items-center justify-center">
            <div className="container mx-auto px-4 max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="font-jura text-4xl font-bold uppercase mb-2">ACCESS_POINT</h1>
                    <p className="font-mono text-xs text-zinc-500">IDENTIFICATION_REQUIRED</p>
                </div>
                <div className="bg-zinc-50 border border-black p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
                    <div className="space-y-4 mb-8">
                        <button onClick={handleDeepLinkLogin} className="w-full bg-[#24A1DE] hover:bg-[#208YbC] text-white font-jura font-bold py-3 px-4 flex items-center justify-center gap-3 transition-all shadow-sm group relative overflow-hidden">
                            <Send className="w-5 h-5 relative z-10" />
                            <span className="relative z-10">ВОЙТИ ЧЕРЕЗ TELEGRAM APP</span>
                        </button>
                        <button onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white border border-zinc-300 hover:border-black text-zinc-800 font-jura font-bold py-2 px-4 flex items-center justify-center gap-2 transition-all text-[10px]">
                            GOOGLE LOGIN
                        </button>
                    </div>
                    {/* EMAIL FORM (Simplified) */}
                    <form onSubmit={handleEmailAuth} className="space-y-4 pt-4 border-t border-zinc-200">
                        <input type="email" placeholder="E-MAIL" className="w-full border p-2 font-mono text-sm" value={email} onChange={e => setEmail(e.target.value)} required />
                        <input type="password" placeholder="PASSWORD" className="w-full border p-2 font-mono text-sm" value={password} onChange={e => setPassword(e.target.value)} required />
                        <button type="submit" className="w-full bg-black text-white py-3 font-bold font-jura uppercase">{loading ? '...' : 'ВОЙТИ / РЕГИСТРАЦИЯ'}</button>
                    </form>
                    {message && <p className={`mt-4 text-xs text-center font-mono ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{message.text}</p>}
                </div>
            </div>
        </div>
      );
  }

  // VIP PROGRESS LOGIC
  const totalSpent = userProfile?.total_spent || 0;
  const vipThreshold = 10000;
  const isVip = totalSpent >= vipThreshold;
  const progressPercent = Math.min(100, (totalSpent / vipThreshold) * 100);

  // --- LOGGED IN USER VIEW ---
  return (
    <div className="min-h-screen pt-24 pb-12 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 pb-6 border-b border-black gap-6">
            <div className="w-full md:w-auto">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full border border-black overflow-hidden">
                        {userProfile?.avatar_url ? <img src={userProfile.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-xl">{user.email?.[0].toUpperCase()}</div>}
                    </div>
                    <div>
                        <h1 className="font-jura text-3xl md:text-4xl font-bold uppercase">{userProfile?.full_name || 'ПОЛЬЗОВАТЕЛЬ'}</h1>
                        <p className="font-mono text-xs text-zinc-500">{user.email}</p>
                    </div>
                </div>

                {/* VIP PROGRESS BAR */}
                <div className="w-full max-w-md bg-zinc-100 p-3 rounded border border-zinc-200">
                    <div className="flex justify-between items-center mb-2 font-mono text-[10px] uppercase font-bold text-zinc-500">
                        <span className={!isVip ? "text-blue-900" : ""}>{isVip ? "ELITE MEMBER" : "ROOKIE"}</span>
                        <span className={isVip ? "text-blue-900 flex items-center gap-1" : "text-zinc-400"}>
                            {isVip && <Crown size={12}/>} VIP ACCESS
                        </span>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden border border-zinc-200 relative">
                        <div 
                            className={`absolute top-0 left-0 h-full transition-all duration-1000 ${isVip ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-black'}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    {!isVip && (
                        <p className="text-[9px] font-mono text-zinc-400 mt-2 text-right">
                            Осталось {Math.max(0, vipThreshold - totalSpent).toLocaleString()} ₽ до закрытого доступа
                        </p>
                    )}
                </div>
            </div>
            
            {/* LOYALTY CARD */}
            <div className="flex gap-4">
                <div className="bg-black text-white p-4 min-w-[160px] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-1 opacity-20"><Star size={40}/></div>
                    <div className="flex justify-between items-start relative z-10">
                        <p className="text-[10px] font-mono text-zinc-400 uppercase">Бонусный счет</p>
                        <button onClick={handleManualRefresh} className={`text-zinc-500 hover:text-white transition-colors ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={12}/></button>
                    </div>
                    <p className="font-jura text-2xl font-bold text-blue-400 relative z-10">{userProfile?.loyalty_points || 0}</p>
                </div>
                <button onClick={logout} className="h-full border border-zinc-300 px-4 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"><LogOut size={20}/></button>
            </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-8 border-b border-zinc-200 mb-8">
            <button 
                onClick={() => setActiveTab('orders')} 
                className={`pb-3 font-jura font-bold uppercase text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'orders' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
            >
                <Package size={16}/> Мои Заказы
            </button>
            <button 
                onClick={() => setActiveTab('drops')} 
                className={`pb-3 font-jura font-bold uppercase text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'drops' ? 'border-blue-600 text-blue-600 animate-pulse-fast' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
            >
                <Radio size={16} /> Drop Radar
            </button>
            <button 
                onClick={() => setActiveTab('wishlist')} 
                className={`pb-3 font-jura font-bold uppercase text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'wishlist' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
            >
                <Heart size={16} fill={activeTab === 'wishlist' ? "black" : "none"}/> Избранное ({likedProducts.length})
            </button>
            <button 
                onClick={() => setActiveTab('settings')} 
                className={`pb-3 font-jura font-bold uppercase text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
            >
                <Settings size={16}/> Мои данные
            </button>
        </div>

        {/* CONTENT */}
        
        {/* --- ORDERS TAB --- */}
        {activeTab === 'orders' && (
            <div className="space-y-12 animate-fade-in">
                
                {/* Orders List */}
                <div className="space-y-6">
                    {userOrders.length === 0 ? (
                        <div className="border-2 border-dashed border-zinc-200 p-12 text-center">
                            <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                            <p className="font-jura text-lg text-zinc-400 uppercase">История пуста</p>
                        </div>
                    ) : (
                        userOrders.map(order => (
                            <div key={order.id} className="border border-zinc-200 p-6 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    {/* Order Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <h3 className="font-jura font-bold text-xl uppercase">#{order.id.slice(0,8)}</h3>
                                            <span className="font-mono text-xs text-zinc-400">{new Date(order.created_at).toLocaleDateString()}</span>
                                        </div>
                                        
                                        {/* Items Preview */}
                                        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                                            {order.order_items.map((item, idx) => (
                                                <div key={idx} className="w-12 h-16 border border-zinc-100 bg-zinc-50 shrink-0 relative" title={item.name}>
                                                    <img src={item.images[0]} className="w-full h-full object-cover" />
                                                    <span className="absolute bottom-0 right-0 bg-black text-white text-[8px] px-1">{item.selectedSize}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="font-mono text-sm flex gap-4">
                                            <span>Сумма: <span className="font-bold">{order.total_price.toLocaleString()} ₽</span></span>
                                            {order.points_used && order.points_used > 0 && (
                                                <span className="text-yellow-600 font-bold flex items-center gap-1"><Sparkles size={12}/> -{order.points_used} Б</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status & Actions */}
                                    <div className="flex-1 border-t md:border-t-0 md:border-l border-zinc-100 pt-4 md:pt-0 md:pl-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="font-mono text-xs text-zinc-500 uppercase">Статус заказа</div>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => handleSupport(order.id)}
                                                    className="flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-400 hover:text-black transition-colors"
                                                    title="Написать в поддержку"
                                                >
                                                    <MessageCircle size={14}/> Помощь
                                                </button>
                                                <button 
                                                    onClick={() => handleRepeatOrder(order)}
                                                    className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-600 hover:underline border border-blue-200 px-2 py-1 hover:bg-blue-50 transition-colors"
                                                >
                                                    <Repeat size={12}/> Купить снова
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <OrderProgress status={order.status} tracking={order.tracking_number} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* DYNAMIC STYLE MAP (RECOMMENDATIONS) */}
                {recommendations.length > 0 && (
                    <div className="border-t border-black pt-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Sparkles className="text-blue-600 animate-pulse" size={20} />
                            <div>
                                <h2 className="font-jura text-xl font-bold uppercase tracking-wide">
                                    SYSTEM MATCH / ВАШ СТИЛЬ
                                </h2>
                                <p className="font-mono text-xs text-zinc-500">
                                    ПОДБОРКА НА ОСНОВЕ ВАШИХ ПРЕДПОЧТЕНИЙ
                                </p>
                            </div>
                        </div>
                        
                        <div 
                            className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide scroll-smooth"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {recommendations.map(product => (
                                <div key={product.id} className="min-w-[260px] md:min-w-[280px] snap-center">
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- DROP RADAR TAB --- */}
        {activeTab === 'drops' && (
            <div className="animate-fade-in">
                <div className="bg-black text-white p-6 md:p-12 mb-12 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"/>
                    <div className="relative z-10 text-center">
                        <h2 className="font-jura text-4xl md:text-6xl font-bold uppercase tracking-widest text-transparent text-stroke-white mb-4">
                            DROP RADAR
                        </h2>
                        <p className="font-mono text-sm text-zinc-400 max-w-lg mx-auto">
                            СИСТЕМА РАННЕГО ОПОВЕЩЕНИЯ. ПОДПИШИСЬ НА ДРОП, ЧТОБЫ ПОЛУЧИТЬ ДОСТУП В ПЕРВЫЕ МИНУТЫ.
                        </p>
                    </div>
                </div>

                {upcomingDrops.length === 0 ? (
                    <div className="text-center py-20 border border-zinc-200 bg-zinc-50">
                        <Radio size={48} className="mx-auto text-zinc-300 mb-4 animate-pulse" />
                        <p className="font-jura text-xl text-zinc-400">СИГНАЛОВ НЕТ</p>
                        <p className="font-mono text-xs text-zinc-500 mt-2">НОВЫЕ ДРОПЫ ПОКА НЕ ОБЪЯВЛЕНЫ</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {upcomingDrops.map(product => {
                            const isSubscribed = subscribedProductIds.includes(product.id);
                            
                            return (
                                <div key={product.id} className="group relative border border-zinc-200 hover:border-blue-600 transition-colors bg-white">
                                    {/* BLURRED IMAGE CONTAINER */}
                                    <div className="aspect-[3/4] relative overflow-hidden bg-black">
                                        <img 
                                            src={getImageUrl(product.images[0], 500)} 
                                            className="w-full h-full object-cover opacity-60 blur-xl group-hover:blur-md transition-all duration-700 scale-110"
                                        />
                                        
                                        {/* OVERLAY CONTENT */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
                                            <Lock size={32} className="text-white mb-4" />
                                            <h3 className="font-jura text-2xl font-bold text-white uppercase drop-shadow-md mb-2">
                                                {product.name}
                                            </h3>
                                            {product.releaseDate && <CountdownTimer targetDate={product.releaseDate} />}
                                        </div>
                                    </div>

                                    {/* ACTION BAR */}
                                    <div className="p-4 border-t border-zinc-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="font-mono text-xs text-zinc-500">STATUS: LOCKED</span>
                                            {product.releaseDate && (
                                                <span className="font-mono text-xs font-bold">
                                                    {new Date(product.releaseDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleSubscribe(product.id)}
                                            disabled={subLoading}
                                            className={`w-full py-3 font-jura font-bold uppercase text-sm flex items-center justify-center gap-2 transition-all 
                                            ${!userProfile?.telegram_id 
                                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                                : isSubscribed 
                                                    ? 'bg-zinc-100 text-green-700 border border-green-200 cursor-default' 
                                                    : 'bg-black text-white hover:bg-zinc-800'
                                            }`}
                                        >
                                            {!userProfile?.telegram_id ? (
                                                <>ПОДКЛЮЧИТЬ TELEGRAM</>
                                            ) : isSubscribed ? (
                                                <><CheckCircle size={16}/> ВЫ В СПИСКЕ</>
                                            ) : (
                                                <><Bell size={16}/> УВЕДОМИТЬ МЕНЯ</>
                                            )}
                                        </button>
                                        {!userProfile?.telegram_id && (
                                            <p className="text-[9px] text-zinc-400 text-center mt-2">
                                                Для уведомлений нужен бот
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

        {/* --- WISHLIST TAB --- */}
        {activeTab === 'wishlist' && (
            <div className="animate-fade-in">
                {likedProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                        {likedProducts.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="py-24 text-center border-2 border-dashed border-zinc-200">
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Heart size={32} className="text-zinc-300" />
                        </div>
                        <h2 className="font-jura text-2xl font-bold uppercase mb-4 text-zinc-400">
                            СПИСОК ПУСТ
                        </h2>
                        <p className="font-montserrat text-sm text-zinc-500 max-w-md mx-auto mb-8">
                            Сохраняйте понравившиеся товары, чтобы не потерять их и купить позже.
                        </p>
                        <button onClick={() => window.location.href = '/catalog'} className="bg-black text-white px-6 py-2 font-jura uppercase text-sm">
                            ПЕРЕЙТИ В КАТАЛОГ
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
            <div className="max-w-xl animate-fade-in">
                <div className="bg-blue-50 border border-blue-200 p-4 mb-6 text-sm text-blue-800 font-mono">
                    <p>Заполните данные для автоматической подстановки при оформлении заказа.</p>
                </div>
                
                <form onSubmit={handleSaveSettings} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Имя</label>
                            <input className="w-full border p-2" value={settingsForm.firstName} onChange={e => setSettingsForm({...settingsForm, firstName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Фамилия</label>
                            <input className="w-full border p-2" value={settingsForm.lastName} onChange={e => setSettingsForm({...settingsForm, lastName: e.target.value})} />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Телефон</label>
                        <input className="w-full border p-2" value={settingsForm.phone} onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})} placeholder="+7..." />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Город</label>
                        <input className="w-full border p-2" value={settingsForm.city} onChange={e => setSettingsForm({...settingsForm, city: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Адрес (Улица, Дом, Кв)</label>
                        {/* Reusing AddressInput component logic but simple input for storage */}
                        <input className="w-full border p-2" value={settingsForm.address} onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSavingSettings}
                        className="bg-black text-white px-8 py-3 font-jura font-bold uppercase hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                        {isSavingSettings ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                </form>
            </div>
        )}

      </div>
    </div>
  );
};

export default ProfilePage;
