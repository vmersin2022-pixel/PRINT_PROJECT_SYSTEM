
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { UserProfile, Order } from '../../types';
import { Search, Mail, User, Shield, RefreshCcw, Send, Save, X, Phone, StickyNote, Ban, CheckCircle, Star, Flame, Snowflake, Gem, HeartHandshake } from 'lucide-react';

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    // CRM State
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [userOrders, setUserOrders] = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    
    // Edit Form
    const [noteText, setNoteText] = useState('');
    const [points, setPoints] = useState<number>(0);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isSavingPoints, setIsSavingPoints] = useState(false);

    // CHANGED: Fetch from View 'customer_segments' instead of Table 'profiles'
    const fetchUsers = async () => {
        setLoading(true);
        setErrorMsg(null);
        
        try {
            // Try fetching from the VIEW first
            const { data, error } = await supabase
                .from('customer_segments') // USE VIEW
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                // If view doesn't exist (404/PGRST error), likely user didn't run SQL.
                console.error("View Fetch Error:", error);
                throw new Error("Не удалось загрузить сегменты клиентов. Убедитесь, что SQL View 'customer_segments' создан в Supabase.");
            }

            if (data) {
                setUsers(data as UserProfile[]);
            }
        } catch (e: any) {
            console.error("CRM Load Error:", e);
            setErrorMsg(e.message);
            
            // FALLBACK: Try fetching raw profiles if view fails, so admin isn't empty
            const { data: profiles } = await supabase.from('profiles').select('*');
            if (profiles) {
                setUsers(profiles as UserProfile[]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // --- FETCH USER DETAILS ---
    const handleUserClick = async (user: UserProfile) => {
        setSelectedUser(user);
        setNoteText(user.notes || '');
        setPoints(user.loyalty_points || 0);
        setOrdersLoading(true);
        
        try {
            let query = supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (user.email) {
                query = query.or(`user_id.eq.${user.id},customer_info->>email.eq.${user.email}`);
            } else {
                query = query.eq('user_id', user.id);
            }

            const { data, error } = await query;
            if (!error && data) {
                setUserOrders(data as Order[]);
            }
        } catch (e) {
            console.error("Orders fetch error", e);
        } finally {
            setOrdersLoading(false);
        }
    };

    const handleSaveNote = async () => {
        if (!selectedUser) return;
        setIsSavingNote(true);
        try {
            // Update the ACTUAL TABLE, not the view
            const { error } = await supabase
                .from('profiles')
                .update({ notes: noteText })
                .eq('id', selectedUser.id);
            
            if (error) throw error;
            
            // Update local state
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, notes: noteText } : u));
            setSelectedUser(prev => prev ? { ...prev, notes: noteText } : null);
        } catch (e: any) {
            alert('Ошибка сохранения: ' + e.message);
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleSavePoints = async () => {
        if (!selectedUser) return;
        setIsSavingPoints(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ loyalty_points: points })
                .eq('id', selectedUser.id);
            
            if (error) throw error;
            
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, loyalty_points: points } : u));
            setSelectedUser(prev => prev ? { ...prev, loyalty_points: points } : null);
            alert('Бонусы обновлены');
        } catch (e: any) {
            alert('Ошибка: ' + e.message);
        } finally {
            setIsSavingPoints(false);
        }
    };

    const toggleBlockUser = async () => {
        if (!selectedUser) return;
        const newState = !selectedUser.is_blocked;
        if (!confirm(newState ? 'Заблокировать пользователя?' : 'Разблокировать пользователя?')) return;

        try {
            const { error } = await supabase.from('profiles').update({ is_blocked: newState }).eq('id', selectedUser.id);
            if (error) throw error;
            
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, is_blocked: newState } : u));
            setSelectedUser(prev => prev ? { ...prev, is_blocked: newState } : null);
        } catch (e: any) {
            alert('Ошибка: ' + e.message);
        }
    };

    const handleWinBack = (user: UserProfile) => {
        const text = `Привет, ${user.full_name || 'друг'}! 👋\n\nДавно не виделись. Заметили, что ты не заходил к нам уже пару месяцев. Твой размер еще есть в наличии.\n\nДержи секретный промокод на возвращение: COMEBACK15`;
        // Check if TG ID exists
        if (user.telegram_id) {
            window.open(`tg://user?id=${user.telegram_id}&text=${encodeURIComponent(text)}`, '_blank');
        } else if (user.email) {
            window.open(`mailto:${user.email}?subject=We Miss You&body=${encodeURIComponent(text)}`);
        } else {
            alert('Нет контактов для связи');
        }
    };

    // --- SEGMENT BADGE RENDERER ---
    const renderSegmentBadge = (segment: string | undefined) => {
        switch(segment) {
            case 'whale':
                return <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold font-mono border border-purple-200"><Gem size={12}/> WHALE</span>;
            case 'hot':
                return <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold font-mono border border-orange-200"><Flame size={12}/> HOT</span>;
            case 'churn':
                return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold font-mono border border-blue-200"><Snowflake size={12}/> CHURN</span>;
            case 'new':
                return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold font-mono border border-green-200">NEW</span>;
            default:
                return <span className="text-zinc-400 text-[10px] font-mono">REGULAR</span>;
        }
    };

    // --- CALCULATE STATS ---
    const totalSpent = userOrders.reduce((acc, o) => acc + (o.status !== 'cancelled' ? o.total_price : 0), 0);
    const avgOrder = userOrders.length > 0 ? Math.round(totalSpent / userOrders.length) : 0;

    const filtered = users.filter(u => 
        (u.email?.toLowerCase().includes(search.toLowerCase())) || 
        (u.full_name?.toLowerCase().includes(search.toLowerCase())) ||
        (u.telegram_id?.toString().includes(search))
    );

    return (
        <div className="space-y-6 relative h-full min-h-[600px]">
             <div className="flex justify-between items-center bg-white p-4 border border-zinc-200">
                <div className="flex items-center gap-4">
                     <h2 className="font-jura text-xl font-bold uppercase">КЛИЕНТЫ ({users.length})</h2>
                     <button onClick={fetchUsers} className="p-2 border hover:bg-zinc-100"><RefreshCcw size={16}/></button>
                </div>
                <div className="relative w-64">
                    <input 
                        placeholder="ПОИСК (EMAIL / ИМЯ)..." 
                        className="w-full pl-9 pr-4 py-2 border border-zinc-300 font-mono text-xs uppercase focus:border-blue-600 outline-none"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14}/>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-red-50 border border-red-200 p-4 text-xs font-mono text-red-700">
                    <strong>ВНИМАНИЕ:</strong> {errorMsg}
                </div>
            )}

            <div className="bg-white border border-black overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-zinc-100 font-mono text-xs uppercase text-zinc-500 border-b border-zinc-200">
                        <tr>
                            <th className="p-4">ПОЛЬЗОВАТЕЛЬ</th>
                            <th className="p-4 text-center">СТАТУС (CRM)</th>
                            <th className="p-4 text-center">LTV (РУБ)</th>
                            <th className="p-4 text-center">ЗАМЕТКА</th>
                            <th className="p-4 text-right">ПОСЛЕДНИЙ ЗАКАЗ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-zinc-400">Загрузка данных...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-zinc-400">Клиенты не найдены</td></tr>
                        ) : (
                            filtered.map(u => (
                                <tr 
                                    key={u.id} 
                                    onClick={() => handleUserClick(u)}
                                    className={`cursor-pointer transition-colors ${selectedUser?.id === u.id ? 'bg-blue-50' : 'hover:bg-zinc-50'} ${u.is_blocked ? 'opacity-50 grayscale' : ''}`}
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-200 relative">
                                                {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : <User size={18} className="text-zinc-400"/>}
                                                {u.is_blocked && <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center"><Ban size={16} className="text-white"/></div>}
                                            </div>
                                            <div>
                                                <div className="font-bold flex items-center gap-2">
                                                    {u.full_name || 'Без имени'}
                                                    {u.role === 'admin' && <Shield size={12} className="text-blue-600"/>}
                                                </div>
                                                <div className="font-mono text-xs text-zinc-400 flex items-center gap-1"><Mail size={10}/> {u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            {renderSegmentBadge(u.segment)}
                                            {u.segment === 'churn' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleWinBack(u); }}
                                                    className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                                >
                                                    <HeartHandshake size={10}/> ВЕРНУТЬ
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center font-mono">
                                        {u.total_spent ? u.total_spent.toLocaleString() : 0} ₽
                                    </td>
                                    <td className="p-4 text-center">
                                        {u.notes && <StickyNote size={16} className="text-yellow-500 inline fill-yellow-100"/>}
                                    </td>
                                    <td className="p-4 text-right font-mono text-xs text-zinc-500">
                                        {u.last_order_date ? new Date(u.last_order_date).toLocaleDateString() : '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- CRM DRAWER --- */}
            <div className={`fixed inset-0 z-[100] transition-all duration-300 pointer-events-none ${selectedUser ? 'bg-black/20' : ''}`}>
                <div className={`absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl border-l border-black transform transition-transform duration-300 pointer-events-auto flex flex-col ${selectedUser ? 'translate-x-0' : 'translate-x-full'}`}>
                    
                    {selectedUser && (
                        <>
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-black flex justify-between items-start bg-zinc-50">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-white border border-zinc-300 overflow-hidden">
                                    {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover"/> : <User className="w-full h-full p-4 text-zinc-300"/>}
                                </div>
                                <div>
                                    <h2 className="font-jura text-xl font-bold uppercase">{selectedUser.full_name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        {renderSegmentBadge(selectedUser.segment)}
                                        {selectedUser.is_blocked && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 font-bold uppercase">BLOCKED</span>}
                                        <span className="text-[10px] font-mono text-zinc-400">ID: {selectedUser.id.slice(0,6)}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="hover:rotate-90 transition-transform p-2"><X size={24}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-50/50">
                            
                            {/* 1. KEY METRICS (LTV) */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white p-4 border border-zinc-200 shadow-sm text-center">
                                    <div className="text-[10px] font-mono text-zinc-400 uppercase mb-1">Всего покупок (LTV)</div>
                                    <div className="text-lg font-bold font-jura text-blue-900">{selectedUser.total_spent?.toLocaleString()} ₽</div>
                                </div>
                                <div className="bg-white p-4 border border-zinc-200 shadow-sm text-center">
                                    <div className="text-[10px] font-mono text-zinc-400 uppercase mb-1">Заказов</div>
                                    <div className="text-lg font-bold font-jura">{selectedUser.orders_count || 0}</div>
                                </div>
                                <div className="bg-white p-4 border border-zinc-200 shadow-sm text-center">
                                    <div className="text-[10px] font-mono text-zinc-400 uppercase mb-1">Средний чек</div>
                                    <div className="text-lg font-bold font-jura text-zinc-600">
                                        {(selectedUser.orders_count && selectedUser.total_spent) ? Math.round(selectedUser.total_spent / selectedUser.orders_count).toLocaleString() : 0} ₽
                                    </div>
                                </div>
                            </div>

                            {/* BONUS SYSTEM EDIT */}
                            <div className="bg-black text-white p-4 flex items-center justify-between shadow-lg">
                                <div className="flex items-center gap-2 text-yellow-400">
                                    <Star className="fill-yellow-400 text-yellow-400" size={20}/>
                                    <span className="font-jura font-bold uppercase">Бонусный счет</span>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="number"
                                        value={points}
                                        onChange={e => setPoints(parseInt(e.target.value) || 0)}
                                        className="w-24 bg-zinc-800 border border-zinc-700 p-1 text-center font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                                    />
                                    <button 
                                        onClick={handleSavePoints}
                                        disabled={isSavingPoints}
                                        className="bg-white text-black px-3 py-1 font-bold font-mono text-xs uppercase hover:bg-blue-600 hover:text-white transition-colors"
                                    >
                                        {isSavingPoints ? '...' : 'SAVE'}
                                    </button>
                                </div>
                            </div>

                            {/* 2. ADMIN NOTES */}
                            <div className="bg-yellow-50 border border-yellow-200 p-4">
                                <h3 className="font-bold text-xs uppercase mb-2 flex items-center gap-2 text-yellow-800">
                                    <StickyNote size={14}/> Заметки администратора
                                </h3>
                                <textarea 
                                    className="w-full bg-white border border-yellow-200 p-3 text-sm font-mono focus:outline-none focus:border-yellow-500 min-h-[80px]"
                                    placeholder="Особые пометки о клиенте..."
                                    value={noteText}
                                    onChange={e => setNoteText(e.target.value)}
                                />
                                <div className="mt-2 flex justify-end">
                                    <button 
                                        onClick={handleSaveNote}
                                        disabled={isSavingNote}
                                        className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 font-bold uppercase transition-colors flex items-center gap-2"
                                    >
                                        {isSavingNote ? 'Сохранение...' : <><Save size={12}/> Сохранить</>}
                                    </button>
                                </div>
                            </div>

                            {/* 3. CONTACT INFO */}
                            <div>
                                <h3 className="font-bold text-sm uppercase mb-4 text-zinc-400 border-b pb-2">Контакты</h3>
                                <div className="space-y-3 text-sm font-mono">
                                    <div className="flex items-center justify-between group">
                                        <span className="text-zinc-500 flex items-center gap-2"><Mail size={14}/> Email</span>
                                        <div className="flex items-center gap-2">
                                            <span className="select-all">{selectedUser.email}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-zinc-500 flex items-center gap-2"><Phone size={14}/> Телефон</span>
                                        <span>{userOrders[0]?.customer_info.phone || selectedUser.phone || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-zinc-500 flex items-center gap-2"><Send size={14}/> Telegram</span>
                                        {selectedUser.telegram_id ? (
                                            <a href={`tg://user?id=${selectedUser.telegram_id}`} className="text-blue-600 hover:underline cursor-pointer font-bold">
                                                ОТКРЫТЬ ЧАТ
                                            </a>
                                        ) : (
                                            <span className="text-zinc-300">НЕ ПРИВЯЗАН</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 4. ORDERS HISTORY */}
                            <div>
                                <h3 className="font-bold text-sm uppercase mb-4 text-zinc-400 border-b pb-2 flex justify-between">
                                    <span>История заказов</span>
                                    {ordersLoading && <RefreshCcw className="animate-spin" size={14}/>}
                                </h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {userOrders.length === 0 ? (
                                        <p className="text-xs text-zinc-400 font-mono text-center py-4">Нет заказов</p>
                                    ) : (
                                        userOrders.map(order => (
                                            <div key={order.id} className="bg-white border border-zinc-200 p-3 hover:border-blue-400 transition-colors">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold font-jura text-sm">#{order.id.slice(0,6)}</span>
                                                    <span className="font-mono text-xs text-zinc-400">{new Date(order.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <div className="text-[10px] text-zinc-500 font-mono max-w-[150px] truncate">
                                                        {order.order_items.map(i => i.name).join(', ')}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-sm">{order.total_price} ₽</div>
                                                        <span className={`text-[9px] uppercase px-1 rounded ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-black bg-zinc-50 flex gap-4">
                            <button 
                                onClick={toggleBlockUser}
                                className={`flex-1 py-3 text-xs font-bold uppercase border flex items-center justify-center gap-2 transition-colors ${selectedUser.is_blocked ? 'border-green-600 text-green-600 hover:bg-green-50' : 'border-red-600 text-red-600 hover:bg-red-50'}`}
                            >
                                {selectedUser.is_blocked ? <><CheckCircle size={14}/> Разблокировать</> : <><Ban size={14}/> Заблокировать</>}
                            </button>
                        </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
