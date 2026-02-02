
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { PromoCode } from '../../types';
import { Plus, Trash2, Save, Loader2, ToggleLeft, ToggleRight, X, RefreshCcw, Users, DollarSign, Repeat, Info } from 'lucide-react';

const AdminPromos: React.FC = () => {
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false); 
    
    // Editor
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        value: '10',
        type: 'percent' as 'percent' | 'fixed',
        usage_limit: '',
        min_order_amount: '',
        target_audience: 'all' as 'all' | 'vip_only' | 'new_users'
    });

    const fetchPromos = async () => {
        setLoading(true);
        // Fetch raw data without server-side sorting to avoid errors if created_at is missing
        const { data, error } = await supabase.from('promocodes').select('*');
        
        if (error) {
            console.error("Promo Fetch Error:", error);
            alert('Ошибка загрузки списка: ' + error.message);
        } 
        
        if (data) {
            // Client-side sort (Safely handles missing created_at)
            const sorted = (data as any[]).sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA; // Newest first
            });
            setPromos(sorted as PromoCode[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPromos();
    }, []);

    const handleError = (e: any) => {
        console.error(e);
        if (e.message?.includes('row-level security') || e.code === '42501') {
            alert('⛔ ОШИБКА ДОСТУПА (RLS)\n\nSupabase блокирует сохранение.\n1. Зайдите в Supabase -> Table Editor -> promocodes\n2. Нажмите "RLS Active" -> "Disable RLS"');
        } else {
            alert('Ошибка: ' + e.message);
        }
    };

    const handleToggle = async (id: string, current: boolean) => {
        try {
            const { error } = await supabase.from('promocodes').update({ is_active: !current }).eq('id', id);
            if (error) throw error;
            // Update local state immediately for speed
            setPromos(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
        } catch (e: any) {
            handleError(e);
            fetchPromos(); // Revert on error
        }
    };

    const handleDelete = async (id: string) => {
        if(!confirm('Удалить промокод?')) return;
        try {
            const { error } = await supabase.from('promocodes').delete().eq('id', id);
            if (error) throw error;
            setPromos(prev => prev.filter(p => p.id !== id));
        } catch (e: any) {
            handleError(e);
        }
    };

    const handleSave = async () => {
        if (!formData.code) return alert('Введите код (например: SALE10)');
        if (!formData.value) return alert('Введите размер скидки');
        
        setSaving(true);
        try {
            const val = parseInt(formData.value);
            if (isNaN(val) || val <= 0) throw new Error('Скидка должна быть целым положительным числом');

            const payload = {
                code: formData.code.toUpperCase().trim(),
                discount_value: val,
                discount_type: formData.type,
                is_active: true,
                usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
                min_order_amount: formData.min_order_amount ? parseInt(formData.min_order_amount) : 0,
                target_audience: formData.target_audience
            };
            
            const { error } = await supabase.from('promocodes').insert([payload]);
            if (error) throw error;
            
            setIsEditorOpen(false);
            // Reset Form
            setFormData({ code: '', value: '10', type: 'percent', usage_limit: '', min_order_amount: '', target_audience: 'all' });
            fetchPromos();
        } catch (e: any) {
            handleError(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative">
             <div className="flex justify-between items-center mb-6 bg-white p-4 border border-zinc-200">
                <div className="flex items-center gap-4">
                    <h2 className="font-jura text-xl font-bold uppercase">ПРОМОКОДЫ 2.0 ({promos.length})</h2>
                    <button onClick={fetchPromos} className="p-2 border hover:bg-zinc-100 transition-colors" title="Обновить список">
                        <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
                <button onClick={() => setIsEditorOpen(true)} className="flex items-center gap-2 bg-black text-white px-6 py-2 font-jura font-bold uppercase hover:bg-blue-600 transition-colors">
                    <Plus size={18} /> Создать
                </button>
            </div>

            <div className="bg-white border border-black overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-zinc-100 font-mono text-xs uppercase text-zinc-500 border-b border-zinc-200">
                        <tr>
                            <th className="p-4">КОД</th>
                            <th className="p-4">СКИДКА</th>
                            <th className="p-4">УСЛОВИЯ</th>
                            <th className="p-4 text-center">ИСПОЛЬЗОВАНО</th>
                            <th className="p-4 text-center">СТАТУС</th>
                            <th className="p-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm">
                        {loading && promos.length === 0 ? (
                             <tr><td colSpan={6} className="p-8 text-center text-zinc-400">Загрузка...</td></tr>
                        ) : promos.length === 0 ? (
                             <tr><td colSpan={6} className="p-8 text-center text-zinc-400">Нет активных промокодов</td></tr>
                        ) : (
                            promos.map(p => (
                                <tr key={p.id} className="hover:bg-zinc-50">
                                    <td className="p-4 font-bold font-mono text-blue-900">{p.code}</td>
                                    <td className="p-4 font-bold">
                                        {p.discount_value} {p.discount_type === 'fixed' ? '₽' : '%'}
                                        {p.min_order_amount > 0 && <div className="text-[10px] text-zinc-400 font-mono">от {p.min_order_amount}₽</div>}
                                    </td>
                                    <td className="p-4 font-mono text-xs text-zinc-500">
                                        {p.target_audience === 'all' && 'ВСЕ'}
                                        {p.target_audience === 'vip_only' && <span className="text-purple-600 font-bold">VIP ONLY</span>}
                                        {p.target_audience === 'new_users' && <span className="text-green-600 font-bold">NEW USERS</span>}
                                    </td>
                                    <td className="p-4 text-center font-mono text-xs">
                                        {p.usage_count}
                                        {p.usage_limit ? ` / ${p.usage_limit}` : ' / ∞'}
                                        {p.usage_limit && p.usage_count >= p.usage_limit && (
                                            <span className="block text-[9px] text-red-500 font-bold">LIMIT REACHED</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleToggle(p.id, p.is_active)} className={`transition-colors ${p.is_active ? 'text-green-600' : 'text-zinc-300'}`}>
                                            {p.is_active ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleDelete(p.id)} className="text-zinc-300 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* CREATE MODAL */}
            {isEditorOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md p-6 border border-black shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-jura font-bold uppercase text-lg">НОВЫЙ ПРОМОКОД</h3>
                            <button onClick={() => setIsEditorOpen(false)}><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-6">
                            
                            {/* BASIC */}
                            <div className="space-y-4 border-b border-zinc-100 pb-4">
                                <h4 className="font-bold text-xs uppercase text-zinc-400">1. Основное</h4>
                                <div>
                                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Код (Латиница)</label>
                                    <input 
                                        className="w-full border border-black p-3 font-mono font-bold uppercase text-center focus:bg-blue-50 outline-none"
                                        placeholder="SALE2024"
                                        value={formData.code}
                                        onChange={e => setFormData({...formData, code: e.target.value.replace(/[^a-zA-Z0-9]/g, '')})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Значение</label>
                                        <input 
                                            type="number"
                                            className="w-full border border-zinc-300 p-3 font-mono text-center focus:border-black outline-none"
                                            value={formData.value}
                                            onChange={e => setFormData({...formData, value: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Тип</label>
                                        <select 
                                            className="w-full border border-zinc-300 p-3 font-mono text-sm bg-white focus:border-black outline-none"
                                            value={formData.type}
                                            onChange={e => setFormData({...formData, type: e.target.value as any})}
                                        >
                                            <option value="percent">% Процент</option>
                                            <option value="fixed">₽ Фикс</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* RESTRICTIONS */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-xs uppercase text-zinc-400">2. Ограничения</h4>
                                
                                <div>
                                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1 flex items-center gap-1"><Repeat size={12}/> Лимит использований</label>
                                    <input 
                                        type="number"
                                        placeholder="Пусто = Безлимит"
                                        className="w-full border border-zinc-300 p-3 font-mono text-sm focus:border-black outline-none"
                                        value={formData.usage_limit}
                                        onChange={e => setFormData({...formData, usage_limit: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1 flex items-center gap-1"><DollarSign size={12}/> Мин. сумма заказа (RUB)</label>
                                    <input 
                                        type="number"
                                        placeholder="0"
                                        className="w-full border border-zinc-300 p-3 font-mono text-sm focus:border-black outline-none"
                                        value={formData.min_order_amount}
                                        onChange={e => setFormData({...formData, min_order_amount: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1 flex items-center gap-1"><Users size={12}/> Аудитория</label>
                                    <select 
                                        className="w-full border border-zinc-300 p-3 font-mono text-sm bg-white focus:border-black outline-none"
                                        value={formData.target_audience}
                                        onChange={e => setFormData({...formData, target_audience: e.target.value as any})}
                                    >
                                        <option value="all">Для всех</option>
                                        <option value="vip_only">Только VIP (Сумма покупок {'>'} 10k)</option>
                                        <option value="new_users">Только новые (Нет заказов)</option>
                                    </select>
                                </div>
                            </div>

                        </div>

                        <button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="w-full mt-8 bg-black text-white py-3 font-jura font-bold uppercase hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                            {saving ? 'СОХРАНЕНИЕ...' : 'СОЗДАТЬ ПРОМОКОД'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPromos;
