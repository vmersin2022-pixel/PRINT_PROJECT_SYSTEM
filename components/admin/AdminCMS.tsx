
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useApp } from '../../context';
import { Save, UploadCloud, Loader2, Monitor, AlertTriangle, Image as ImageIcon } from 'lucide-react';

const AdminCMS: React.FC = () => {
    const { siteConfig, updateSiteConfig } = useApp();
    const [form, setForm] = useState({
        hero_title: '',
        hero_subtitle: '',
        hero_image: '',
        announcement_text: '',
        sale_mode: false,
        sale_end_date: ''
    });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize form with context data
    useEffect(() => {
        if (siteConfig) {
            setForm({
                hero_title: siteConfig.hero_title || '',
                hero_subtitle: siteConfig.hero_subtitle || '',
                hero_image: siteConfig.hero_image || '',
                announcement_text: siteConfig.announcement_text || '',
                sale_mode: siteConfig.sale_mode || false,
                sale_end_date: siteConfig.sale_end_date ? new Date(siteConfig.sale_end_date).toISOString().slice(0, 16) : ''
            });
        }
    }, [siteConfig]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateSiteConfig({
                ...form,
                sale_end_date: form.sale_end_date ? new Date(form.sale_end_date).toISOString() : undefined
            });
            alert('Настройки сайта обновлены!');
        } catch (e: any) {
            alert('Ошибка: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];
        const fileName = `hero_${Date.now()}.${file.name.split('.').pop()}`;
        
        try {
            const { error } = await supabase.storage.from('images').upload(fileName, file);
            if (error) throw error;
            const { data } = supabase.storage.from('images').getPublicUrl(fileName);
            setForm(prev => ({ ...prev, hero_image: data.publicUrl }));
        } catch (e: any) {
            alert('Upload error: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white border border-black shadow-lg animate-fade-in">
            <div className="flex justify-between items-center mb-8 border-b border-zinc-200 pb-4">
                <div>
                    <h2 className="font-jura text-2xl font-bold uppercase">VISUAL EDITOR (CMS)</h2>
                    <p className="font-mono text-xs text-zinc-500">Управление контентом главной страницы</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-black text-white px-6 py-3 font-jura font-bold uppercase hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} СОХРАНИТЬ
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                
                {/* LEFT COLUMN: HERO SETTINGS */}
                <div className="space-y-6">
                    <h3 className="font-bold uppercase text-sm border-b pb-2 flex items-center gap-2"><Monitor size={16}/> Главный экран</h3>
                    
                    <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Заголовок (Hero Title)</label>
                        <textarea 
                            rows={3}
                            className="w-full border border-zinc-300 p-3 font-jura font-bold text-xl uppercase focus:border-black outline-none"
                            value={form.hero_title}
                            onChange={e => setForm({...form, hero_title: e.target.value})}
                            placeholder="PRINT PROJECT GAME"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Подзаголовок</label>
                        <input 
                            className="w-full border border-zinc-300 p-3 font-mono text-sm focus:border-black outline-none"
                            value={form.hero_subtitle}
                            onChange={e => setForm({...form, hero_subtitle: e.target.value})}
                            placeholder="СИНХРОНИЗИРУЙ СВОЙ СТИЛЬ..."
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Баннер (Hero Image)</label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="relative aspect-video border-2 border-dashed border-zinc-300 cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center overflow-hidden"
                        >
                            {form.hero_image ? (
                                <img src={form.hero_image} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <div className="text-zinc-400 flex flex-col items-center">
                                    <ImageIcon size={32} className="mb-2"/>
                                    <span className="text-xs uppercase font-mono">Выбрать изображение</span>
                                </div>
                            )}
                            {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>}
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: SALE & ALERTS */}
                <div className="space-y-6">
                    <h3 className="font-bold uppercase text-sm border-b pb-2 flex items-center gap-2 text-red-600"><AlertTriangle size={16}/> Режим Распродажи</h3>
                    
                    <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                        <label className="flex items-center justify-between cursor-pointer mb-4">
                            <span className="font-jura font-bold text-lg uppercase text-red-900">Включить SALE MODE</span>
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={form.sale_mode}
                                    onChange={e => setForm({...form, sale_mode: e.target.checked})}
                                />
                                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
                            </div>
                        </label>
                        <p className="text-xs text-red-800 font-mono mb-4 leading-relaxed">
                            При включении:
                            <br/>• Фон бегущей строки станет КРАСНЫМ.
                            <br/>• На главной появится ТАЙМЕР.
                            <br/>• Цены получат визуальный акцент.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-mono uppercase text-red-900 mb-1">Текст бегущей строки</label>
                                <input 
                                    className="w-full border border-red-200 p-2 font-mono text-sm focus:border-red-600 outline-none"
                                    value={form.announcement_text}
                                    onChange={e => setForm({...form, announcement_text: e.target.value})}
                                    placeholder="SALE IS LIVE // СКИДКИ ДО 50%"
                                />
                            </div>
                            
                            {form.sale_mode && (
                                <div className="animate-fade-in">
                                    <label className="block text-[10px] font-mono uppercase text-red-900 mb-1">Конец акции (Таймер)</label>
                                    <input 
                                        type="datetime-local"
                                        className="w-full border border-red-200 p-2 font-mono text-sm bg-white"
                                        value={form.sale_end_date}
                                        onChange={e => setForm({...form, sale_end_date: e.target.value})}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminCMS;
