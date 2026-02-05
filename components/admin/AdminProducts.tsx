
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Product, ProductVariant, Category } from '../../types';
import { Plus, Search, Edit2, Trash2, X, UploadCloud, Save, Loader2, Image as ImageIcon, AlertTriangle, Calendar, Lock, Coins, Sparkles, Wand2, Camera, Cpu } from 'lucide-react';
import { useApp } from '../../context';
import { getImageUrl } from '../../utils';
import { aiService } from '../../services/aiService';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'OS'];
const CATEGORIES: Category[] = ['t-shirts', 'sets', 'accessories', 'fresh_drop', 'last_drop'];

// DEFAULT PROMPT FOR IMAGE GEN (Optimized for Flux/Pollinations)
const DEFAULT_IMAGE_PROMPT = "A cool model wearing a black oversized t-shirt with the provided print design on chest. Urban cyberpunk environment, neon lights, cinematic shot, hyperrealistic, 8k, fashion lookbook style.";

interface ProductFormData {
    name: string;
    price: string;
    costPrice: string;
    description: string;
    categories: Category[];
    collectionIds: string[];
    images: string[];
    variants: Record<string, number>;
    isHidden: boolean;
    isNew: boolean;
    isVipOnly: boolean;
    releaseDate: string; 
}

const INITIAL_FORM: ProductFormData = {
    name: '',
    price: '',
    costPrice: '',
    description: '',
    categories: ['t-shirts'],
    collectionIds: [],
    images: [],
    variants: { 'S': 10, 'M': 10, 'L': 10, 'XL': 5 },
    isHidden: false,
    isNew: true,
    isVipOnly: false,
    releaseDate: ''
};

