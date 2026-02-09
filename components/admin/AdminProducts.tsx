
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Product, Category } from '../../types';
import { Plus, Search, Edit2, Trash2, X, UploadCloud, Save, Loader2, Image as ImageIcon, AlertTriangle, Calendar, Lock, Coins, Sparkles, Wand2, Camera, Cpu, LayoutGrid, Check, RefreshCw, ArrowRight, Terminal, Download, Maximize2, Clock, Zap } from 'lucide-react';
import { useApp } from '../../context';
import { getImageUrl } from '../../utils';
import { aiService } from '../../services/aiService';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'OS'];
const CATEGORIES: Category[] = ['t-shirts', 'sets', 'accessories', 'fresh_drop', 'last_drop'];

// --- AI PROMPT PRESETS (Optimized for FLUX) ---
const PROMPT_PRESETS: Record<string, { label: string, prompt: string }> = {
    'flat_lay': { 
        label: 'Каталожное (Flat Lay)', 
        prompt: "Professional flat lay photography of a high quality t-shirt with the graphic print visible on chest, isolated on a clean white background. Soft studio lighting, 8k resolution, product photography, sharp details, minimalist." 
    },
    'closeup': { 
        label: 'Макро (Текстура)', 
        prompt: "Extreme close-up macro shot of cotton fabric texture with a graphic print. Low angle, very shallow depth of field, soft daylight, realistic fabric details, high quality inkjet print texture." 
    },
    'model_m': { 
        label: 'Модель (Streetwear)', 
        prompt: "A photo of a cool streetwear model man wearing the t-shirt. He is standing in a urban street environment. Realistic lighting, depth of field, fashion editorial style, 35mm film grain, raw photo." 
    },
    'model_f': { 
        label: 'Модель (Studio)', 
        prompt: "A photo of a fashion model woman wearing the t-shirt. Minimalist concrete studio background. Natural soft window lighting, vogue style, 8k, photorealistic, authentic look." 
    },
    'custom': {
        label: 'Свой Промпт (Terminal)',
        prompt: '' 
    }
};

const AI_MODELS = [
    { id: 'flux', label: 'FLUX (Default)' },
    { id: 'flux-realism', label: 'FLUX Realism' },
    { id: 'flux-3d', label: 'FLUX 3D' },
    { id: 'any-dark', label: 'Dark / Gothic' },
    { id: 'turbo', label: 'Turbo (Fast)' },
];

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

interface GenerationSlot {
    id: number;
    presetKey: string;
    status: 'idle' | 'loading' | 'success' | 'error';
    imageUrl: string | null;
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
    
    // --- AI LAB STATE ---
    const [masterPrintFile, setMasterPrintFile] = useState<File | null>(null);
    const [masterPreview, setMasterPreview] = useState<string | null>(null);
    const [masterPrintUrl, setMasterPrintUrl] = useState<string | null>(null); // PUBLIC URL FOR AI
    const [isUploadingMaster, setIsUploadingMaster] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>('flux'); // NEW: Model Selection

