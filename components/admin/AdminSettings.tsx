
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context';
import { Save, Loader2, Crown, ShieldCheck, Settings } from 'lucide-react';

const AdminSettings: React.FC = () => {
    const { siteConfig, updateSiteConfig } = useApp();
    const [threshold, setThreshold] = useState(15000);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (siteConfig) {
            setThreshold(siteConfig.vip_threshold || 15000);
        }
    }, [siteConfig]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateSiteConfig({ vip_threshold: threshold });
            alert('Настройки системы успешно обновлены.');
        } catch (e: any) {
            alert('Ошибка сохранения: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-blur-in">
            <div className="bg-white border border-black p-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                    <Settings size={200} />
                </div>

                <div className="flex items-center gap-4 mb-8 border-b border-black pb-4">
                    <div className="bg-black text-white p-3">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h2 className="font-jura text-2xl font-bold uppercase">Глобальные настройки</h2>
                        <p className="font-mono text-xs text-zinc-500">SYSTEM_CONFIG_V.1.0</p>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* VIP CONFIG SECTION */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Crown className="text-purple-600" size={20} />
                            <h3 className="font-jura font-bold text-lg uppercase">VIP Программа (Whale Status)</h3>
                        </div>
                        
                        <div className="bg-purple-50/50 border border-purple-100 p-6 rounded-lg relative">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex-1">
                                    <label className="block text-xs font-mono text-zinc-500 mb-2 uppercase tracking-wider">
                                        Порог входа (Сумма выкупа LTV)
                                    </label>
                                    <p className="text-sm text-zinc-600 mb-4 max-w-md">
                                        Пользователи, чья сумма выкупленных заказов превышает это значение, автоматически получают статус <strong>WHALE</strong> и доступ к закрытым дропам (Lock).
                                    </p>
                                </div>
                                <div className="bg-white border border-purple-200 p-4 rounded shadow-sm text-center min-w-[200px]">
                                    <div className="font-jura font-bold text-3xl text-purple-900">
                                        {threshold.toLocaleString()} ₽
                                    </div>
                                    <div className="text-[10px] font-mono text-purple-400 mt-1 uppercase">Текущее значение</div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100000" 
                                    step="1000" 
                                    value={threshold}
                                    onChange={(e) => setThreshold(Number(e.target.value))}
                                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-purple-900"
                                />
                                <div className="flex justify-between text-[10px] font-mono text-zinc-400 mt-2 uppercase">
                                    <span>0 ₽ (Все)</span>
                                    <span>100 000 ₽ (Elite)</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* FUTURE SETTINGS PLACEHOLDERS */}
                    <section className="opacity-50 grayscale pointer-events-none border-t border-zinc-100 pt-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-bold text-sm uppercase mb-2">Кэшбэк (Loyalty)</h3>
                                <div className="flex gap-2">
                                    <input className="border p-2 w-20" value="5%" readOnly />
                                    <span className="text-xs self-center">Базовая ставка</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm uppercase mb-2">Курс списания</h3>
                                <div className="flex gap-2">
                                    <input className="border p-2 w-20" value="1 к 1" readOnly />
                                    <span className="text-xs self-center">Баллы к Рублю</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 text-[10px] font-mono text-zinc-400 uppercase bg-zinc-100 inline-block px-2 py-1">
                            В разработке (Скоро)
                        </div>
                    </section>
                </div>

                <div className="mt-12 pt-6 border-t border-black flex justify-end">
                    <button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="bg-black text-white px-8 py-4 font-jura font-bold uppercase hover:bg-blue-600 transition-colors flex items-center gap-3 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-200"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                        СОХРАНИТЬ КОНФИГУРАЦИЮ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
