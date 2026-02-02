
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ShoppingCart, Package, Layers, Tag, Users, LogOut, Lock, AlertTriangle, Eye, EyeOff, UserPlus, ArrowRight, BarChart2, Monitor } from 'lucide-react';
import { useApp } from '../context';

// Import sub-components
import AdminOrders from '../components/admin/AdminOrders';
import AdminProducts from '../components/admin/AdminProducts';
import AdminCollections from '../components/admin/AdminCollections';
import AdminPromos from '../components/admin/AdminPromos';
import AdminUsers from '../components/admin/AdminUsers';
import AdminOverview from '../components/admin/AdminOverview';
import AdminCMS from '../components/admin/AdminCMS'; // NEW

// --- CONFIG: ALLOWED ADMIN EMAILS ---
const ALLOWED_ADMINS = ['vmersin2022@gmail.com']; 

const Admin: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'collections' | 'promocodes' | 'users' | 'cms'>('overview');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false); 
    });
    
    // 2. Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        if (session) setLoading(false); 
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    
    try {
        if (isRegistering) {
            if (!ALLOWED_ADMINS.includes(email.trim())) {
                throw new Error('ACCESS_DENIED: Этот Email не находится в списке разрешенных администраторов.');
            }
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { role: 'admin_init' } }
            });

            if (error) throw error;

            if (data.session) {
                window.location.reload(); 
            } else if (data.user) {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (!signInError) {
                    window.location.reload();
                } else {
                    setLoginError('Аккаунт создан! Пожалуйста, подтвердите почту или попробуйте войти.');
                    setIsRegistering(false);
                }
            }
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            
            if (data.user && !ALLOWED_ADMINS.includes(data.user.email || '')) {
                await supabase.auth.signOut();
                throw new Error('ACCESS_DENIED: Этот Email не имеет прав администратора.');
            }
        }

    } catch (err: any) {
        let msg = err.message;
        if (msg.includes('Invalid login credentials')) msg = 'Неверный логин или пароль.';
        if (msg.includes('Email not confirmed')) msg = 'Email не подтвержден. Проверьте почту.';
        if (msg.includes('User already registered')) {
            msg = 'Пользователь уже существует. Пожалуйста, войдите.';
            setIsRegistering(false);
        }
        setLoginError(msg);
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = async () => await supabase.auth.signOut();

  // Loading State
  if (loading && !session) return (
      <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center text-white font-mono gap-4">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          <span>SYSTEM_BOOT...</span>
      </div>
  );

  // --- ACCESS DENIED / LOGIN SCREEN ---
  const isAuthorized = session?.user?.email && ALLOWED_ADMINS.includes(session.user.email);

  if (!session || !isAuthorized) {
      return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
            <div className="bg-white border border-black p-8 w-full max-w-md shadow-2xl relative overflow-hidden transition-all">
                <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500 ${isRegistering ? 'bg-green-500' : 'bg-gradient-to-r from-blue-600 to-black'}`} />
                
                <div className="mb-8 text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 text-white mb-4 rounded-full transition-colors duration-500 ${isRegistering ? 'bg-green-600' : 'bg-black'}`}>
                        {isRegistering ? <UserPlus size={20} /> : <Lock size={20} />}
                    </div>
                    <h1 className="font-jura text-2xl font-bold uppercase">
                        {isRegistering ? 'РЕГИСТРАЦИЯ ADMIN' : 'ERP ВХОД'}
                    </h1>
                    <p className="font-mono text-xs text-zinc-500 mt-2">RESTRICTED AREA // AUTHORIZED PERSONNEL ONLY</p>
                </div>

                {loginError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 flex gap-3 items-start animate-fade-in">
                        <AlertTriangle className="text-red-500 shrink-0" size={18} />
                        <p className="text-xs font-mono text-red-700 leading-snug">{loginError}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block font-mono text-[10px] uppercase text-zinc-500 mb-1">System ID (Email)</label>
                        <input 
                            type="email" 
                            required
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="w-full border border-zinc-300 p-3 font-mono text-sm focus:border-blue-600 focus:outline-none transition-colors"
                            placeholder="admin@printproject.ru"
                        />
                    </div>
                    
                    <div>
                        <label className="block font-mono text-[10px] uppercase text-zinc-500 mb-1">Passcode</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                required
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="w-full border border-zinc-300 p-3 font-mono text-sm focus:border-blue-600 focus:outline-none transition-colors pr-10"
                                placeholder="••••••••"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full text-white font-jura font-bold uppercase py-4 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 ${isRegistering ? 'bg-green-600 hover:bg-green-700' : 'bg-black hover:bg-blue-900'}`}
                    >
                        {loading ? 'ОБРАБОТКА...' : (isRegistering ? 'СОЗДАТЬ И ВОЙТИ' : 'ВОЙТИ В СИСТЕМУ')}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
                    <button 
                        type="button"
                        onClick={() => { setIsRegistering(!isRegistering); setLoginError(null); }}
                        className="font-mono text-[10px] text-zinc-500 hover:text-black uppercase tracking-wider flex items-center justify-center gap-2 mx-auto group"
                    >
                        {isRegistering ? 'Уже есть аккаунт? Войти' : 'Первый вход? Создать администратора'}
                        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-12 relative">
      <div className="container mx-auto px-4">
        
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-8 border-b border-black pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-xs text-zinc-500">ADMIN: {session.user.email}</span>
            </div>
            <h1 className="font-jura text-4xl font-bold uppercase">ERP SYSTEM</h1>
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {[
                    { id: 'overview', label: 'ДАШБОРД', icon: BarChart2 },
                    { id: 'cms', label: 'ВИЗУАЛ (CMS)', icon: Monitor }, // NEW TAB
                    { id: 'orders', label: 'ЗАКАЗЫ', icon: ShoppingCart }, 
                    { id: 'products', label: 'СКЛАД', icon: Package },
                    { id: 'collections', label: 'КОЛЛЕКЦИИ', icon: Layers }, 
                    { id: 'promocodes', label: 'ПРОМО', icon: Tag },
                    { id: 'users', label: 'КЛИЕНТЫ', icon: Users } 
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 font-mono text-sm px-4 py-2 border border-black transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'}`}>
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>
          </div>
          <div className="flex gap-4 items-end flex-wrap">
             <button onClick={handleLogout} className="flex items-center gap-2 font-mono text-xs hover:text-red-600 transition-colors border border-zinc-300 px-3 py-1 h-8 bg-white"><LogOut size={14} /> ВЫЙТИ</button>
          </div>
        </div>

        {/* CONTENT TABS */}
        <div className="min-h-[500px]">
            {activeTab === 'overview' && <AdminOverview onChangeTab={setActiveTab} />}
            {activeTab === 'cms' && <AdminCMS />}
            {activeTab === 'orders' && <AdminOrders />}
            {activeTab === 'products' && <AdminProducts />}
            {activeTab === 'collections' && <AdminCollections />}
            {activeTab === 'promocodes' && <AdminPromos />}
            {activeTab === 'users' && <AdminUsers />}
        </div>

      </div>
    </div>
  );
};

export default Admin;
