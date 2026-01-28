import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import { Product, Category, Collection } from '../types';
import FancyButton from '../components/ui/FancyButton';
import { supabase } from '../supabaseClient';
import { Trash2, Edit2, Eye, EyeOff, Plus, LogOut, Package, Upload, Database, AlertTriangle, X, Lock, Loader2, Layers, CheckSquare, Square, Shirt, Ruler } from 'lucide-react';

const Admin: React.FC = () => {
  const { products, collections, addProduct, updateProduct, deleteProduct, addCollection, deleteCollection } = useApp();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add submitting state to prevent double clicks
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'products' | 'collections'>('products');

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- PRODUCT FORM STATE ---
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    price: 0,
    categories: [],
    collectionIds: [],
    description: '',
    images: ['https://picsum.photos/800/1000'],
    sizes: ['S', 'M', 'L', 'XL'],
    isNew: false,
    isHidden: false
  });

  // --- COLLECTION FORM STATE ---
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [editCollectionId, setEditCollectionId] = useState<string | null>(null);

  const [collectionForm, setCollectionForm] = useState<Partial<Collection>>({
    title: '',
    desc: '',
    image: 'https://picsum.photos/800/1000',
    link: '/catalog'
  });

  // Словарь для перевода категорий
  const CATEGORY_LABELS: Record<Category, string> = {
    'fresh_drop': 'СВЕЖИЙ ДРОП',
    't-shirts': 'ФУТБОЛКИ',
    'sets': 'КОМПЛЕКТЫ',
    'accessories': 'АКСЕССУАРЫ',
    'last_drop': 'ЗАВЕРШАЕМ ДРОП'
  };

  const ALL_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- AUTH HANDLERS ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Ошибка входа: ' + error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- UPLOAD HANDLER ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('images')
            .getPublicUrl(fileName);

        if (data && data.publicUrl) {
            callback(data.publicUrl);
        }
    } catch (error: any) {
        console.error('Upload Error:', error);
        alert(`Не удалось загрузить фото. \nОшибка: ${error.message}\n\nУбедитесь, что Bucket 'images' создан.`);
    } finally {
        setUploading(false);
    }
  };

  // --- ID GENERATOR ---
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
  };

  // --- PRODUCT HANDLERS ---
  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if ((productForm.images?.length || 0) >= 6) {
        alert("ЛИМИТ: МАКСИМУМ 6 ФОТО");
        return;
    }
    handleFileUpload(e, (url) => {
        setProductForm(prev => ({ ...prev, images: [...(prev.images || []), url] }));
    });
  };

  const handleAddProductImageUrl = () => {
    if (!imageUrlInput) return;
    setProductForm(prev => ({ ...prev, images: [...(prev.images || []), imageUrlInput] }));
    setImageUrlInput('');
  };

  const toggleProductCollection = (colId: string) => {
    setProductForm(prev => {
        const current = prev.collectionIds || [];
        if (current.includes(colId)) {
            return { ...prev, collectionIds: current.filter(id => id !== colId) };
        } else {
            return { ...prev, collectionIds: [...current, colId] };
        }
    });
  };

  const toggleProductCategory = (cat: Category) => {
    setProductForm(prev => {
        const current = prev.categories || [];
        if (current.includes(cat)) {
            return { ...prev, categories: current.filter(c => c !== cat) };
        } else {
            return { ...prev, categories: [...current, cat] };
        }
    });
  };

  const toggleProductSize = (size: string) => {
    setProductForm(prev => {
        const current = prev.sizes || [];
        if (current.includes(size)) {
            return { ...prev, sizes: current.filter(s => s !== size) };
        } else {
            // Keep sizes sorted
            const newSizes = [...current, size];
            return { ...prev, sizes: ALL_SIZES.filter(s => newSizes.includes(s)) };
        }
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) { alert('НУЖНА АВТОРИЗАЦИЯ'); return; }
    if (!productForm.name || !productForm.price) return;
    setIsSubmitting(true);

    const finalImages = (productForm.images && productForm.images.length > 0) 
        ? productForm.images 
        : ['https://picsum.photos/800/1000'];

    // Ensure sizes are set, default to S-XL if empty
    const finalSizes = (productForm.sizes && productForm.sizes.length > 0)
        ? productForm.sizes
        : ['S', 'M', 'L', 'XL'];

    if (isEditing && editId) {
      await updateProduct(editId, { ...productForm, images: finalImages, sizes: finalSizes });
    } else {
      await addProduct({
        id: generateId(),
        name: productForm.name!,
        price: Number(productForm.price),
        categories: productForm.categories || [],
        collectionIds: productForm.collectionIds || [],
        description: productForm.description || '',
        images: finalImages,
        sizes: finalSizes,
        isNew: productForm.isNew || false,
        isHidden: productForm.isHidden || false
      });
    }
    resetProductForm();
    setIsSubmitting(false);
  };

  const startEditProduct = (product: Product) => {
    setIsEditing(true);
    setEditId(product.id);
    setProductForm(product);
    setImageUrlInput('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetProductForm = () => {
    setIsEditing(false);
    setEditId(null);
    setProductForm({
      name: '',
      price: 0,
      categories: [],
      collectionIds: [],
      description: '',
      images: ['https://picsum.photos/800/1000'],
      sizes: ['S', 'M', 'L', 'XL'],
      isNew: false,
      isHidden: false
    });
  };

  // --- COLLECTION HANDLERS ---
  const handleCollectionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e, (url) => {
        setCollectionForm(prev => ({ ...prev, image: url }));
    });
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) { alert('НУЖНА АВТОРИЗАЦИЯ'); return; }
    if (!collectionForm.title) return;
    setIsSubmitting(true);

    if (isEditingCollection && editCollectionId) {
        await addCollection({
            id: editCollectionId, 
            title: collectionForm.title!,
            desc: collectionForm.desc || '',
            image: collectionForm.image || 'https://picsum.photos/800/1000',
            link: collectionForm.link || '/catalog'
        });
    } else {
        await addCollection({
            id: generateId(),
            title: collectionForm.title!,
            desc: collectionForm.desc || '',
            image: collectionForm.image || 'https://picsum.photos/800/1000',
            link: collectionForm.link || '/catalog'
        });
    }
    
    resetCollectionForm();
    setIsSubmitting(false);
  };

  const startEditCollection = (col: Collection) => {
      setIsEditingCollection(true);
      setEditCollectionId(col.id);
      setCollectionForm(col);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetCollectionForm = () => {
      setIsEditingCollection(false);
      setEditCollectionId(null);
      setCollectionForm({ title: '', desc: '', image: '', link: '' });
  };

  const getProductsInCollection = (colId: string) => {
      return products.filter(p => Array.isArray(p.collectionIds) && p.collectionIds.includes(colId));
  };

  if (loading) return <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white font-mono">ЗАГРУЗКА СИСТЕМЫ...</div>;

  const availableCategories: Category[] = ['fresh_drop', 't-shirts', 'sets', 'accessories', 'last_drop'];

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-12">
      <div className="container mx-auto px-4">
        
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-8 border-b border-black pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${session ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-mono text-xs text-zinc-500">{session ? 'БЕЗОПАСНОЕ СОЕДИНЕНИЕ' : 'РЕЖИМ ЧТЕНИЯ'}</span>
            </div>
            <h1 className="font-jura text-4xl font-bold uppercase">Админ Панель</h1>
            <div className="flex gap-4 mt-4">
                <button 
                    onClick={() => setActiveTab('products')}
                    className={`font-mono text-sm px-4 py-2 border border-black transition-colors ${activeTab === 'products' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'}`}
                >
                    ТОВАРЫ
                </button>
                <button 
                    onClick={() => setActiveTab('collections')}
                    className={`font-mono text-sm px-4 py-2 border border-black transition-colors ${activeTab === 'collections' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'}`}
                >
                    КОЛЛЕКЦИИ
                </button>
            </div>
          </div>
          
          <div className="flex gap-4 items-end flex-wrap">
             {session ? (
                 <button onClick={handleLogout} className="flex items-center gap-2 font-mono text-xs hover:text-red-600 transition-colors border border-zinc-300 px-3 py-1 h-8">
                     <LogOut size={14} /> ВЫЙТИ
                 </button>
             ) : (
                 <form onSubmit={handleLogin} className="flex flex-col sm:flex-row gap-2 items-end">
                    <input type="email" placeholder="EMAIL" value={email} onChange={e => setEmail(e.target.value)} className="bg-white border border-zinc-300 p-1 font-mono text-xs w-40" />
                    <input type="password" placeholder="ПАРОЛЬ" value={password} onChange={e => setPassword(e.target.value)} className="bg-white border border-zinc-300 p-1 font-mono text-xs w-32" />
                    <button type="submit" className="bg-black text-white px-4 py-1 font-jura text-xs font-bold">ВОЙТИ</button>
                 </form>
             )}
          </div>
        </div>

        {/* --- PRODUCTS TAB --- */}
        {activeTab === 'products' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* EDITOR */}
            <div className="lg:col-span-1">
                <div className={`bg-white border border-black p-6 sticky top-24 shadow-lg ${!session ? 'opacity-50 pointer-events-none' : ''}`}>
                {!session && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50"><div className="bg-black text-white px-3 py-1 font-mono text-xs flex gap-2"><Lock size={12} /> LOCKED</div></div>}
                <h2 className="font-jura text-xl font-bold uppercase mb-6 flex items-center gap-2">
                    {isEditing ? <Edit2 size={18} /> : <Plus size={18} />} {isEditing ? 'Редактировать' : 'Новый Товар'}
                </h2>
                <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-mono text-zinc-400">НАЗВАНИЕ (AUTO-CAPS)</label>
                        <input 
                            type="text" 
                            className="w-full bg-zinc-50 border border-zinc-200 p-2 font-jura uppercase" 
                            value={productForm.name} 
                            onChange={e => setProductForm({...productForm, name: e.target.value.toUpperCase()})} 
                            required 
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-mono text-zinc-400">ЦЕНА (₽)</label>
                            <input type="number" className="w-full bg-zinc-50 border border-zinc-200 p-2 font-jura" value={productForm.price} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} required />
                        </div>
                    </div>

                    {/* SIZES SELECT */}
                    <div className="border border-zinc-200 p-3 bg-zinc-50">
                        <label className="text-[10px] font-mono text-zinc-400 block mb-2 flex items-center gap-1"><Ruler size={12}/> ДОСТУПНЫЕ РАЗМЕРЫ</label>
                        <div className="flex flex-wrap gap-2">
                            {ALL_SIZES.map(size => (
                                <button 
                                    key={size} 
                                    type="button"
                                    onClick={() => toggleProductSize(size)}
                                    className={`
                                        w-8 h-8 text-xs font-bold border transition-colors
                                        ${productForm.sizes?.includes(size) 
                                            ? 'bg-black text-white border-black' 
                                            : 'bg-white text-zinc-400 border-zinc-300 hover:border-black'}
                                    `}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* MULTI-SELECT CATEGORIES */}
                    <div className="border border-zinc-200 p-3 bg-zinc-50">
                        <label className="text-[10px] font-mono text-zinc-400 block mb-2">ТИП И КАТЕГОРИИ (ВЫБЕРИТЕ НЕСКОЛЬКО)</label>
                        <div className="space-y-2">
                            {availableCategories.map(cat => (
                                <div key={cat} onClick={() => toggleProductCategory(cat)} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-100 p-1 select-none">
                                    {productForm.categories?.includes(cat) ? <CheckSquare size={16} className="text-blue-900" /> : <Square size={16} className="text-zinc-300" />}
                                    <span className="font-mono text-xs uppercase">{CATEGORY_LABELS[cat]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MULTI-SELECT COLLECTIONS */}
                    <div className="border border-zinc-200 p-3 bg-zinc-50">
                        <label className="text-[10px] font-mono text-zinc-400 block mb-2">ДОБАВИТЬ В КОЛЛЕКЦИИ</label>
                        {collections.length === 0 && <span className="text-xs text-zinc-400">Нет коллекций. Создайте их во вкладке Коллекции.</span>}
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {collections.map(col => (
                                <div key={col.id} onClick={() => toggleProductCollection(col.id)} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-100 p-1 select-none">
                                    {productForm.collectionIds?.includes(col.id) ? <CheckSquare size={16} className="text-blue-900" /> : <Square size={16} className="text-zinc-300" />}
                                    <span className="font-mono text-xs uppercase">{col.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div className="border-t border-zinc-100 pt-2">
                        <label className="text-[10px] font-mono text-zinc-400 block mb-2">ФОТО ({productForm.images?.length}/6)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {productForm.images?.map((img, i) => (
                                <div key={i} className="w-12 h-16 relative bg-zinc-100 border"><img src={img} className="w-full h-full object-cover" /><button type="button" onClick={() => setProductForm(p => ({...p, images: p.images?.filter((_, x) => x !== i)}))} className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 flex items-center justify-center text-[8px]">X</button></div>
                            ))}
                            {(productForm.images?.length || 0) < 6 && (
                                <label className={`w-12 h-16 border border-dashed flex items-center justify-center cursor-pointer hover:bg-zinc-100 ${uploading ? 'opacity-50' : ''}`}>
                                    {uploading ? <Loader2 size={12} className="animate-spin"/> : <Upload size={12} />}
                                    <input type="file" className="hidden" onChange={handleProductImageUpload} disabled={uploading} />
                                </label>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" className="w-full bg-zinc-50 border border-zinc-200 p-1 text-xs" placeholder="ИЛИ ССЫЛКУ" value={imageUrlInput} onChange={e => setImageUrlInput(e.target.value)} />
                            <button type="button" onClick={handleAddProductImageUrl} className="bg-zinc-200 px-2"><Plus size={14}/></button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-mono text-zinc-400">ОПИСАНИЕ</label>
                        <textarea rows={2} className="w-full bg-zinc-50 border border-zinc-200 p-2 text-sm" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
                    </div>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={productForm.isNew} onChange={e => setProductForm({...productForm, isNew: e.target.checked})} /> <span className="font-mono text-xs">НОВИНКА</span></label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={productForm.isHidden} onChange={e => setProductForm({...productForm, isHidden: e.target.checked})} /> <span className="font-mono text-xs">СКРЫТЬ</span></label>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <FancyButton type="submit" fullWidth variant="solid" className={isSubmitting ? 'opacity-50' : ''}>
                            {isSubmitting ? 'СОХРАНЕНИЕ...' : (isEditing ? 'ОБНОВИТЬ' : 'ДОБАВИТЬ')}
                        </FancyButton>
                        {isEditing && <button type="button" onClick={resetProductForm} className="border px-4 text-xs hover:bg-zinc-100">ОТМЕНА</button>}
                    </div>
                </form>
                </div>
            </div>
            {/* LIST */}
            <div className="lg:col-span-2 space-y-2">
                <h2 className="font-jura text-xl font-bold uppercase mb-4 flex gap-2"><Package size={18} /> Склад ({products.length})</h2>
                {products.map(p => (
                    <div key={p.id} className="flex gap-4 bg-white border p-2 items-center">
                        <img src={p.images[0]} className="w-10 h-12 object-cover bg-zinc-100" />
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{p.name}</div>
                            <div className="text-[10px] font-mono text-zinc-500">
                                {p.categories?.map(c => CATEGORY_LABELS[c] || c).join(', ')} | {p.price} ₽
                            </div>
                        </div>
                        {session && (
                            <div className="flex gap-2">
                                <button onClick={() => startEditProduct(p)} className="p-1 hover:bg-blue-50 text-blue-900"><Edit2 size={14} /></button>
                                <button onClick={() => { if(confirm('Удалить товар?')) deleteProduct(p.id) }} className="p-1 hover:bg-red-50 text-red-600"><Trash2 size={14} /></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            </div>
        )}

        {/* --- COLLECTIONS TAB --- */}
        {activeTab === 'collections' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* COLLECTION EDITOR */}
                <div className="lg:col-span-1">
                    <div className={`bg-white border border-black p-6 sticky top-24 shadow-lg ${!session ? 'opacity-50 pointer-events-none' : ''}`}>
                        {!session && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50"><div className="bg-black text-white px-3 py-1 font-mono text-xs flex gap-2"><Lock size={12} /> LOCKED</div></div>}
                        <h2 className="font-jura text-xl font-bold uppercase mb-6 flex items-center gap-2">
                            {isEditingCollection ? <Edit2 size={18}/> : <Plus size={18} />} 
                            {isEditingCollection ? 'Редактировать Коллекцию' : 'Новая Коллекция'}
                        </h2>
                        <form onSubmit={handleSaveCollection} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-mono text-zinc-400">НАЗВАНИЕ (AUTO-CAPS)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-zinc-50 border border-zinc-200 p-2 font-jura uppercase" 
                                    value={collectionForm.title} 
                                    onChange={e => setCollectionForm({...collectionForm, title: e.target.value.toUpperCase()})} 
                                    required 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-mono text-zinc-400">ПОДЗАГОЛОВОК (AUTO-CAPS)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-zinc-50 border border-zinc-200 p-2 font-mono text-xs uppercase" 
                                    value={collectionForm.desc} 
                                    onChange={e => setCollectionForm({...collectionForm, desc: e.target.value.toUpperCase()})} 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-mono text-zinc-400">ССЫЛКА (Например /catalog?category=sets)</label>
                                <input type="text" className="w-full bg-zinc-50 border border-zinc-200 p-2 font-mono text-xs" value={collectionForm.link} onChange={e => setCollectionForm({...collectionForm, link: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-mono text-zinc-400 block mb-2">ОБЛОЖКА</label>
                                <div className="flex gap-4 items-end">
                                    <div className="w-20 h-24 bg-zinc-100 border flex-shrink-0">
                                        {collectionForm.image && <img src={collectionForm.image} className="w-full h-full object-cover" />}
                                    </div>
                                    <label className={`border border-dashed px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-zinc-100 ${uploading ? 'opacity-50' : ''}`}>
                                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        <span className="font-mono text-[10px]">{uploading ? '...' : 'ЗАГРУЗИТЬ'}</span>
                                        <input type="file" className="hidden" onChange={handleCollectionImageUpload} disabled={uploading} />
                                    </label>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-2">
                                <FancyButton type="submit" fullWidth variant="solid" className={isSubmitting ? 'opacity-50' : ''}>
                                    {isSubmitting ? 'СОХРАНЕНИЕ...' : (isEditingCollection ? 'СОХРАНИТЬ' : 'СОЗДАТЬ')}
                                </FancyButton>
                                {isEditingCollection && (
                                    <button type="button" onClick={resetCollectionForm} className="border px-4 text-xs hover:bg-zinc-100">ОТМЕНА</button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* COLLECTION LIST */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="font-jura text-xl font-bold uppercase mb-4 flex gap-2"><Layers size={18} /> Активные Коллекции ({collections.length})</h2>
                    <div className="space-y-6">
                        {collections.map(col => {
                            const includedProducts = getProductsInCollection(col.id);
                            return (
                                <div key={col.id} className="bg-white border border-zinc-300 p-4 relative group hover:border-black transition-all">
                                    <div className="flex gap-4 mb-4">
                                        <div className="w-20 h-24 bg-zinc-100 flex-shrink-0">
                                            <img src={col.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0" />
                                        </div>
                                        <div className="flex-1 min-w-0 pt-1">
                                            <h3 className="font-jura font-bold uppercase truncate text-lg">{col.title}</h3>
                                            <p className="font-mono text-[10px] text-zinc-500 mb-2 truncate uppercase">{col.desc}</p>
                                            <span className="text-[10px] bg-zinc-100 px-2 py-1 font-mono truncate block w-fit mb-2">ID: {col.id}</span>
                                            
                                            {/* Products count badge */}
                                            <div className="inline-flex items-center gap-1 text-xs font-mono bg-blue-50 text-blue-900 px-2 py-1">
                                                <Shirt size={12} />
                                                <span>{includedProducts.length} ITEMS</span>
                                            </div>
                                        </div>
                                        {session && (
                                            <div className="flex flex-col gap-2">
                                                <button 
                                                    onClick={() => startEditCollection(col)} 
                                                    className="text-blue-900 hover:bg-blue-50 p-2 border border-transparent hover:border-blue-900 transition-colors"
                                                    title="Редактировать"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => { if(confirm('Удалить коллекцию?')) deleteCollection(col.id) }} 
                                                    className="text-zinc-400 hover:text-red-600 hover:bg-red-50 p-2 border border-transparent hover:border-red-600 transition-colors"
                                                    title="Удалить"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Products Preview Grid */}
                                    {includedProducts.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-dashed border-zinc-200">
                                            <p className="font-mono text-[10px] text-zinc-400 mb-2">ВКЛЮЧЕННЫЕ ТОВАРЫ:</p>
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                                {includedProducts.map(p => (
                                                    <div key={p.id} className="w-12 h-16 flex-shrink-0 border border-zinc-200 relative group/item" title={p.name}>
                                                        <img src={p.images[0]} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px]">
                                                            {p.price}₽
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Admin;