    const [textGenLoading, setTextGenLoading] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isSequencing, setIsSequencing] = useState(false);
    
    const [genSlots, setGenSlots] = useState<GenerationSlot[]>([
        { id: 1, presetKey: 'flat_lay', status: 'idle', imageUrl: null },
        { id: 2, presetKey: 'closeup', status: 'idle', imageUrl: null },
        { id: 3, presetKey: 'model_m', status: 'idle', imageUrl: null },
        { id: 4, presetKey: 'custom', status: 'idle', imageUrl: null }, 
    ]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const masterFileRef = useRef<HTMLInputElement>(null);

    // --- 1. FETCH DATA ---
    const fetchProducts = async (queryStr: string = '') => {
        setLoading(true);
        try {
            let query = supabase
                .from('products')
                .select('*, variants:product_variants(*)')
                .order('created_at', { ascending: false });

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

    // --- AI HANDLERS ---

    const handleTextGen = async () => {
        if (!formData.name) return alert('Введите название для генерации описания');
        setTextGenLoading(true);
        try {
            const res = await aiService.generateProductDescription(formData.name, formData.categories);
            setFormData(prev => ({
                ...prev,
                name: res.name || prev.name,
                description: res.description || prev.description
            }));
        } catch (e: any) {
            alert(e.message);
        } finally {
            setTextGenLoading(false);
        }
    };

    const handleMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // 1. Set local preview immediately
            setMasterPrintFile(file);
            setMasterPreview(URL.createObjectURL(file));
            
            // 2. Upload to Supabase to get Public URL for Pollinations
            setIsUploadingMaster(true);
            try {
                const fileExt = file.name.split('.').pop();
                // Use temp folder
                const fileName = `temp/master_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                
                const { error } = await supabase.storage.from('images').upload(fileName, file);
                if (error) throw error;
                
                const { data } = supabase.storage.from('images').getPublicUrl(fileName);
                setMasterPrintUrl(data.publicUrl);
            } catch (err: any) {
                alert('Ошибка загрузки макета: ' + err.message);
                setMasterPrintFile(null);
                setMasterPreview(null);
            } finally {
                setIsUploadingMaster(false);
            }
        }
    };

    const generateSlot = async (slotIndex: number) => {
        if (!masterPrintUrl) return alert('Сначала загрузите макет принта (шаг 1).');
        
        const slot = genSlots[slotIndex];
        setGenSlots(prev => prev.map((s, idx) => 
            idx === slotIndex ? { ...s, status: 'loading' } : s
        ));

        try {
            let prompt = "";
            if (slot.presetKey === 'custom') {
                if (!customPrompt) throw new Error("Введите промпт в поле ниже");
                prompt = customPrompt;
            } else {
                prompt = PROMPT_PRESETS[slot.presetKey].prompt;
            }

            // Pass the Public URL and Selected Model to the AI Service
            const imageUrl = await aiService.generateLookbook(masterPrintUrl, prompt, selectedModel);
            
            setGenSlots(prev => prev.map((s, idx) => 
                idx === slotIndex ? { ...s, status: 'success', imageUrl } : s
            ));
        } catch (e: any) {
            console.error(e);
            setGenSlots(prev => prev.map((s, idx) => 
                idx === slotIndex ? { ...s, status: 'error' } : s
            ));
            if (!isSequencing) alert(e.message);
        }
    };

    const handleDownload = async (imageUrl: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `gen_image_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Download failed', e);
            alert('Ошибка скачивания');
        }
    };

    const applyGeneratedImage = async (slotIndex: number) => {
        const slot = genSlots[slotIndex];
        if (!slot.imageUrl) return;

        try {
            const res = await fetch(slot.imageUrl);
            const blob = await res.blob();
            const file = new File([blob], `gen_${Date.now()}_${slotIndex}.png`, { type: 'image/png' });
            
            const fileName = `ai_gen_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
            const { error } = await supabase.storage.from('images').upload(fileName, file);
            
            if (error) throw error;
            const { data } = supabase.storage.from('images').getPublicUrl(fileName);
            
            setFormData(prev => ({ ...prev, images: [...prev.images, data.publicUrl] }));
        } catch (e: any) {
            alert('Ошибка сохранения: ' + e.message);
        }
    };

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
        // Reset AI Lab
        setMasterPrintFile(null);
        setMasterPreview(null);
        setMasterPrintUrl(null);
        setCustomPrompt('');
        setGenSlots(prev => prev.map(s => ({ ...s, status: 'idle', imageUrl: null })));
    };

    const handleCreate = () => {
        setFormData(INITIAL_FORM);
        setEditingId(null);
        setIsEditorOpen(true);
        // Reset AI Lab
        setMasterPrintFile(null);
        setMasterPreview(null);
        setMasterPrintUrl(null);
        setCustomPrompt('');
        setGenSlots(prev => prev.map(s => ({ ...s, status: 'idle', imageUrl: null })));
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
            {previewImage && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 cursor-pointer" onClick={() => setPreviewImage(null)}>
                    <button className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors"><X size={32} /></button>
                    <img src={previewImage} className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 border border-zinc-200">
                <div className="relative w-full md:w-96">
                    <input type="text" placeholder="ПОИСК ПО СКЛАДУ..." className="w-full pl-10 pr-4 py-2 border border-zinc-300 font-mono text-sm uppercase focus:border-blue-600 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
                <button onClick={handleCreate} className="flex items-center gap-2 bg-black text-white px-6 py-2 font-jura font-bold uppercase hover:bg-blue-600 transition-colors"><Plus size={18} /> Добавить Товар</button>
            </div>

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
                                        <td className="p-4"><img src={getImageUrl(p.images[0], 100)} className="w-12 h-16 object-cover bg-zinc-200 border border-zinc-300" /></td>
                                        <td className="p-4">
                                            <div className="font-bold uppercase font-jura">{p.name}</div>
                                            <div className="text-[10px] font-mono text-zinc-400">{p.id.split('-')[0]}...</div>
                                            {p.isHidden && <span className="text-[9px] bg-red-100 text-red-600 px-1 font-mono">HIDDEN</span>}
                                            {p.isNew && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 font-mono ml-1">NEW</span>}
                                            {p.isVipOnly && <span className="text-[9px] bg-black text-white px-1 font-mono ml-1">VIP ONLY</span>}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {p.categories?.map(c => (<span key={c} className="text-[9px] border border-zinc-300 px-1 rounded-sm uppercase">{c}</span>))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-mono">
                                            <div className="font-bold">{p.price.toLocaleString()} ₽</div>
                                            {p.cost_price ? <div className="text-[10px] text-zinc-400">COGS: {p.cost_price}</div> : <div className="text-[10px] text-red-300">NO COST</div>}
                                        </td>
                                        <td className="p-4 text-center"><span className={`font-mono font-bold ${totalStock === 0 ? 'text-red-500' : totalStock < 5 ? 'text-orange-500' : 'text-green-600'}`}>{totalStock}</span></td>
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

            {/* EDITOR DRAWER */}
            <div className={`fixed inset-0 z-[100] transition-all duration-300 ${isEditorOpen ? 'bg-black/40 pointer-events-auto' : 'pointer-events-none'}`} onClick={() => setIsEditorOpen(false)}>
                <div onClick={e => e.stopPropagation()} className={`absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl border-l border-black transform transition-transform duration-300 flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 border-b border-black flex justify-between items-center bg-zinc-50">
                        <div className="flex items-center gap-2">
                            <h2 className="font-jura text-2xl font-bold uppercase">{editingId ? 'РЕДАКТИРОВАНИЕ ТОВАРА' : 'НОВЫЙ ТОВАР'}</h2>
                            {!editingId && <span className="text-xs font-mono bg-blue-600 text-white px-2 py-1 rounded">DRAFT</span>}
                        </div>
                        <button onClick={() => setIsEditorOpen(false)} className="hover:rotate-90 transition-transform"><X size={24}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* BASIC INFO */}
                        <section className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 md:col-span-1">
                                <div className="flex justify-between mb-1">
                                    <label className="text-[10px] font-mono uppercase text-zinc-500">Название товара</label>
                                    <button onClick={handleTextGen} disabled={textGenLoading} className="text-[10px] text-blue-600 font-bold uppercase flex items-center gap-1 hover:underline">
                                        {textGenLoading ? <Loader2 className="animate-spin" size={10}/> : <Sparkles size={10}/>} AI GENERATE
                                    </button>
                                </div>
                                <input className="w-full border border-zinc-300 p-3 font-jura font-bold text-lg uppercase focus:border-blue-600 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="НАЗВАНИЕ..." />
                            </div>
                            <div className="col-span-2 md:col-span-1 grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Цена (RUB)</label><input type="number" className="w-full border border-zinc-300 p-3 font-mono font-bold focus:border-blue-600 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div>
                                <div><label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1 text-green-700">COGS (Себест.)</label><input type="number" className="w-full border border-green-200 bg-green-50 p-3 font-mono text-green-800 focus:border-green-600 outline-none" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} /></div>
                            </div>
                            <div className="col-span-2"><label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Описание</label><textarea rows={3} className="w-full border border-zinc-300 p-3 font-mono text-sm focus:border-blue-600 outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                        </section>

                        {/* AI LAB (FLUX) */}
                        <div className="border border-zinc-300 bg-zinc-50 p-6 relative overflow-hidden">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-4">
                                <h3 className="font-jura font-bold text-lg uppercase flex items-center gap-2">
                                    <Cpu size={20} className="text-blue-600"/> AI IMAGE LAB
                                </h3>
                                {/* MODEL SELECTOR */}
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-mono uppercase text-zinc-500 font-bold">MODEL:</label>
                                    <select 
                                        className="border border-black bg-white px-2 py-1 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                    >
                                        {AI_MODELS.map(m => (
                                            <option key={m.id} value={m.id}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-6 relative z-10">
                                <div className="w-1/4 shrink-0">
                                    <p className="text-[10px] font-mono font-bold uppercase mb-2 text-zinc-500">1. MASTER SOURCE (PRINT)</p>
                                    <div onClick={() => masterFileRef.current?.click()} className="aspect-[3/4] border-2 border-dashed border-zinc-400 bg-white flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors relative overflow-hidden group">
                                        {masterPreview ? (
                                            <>
                                                <img src={masterPreview} className="w-full h-full object-contain p-2" />
                                                {isUploadingMaster && (
                                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                        <div className="text-center">
                                                            <Loader2 className="animate-spin text-blue-600 mb-2" size={24}/>
                                                            <span className="text-[9px] font-mono font-bold text-blue-900">UPLOADING...</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Edit overlay */}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <span className="text-white text-xs font-mono uppercase">CHANGE FILE</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center text-zinc-400 p-4">
                                                <UploadCloud className="mx-auto mb-2"/>
                                                <span className="text-[9px] uppercase block">UPLOAD PNG/JPG</span>
                                            </div>
                                        )}
                                        <input ref={masterFileRef} type="file" accept="image/*" className="hidden" onChange={handleMasterUpload} />
                                    </div>
                                    <p className="text-[9px] text-zinc-400 mt-2 text-center">
                                        * Загружается в облако для обработки нейросетью.
                                    </p>
                                </div>

                                <div className="flex-1">
                                    <p className="text-[10px] font-mono font-bold uppercase mb-2 text-zinc-500">2. GENERATION GRID ({selectedModel.toUpperCase()})</p>
                                    <div className="grid grid-cols-4 gap-3">
                                        {genSlots.slice(0, 4).map((slot, idx) => (
                                            <div key={slot.id} className="relative group">
                                                {/* Dropdown for Preset Selection */}
                                                <select 
                                                    className="w-full mb-1 text-[9px] font-mono uppercase border border-zinc-300 bg-white p-1 outline-none focus:border-blue-600" 
                                                    value={slot.presetKey} 
                                                    onChange={(e) => { const newSlots = [...genSlots]; newSlots[idx].presetKey = e.target.value; setGenSlots(newSlots); }}
                                                >
                                                    {Object.entries(PROMPT_PRESETS).filter(([k]) => k !== 'custom').map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
                                                    <option value="custom">CUSTOM</option>
                                                </select>

                                                {/* Image Area */}
                                                <div className="aspect-[3/4] bg-white border border-zinc-300 relative overflow-hidden flex items-center justify-center">
                                                    {slot.status === 'loading' ? (
                                                        <div className="absolute inset-0 bg-zinc-100 animate-pulse flex items-center justify-center flex-col">
                                                            <Loader2 className="animate-spin text-zinc-400 mb-2"/>
                                                            <span className="text-[9px] font-mono text-zinc-400">PROCESSING...</span>
                                                        </div>
                                                    ) : slot.status === 'success' && slot.imageUrl ? (
                                                        <div className="w-full h-full relative cursor-pointer" onClick={() => setPreviewImage(slot.imageUrl)}>
                                                            <img src={slot.imageUrl} className="w-full h-full object-cover" />
                                                            {/* Actions Overlay on Hover */}
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2" onClick={e => e.stopPropagation()}>
                                                                <button onClick={() => applyGeneratedImage(idx)} className="w-full bg-green-600 text-white py-1 text-[9px] font-bold uppercase flex items-center justify-center gap-1 hover:bg-green-700"><Check size={10}/> Принять</button>
                                                                <div className="flex gap-1 w-full">
                                                                    <button onClick={() => generateSlot(idx)} className="flex-1 bg-white text-black py-1 text-[9px] font-bold uppercase flex items-center justify-center gap-1 hover:bg-zinc-200" title="Перегенерировать"><RefreshCw size={10}/></button>
                                                                    <button onClick={() => handleDownload(slot.imageUrl!)} className="flex-1 bg-blue-600 text-white py-1 text-[9px] font-bold uppercase flex items-center justify-center gap-1 hover:bg-blue-700" title="Скачать"><Download size={10}/></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // IDLE STATE: BIG GENERATE BUTTON
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-zinc-50">
                                                            {slot.status === 'error' && <div className="text-red-500 text-[9px] font-mono mb-2 bg-red-100 px-2 py-1 rounded">ERROR</div>}
                                                            <button 
                                                                onClick={() => generateSlot(idx)}
                                                                disabled={!masterPrintUrl}
                                                                className="bg-black text-white px-3 py-2 text-[9px] font-bold uppercase hover:bg-blue-600 transition-colors flex items-center gap-1 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Zap size={10} className="fill-current" /> GENERATE
                                                            </button>
                                                            {!masterPrintUrl && <span className="text-[8px] text-zinc-400 mt-1 uppercase">Загрузите макет</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Custom Prompt Input (Only shows if at least one slot is 'custom') */}
                                    {genSlots.slice(0,4).some(s => s.presetKey === 'custom') && (
                                        <div className="mt-4 p-3 bg-black text-green-400 font-mono text-xs border-l-4 border-green-500">
                                            <div className="flex items-center gap-2 mb-2 text-zinc-500 uppercase font-bold"><Terminal size={12}/> Custom Prompt Terminal</div>
                                            <textarea 
                                                className="w-full bg-transparent outline-none resize-none placeholder-zinc-700"
                                                rows={2}
                                                placeholder="Введите ваш промпт здесь (на английском)..."
                                                value={customPrompt}
                                                onChange={e => setCustomPrompt(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* PRODUCT IMAGES GALLERY */}
                        <section>
                            <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-2">Галерея товара</label>
                            <div className="grid grid-cols-6 gap-2">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-[3/4] group border border-zinc-200">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                                    </div>
                                ))}
                                <div onClick={() => fileInputRef.current?.click()} className="aspect-[3/4] border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors">
                                    {uploading ? <Loader2 className="animate-spin text-zinc-400"/> : <Plus size={24} className="text-zinc-300"/>}
                                </div>
                                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleImageUpload} />
                            </div>
                        </section>

                        {/* VARIANTS & ATTRIBUTES */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-2">Категории</label>
                                <div className="space-y-2">
                                    {CATEGORIES.map(cat => (
                                        <label key={cat} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={formData.categories.includes(cat)} onChange={e => {
                                                const newCats = e.target.checked ? [...formData.categories, cat] : formData.categories.filter(c => c !== cat);
                                                setFormData({...formData, categories: newCats});
                                            }} />
                                            <span className="text-sm font-mono uppercase">{cat}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-2">Настройки доступа</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isNew} onChange={e => setFormData({...formData, isNew: e.target.checked})} /><span className="text-sm font-mono uppercase text-blue-600 font-bold">NEW DROP</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isVipOnly} onChange={e => setFormData({...formData, isVipOnly: e.target.checked})} /><span className="text-sm font-mono uppercase text-purple-600 font-bold flex items-center gap-1"><Lock size={12}/> VIP ONLY</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isHidden} onChange={e => setFormData({...formData, isHidden: e.target.checked})} /><span className="text-sm font-mono uppercase text-red-600 font-bold">СКРЫТЬ ТОВАР</span></label>
                                </div>
                            </div>
                        </div>

                        {/* STOCK */}
                        <section className="bg-zinc-50 p-4 border border-zinc-200">
                            <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-2">Складской учет</label>
                            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                {SIZES.map(size => (
                                    <div key={size}>
                                        <div className="text-[10px] font-bold text-center mb-1">{size}</div>
                                        <input type="number" className="w-full border border-zinc-300 p-1 text-center text-sm" value={formData.variants[size] || 0} onChange={e => setFormData({...formData, variants: {...formData.variants, [size]: parseInt(e.target.value) || 0}})} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="p-6 border-t border-black bg-white flex gap-4">
                        <button onClick={handleSave} disabled={uploading} className="flex-1 bg-black text-white py-4 font-jura font-bold uppercase hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                            {uploading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} СОХРАНИТЬ ИЗМЕНЕНИЯ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProducts;