const AdminProducts: React.FC = () => {
    const { refreshData, collections } = useApp();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Editor State
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<ProductFormData>(INITIAL_FORM);
    const [uploading, setUploading] = useState(false);
    
    // AI State
    const [aiTextLoading, setAiTextLoading] = useState(false);
    const [aiImageLoading, setAiImageLoading] = useState(false); // API call status
    const [imgIsLoading, setImgIsLoading] = useState(false); // Actual image fetch status
    const [aiImagePrompt, setAiImagePrompt] = useState(DEFAULT_IMAGE_PROMPT);
    const [aiPrintFile, setAiPrintFile] = useState<File | null>(null);
    const [aiGeneratedImage, setAiGeneratedImage] = useState<string | null>(null); // URL string
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const aiPrintInputRef = useRef<HTMLInputElement>(null);

    // --- 1. FETCH DATA ---
    const fetchProducts = async (queryStr: string = '') => {
        setLoading(true);
        try {
            let query = supabase
                .from('products')
                .select('*, variants:product_variants(*)')
                .order('name', { ascending: true });

            if (queryStr) {
                query = query.or(`name.ilike.%${queryStr}%,id.ilike.%${queryStr}%`);
            }

            const { data: prodData, error: prodError } = await query;

            if (prodError) throw prodError;

            const formatted: Product[] = prodData.map((p: any) => ({
                ...p,
                isNew: p.is_new,
                isHidden: p.is_hidden,
                isVipOnly: p.is_vip_only,
                cost_price: p.cost_price,
                collectionIds: p.collection_ids || [], 
                categories: typeof p.category === 'string' ? p.category.split(',').filter((c:string) => c) : [],
                variants: p.variants || [],
                releaseDate: p.release_date
            }));

            setProducts(formatted);
        } catch (e) {
            console.error("Fetch Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // --- AI HANDLERS (USING SERVICE) ---

    const handleAiTextGen = async () => {
        if (!formData.name) {
            alert('Введите хотя бы черновое название товара для контекста');
            return;
        }
        
        setAiTextLoading(true);
        try {
            const result = await aiService.generateProductDescription(formData.name, formData.categories);
            setFormData(prev => ({
                ...prev,
                name: result.name || prev.name,
                description: result.description || prev.description
            }));
        } catch (e: any) {
            console.error("AI Text Error", e);
            alert("AI Error: " + e.message);
        } finally {
            setAiTextLoading(false);
        }
    };

    const handleAiImageGen = async () => {
        if (!aiPrintFile) {
            alert('Сначала загрузите изображение принта (PNG/JPG)');
            return;
        }
        if (!aiImagePrompt) {
            setAiImagePrompt(DEFAULT_IMAGE_PROMPT);
        }
        
        setAiImageLoading(true);
        setAiGeneratedImage(null);
        setImgIsLoading(true); // Prepare for new image load

        try {
            // New logic: Returns a URL string directly
            const imageUrl = await aiService.generateLookbook(aiPrintFile, aiImagePrompt);
            setAiGeneratedImage(imageUrl);
        } catch (e: any) {
            console.error("AI Image Error", e);
            alert("AI Error: " + e.message);
            setImgIsLoading(false); // Stop loading if error
        } finally {
            setAiImageLoading(false);
        }
    };

    const handleSaveAiImage = async () => {
        if (!aiGeneratedImage) return;
        setUploading(true);
        try {
            // Convert URL/DataURL to Blob to File for Supabase upload
            const res = await fetch(aiGeneratedImage);
            if (!res.ok) throw new Error('Failed to fetch generated image');
            
            const blob = await res.blob();
            const file = new File([blob], `ai_lookbook_${Date.now()}.jpg`, { type: 'image/jpeg' });

            const fileName = `ai_gen_${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('images').getPublicUrl(fileName);
            
            setFormData(prev => ({ ...prev, images: [...prev.images, data.publicUrl] }));
            setAiGeneratedImage(null);
            setAiPrintFile(null); // Reset
            alert("Изображение сохранено в галерею!");
            
        } catch (e: any) {
            console.error("Save Error", e);
            alert('Ошибка сохранения: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    // --- STANDARD HANDLERS ---

    const handleEdit = (product: Product) => {
        const variantMap: Record<string, number> = {};
        if (product.variants) {
            product.variants.forEach(v => {
                variantMap[v.size] = v.stock;
            });
        }
        
        setFormData({
            name: product.name,
            price: product.price.toString(),
            costPrice: product.cost_price?.toString() || '',
            description: product.description || '',
            categories: product.categories || [],
            collectionIds: product.collectionIds || [],
            images: product.images || [],
            variants: variantMap,
            isHidden: product.isHidden || false,
            isNew: product.isNew || false,
            isVipOnly: product.isVipOnly || false,
            releaseDate: product.releaseDate ? new Date(product.releaseDate).toISOString().slice(0, 16) : ''
        });
        setEditingId(product.id);
        setIsEditorOpen(true);
        // Reset AI state
        setAiGeneratedImage(null);
        setAiPrintFile(null);
    };

    const handleCreate = () => {
        setFormData(INITIAL_FORM);
        setEditingId(null);
        setIsEditorOpen(true);
        // Reset AI state
        setAiGeneratedImage(null);
        setAiPrintFile(null);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Вы уверены? Это действие нельзя отменить.')) return;
        try {
            await supabase.from('product_variants').delete().eq('product_id', id);
            await supabase.from('products').delete().eq('id', id);
            fetchProducts(searchQuery);
            refreshData(); 
        } catch (e: any) {
            alert('Ошибка: ' + e.message);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);

        const files: File[] = Array.from(e.target.files);
        const newImages: string[] = [];

        for (const file of files) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            
            try {
                const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('images').getPublicUrl(fileName);
                newImages.push(data.publicUrl);
            } catch (error) {
                console.error('Upload failed:', error);
            }
        }

        setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price) {
            alert('Заполните название и цену');
            return;
        }
        setUploading(true);
        
        try {
            const productPayload = {
                name: formData.name,
                price: parseFloat(formData.price),
                cost_price: formData.costPrice ? parseFloat(formData.costPrice) : 0,
                description: formData.description,
                category: formData.categories.join(','),
                collection_ids: formData.collectionIds,
                images: formData.images,
                is_new: formData.isNew,
                is_hidden: formData.isHidden,
                is_vip_only: formData.isVipOnly,
                release_date: formData.releaseDate ? new Date(formData.releaseDate).toISOString() : null
            };

            let productId = editingId;

            if (editingId) {
                const { error } = await supabase.from('products').update(productPayload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('products').insert([productPayload]).select().single();
                if (error) throw error;
                productId = data.id;
            }

            if (productId) {
                if (editingId) await supabase.from('product_variants').delete().eq('product_id', productId);
                
                const variantsPayload = Object.entries(formData.variants)
                    .filter(([_, stock]) => (stock as number) >= 0)
                    .map(([size, stock]) => ({
                        product_id: productId,
                        size,
                        stock: Number(stock)
                    }));
                
                if (variantsPayload.length > 0) {
                    const { error: varError } = await supabase.from('product_variants').insert(variantsPayload);
                    if (varError) throw varError;
                }
            }

            setIsEditorOpen(false);
            fetchProducts(searchQuery);
            refreshData();
            
        } catch (e: any) {
            alert('Ошибка: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative h-full min-h-[600px]">
            
            {/* --- TOP BAR --- */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 border border-zinc-200">
                <div className="relative w-full md:w-96">
                    <input 
                        type="text" 
                        placeholder="ПОИСК ПО СКЛАДУ..." 
                        className="w-full pl-10 pr-4 py-2 border border-zinc-300 font-mono text-sm uppercase focus:border-blue-600 outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
                <button 
                    onClick={handleCreate}
                    className="flex items-center gap-2 bg-black text-white px-6 py-2 font-jura font-bold uppercase hover:bg-blue-600 transition-colors"
                >
                    <Plus size={18} /> Добавить Товар
                </button>
            </div>

            {/* --- PRODUCT TABLE --- */}
            <div className="bg-white border border-black overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-100 text-xs font-mono uppercase text-zinc-500 border-b border-zinc-200">
                        <tr>
                            <th className="p-4 w-20">IMG</th>
                            <th className="p-4">НАЗВАНИЕ / ID</th>
                            <th className="p-4">КАТЕГОРИИ</th>
                            <th className="p-4 text-center">ЦЕНА / СЕБЕСТ.</th>
                            <th className="p-4 text-center">ОСТАТОК</th>
                            <th className="p-4 text-right">ДЕЙСТВИЯ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin inline"/> Loading Data...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-zinc-400">СКЛАД ПУСТ / НИЧЕГО НЕ НАЙДЕНО</td></tr>
                        ) : (
                            products.map(p => {
                                const totalStock = p.variants?.reduce((acc, v) => acc + v.stock, 0) || 0;
                                return (
                                    <tr key={p.id} className="hover:bg-blue-50/30 group">
                                        <td className="p-4">
                                            <img src={getImageUrl(p.images[0], 100)} className="w-12 h-16 object-cover bg-zinc-200 border border-zinc-300" />
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold uppercase font-jura">{p.name}</div>
                                            <div className="text-[10px] font-mono text-zinc-400">{p.id.split('-')[0]}...</div>
                                            {p.isHidden && <span className="text-[9px] bg-red-100 text-red-600 px-1 font-mono">HIDDEN</span>}
                                            {p.isNew && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 font-mono ml-1">NEW</span>}
                                            {p.isVipOnly && <span className="text-[9px] bg-black text-white px-1 font-mono ml-1">VIP ONLY</span>}
                                            {p.releaseDate && new Date(p.releaseDate) > new Date() && (
                                                <div className="mt-1 text-[9px] font-mono bg-purple-100 text-purple-700 px-1 rounded inline-block">
                                                    DROP: {new Date(p.releaseDate).toLocaleDateString()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {p.categories?.map(c => (
                                                    <span key={c} className="text-[9px] border border-zinc-300 px-1 rounded-sm uppercase">{c}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-mono">
                                            <div className="font-bold">{p.price.toLocaleString()} ₽</div>
                                            {p.cost_price ? (
                                                <div className="text-[10px] text-zinc-400">COGS: {p.cost_price}</div>
                                            ) : (
                                                <div className="text-[10px] text-red-300">NO COST</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`font-mono font-bold ${totalStock === 0 ? 'text-red-500' : totalStock < 5 ? 'text-orange-500' : 'text-green-600'}`}>
                                                {totalStock}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(p)} className="p-2 bg-zinc-100 hover:bg-blue-600 hover:text-white rounded"><Edit2 size={14}/></button>
                                                <button onClick={() => handleDelete(p.id)} className="p-2 bg-zinc-100 hover:bg-red-600 hover:text-white rounded"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- EDITOR DRAWER --- */}
            <div 
                className={`fixed inset-0 z-[100] transition-all duration-300 ${isEditorOpen ? 'bg-black/40 pointer-events-auto' : 'pointer-events-none'}`}
                onClick={() => setIsEditorOpen(false)}
            >
                <div 
                    onClick={e => e.stopPropagation()}
                    className={`absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl border-l border-black transform transition-transform duration-300 flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    
                    {/* Header */}
                    <div className="p-6 border-b border-black flex justify-between items-center bg-zinc-50">
                        <div className="flex items-center gap-2">
                            <h2 className="font-jura text-2xl font-bold uppercase">
                                {editingId ? 'РЕДАКТИРОВАНИЕ' : 'СОЗДАНИЕ'}
                            </h2>
                            {!editingId && <span className="text-xs font-mono bg-blue-600 text-white px-2 py-1 rounded">NEW</span>}
                        </div>
                        <button onClick={() => setIsEditorOpen(false)} className="hover:rotate-90 transition-transform"><X size={24}/></button>
                    </div>

                    {/* Scrollable Form */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        
                        {/* --- AI LAB SECTION --- */}
                        <div className="bg-gradient-to-r from-zinc-50 to-blue-50/30 p-6 border border-zinc-200 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Cpu size={100} /></div>
                            <h3 className="font-bold text-sm uppercase mb-4 flex items-center gap-2 text-blue-900 relative z-10">
                                <Sparkles size={16} className="text-blue-500 animate-pulse"/> AI LAB: NEURAL ENGINE
                            </h3>

                            <div className="grid grid-cols-2 gap-6 relative z-10">
                                {/* TEXT GEN */}
                                <div className="border-r border-zinc-200 pr-6">
                                    <p className="text-[10px] font-mono text-zinc-500 mb-2 uppercase font-bold flex items-center gap-1"><Wand2 size={10}/> 1. TEXT CO-PILOT</p>
                                    <p className="text-[10px] text-zinc-400 mb-2 leading-tight">Генерация названия и описания на основе данных.</p>
                                    <button 
                                        onClick={handleAiTextGen}
                                        disabled={aiTextLoading}
                                        className="w-full border border-blue-200 bg-white text-blue-900 py-2 text-xs font-bold uppercase hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center gap-2"
                                    >
                                        {aiTextLoading ? <Loader2 className="animate-spin" size={14}/> : <Wand2 size={14}/>} 
                                        AUTO-COMPLETE
                                    </button>
                                </div>

                                {/* IMAGE GEN (POLLINATIONS) */}
                                <div>
                                    <p className="text-[10px] font-mono text-zinc-500 mb-2 uppercase font-bold flex items-center gap-1"><Camera size={10}/> 2. FLUX LOOKBOOK (POLLINATIONS)</p>
                                    <p className="text-[10px] text-zinc-400 mb-2 leading-tight">Генерация фото на модели.</p>
                                    
                                    <div className="flex gap-2 mb-2">
                                        <button 
                                            onClick={() => aiPrintInputRef.current?.click()}
                                            className="flex-1 border border-dashed border-zinc-400 p-2 text-[10px] uppercase text-zinc-500 hover:border-black hover:text-black transition-colors truncate text-center"
                                        >
                                            {aiPrintFile ? aiPrintFile.name : '[+] UPLOAD PRINT'}
                                        </button>
                                        <input ref={aiPrintInputRef} type="file" accept="image/*" className="hidden" onChange={e => setAiPrintFile(e.target.files?.[0] || null)} />
                                    </div>
                                    
                                    <textarea 
                                        className="w-full border p-2 text-[9px] font-mono h-16 resize-none mb-2 focus:border-blue-500 outline-none"
                                        value={aiImagePrompt}
                                        onChange={e => setAiImagePrompt(e.target.value)}
                                        placeholder="PROMPT..."
                                    />

                                    <button 
                                        onClick={handleAiImageGen}
                                        disabled={aiImageLoading}
                                        className="w-full bg-black text-white py-2 text-xs font-bold uppercase hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {aiImageLoading ? <Loader2 className="animate-spin" size={14}/> : <Camera size={14}/>} 
                                        RENDER IMAGE
                                    </button>
                                </div>
                            </div>

                            {/* GENERATED IMAGE PREVIEW WITH LOADING STATE */}
                            {aiGeneratedImage && (
                                <div className="mt-4 border-t border-zinc-200 pt-4 flex gap-4 animate-fade-in items-start">
                                    <div className="w-24 h-32 bg-zinc-100 border border-black shrink-0 relative flex items-center justify-center">
                                        {/* SPINNER OVERLAY IF IMAGE IS LOADING */}
                                        {imgIsLoading && (
                                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-100/90 backdrop-blur-sm">
                                                <Loader2 className="animate-spin text-zinc-400" size={20}/>
                                            </div>
                                        )}
                                        
                                        <img 
                                            src={aiGeneratedImage} 
                                            // Handle cross-origin if needed, but 'anonymous' can break if server is strict. 
                                            // Pollinations is usually open. 
                                            // We hide image until loaded to avoid flickering.
                                            className={`w-full h-full object-cover transition-opacity duration-300 ${imgIsLoading ? 'opacity-0' : 'opacity-100'}`} 
                                            onLoad={() => setImgIsLoading(false)}
                                            onError={() => {
                                                setImgIsLoading(false);
                                                // Optional: alert('Failed to load image preview'); 
                                            }}
                                        />
                                        {!imgIsLoading && <div className="absolute top-0 right-0 bg-green-500 w-2 h-2"/>}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold uppercase mb-2 text-green-700">GENERATION COMPLETE</p>
                                        <button 
                                            onClick={handleSaveAiImage}
                                            disabled={uploading || imgIsLoading}
                                            className="bg-blue-600 text-white px-4 py-2 text-xs font-bold uppercase hover:bg-blue-700 transition-colors w-full md:w-auto flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {uploading ? 'SAVING...' : <><Save size={12}/> SAVE TO GALLERY</>}
                                        </button>
                                        <button 
                                            onClick={() => setAiGeneratedImage(null)}
                                            className="block mt-2 text-[10px] text-red-500 hover:underline"
                                        >
                                            DISCARD
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 1. VISUALS */}
                        <section>
                            <h3 className="font-bold text-sm uppercase mb-4 flex items-center gap-2 text-blue-900"><ImageIcon size={16}/> Галерея</h3>
                            
                            <div className="grid grid-cols-4 gap-4 mb-4">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-[3/4] group border border-zinc-200">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 bg-red-600 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12}/>
                                        </button>
                                        {idx === 0 && <span className="absolute bottom-0 left-0 bg-blue-600 text-white text-[9px] px-1 font-mono">MAIN</span>}
                                    </div>
                                ))}
                                <label className="aspect-[3/4] border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-colors">
                                    {uploading ? <Loader2 className="animate-spin text-blue-600"/> : <UploadCloud className="text-zinc-400 mb-2"/>}
                                    <span className="text-[10px] font-mono text-center uppercase text-zinc-500">
                                        {uploading ? 'ЗАГРУЗКА...' : 'ЗАГРУЗИТЬ'}
                                    </span>
                                    <input 
                                        type="file" 
                                        multiple 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handleImageUpload}
                                        ref={fileInputRef}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                        </section>

                        {/* 2. MAIN INFO */}
                        <section className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Название товара</label>
                                <input 
                                    className="w-full border border-zinc-300 p-3 font-jura font-bold text-lg uppercase focus:border-blue-600 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    placeholder="НАПРИМЕР: T-SHIRT 'CHAOS'"
                                />
                            </div>
                            
                            {/* PRICING */}
                            <div>
                                <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Цена продажи (RUB)</label>
                                <input 
                                    type="number"
                                    className="w-full border border-zinc-300 p-3 font-mono focus:border-blue-600 outline-none font-bold"
                                    value={formData.price}
                                    onChange={e => setFormData({...formData, price: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1 flex items-center gap-1 text-green-700">
                                    <Coins size={12}/> Себестоимость (Закупка)
                                </label>
                                <input 
                                    type="number"
                                    className="w-full border border-green-200 bg-green-50 p-3 font-mono focus:border-green-600 outline-none text-green-800"
                                    value={formData.costPrice}
                                    onChange={e => setFormData({...formData, costPrice: e.target.value})}
                                    placeholder="0"
                                />
                            </div>
                            
                            {/* DROP SETTINGS */}
                            <div className="col-span-2 bg-purple-50 p-4 border border-purple-100">
                                <label className="block text-[10px] font-bold font-mono uppercase text-purple-900 mb-2 flex items-center gap-2">
                                    <Calendar size={14}/> ДАТА РЕЛИЗА (ДЛЯ ДРОПОВ)
                                </label>
                                <input 
                                    type="datetime-local"
                                    className="w-full border border-purple-200 p-2 font-mono text-sm bg-white"
                                    value={formData.releaseDate}
                                    onChange={e => setFormData({...formData, releaseDate: e.target.value})}
                                />
                                <p className="text-[10px] text-purple-600 mt-2 leading-tight">
                                    * Если указать дату в будущем, товар попадет во вкладку "Drop Radar" и не будет доступен к покупке до наступления этой даты.
                                </p>
                            </div>

                            <div className="flex gap-4 items-center col-span-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isNew} 
                                        onChange={e => setFormData({...formData, isNew: e.target.checked})}
                                        className="w-4 h-4 accent-blue-600"
                                    />
                                    <span className="font-mono text-xs uppercase">СВЕЖИЙ ДРОП</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isVipOnly} 
                                        onChange={e => setFormData({...formData, isVipOnly: e.target.checked})}
                                        className="w-4 h-4 accent-black"
                                    />
                                    <span className="font-mono text-xs uppercase font-bold text-black flex items-center gap-1"><Lock size={10}/> VIP ONLY</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isHidden} 
                                        onChange={e => setFormData({...formData, isHidden: e.target.checked})}
                                        className="w-4 h-4 accent-red-600"
                                    />
                                    <span className="font-mono text-xs uppercase text-red-600">СКРЫТЬ</span>
                                </label>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Описание / Детализация</label>
                                <textarea 
                                    rows={4}
                                    className="w-full border border-zinc-300 p-3 font-mono text-sm focus:border-blue-600 outline-none"
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </section>

                        {/* 3. WAREHOUSE & VARIANTS */}
                        <section className="bg-zinc-50 p-4 border border-zinc-200">
                             <h3 className="font-bold text-sm uppercase mb-4 text-blue-900">Склад и Размеры</h3>
                             <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                {SIZES.map(size => (
                                    <div key={size} className="bg-white border border-zinc-300 p-2 text-center">
                                        <div className="text-[10px] font-bold mb-1">{size}</div>
                                        <input 
                                            type="number" 
                                            min="0"
                                            className={`w-full text-center font-mono border-b ${!formData.variants[size] ? 'text-zinc-300 border-zinc-200' : 'text-black border-black font-bold'}`}
                                            value={formData.variants[size] || 0}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    variants: { ...prev.variants, [size]: val }
                                                }));
                                            }}
                                        />
                                    </div>
                                ))}
                             </div>
                        </section>

                        {/* 4. METADATA */}
                        <section>
                             <h3 className="font-bold text-sm uppercase mb-4 text-blue-900">Категории и Коллекции</h3>
                             <div className="mb-4">
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                const has = formData.categories.includes(cat);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    categories: has ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat]
                                                }));
                                            }}
                                            className={`text-xs px-3 py-1 border uppercase font-mono transition-colors ${formData.categories.includes(cat) ? 'bg-black text-white border-black' : 'bg-white text-zinc-500 border-zinc-300'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                             </div>

                             <div>
                                <div className="flex flex-wrap gap-2">
                                    {collections.map(col => (
                                        <button
                                            key={col.id}
                                            onClick={() => {
                                                const has = formData.collectionIds.includes(col.id);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    collectionIds: has ? prev.collectionIds.filter(c => c !== col.id) : [...prev.collectionIds, col.id]
                                                }));
                                            }}
                                            className={`text-xs px-3 py-1 border uppercase font-mono transition-colors ${formData.collectionIds.includes(col.id) ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-zinc-500 border-zinc-300'}`}
                                        >
                                            {col.title}
                                        </button>
                                    ))}
                                    <button
                                         onClick={() => {
                                            const has = formData.collectionIds.includes('duo');
                                            setFormData(prev => ({
                                                ...prev,
                                                collectionIds: has ? prev.collectionIds.filter(c => c !== 'duo') : [...prev.collectionIds, 'duo']
                                            }));
                                        }}
                                        className={`text-xs px-3 py-1 border uppercase font-mono transition-colors ${formData.collectionIds.includes('duo') ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-zinc-500 border-zinc-300'}`}
                                    >
                                        FOR DUO
                                    </button>
                                </div>
                             </div>
                        </section>

                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-black bg-white flex gap-4">
                        <button 
                            onClick={() => setIsEditorOpen(false)} 
                            className="flex-1 py-4 border border-zinc-300 font-jura font-bold uppercase hover:bg-zinc-100"
                        >
                            Отмена
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={uploading}
                            className="flex-1 py-4 bg-black text-white font-jura font-bold uppercase hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {uploading ? <Loader2 className="animate-spin"/> : <Save size={18}/>}
                            {editingId ? 'Сохранить изменения' : 'Создать товар'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminProducts;
