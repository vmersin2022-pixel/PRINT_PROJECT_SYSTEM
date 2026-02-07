
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Product, Category } from '../../types';
import { Plus, Search, Edit2, Trash2, X, UploadCloud, Save, Loader2, Image as ImageIcon, AlertTriangle, Calendar, Lock, Coins, Sparkles, Wand2, Camera, Cpu, LayoutGrid, Check, RefreshCw, ArrowRight, Terminal, Download, Maximize2, Play, AlertCircle, Clock } from 'lucide-react';
import { useApp } from '../../context';
import { getImageUrl } from '../../utils';
import { aiService } from '../../services/aiService';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'OS'];
const CATEGORIES: Category[] = ['t-shirts', 'sets', 'accessories', 'fresh_drop', 'last_drop'];

// --- AI PROMPT PRESETS ---
const PROMPT_PRESETS: Record<string, { label: string, prompt: string }> = {
    'flat_lay': { 
        label: 'Каталожное (Flat Lay)', 
        prompt: "Премиальный мокап черной футболки из плотного тяжелого хлопка. Футболка сложена стильно, с легким объемом, подчеркивающим крой оверсайз. Лежит на ровной бетонно-серой поверхности. Естественный мягкий свет сбоку, подчеркивающий складки ткани и премиальное качество. Качественное фото для интернет-магазина, резкий фокус, гиперреализм" 
    },
    'closeup': { 
        label: 'Макро (Принт близко)', 
        prompt: "Крупный макроснимок белой хлопковой ткани, на которой нанесён типографский принт (принт приложен к заданию). Ракурс низкий и слегка диагональный, камера расположена очень близко к поверхности, создавая ощущение глубины и фокус на текстуре ткани. Экспозиция мягкая и светлая, с рассеянным дневным светом, подчёркивающим матовую поверхность материала и мелкие волокна.Принт выполнен методом дтф:  буквы выглядят плотно нанесёнными и слегка глянцевыми. Хорошо различима лёгкая фактура чернил, создающая рельеф. На ткани видны мелкие ворсинки, что добавляет реалистичности. Глубина резкости мала: передний план и центр изображения в резком фокусе, края плавно размыты" 
    },
    'model_m': { 
        label: 'Модель (Парень)', 
        prompt: `ТЫ — ВЕДУЩИЙ ВИЗУАЛЬНЫЙ ХУДОЖНИК В СФЕРЕ STREETWEAR И URBAN FASHION.

ЗАДАЧА:
Показать парня в чёрной футболке с прикреплённым принтом в уличном лайфстайл-контексте.
Принт должен быть ТОЧНО СКОПИРОВАН с reference image и выглядеть как реальная печать на ткани.

МОДЕЛЬ:
- Парень 22–30 лет
- Современный городской стиль
- Расслабленная поза
- Минимальные аксессуары (без отвлечения от принта)

ОДЕЖДА:
- Чёрная футболка, матовая ткань
- Принт строго по центру груди
- Реалистичное взаимодействие принта с тканью

ОКРУЖЕНИЕ:
- Городской фон (бетон, улица, стена)
- Фон слегка размытый, акцент на футболке

ОГРАНИЧЕНИЯ:
- Не изменять принт
- Не добавлять дополнительные графические элементы
- Не стилизовать принт под арт или иллюстрацию` 
    },
    'model_f': { 
        label: 'Модель (Девушка)', 
        prompt: `ТЫ — ЭКСПЕРТ ПО МАКРО-СЪЁМКЕ ТЕКСТИЛЯ И ПРИНТОВ НА ОДЕЖДЕ.

ЗАДАЧА:
Показать верхнюю часть торса девушки в чёрной футболке с прикреплённым принтом.
Основной акцент — качество печати и текстура ткани.

ДЕТАЛИ:
- Кадр от плеч до груди
- Видны складки ткани
- Принт чёткий и реалистичный

ПРИНТ:
- Полное соответствие reference image
- Без изменений дизайна

ЗАПРЕТЫ:
- Не добавлять фильтры
- Не стилизовать изображение
- Не менять форму принта` 
    },
    'custom': {
        label: 'CUSTOM INPUT',
        prompt: '' // Placeholder, logic uses state
    }
};

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
    errorMsg?: string;
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
    const [textGenLoading, setTextGenLoading] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [cooldownTimer, setCooldownTimer] = useState(0);
    const [isSequencing, setIsSequencing] = useState(false);
    
    const [genSlots, setGenSlots] = useState<GenerationSlot[]>([
        { id: 1, presetKey: 'flat_lay', status: 'idle', imageUrl: null },
        { id: 2, presetKey: 'closeup', status: 'idle', imageUrl: null },
        { id: 3, presetKey: 'model_m', status: 'idle', imageUrl: null },
        { id: 4, presetKey: 'model_f', status: 'idle', imageUrl: null },
        { id: 5, presetKey: 'custom', status: 'idle', imageUrl: null }, // 5th Slot for Custom
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
                .order('created_at', { ascending: false }); // Newest first

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

    // Timer effect for sequencing
    useEffect(() => {
        if (cooldownTimer > 0) {
            const timer = setTimeout(() => setCooldownTimer(t => t - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldownTimer]);

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

    const handleMasterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setMasterPrintFile(file);
            setMasterPreview(URL.createObjectURL(file));
        }
    };

    const generateSlot = async (slotIndex: number) => {
        if (!masterPrintFile) return alert('Загрузите мастер-принт');
        
        const slot = genSlots[slotIndex];
        
        // Optimistic update
        setGenSlots(prev => prev.map((s, idx) => 
            idx === slotIndex ? { ...s, status: 'loading', errorMsg: undefined } : s
        ));

        try {
            // Logic to select prompt: Custom vs Preset
            let prompt = "";
            if (slot.presetKey === 'custom') {
                if (!customPrompt) throw new Error("Введите промпт в терминал");
                prompt = customPrompt;
            } else {
                prompt = PROMPT_PRESETS[slot.presetKey].prompt;
            }

            const imageUrl = await aiService.generateLookbook(masterPrintFile, prompt);
            
            setGenSlots(prev => prev.map((s, idx) => 
                idx === slotIndex ? { ...s, status: 'success', imageUrl } : s
            ));
        } catch (e: any) {
            console.error(e);
            setGenSlots(prev => prev.map((s, idx) => 
                idx === slotIndex ? { ...s, status: 'error', errorMsg: e.message } : s
            ));
            // Don't alert if sequencing, just log
            if (!isSequencing) alert(e.message);
        }
    };

    const handleRenderSequentially = async () => {
        if (!masterPrintFile) return alert('Загрузите мастер-принт');
        
        setIsSequencing(true);
        // Only render the first 4 slots (presets). Custom slot (index 4) is manual.
        for (let i = 0; i < 4; i++) {
            // Skip custom slot or if user cancelled (logic for cancel not impl here for simplicity)
            
            // Generate
            await generateSlot(i);
            
            // Wait 15 seconds if not the last one
            if (i < 3) {
                setCooldownTimer(15);
                await new Promise(resolve => setTimeout(resolve, 15000));
            }
        }
        setIsSequencing(false);
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

        // Convert Data URL to File for Supabase Upload
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
        // Reset AI
        setMasterPrintFile(null);
        setMasterPreview(null);
        setCustomPrompt('');
        setGenSlots(prev => prev.map(s => ({ ...s, status: 'idle', imageUrl: null, errorMsg: undefined })));
    };

    const handleCreate = () => {
        setFormData(INITIAL_FORM);
        setEditingId(null);
        setIsEditorOpen(true);
        // Reset AI
        setMasterPrintFile(null);
        setMasterPreview(null);
        setCustomPrompt('');
        setGenSlots(prev => prev.map(s => ({ ...s, status: 'idle', imageUrl: null, errorMsg: undefined })));
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
            
            {/* --- FULL SCREEN IMAGE PREVIEW MODAL --- */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setPreviewImage(null)}
                >
                    <button className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-[10000]">
                        <X size={32} />
                    </button>
                    <img 
                        src={previewImage} 
                        className="max-w-full max-h-full object-contain" 
                        onClick={e => e.stopPropagation()} // Prevent closing when clicking image
                    />
                </div>
            )}

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
                    className={`absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl border-l border-black transform transition-transform duration-300 flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    
                    {/* Header */}
                    <div className="p-6 border-b border-black flex justify-between items-center bg-zinc-50">
                        <div className="flex items-center gap-2">
                            <h2 className="font-jura text-2xl font-bold uppercase">
                                {editingId ? 'РЕДАКТИРОВАНИЕ ТОВАРА' : 'НОВЫЙ ТОВАР'}
                            </h2>
                            {!editingId && <span className="text-xs font-mono bg-blue-600 text-white px-2 py-1 rounded">ЧЕРНОВИК</span>}
                        </div>
                        <button onClick={() => setIsEditorOpen(false)} className="hover:rotate-90 transition-transform"><X size={24}/></button>
                    </div>

                    {/* Scrollable Form */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        
                        {/* 1. MAIN INFO (Smart Assistant) */}
                        <section className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 md:col-span-1">
                                <div className="flex justify-between mb-1">
                                    <label className="text-[10px] font-mono uppercase text-zinc-500">Название товара</label>
                                    <button onClick={handleTextGen} disabled={textGenLoading} className="text-[10px] text-blue-600 font-bold uppercase flex items-center gap-1 hover:underline">
                                        {textGenLoading ? <Loader2 className="animate-spin" size={10}/> : <Sparkles size={10}/>} AI ГЕНЕРАЦИЯ
                                    </button>
                                </div>
                                <input 
                                    className="w-full border border-zinc-300 p-3 font-jura font-bold text-lg uppercase focus:border-blue-600 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    placeholder="НАЗВАНИЕ..."
                                />
                            </div>
                            
                            <div className="col-span-2 md:col-span-1 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Цена (RUB)</label>
                                    <input 
                                        type="number"
                                        className="w-full border border-zinc-300 p-3 font-mono font-bold focus:border-blue-600 outline-none"
                                        value={formData.price}
                                        onChange={e => setFormData({...formData, price: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1 text-green-700">COGS (Себест.)</label>
                                    <input 
                                        type="number"
                                        className="w-full border border-green-200 bg-green-50 p-3 font-mono text-green-800 focus:border-green-600 outline-none"
                                        value={formData.costPrice}
                                        onChange={e => setFormData({...formData, costPrice: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Описание</label>
                                <textarea 
                                    rows={3}
                                    className="w-full border border-zinc-300 p-3 font-mono text-sm focus:border-blue-600 outline-none"
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </section>

                        {/* 2. AI IMAGE LAB (New Layout) */}
                        <div className="border border-zinc-300 bg-zinc-50 p-6 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <h3 className="font-jura font-bold text-lg uppercase flex items-center gap-2">
                                    <Cpu size={20} className="text-blue-600"/> 
                                    AI ФОТО-ЛАБ 
                                    <span className="text-xs font-mono bg-black text-white px-2 py-0.5 rounded">ПАКЕТНАЯ ГЕНЕРАЦИЯ</span>
                                </h3>
                                <div className="flex items-center gap-4">
                                    {cooldownTimer > 0 && (
                                        <span className="text-xs font-mono text-orange-600 flex items-center gap-1 animate-pulse">
                                            <Clock size={12}/> {cooldownTimer}s cooldown
                                        </span>
                                    )}
                                    <button 
                                        onClick={handleRenderSequentially}
                                        disabled={!masterPrintFile || isSequencing}
                                        className="bg-blue-600 text-white px-6 py-2 font-jura font-bold uppercase hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                                    >
                                        {isSequencing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} 
                                        {isSequencing ? 'ГЕНЕРАЦИЯ...' : 'ЗАПУСК (ПО ОЧЕРЕДИ)'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-6 relative z-10">
                                {/* MASTER SOURCE */}
                                <div className="w-1/4 shrink-0">
                                    <p className="text-[10px] font-mono font-bold uppercase mb-2 text-zinc-500">1. ИСХОДНИК (ПРИНТ)</p>
                                    <div 
                                        onClick={() => masterFileRef.current?.click()}
                                        className="aspect-[3/4] border-2 border-dashed border-zinc-400 bg-white flex flex-col items-center justify-center cursor-pointer hover:border-black transition-colors relative overflow-hidden"
                                    >
                                        {masterPreview ? (
                                            <img src={masterPreview} className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <div className="text-center text-zinc-400 p-4">
                                                <UploadCloud className="mx-auto mb-2"/>
                                                <span className="text-[9px] uppercase block">ЗАГРУЗИТЬ PNG/JPG</span>
                                            </div>
                                        )}
                                        <input ref={masterFileRef} type="file" accept="image/*" className="hidden" onChange={handleMasterUpload} />
                                    </div>
                                    {masterPrintFile && <p className="text-[9px] font-mono mt-1 truncate text-zinc-500">{masterPrintFile.name}</p>}
                                </div>

                                {/* BATCH GRID */}
                                <div className="flex-1">
                                    <p className="text-[10px] font-mono font-bold uppercase mb-2 text-zinc-500">2. ВАРИАНТЫ (4X)</p>
                                    <div className="grid grid-cols-4 gap-3">
                                        {genSlots.slice(0, 4).map((slot, idx) => (
                                            <div key={slot.id} className="relative group">
                                                {/* PRESET SELECTOR */}
                                                <select 
                                                    className="w-full mb-1 text-[9px] font-mono uppercase border border-zinc-300 bg-white p-1 outline-none focus:border-blue-600"
                                                    value={slot.presetKey}
                                                    onChange={(e) => {
                                                        const newSlots = [...genSlots];
                                                        newSlots[idx].presetKey = e.target.value;
                                                        setGenSlots(newSlots);
                                                    }}
                                                >
                                                    {Object.entries(PROMPT_PRESETS).filter(([k]) => k !== 'custom').map(([key, val]) => (
                                                        <option key={key} value={key}>{val.label}</option>
                                                    ))}
                                                </select>

                                                {/* PREVIEW AREA */}
                                                <div 
                                                    className="aspect-[3/4] bg-white border border-zinc-300 relative overflow-hidden flex items-center justify-center group"
                                                >
                                                    {slot.status === 'loading' ? (
                                                        <div className="absolute inset-0 bg-zinc-100 animate-pulse flex items-center justify-center">
                                                            <Loader2 className="animate-spin text-zinc-400"/>
                                                        </div>
                                                    ) : slot.status === 'success' && slot.imageUrl ? (
                                                        <>
                                                            <img 
                                                                src={slot.imageUrl} 
                                                                className="w-full h-full object-cover" 
                                                            />
                                                            <div className="absolute top-1 right-1 bg-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                                <Maximize2 size={10} className="text-black"/>
                                                            </div>
                                                        </>
                                                    ) : slot.status === 'error' ? (
                                                        <div className="text-red-500 text-[9px] font-mono text-center p-2 flex flex-col items-center">
                                                            <AlertCircle size={16} className="mb-1"/>
                                                            <span className="leading-tight">{slot.errorMsg || 'ERROR'}</span>
                                                            <button onClick={() => generateSlot(idx)} className="mt-2 bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200">RETRY</button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center">
                                                            <LayoutGrid size={24} className="text-zinc-200 mb-2"/>
                                                            <button 
                                                                onClick={() => generateSlot(idx)} 
                                                                className="bg-black text-white px-3 py-1 text-[9px] font-bold uppercase hover:bg-blue-600 transition-colors flex items-center gap-1"
                                                            >
                                                                <Play size={8} fill="currentColor"/> GEN
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* HOVER ACTIONS (Only on Success) */}
                                                    {slot.status === 'success' && slot.imageUrl && (
                                                        <div 
                                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 cursor-zoom-in"
                                                            onClick={() => setPreviewImage(slot.imageUrl)}
                                                        >
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); applyGeneratedImage(idx); }}
                                                                className="w-full bg-green-600 text-white py-1 text-[9px] font-bold uppercase flex items-center justify-center gap-1 hover:bg-green-700"
                                                            >
                                                                <Check size={10}/> Принять
                                                            </button>
                                                            <div className="flex gap-1 w-full">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); generateSlot(idx); }}
                                                                    className="flex-1 bg-white text-black py-1 text-[9px] font-bold uppercase flex items-center justify-center gap-1 hover:bg-zinc-200"
                                                                >
                                                                    <RefreshCw size={10}/>
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleDownload(slot.imageUrl!); }}
                                                                    className="flex-1 bg-blue-600 text-white py-1 text-[9px] font-bold uppercase flex items-center justify-center gap-1 hover:bg-blue-700"
                                                                >
                                                                    <Download size={10}/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* CUSTOM TERMINAL (NEW) */}
                            <div className="mt-6 bg-black p-4 flex gap-6 items-stretch relative z-10 border border-zinc-700">
                                <div className="flex-1 flex flex-col justify-between">
                                    <div className="flex items-center gap-2 text-green-500 font-mono text-xs uppercase mb-2">
                                        <Terminal size={14}/>
                                        <span className="animate-pulse">ДОСТУП_К_ТЕРМИНАЛУ</span>
                                    </div>
                                    <div className="flex-1 bg-zinc-900 border border-zinc-700 p-2 font-mono text-sm text-green-400 focus-within:border-green-600 flex gap-2">
                                        <span className="select-none text-green-700">{'>_'}</span>
                                        <textarea 
                                            value={customPrompt}
                                            onChange={e => setCustomPrompt(e.target.value)}
                                            placeholder="Введите уникальный промпт здесь (например: футболка лежит на капоте кибертрака, дождь, неон)..."
                                            className="bg-transparent border-none outline-none w-full h-full resize-none placeholder-zinc-700"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => generateSlot(4)} // Index 4 is the custom slot
                                        disabled={!masterPrintFile || !customPrompt}
                                        className="mt-2 w-full bg-green-900 text-green-100 py-2 font-mono text-xs uppercase hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50 disabled:bg-zinc-800"
                                    >
                                        [ EXECUTE COMMAND ]
                                    </button>
                                </div>

                                {/* Custom Result Slot (Index 4) */}
                                <div className="w-1/4 shrink-0">
                                    <div className="relative group h-full">
                                        <div 
                                            className="aspect-[3/4] bg-zinc-900 border border-zinc-700 relative overflow-hidden flex items-center justify-center h-full group"
                                        >
                                            {genSlots[4].status === 'loading' ? (
                                                <div className="text-green-500 font-mono text-xs animate-pulse text-center">PROCESSING...<br/>PLEASE WAIT</div>
                                            ) : genSlots[4].status === 'success' && genSlots[4].imageUrl ? (
                                                <>
                                                    <img 
                                                        src={genSlots[4].imageUrl!} 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                    <div className="absolute top-1 right-1 bg-black/50 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                        <Maximize2 size={12} className="text-green-500"/>
                                                    </div>
                                                </>
                                            ) : genSlots[4].status === 'error' ? (
                                                <div className="text-red-500 text-[9px] font-mono text-center p-2 flex flex-col items-center">
                                                    <AlertCircle size={16} className="mb-1"/>
                                                    <span>SYSTEM ERROR</span>
                                                    <button onClick={() => generateSlot(4)} className="mt-2 bg-red-900 text-red-100 px-2 py-1 rounded hover:bg-red-800 uppercase text-[9px]">RETRY</button>
                                                </div>
                                            ) : (
                                                <div className="text-zinc-700 font-mono text-[9px] text-center p-4">WAITING FOR<br/>INPUT DATA</div>
                                            )}

                                            {genSlots[4].status === 'success' && genSlots[4].imageUrl && (
                                                <div 
                                                    className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 cursor-zoom-in"
                                                    onClick={() => setPreviewImage(genSlots[4].imageUrl)}
                                                >
                                                    <button onClick={(e) => { e.stopPropagation(); applyGeneratedImage(4); }} className="w-full bg-green-600 text-white py-1 text-[9px] font-bold uppercase">APPLY</button>
                                                    <div className="flex gap-1 w-full">
                                                        <button onClick={(e) => { e.stopPropagation(); generateSlot(4); }} className="flex-1 bg-white text-black py-1 text-[9px] font-bold uppercase">RETRY</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDownload(genSlots[4].imageUrl!); }} className="flex-1 bg-blue-600 text-white py-1 text-[9px] font-bold uppercase"><Download size={10}/></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* DECORATIVE BG */}
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                <Cpu size={120} />
                            </div>
                        </div>

                        {/* 3. GALLERY (MANUAL) */}
                        <section>
                            <h3 className="font-bold text-sm uppercase mb-4 flex items-center gap-2 text-zinc-500"><ImageIcon size={16}/> Галерея товара</h3>
                            <div className="grid grid-cols-5 gap-4">
                                {/* Existing Images */}
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-[3/4] group border border-zinc-200 bg-white cursor-pointer" onClick={() => setPreviewImage(img)}>
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                            className="absolute top-1 right-1 bg-red-600 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12}/>
                                        </button>
                                        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-full pointer-events-none">
                                            <Maximize2 size={12}/>
                                        </div>
                                        {idx === 0 && <span className="absolute bottom-0 left-0 bg-blue-600 text-white text-[9px] px-1 font-mono">MAIN</span>}
                                    </div>
                                ))}
                                
                                {/* Upload Button */}
                                <label className="aspect-[3/4] border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-zinc-50 transition-colors">
                                    {uploading ? <Loader2 className="animate-spin text-zinc-400"/> : <UploadCloud className="text-zinc-400 mb-2"/>}
                                    <span className="text-[9px] font-mono text-center uppercase text-zinc-500">
                                        {uploading ? 'ЗАГРУЗКА...' : 'ЗАГРУЗИТЬ ФАЙЛ'}
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

                                {/* Empty Slots (Placeholders to show capacity) */}
                                {Array.from({ length: Math.max(0, 7 - formData.images.length) }).map((_, i) => (
                                    <div key={`empty-${i}`} className="aspect-[3/4] border border-zinc-100 bg-zinc-50 flex items-center justify-center">
                                        <div className="w-8 h-8 border border-zinc-200 rounded-full flex items-center justify-center">
                                            <Plus size={14} className="text-zinc-300"/>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 4. SETTINGS & STOCK */}
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50 p-4 border border-zinc-200">
                            
                            {/* Stock */}
                            <div>
                                <h4 className="font-bold text-xs uppercase mb-3 text-zinc-500">Склад</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    {SIZES.map(size => (
                                        <div key={size} className="bg-white border border-zinc-300 p-1 text-center">
                                            <div className="text-[9px] font-bold text-zinc-400">{size}</div>
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-full text-center font-mono text-sm border-none focus:outline-none font-bold"
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
                            </div>

                            {/* Options */}
                            <div>
                                <h4 className="font-bold text-xs uppercase mb-3 text-zinc-500">Опции</h4>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input type="checkbox" checked={formData.isNew} onChange={e => setFormData({...formData, isNew: e.target.checked})} className="accent-blue-600"/>
                                        <span className="font-mono text-xs uppercase">СВЕЖИЙ ДРОП</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input type="checkbox" checked={formData.isVipOnly} onChange={e => setFormData({...formData, isVipOnly: e.target.checked})} className="accent-black"/>
                                        <span className="font-mono text-xs uppercase font-bold flex items-center gap-1"><Lock size={10}/> VIP ONLY</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input type="checkbox" checked={formData.isHidden} onChange={e => setFormData({...formData, isHidden: e.target.checked})} className="accent-red-600"/>
                                        <span className="font-mono text-xs uppercase text-red-600">СКРЫТЬ ТОВАР</span>
                                    </label>
                                </div>
                                
                                <div className="mt-4">
                                    <label className="text-[9px] font-mono uppercase text-zinc-500 block mb-1">Категории</label>
                                    <div className="flex flex-wrap gap-1">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => {
                                                    const has = formData.categories.includes(cat);
                                                    setFormData(prev => ({ ...prev, categories: has ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat] }));
                                                }}
                                                className={`text-[9px] px-2 py-0.5 border uppercase ${formData.categories.includes(cat) ? 'bg-black text-white border-black' : 'bg-white text-zinc-400 border-zinc-300'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-black bg-white flex gap-4 sticky bottom-0 z-20">
                        <button 
                            onClick={() => setIsEditorOpen(false)} 
                            className="flex-1 py-4 border border-zinc-300 font-jura font-bold uppercase hover:bg-zinc-100"
                        >
                            Отмена
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={uploading}
                            className="flex-[2] py-4 bg-black text-white font-jura font-bold uppercase hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
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
