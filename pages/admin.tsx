import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import { Product, Category, Collection, Order, PromoCode } from '../types';
import FancyButton from '../components/ui/FancyButton';
import { supabase } from '../supabaseClient';
import { Trash2, Edit2, Eye, EyeOff, Plus, LogOut, Package, Upload, Database, AlertTriangle, X, Lock, Loader2, Layers, CheckSquare, Square, Shirt, Ruler, ShoppingCart, Tag, RefreshCcw } from 'lucide-react';

const Admin: React.FC = () => {
  const { 
      products, collections, orders, promocodes,
      addProduct, updateProduct, deleteProduct, 
      addCollection, deleteCollection,
      updateOrderStatus,
      addPromoCodeDb, togglePromoCodeDb, deletePromoCodeDb,
      refreshData
  } = useApp();
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'products' | 'collections' | 'orders' | 'promocodes'>('products');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- PRODUCT FORM STATE ---
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  
  // Stock Matrix State: { "S": 10, "M": 5, "XL": 0 }
  const [stockMatrix, setStockMatrix] = useState<Record<string, number>>({ 'S': 0, 'M': 0, 'L': 0, 'XL': 0 });

  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    price: 0,
    categories: [],
    collectionIds: [],
    description: '',
    images: ['https://picsum.photos/800/1000'],
    sizes: [], // Will be derived from stockMatrix for display purposes
    isNew: false,
    isHidden: false
  });

  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [editCollectionId, setEditCollectionId] = useState<string | null>(null);
  const [collectionForm, setCollectionForm] = useState<Partial<Collection>>({
    title: '',
    desc: '',
    image: 'https://picsum.photos/800/1000',
    link: '/catalog'
  });

  const [promoForm, setPromoForm] = useState({ code: '', percent: 10 });

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
      // Trigger data refresh on initial load to ensure we have latest data permission-wise
      refreshData();
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        // CRITICAL: When auth state changes (login/logout), re-fetch data.
        // If logged in -> RLS allows reading orders.
        // If logged out -> RLS blocks orders.
        await refreshData();
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        alert('Ошибка входа: ' + error.message);
    } else {
        // Success handled by onAuthStateChange
    }
    setLoading(false);
  };

  const handleLogout = async () => await supabase.auth.signOut();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        if (data?.publicUrl) callback(data.publicUrl);
    } catch (error: any) {
        alert(`Ошибка загрузки: ${error.message}`);
    } finally {
        setUploading(false);
    }
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e, (url) => setProductForm(prev => ({ ...prev, images: [...(prev.images || []), url] })));
  };

  const handleAddProductImageUrl = () => {
    if (!imageUrlInput) return;
    setProductForm(prev => ({ ...prev, images: [...(prev.images || []), imageUrlInput] }));
    setImageUrlInput('');
  };

  const toggleProductCollection = (colId: string) => {
    setProductForm(prev => {
        const current = prev.collectionIds || [];
        return { ...prev, collectionIds: current.includes(colId) ? current.filter(id => id !== colId) : [...current, colId] };
    });
  };

  const toggleProductCategory = (cat: Category) => {
    setProductForm(prev => {
        const current = prev.categories || [];
        return { ...prev, categories: current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat] };
    });
  };

  const generateId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) { alert('НУЖНА АВТОРИЗАЦИЯ'); return; }
    setIsSubmitting(true);

    const finalImages = (productForm.images && productForm.images.length > 0) ? productForm.images : ['https://picsum.photos/800/1000'];
    
    // Convert stockMatrix to array for DB
    const variantsToSave = Object.entries(stockMatrix)
        .filter(([_, stock]) => stock >= 0) // Filter out undefined, keep 0s
        .map(([size, stock]) => ({ size, stock }));
    
    // Derived sizes array (only those with stock > 0 for display)
    const displaySizes = variantsToSave.filter(v => v.stock > 0).map(v => v.size);

    const payload = {
        name: productForm.name!,
        price: Number(productForm.price),
        categories: productForm.categories || [],
        collectionIds: productForm.collectionIds || [],
        description: productForm.description || '',
        images: finalImages,
        sizes: displaySizes, // Saving simplified list to main table
        isNew: productForm.isNew || false,
        isHidden: productForm.isHidden || false
    };

    if (isEditing && editId) {
      await updateProduct(editId, payload, variantsToSave);
    } else {
      await addProduct({ ...payload, id: generateId() } as Product, variantsToSave);
    }
    resetProductForm();
    setIsSubmitting(false);
  };

  const startEditProduct = (product: Product) => {
    setIsEditing(true);
    setEditId(product.id);
    setProductForm(product);
    
    // Reconstruct stock matrix from variants if available, or default
    const matrix: Record<string, number> = {};
    ALL_SIZES.forEach(s => matrix[s] = 0); // Init all to 0
    
    if (product.variants && product.variants.length > 0) {
        product.variants.forEach(v => {
            matrix[v.size] = v.stock;
        });
    } else if (product.sizes) {
        // Fallback for legacy products without variants table data
        product.sizes.forEach(s => {
            matrix[s] = 10; // Default dummy stock for old items
        });
    }
    setStockMatrix(matrix);

    setImageUrlInput('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetProductForm = () => {
    setIsEditing(false);
    setEditId(null);
    setProductForm({ name: '', price: 0, categories: [], collectionIds: [], description: '', images: ['https://picsum.photos/800/1000'], sizes: [], isNew: false, isHidden: false });
    setStockMatrix({ 'S': 0, 'M': 0, 'L': 0, 'XL': 0 });
  };

  // --- COLLECTION HANDLERS ---
  const handleCollectionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e, (url) => setCollectionForm(prev => ({ ...prev, image: url })));
  };
  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setIsSubmitting(true);
    const id = (isEditingCollection && editCollectionId) ? editCollectionId : generateId();
    await addCollection({ id, title: collectionForm.title!, desc: collectionForm.desc || '', image: collectionForm.image || '', link: collectionForm.link || '' });
    resetCollectionForm();
    setIsSubmitting(false);
  };
  const startEditCollection = (col: Collection) => {
      setIsEditingCollection(true); setEditCollectionId(col.id); setCollectionForm(col);
  };
  const resetCollectionForm = () => {
      setIsEditingCollection(false); setEditCollectionId(null); setCollectionForm({ title: '', desc: '', image: '', link: '' });
  };

  // --- PROMO HANDLERS ---
  const handleAddPromo = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!session) return;
      await addPromoCodeDb(promoForm.code, promoForm.percent);
      setPromoForm({ code: '', percent: 10 });
  };

  if (loading) return <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white font-mono">ЗАГРУЗКА СИСТЕМЫ...</div>;
  
  const availableCategories: Category[] = ['fresh_drop', 't-shirts', 'sets', 'accessories', 'last_drop'];
  const getStatusBadge = (status: Order['status']) => {
      const colors = { 'new': 'bg-blue-600 text-white', 'paid': 'bg-green-600 text-white', 'shipping': 'bg-yellow-500 text-black', 'completed': 'bg-zinc-800 text-white', 'cancelled': 'bg-red-600 text-white' };
      return <span className={`px-2 py-1 text-[10px] font-mono font-bold uppercase rounded ${colors[status]}`}>{status}</span>
  };

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
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {[{ id: 'products', label: 'ТОВАРЫ', icon: Package }, { id: 'collections', label: 'КОЛЛЕКЦИИ', icon: Layers }, { id: 'orders', label: 'ЗАКАЗЫ', icon: ShoppingCart }, { id: 'promocodes', label: 'ПРОМОКОДЫ', icon: Tag }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 font-mono text-sm px-4 py-2 border border-black transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'}`}>
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>
          </div>
          <div className="flex gap-4 items-end flex-wrap">
             {session ? (
                 <button onClick={handleLogout} className="flex items-center gap-2 font-mono text-xs hover:text-red-600 transition-colors border border-zinc-300 px-3 py-1 h-8"><LogOut size={14} /> ВЫЙТИ</button>
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
            <div className="lg:col-span-1">
                <div className={`bg-white border border-black p-6 sticky top-24 shadow-lg ${!session ? 'opacity-50 pointer-events-none' : ''}`}>
                <h2 className="font-jura text-xl font-bold uppercase mb-6 flex items-center gap-2">
                    {isEditing ? <Edit2 size={18} /> : <Plus size={18} />} {isEditing ? 'Редактировать' : 'Новый Товар'}
                </h2>
                <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-mono text-zinc-400">НАЗВАНИЕ (AUTO-CAPS)</label>
                        <input type="text" className="w-full bg-zinc-50 border border-zinc-200 p-2 font-jura uppercase" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value.toUpperCase()})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-mono text-zinc-400">ЦЕНА (₽)</label>
                            <input type="number" className="w-full bg-zinc-50 border border-zinc-200 p-2 font-jura" value={productForm.price} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} required />
                        </div>
                    </div>
                    
                    {/* STOCK MATRIX INPUT */}
                    <div className="border border-zinc-200 p-3 bg-zinc-50">
                        <label className="text-[10px] font-mono text-zinc-400 block mb-2 flex items-center gap-1"><Ruler size={12}/> СКЛАД (ВВОД КОЛИЧЕСТВА)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {ALL_SIZES.map(size => (
                                <div key={size} className="flex flex-col">
                                    <label className="text-[9px] font-bold text-center mb-1">{size}</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        className={`text-center p-1 border text-sm font-mono ${stockMatrix[size] > 0 ? 'bg-white border-black text-black' : 'bg-zinc-100 border-zinc-200 text-zinc-400'}`}
                                        value={stockMatrix[size] || 0}
                                        onChange={(e) => setStockMatrix(prev => ({...prev, [size]: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border border-zinc-200 p-3 bg-zinc-50">
                        <label className="text-[10px] font-mono text-zinc-400 block mb-2">ТИП И КАТЕГОРИИ</label>
                        <div className="space-y-2">
                            {availableCategories.map(cat => (
                                <div key={cat} onClick={() => toggleProductCategory(cat)} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-100 p-1 select-none">
                                    {productForm.categories?.includes(cat) ? <CheckSquare size={16} className="text-blue-900" /> : <Square size={16} className="text-zinc-300" />}
                                    <span className="font-mono text-xs uppercase">{CATEGORY_LABELS[cat]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border border-zinc-200 p-3 bg-zinc-50">
                        <label className="text-[10px] font-mono text-zinc-400 block mb-2">В КОЛЛЕКЦИИ</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {collections.map(col => (
                                <div key={col.id} onClick={() => toggleProductCollection(col.id)} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-100 p-1 select-none">
                                    {productForm.collectionIds?.includes(col.id) ? <CheckSquare size={16} className="text-blue-900" /> : <Square size={16} className="text-zinc-300" />}
                                    <span className="font-mono text-xs uppercase">{col.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
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
                        <FancyButton type="submit" fullWidth variant="solid" className={isSubmitting ? 'opacity-50' : ''}>{isSubmitting ? '...' : (isEditing ? 'ОБНОВИТЬ' : 'ДОБАВИТЬ')}</FancyButton>
                        {isEditing && <button type="button" onClick={resetProductForm} className="border px-4 text-xs hover:bg-zinc-100">ОТМЕНА</button>}
                    </div>
                </form>
                </div>
            </div>
            <div className="lg:col-span-2 space-y-2">
                <h2 className="font-jura text-xl font-bold uppercase mb-4 flex gap-2"><Package size={18} /> Склад ({products.length})</h2>
                {products.map(p => (
                    <div key={p.id} className="flex gap-4 bg-white border p-2 items-center">
                        <img src={p.images[0]} className="w-10 h-12 object-cover bg-zinc-100" />
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{p.name}</div>
                            <div className="text-[10px] font-mono text-zinc-500 mb-1">{p.categories?.map(c => CATEGORY_LABELS[c] || c).join(', ')} | {p.price} ₽</div>
                            
                            {/* Stock Display */}
                            <div className="flex gap-1 flex-wrap">
                                {p.variants ? (
                                    p.variants.map(v => (
                                        <span key={v.size} className={`text-[9px] px-1 border rounded ${v.stock > 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                            {v.size}: {v.stock}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-[9px] text-zinc-400">Legacy Stock</span>
                                )}
                            </div>
                        </div>
                        {session && (
                            <div className="flex gap-2">
                                <button onClick={() => startEditProduct(p)} className="p-1 hover:bg-blue-50 text-blue-900"><Edit2 size={14} /></button>
                                <button onClick={() => { if(confirm('Удалить?')) deleteProduct(p.id) }} className="p-1 hover:bg-red-50 text-red-600"><Trash2 size={14} /></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            </div>
        )}

        {/* ... (Other tabs remain the same) ... */}
        {activeTab === 'collections' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className={`bg-white border border-black p-6 sticky top-24 shadow-lg ${!session ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h2 className="font-jura text-xl font-bold uppercase mb-6 flex items-center gap-2">
                            {isEditingCollection ? <Edit2 size={18}/> : <Plus size={18} />} 
                            {isEditingCollection ? 'Редактировать' : 'Новая Коллекция'}
                        </h2>
                        <form onSubmit={handleSaveCollection} className="space-y-4">
                            <div><label className="text-[10px] font-mono text-zinc-400">НАЗВАНИЕ</label><input type="text" className="w-full bg-zinc-50 border border-zinc-200 p-2 font-jura uppercase" value={collectionForm.title} onChange={e => setCollectionForm({...collectionForm, title: e.target.value.toUpperCase()})} required /></div>
                            <div><label className="text-[10px] font-mono text-zinc-400">ОПИСАНИЕ</label><textarea rows={4} className="w-full bg-zinc-50 border border-zinc-200 p-2 font-montserrat text-xs" value={collectionForm.desc} onChange={e => setCollectionForm({...collectionForm, desc: e.target.value})} /></div>
                            <div><label className="text-[10px] font-mono text-zinc-400">ОБЛОЖКА</label><div className="flex gap-4 items-end"><div className="w-20 h-24 bg-zinc-100 border flex-shrink-0">{collectionForm.image && <img src={collectionForm.image} className="w-full h-full object-cover" />}</div><label className={`border border-dashed px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-zinc-100 ${uploading ? 'opacity-50' : ''}`}>{uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}<input type="file" className="hidden" onChange={handleCollectionImageUpload} disabled={uploading} /></label></div></div>
                            <div className="pt-4 flex gap-2"><FancyButton type="submit" fullWidth variant="solid" className={isSubmitting ? 'opacity-50' : ''}>{isSubmitting ? '...' : (isEditingCollection ? 'СОХРАНИТЬ' : 'СОЗДАТЬ')}</FancyButton>{isEditingCollection && <button type="button" onClick={resetCollectionForm} className="border px-4 text-xs hover:bg-zinc-100">ОТМЕНА</button>}</div>
                        </form>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="font-jura text-xl font-bold uppercase mb-4 flex gap-2"><Layers size={18} /> Коллекции ({collections.length})</h2>
                    <div className="space-y-6">{collections.map(col => (<div key={col.id} className="bg-white border border-zinc-300 p-4 relative group hover:border-black transition-all"><div className="flex gap-4"><div className="w-20 h-24 bg-zinc-100 flex-shrink-0"><img src={col.image} className="w-full h-full object-cover" /></div><div className="flex-1 pt-1"><h3 className="font-jura font-bold uppercase text-lg">{col.title}</h3><p className="font-mono text-[10px] text-zinc-500 mb-2">{col.desc}</p></div>{session && (<div className="flex flex-col gap-2"><button onClick={() => startEditCollection(col)} className="text-blue-900 p-2"><Edit2 size={16} /></button><button onClick={() => { if(confirm('Удалить?')) deleteCollection(col.id) }} className="text-red-600 p-2"><Trash2 size={16} /></button></div>)}</div></div>))}</div>
                </div>
            </div>
        )}
        {/* Orders and Promos tabs... */}
        {activeTab === 'orders' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="font-jura text-xl font-bold uppercase flex gap-2"><ShoppingCart size={18} /> ЗАКАЗЫ ({orders.length})</h2>
                    <button onClick={() => window.location.reload()} className="p-2 border hover:bg-zinc-100"><RefreshCcw size={16}/></button>
                </div>
                <div className="bg-white border border-black overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-100 border-b border-black font-mono text-xs uppercase">
                                    <th className="p-4 border-r">DATE / ID</th>
                                    <th className="p-4 border-r">CLIENT</th>
                                    <th className="p-4 border-r">ITEMS</th>
                                    <th className="p-4 border-r">TOTAL</th>
                                    <th className="p-4 border-r">STATUS</th>
                                    <th className="p-4">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                                {orders.map(order => (
                                    <tr key={order.id} className="hover:bg-blue-50/20 text-sm">
                                        <td className="p-4 border-r align-top">
                                            <div className="font-mono text-xs text-zinc-500">
                                                {new Date(order.created_at).toLocaleDateString()}
                                                <br/>
                                                {new Date(order.created_at).toLocaleTimeString().slice(0,5)}
                                            </div>
                                            <div className="font-mono font-bold text-[10px] text-blue-900 mt-1">#{order.id.slice(0,8)}</div>
                                        </td>
                                        <td className="p-4 border-r align-top">
                                            <div className="font-bold uppercase">{order.customer_info.firstName} {order.customer_info.lastName}</div>
                                            <div className="font-mono text-xs text-zinc-500 mt-1">{order.customer_info.phone}</div>
                                        </td>
                                        <td className="p-4 border-r align-top">
                                            <div className="space-y-1">
                                                {order.order_items.map((item, i) => (
                                                    <div key={i} className="text-xs font-mono border-b border-dashed pb-1 last:border-0">
                                                        <span className="font-bold">{item.name}</span> ({item.selectedSize}) x{item.quantity}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 border-r align-top font-bold font-jura text-lg">
                                            {order.total_price.toLocaleString()} ₽
                                            <div className="text-[10px] font-mono font-normal text-zinc-500 mt-1">{order.payment_method}</div>
                                        </td>
                                        <td className="p-4 border-r align-top">
                                            {getStatusBadge(order.status)}
                                            {session && (
                                                <select 
                                                    value={order.status}
                                                    onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                                                    className="mt-2 block w-full text-xs border p-1 bg-white"
                                                >
                                                    <option value="new">NEW</option>
                                                    <option value="paid">PAID</option>
                                                    <option value="shipping">SHIPPING</option>
                                                    <option value="completed">COMPLETED</option>
                                                    <option value="cancelled">CANCELLED</option>
                                                </select>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            <button className="p-2 border hover:bg-black hover:text-white transition-colors" title="Открыть детали"><Eye size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
        {activeTab === 'promocodes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                     <div className={`bg-white border border-black p-6 ${!session ? 'opacity-50 pointer-events-none' : ''}`}>
                        <h2 className="font-jura text-xl font-bold uppercase mb-6">Создать Промокод</h2>
                        <form onSubmit={handleAddPromo} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-mono text-zinc-400">КОД</label>
                                <input type="text" className="w-full bg-zinc-50 border border-zinc-200 p-2 font-mono font-bold uppercase" value={promoForm.code} onChange={e => setPromoForm({...promoForm, code: e.target.value})} required />
                            </div>
                            <div>
                                <label className="text-[10px] font-mono text-zinc-400">СКИДКА (%)</label>
                                <input type="number" max="100" min="1" className="w-full bg-zinc-50 border border-zinc-200 p-2 font-mono" value={promoForm.percent} onChange={e => setPromoForm({...promoForm, percent: parseInt(e.target.value)})} required />
                            </div>
                            <FancyButton type="submit" fullWidth variant="solid">ДОБАВИТЬ КОД</FancyButton>
                        </form>
                     </div>
                </div>
                <div>
                    <h2 className="font-jura text-xl font-bold uppercase mb-6 flex gap-2"><Tag size={18} /> АКТИВНЫЕ КОДЫ ({promocodes.length})</h2>
                    <div className="space-y-2">
                        {promocodes.map(promo => (
                            <div key={promo.id} className={`flex justify-between items-center p-4 border ${promo.is_active ? 'bg-white border-black' : 'bg-zinc-100 border-zinc-200 text-zinc-400'}`}>
                                <div><div className="font-bold font-mono text-lg">{promo.code}</div><div className="text-xs font-mono">{promo.discount_percent}% СКИДКА</div></div>
                                {session && (<div className="flex items-center gap-2"><button onClick={() => togglePromoCodeDb(promo.id, promo.is_active)} className={`px-3 py-1 text-xs font-mono border ${promo.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-zinc-200 text-zinc-500'}`}>{promo.is_active ? 'ON' : 'OFF'}</button><button onClick={() => { if(confirm('Удалить код?')) deletePromoCodeDb(promo.id) }} className="p-2 text-red-600 hover:bg-red-50"><Trash2 size={16}/></button></div>)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Admin;