import React, { useState } from 'react';
import { useApp } from '../context';
import FancyButton from '../components/ui/FancyButton';
import { LogOut, Package, Mail, Loader2, Clock, CheckCircle, Lock, ArrowRight, Zap, AlertTriangle } from 'lucide-react';
import { Order } from '../types';

const ProfilePage: React.FC = () => {
  const { user, isSessionLoading, userOrders, loginWithMagicLink, loginWithPassword, signupWithPassword, loginWithGoogle, logout } = useApp();
  
  // Auth Modes: 'login', 'register', 'magic'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'magic'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // --- HANDLERS ---

  const handleGoogleLogin = async () => {
      setLoading(true);
      const { error } = await loginWithGoogle();
      if (error) setMessage({ type: 'error', text: error.message });
      // Redirect happens automatically
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) return;
      setMessage(null);
      setLoading(true);

      try {
          if (authMode === 'magic') {
              const { error } = await loginWithMagicLink(email);
              if (error) throw error;
              setMessage({ type: 'success', text: `Ссылка отправлена на ${email}. Проверьте почту (и спам).` });
          } 
          else if (authMode === 'login') {
              if (!password) { setMessage({type: 'error', text: 'Введите пароль'}); setLoading(false); return; }
              const { error } = await loginWithPassword(email, password);
              if (error) {
                 if (error.message.includes('Invalid login credentials')) {
                     throw new Error('Неверный Email или пароль (или почта не подтверждена).');
                 }
                 throw error;
              }
              // Success handled by global state
          } 
          else if (authMode === 'register') {
              if (!password) { setMessage({type: 'error', text: 'Придумайте пароль'}); setLoading(false); return; }
              if (password.length < 6) { setMessage({type: 'error', text: 'Пароль слишком короткий (минимум 6 символов)'}); setLoading(false); return; }
              
              const { data, error } = await signupWithPassword(email, password);
              
              if (error) {
                  // LOGGING ERROR FOR DEBUGGING
                  console.error("SIGNUP ERROR:", error);
                  throw error; 
              }
              
              // INTELLIGENT REGISTRATION CHECK:
              if (data?.session) {
                  // User is already logged in
              } else if (data?.user) {
                  // Session is null but user created -> Email confirmation is ON.
                  setMessage({ type: 'success', text: `АККАУНТ СОЗДАН! МЫ ОТПРАВИЛИ ССЫЛКУ НА ${email.toUpperCase()}. ПОДТВЕРДИТЕ ЕЁ ДЛЯ ВХОДА.` });
              }
          }
      } catch (error: any) {
          let msg = error.message || 'Ошибка авторизации';
          let fullError = JSON.stringify(error);
          
          // --- CUSTOM ERROR TRANSLATION ---
          if (msg.includes('User already registered') || msg.includes('already registered')) {
              msg = 'Пользователь с таким Email уже зарегистрирован. Пожалуйста, войдите.';
          } else if (msg.includes('Email not confirmed') || msg.includes('not confirmed')) {
              msg = 'Почта не подтверждена. Проверьте входящие письма.';
          } else if (msg.includes('rate limit') || msg.includes('Too many requests')) {
              msg = 'Слишком много попыток. Подождите 60 секунд.';
          } else if (msg.includes('security purposes')) {
              msg = 'В целях безопасности подождите перед повторной попыткой.';
          }
          
          // Show technical details if it's an unknown error to help debug "no record" issues
          if (!msg.includes('Пользователь') && !msg.includes('Почта')) {
              console.warn("Supabase Raw Error:", error);
          }

          setMessage({ type: 'error', text: msg });
      } finally {
          setLoading(false);
      }
  };

  const getStatusBadge = (status: Order['status']) => {
      const styles = {
          'new': 'bg-blue-100 text-blue-800 border-blue-200',
          'paid': 'bg-green-100 text-green-800 border-green-200',
          'shipping': 'bg-yellow-100 text-yellow-800 border-yellow-200',
          'completed': 'bg-zinc-100 text-zinc-800 border-zinc-200',
          'cancelled': 'bg-red-100 text-red-800 border-red-200'
      };
      return (
          <span className={`px-2 py-1 text-[10px] font-mono uppercase border rounded ${styles[status]}`}>
              {status}
          </span>
      );
  };

  // --- 0. CHECKING SESSION LOADING ---
  if (isSessionLoading) {
      return (
          <div className="min-h-screen pt-24 pb-12 bg-white flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
              <p className="font-mono text-xs text-zinc-400 uppercase">ПРОВЕРКА ДОСТУПА...</p>
          </div>
      );
  }

  // --- 1. GUEST VIEW (LOGIN/REGISTER) ---
  if (!user) {
      return (
        <div className="min-h-screen pt-24 pb-12 bg-white flex flex-col items-center justify-center">
            <div className="container mx-auto px-4 max-w-md w-full">
                
                <div className="text-center mb-8">
                    <h1 className="font-jura text-4xl font-bold uppercase mb-2">ACCESS_POINT</h1>
                    <p className="font-mono text-xs text-zinc-500">IDENTIFICATION_REQUIRED</p>
                </div>

                <div className="bg-zinc-50 border border-black p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
                    
                    {/* FAST LOGIN BUTTON */}
                    <button 
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full bg-white border border-zinc-300 hover:border-blue-600 hover:text-blue-600 text-zinc-800 font-jura font-bold py-3 px-4 flex items-center justify-center gap-3 transition-all mb-6"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        ВОЙТИ ЧЕРЕЗ GOOGLE
                    </button>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-px bg-zinc-300 flex-1"></div>
                        <span className="font-mono text-[10px] text-zinc-400 uppercase">ИЛИ EMAIL</span>
                        <div className="h-px bg-zinc-300 flex-1"></div>
                    </div>

                    {/* MODE TABS */}
                    {authMode !== 'magic' && (
                        <div className="flex mb-6 border-b border-zinc-200">
                            <button 
                                onClick={() => { setAuthMode('login'); setMessage(null); }}
                                className={`flex-1 pb-2 text-center font-jura font-bold uppercase text-sm ${authMode === 'login' ? 'text-black border-b-2 border-black' : 'text-zinc-400'}`}
                            >
                                Вход
                            </button>
                            <button 
                                onClick={() => { setAuthMode('register'); setMessage(null); }}
                                className={`flex-1 pb-2 text-center font-jura font-bold uppercase text-sm ${authMode === 'register' ? 'text-black border-b-2 border-black' : 'text-zinc-400'}`}
                            >
                                Регистрация
                            </button>
                        </div>
                    )}

                    {authMode === 'magic' && (
                        <div className="mb-4">
                             <button onClick={() => setAuthMode('login')} className="text-xs font-mono text-zinc-500 hover:text-black flex items-center gap-1 mb-4">
                                &larr; Вернуться к паролю
                             </button>
                             <h3 className="font-jura font-bold uppercase text-lg mb-2">Magic Link</h3>
                             <p className="text-xs text-zinc-500 mb-4 font-montserrat">
                                Введите почту, и мы пришлем одноразовую ссылку для входа без пароля.
                             </p>
                        </div>
                    )}

                    {/* STATUS MESSAGE */}
                    {message && (
                        <div className={`p-4 mb-4 text-xs font-mono border flex items-start gap-2 ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                            {message.type === 'error' && <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                            {message.type === 'success' && <CheckCircle size={16} className="shrink-0 mt-0.5" />}
                            <div>{message.text}</div>
                        </div>
                    )}

                    {/* FORM */}
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                            <input 
                                type="email" 
                                placeholder="E-MAIL" 
                                className="w-full bg-white border border-zinc-300 pl-10 pr-4 py-3 font-mono text-sm focus:outline-none focus:border-blue-600 uppercase transition-colors"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {authMode !== 'magic' && (
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                                <input 
                                    type="password" 
                                    placeholder="ПАРОЛЬ" 
                                    className="w-full bg-white border border-zinc-300 pl-10 pr-4 py-3 font-mono text-sm focus:outline-none focus:border-blue-600 uppercase transition-colors"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <FancyButton type="submit" fullWidth variant="solid" className={loading ? 'opacity-70' : ''}>
                            {loading ? <Loader2 className="animate-spin w-5 h-5"/> : (
                                authMode === 'login' ? 'ВОЙТИ' : 
                                authMode === 'register' ? 'СОЗДАТЬ АККАУНТ' : 
                                'ОТПРАВИТЬ ССЫЛКУ'
                            )}
                        </FancyButton>
                    </form>

                    {/* FOOTER LINKS */}
                    {authMode === 'login' && (
                        <div className="mt-4 text-center">
                            <button 
                                onClick={() => setAuthMode('magic')}
                                className="text-[10px] font-mono uppercase text-zinc-400 hover:text-blue-600 border-b border-transparent hover:border-blue-600 transition-colors"
                            >
                                ЗАБЫЛИ ПАРОЛЬ? / ВОЙТИ ПО ССЫЛКЕ
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  }

  // --- 2. USER VIEW (PROFILE) ---
  return (
    <div className="min-h-screen pt-24 pb-12 bg-white">
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Header */}
        <div className="mb-12 border-b border-black pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h1 className="font-jura text-4xl md:text-5xl font-bold uppercase mb-2">Личный Кабинет</h1>
                <div className="flex items-center gap-2 font-mono text-sm text-zinc-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    ID: {user.email?.toUpperCase()}
                </div>
            </div>
            <button 
                onClick={logout} 
                className="flex items-center gap-2 text-xs font-mono uppercase border border-zinc-300 px-4 py-2 hover:bg-black hover:text-white transition-colors"
            >
                <LogOut size={14} /> Выйти из системы
            </button>
        </div>

        {/* Content */}
        <div className="grid gap-12">
            
            {/* Orders Section */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <Package className="w-6 h-6 text-blue-900" />
                    <h2 className="font-jura text-2xl font-bold uppercase">История Заказов</h2>
                </div>

                {userOrders.length === 0 ? (
                    <div className="border-2 border-dashed border-zinc-200 p-12 text-center">
                        <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                        <p className="font-jura text-lg text-zinc-400 uppercase">История пуста</p>
                        <p className="font-mono text-xs text-zinc-400 mt-2">
                            Если вы делали заказы ранее с этой почты, они должны отобразиться здесь.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {userOrders.map(order => (
                            <div key={order.id} className="border border-zinc-200 p-6 hover:border-blue-900 transition-colors bg-zinc-50/50">
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 border-b border-zinc-200 pb-4">
                                    <div>
                                        <div className="font-mono text-xs text-zinc-500 mb-1">
                                            {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString().slice(0,5)}
                                        </div>
                                        <div className="font-bold font-jura text-lg">ORDER #{order.id.slice(0,8).toUpperCase()}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-bold font-jura text-lg">{order.total_price.toLocaleString()} ₽</div>
                                            <div className="text-[10px] font-mono text-zinc-500">{order.payment_method.toUpperCase()}</div>
                                        </div>
                                        {getStatusBadge(order.status)}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {order.order_items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm font-montserrat">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{item.name}</span>
                                                <span className="text-zinc-500 text-xs">/ {item.selectedSize} / x{item.quantity}</span>
                                            </div>
                                            <span className="font-mono text-xs">{item.price.toLocaleString()} ₽</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Delivery Info */}
                                <div className="mt-4 pt-4 border-t border-dashed border-zinc-300 flex justify-between items-center text-xs font-mono text-zinc-500">
                                    <span>
                                        DELIVERY: {order.customer_info.city}, {order.customer_info.address}
                                    </span>
                                    {order.status === 'shipping' && (
                                        <span className="text-blue-600 font-bold">TRACK: PREPARING...</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;