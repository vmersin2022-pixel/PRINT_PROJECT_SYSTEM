
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useApp } from '../../context';
import { Save, UploadCloud, Loader2, Monitor, AlertTriangle, Image as ImageIcon, Plus, Trash2, ExternalLink, FileText } from 'lucide-react';
import { getImageUrl } from '../../utils';

const AdminCMS: React.FC = () => {
    const { siteConfig, updateSiteConfig, articles, refreshData } = useApp();
    
    // --- GENERAL SETTINGS STATE ---
    const [form, setForm] = useState({
        hero_title: '',
        hero_subtitle: '',
        hero_image: '',
        announcement_text: '',
        sale_mode: false,
        sale_end_date: '',
        // vip_threshold removed from here
    });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- ARTICLES STATE ---
    const [isArticleEditorOpen, setIsArticleEditorOpen] = useState(false);
    const [articleForm, setArticleForm] = useState({
        title: '',
        cover_image: '',
        article_type: 'internal' as 'internal' | 'external',
        external_link: '',
        content: ''
    });
    const articleFileRef = useRef<HTMLInputElement>(null);

    // Initialize general form
    useEffect(() => {
        if (siteConfig) {
            setForm({
                hero_title: siteConfig.hero_title || '',
                hero_subtitle: siteConfig.hero_subtitle || '',
                hero_image: siteConfig.hero_image || '',
                announcement_text: siteConfig.announcement_text || '',
                sale_mode: siteConfig.sale_mode || false,
                sale_end_date: siteConfig.sale_end_date ? new Date(siteConfig.sale_end_date).toISOString().slice(0, 16) : '',
            });
        }
    }, [siteConfig]);

    // --- HANDLERS: GENERAL CMS ---
    const handleSaveGeneral = async () => {
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

    const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);
        try {
            const file = e.target.files[0];
            const fileName = `hero_${Date.now()}.${file.name.split('.').pop()}`;
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

    // --- HANDLERS: ARTICLES ---
    const handleArticleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);
        try {
            const file = e.target.files[0];
            const fileName = `article_${Date.now()}.${file.name.split('.').pop()}`;
            const { error } = await supabase.storage.from('images').upload(fileName, file);
            if (error) throw error;
            const { data } = supabase.storage.from('images').getPublicUrl(fileName);
            setArticleForm(prev => ({ ...prev, cover_image: data.publicUrl }));
        } catch (e: any) {
            alert('Upload error: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveArticle = async () => {
        if (!articleForm.title || !articleForm.cover_image) {
            alert("Заполните заголовок и обложку");
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase.from('articles').insert([{
                title: articleForm.title,
                cover_image: articleForm.cover_image,
                article_type: articleForm.article_type,
                external_link: articleForm.article_type === 'external' ? articleForm.external_link : null,
                content: articleForm.article_type === 'internal' ? articleForm.content : null
            }]);
            if (error) throw error;
            
            setIsArticleEditorOpen(false);
            setArticleForm({ title: '', cover_image: '', article_type: 'internal', external_link: '', content: '' });
            refreshData();
        } catch (e: any) {
            alert('Ошибка: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteArticle = async (id: string) => {
        if (!confirm('Удалить статью?')) return;
        try {
            await supabase.from('articles').delete().eq('id', id);
            refreshData();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 bg-white border border-black shadow-lg animate-blur-in relative">
            
            {/* GENERAL CMS HEADER */}
            <div className="flex justify-between items-center mb-8 border-b border-zinc-200 pb-4">
                <div>
                    <h2 className="font-jura text-2xl font-bold uppercase">VISUAL EDITOR (CMS)</h2>
                    <p className="font-mono text-xs text-zinc-500">Управление контентом главной страницы</p>
                </div>
                <button 
                    onClick={handleSaveGeneral} 
                    disabled={saving}
                    className="bg-black text-white px-6 py-3 font-jura font-bold uppercase hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} СОХРАНИТЬ
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                
                {/* HERO SETTINGS */}
                <div className="space-y-6">
                    <h3 className="font-bold uppercase text-sm border-b pb-2 flex items-center gap-2"><Monitor size={16}/> Главный экран</h3>
                    <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Заголовок (Hero Title)</label>
                        <textarea rows={3} className="w-full border border-zinc-300 p-3 font-jura font-bold text-xl uppercase focus:border-black outline-none" value={form.hero_title} onChange={e => setForm({...form, hero_title: e.target.value})} placeholder="PRINT PROJECT GAME" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Подзаголовок</label>
                        <input className="w-full border border-zinc-300 p-3 font-mono text-sm focus:border-black outline-none" value={form.hero_subtitle} onChange={e => setForm({...form, hero_subtitle: e.target.value})} placeholder="СИНХРОНИЗИРУЙ СВОЙ СТИЛЬ..." />
                    </div>
                    <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Баннер (Hero Image)</label>
                        <div onClick={() => fileInputRef.current?.click()} className="relative aspect-video border-2 border-dashed border-zinc-300 cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center overflow-hidden">
                            {form.hero_image ? <img src={form.hero_image} className="absolute inset-0 w-full h-full object-cover" /> : <div className="text-zinc-400 flex flex-col items-center"><ImageIcon size={32} className="mb-2"/><span className="text-xs uppercase font-mono">Выбрать изображение</span></div>}
                            {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>}
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleHeroUpload} accept="image/*" />
                        </div>
                    </div>
                </div>

                {/* SALE & ALERTS */}
                <div className="space-y-6">
                    <h3 className="font-bold uppercase text-sm border-b pb-2 flex items-center gap-2 text-red-600"><AlertTriangle size={16}/> Маркетинг и Акции</h3>
                    
                    <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                        <label className="flex items-center justify-between cursor-pointer mb-4">
                            <span className="font-jura font-bold text-lg uppercase text-red-900">Включить SALE MODE</span>
                            <div className="relative">
                                <input type="checkbox" className="sr-only peer" checked={form.sale_mode} onChange={e => setForm({...form, sale_mode: e.target.checked})} />
                                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
                            </div>
                        </label>
                        <p className="text-xs text-red-800 font-mono mb-4 leading-relaxed">При включении:<br/>• Фон бегущей строки станет КРАСНЫМ.<br/>• На главной появится ТАЙМЕР.<br/>• Цены получат визуальный акцент.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-mono uppercase text-red-900 mb-1">Текст бегущей строки</label>
                                <input className="w-full border border-red-200 p-2 font-mono text-sm focus:border-red-600 outline-none" value={form.announcement_text} onChange={e => setForm({...form, announcement_text: e.target.value})} placeholder="SALE IS LIVE // СКИДКИ ДО 50%" />
                            </div>
                            {form.sale_mode && (
                                <div className="animate-fade-in">
                                    <label className="block text-[10px] font-mono uppercase text-red-900 mb-1">Конец акции (Таймер)</label>
                                    <input type="datetime-local" className="w-full border border-red-200 p-2 font-mono text-sm bg-white" value={form.sale_end_date} onChange={e => setForm({...form, sale_end_date: e.target.value})} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- JOURNAL SECTION --- */}
            <div className="border-t border-black pt-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-jura text-xl font-bold uppercase flex items-center gap-2"><FileText size={20}/> ЖУРНАЛ / МЕДИА</h3>
                        <p className="text-xs text-zinc-500 font-mono">Статьи на сайте и упоминания в СМИ</p>
                    </div>
                    <button onClick={() => setIsArticleEditorOpen(true)} className="flex items-center gap-2 border border-black px-4 py-2 font-mono text-xs uppercase hover:bg-black hover:text-white transition-colors">
                        <Plus size={14}/> Добавить статью
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {articles.map(article => (
                        <div key={article.id} className="border border-zinc-200 p-4 flex gap-4 bg-zinc-50 relative group">
                            <div className="w-20 h-20 bg-zinc-200 shrink-0">
                                <img src={getImageUrl(article.cover_image, 150)} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[9px] px-1 font-bold uppercase ${article.article_type === 'internal' ? 'bg-black text-white' : 'bg-blue-600 text-white'}`}>
                                        {article.article_type === 'internal' ? 'SITE' : 'LINK'}
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-400">{new Date(article.published_at).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-bold text-sm uppercase line-clamp-2">{article.title}</h4>
                                {article.external_link && <a href={article.external_link} target="_blank" className="text-[10px] text-blue-600 underline mt-1 block truncate max-w-[200px]">{article.external_link}</a>}
                            </div>
                            <button onClick={() => handleDeleteArticle(article.id)} className="absolute top-2 right-2 p-2 text-zinc-300 hover:text-red-600"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- ARTICLE EDITOR DRAWER --- */}
            {isArticleEditorOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex justify-end" onClick={() => setIsArticleEditorOpen(false)}>
                    <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto animate-slide-in-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-8 border-b pb-4">
                            <h3 className="font-jura text-xl font-bold uppercase">НОВАЯ СТАТЬЯ</h3>
                            <button onClick={() => setIsArticleEditorOpen(false)}>✕</button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Заголовок</label>
                                <textarea rows={2} className="w-full border p-2 font-bold uppercase" value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} placeholder="ЗАГОЛОВОК..." />
                            </div>

                            <div>
                                <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Обложка</label>
                                <div onClick={() => articleFileRef.current?.click()} className="aspect-video border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer hover:bg-zinc-50">
                                    {articleForm.cover_image ? <img src={articleForm.cover_image} className="w-full h-full object-cover" /> : <div className="text-center text-zinc-400"><UploadCloud className="mx-auto mb-2"/><span className="text-xs">UPLOAD</span></div>}
                                </div>
                                <input type="file" ref={articleFileRef} className="hidden" onChange={handleArticleUpload} accept="image/*"/>
                            </div>

                            <div>
                                <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Тип материала</label>
                                <div className="flex border border-black">
                                    <button onClick={() => setArticleForm({...articleForm, article_type: 'internal'})} className={`flex-1 py-2 text-xs uppercase font-bold ${articleForm.article_type === 'internal' ? 'bg-black text-white' : 'hover:bg-zinc-100'}`}>Статья на сайте</button>
                                    <button onClick={() => setArticleForm({...articleForm, article_type: 'external'})} className={`flex-1 py-2 text-xs uppercase font-bold ${articleForm.article_type === 'external' ? 'bg-black text-white' : 'hover:bg-zinc-100'}`}>Ссылка (СМИ)</button>
                                </div>
                            </div>

                            {articleForm.article_type === 'external' ? (
                                <div>
                                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Ссылка</label>
                                    <div className="flex items-center border border-zinc-300 p-2">
                                        <ExternalLink size={16} className="text-zinc-400 mr-2"/>
                                        <input className="w-full outline-none text-sm" value={articleForm.external_link} onChange={e => setArticleForm({...articleForm, external_link: e.target.value})} placeholder="https://..." />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Текст статьи</label>
                                    <textarea rows={15} className="w-full border p-2 text-sm font-mono leading-relaxed" value={articleForm.content} onChange={e => setArticleForm({...articleForm, content: e.target.value})} placeholder="Текст статьи..." />
                                    <p className="text-[10px] text-zinc-400 mt-1">* Поддерживаются переносы строк</p>
                                </div>
                            )}

                            <button onClick={handleSaveArticle} disabled={saving} className="w-full bg-black text-white py-4 font-bold uppercase hover:bg-blue-600 transition-colors">
                                {saving ? 'СОХРАНЕНИЕ...' : 'ОПУБЛИКОВАТЬ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCMS;
