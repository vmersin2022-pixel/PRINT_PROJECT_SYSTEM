
import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import { Product, Category, Collection, Order, PromoCode, OrderStatus } from '../types';
import FancyButton from '../components/ui/FancyButton';
import { supabase } from '../supabaseClient';
import { Trash2, Edit2, Eye, Plus, LogOut, Package, Upload, Layers, ShoppingCart, Tag, RefreshCcw, Users, CheckSquare, Square, Ruler, Loader2, Send, X, Printer, Phone, MapPin, Search } from 'lucide-react';

// --- STYLES FOR PRINTING ---
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    #printable-area, #printable-area * {
      visibility: visible;
    }
    #printable-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: white;
      color: black;
      padding: 20px;
    }
  }
`;

const Admin: React.FC = () => {
  const { 
      products, collections, orders, promocodes, allUsers,
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
  
  const [activeTab, setActiveTab] = useState<'products' | 'collections' | 'orders' | 'promocodes' | 'users'>('orders');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- ORDER DETAILS DRAWER STATE ---
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // --- PRODUCT FORM STATE ---
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  
  // Stock Matrix State: { "S": 10, "M": 5, "XL": 0 }
  const [stockMatrix, setStockMatrix] = useState<Record<string, number>>({ 'S': 0, 'M': 0, 'L': 0, 'XL': 0 });

  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    price: 0,
    old_price: 0,
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
        .filter(([_, stock]) => (stock as number) >= 0) // Filter out undefined, keep 0s
        .map(([size, stock]) => ({ size, stock: stock as number }));
    
    // Derived sizes array (only those with stock > 0 for display)
    const displaySizes = variantsToSave.filter(v => v.stock > 0).map(v => v.size);

    const payload = {
        name: productForm.name!,
        price: Number(productForm.price),
        old_price: Number(productForm.old_price || 0),
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
    setProductForm({ name: '', price: 0, old_price: 0, categories: [], collectionIds: [], description: '', images: ['https://picsum.photos/800/1000'], sizes: [], isNew: false, isHidden: false });
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

  // --- ORDER HELPERS ---
  const getStatusBadge = (status: Order['status']) => {
      const colors: Record<OrderStatus, string> = { 
          'new': 'bg-blue-600 text-white', 
          'paid': 'bg-green-600 text-white', 
          'assembly': 'bg-orange-500 text-white', // NEW
          'ready': 'bg-blue-400 text-white', // NEW
          'shipping': 'bg-purple-600 text-white', // CHANGED COLOR
          'completed': 'bg-black text-white', 
          'cancelled': 'bg-red-600 text-white' 
      };
      const labels: Record<OrderStatus, string> = {
          'new': 'НОВЫЙ',
          'paid': 'ОПЛАЧЕН',
          'assembly': 'НА СБОРКЕ',
          'ready': 'СОБРАН',
          'shipping': 'В ДОСТАВКЕ',
          'completed': 'ВЫПОЛНЕН',
          'cancelled': 'ОТМЕНА'
      }
      return <span className={`px-2 py-1 text-[10px] font-mono font-bold uppercase rounded ${colors[status]}`}>{labels[status] || status}</span>
  };

  const handlePrint = () => {
      window.print();
  };

  if (loading) return <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white font-mono">ЗАГРУЗКА СИСТЕМЫ...</div>;
  
  const availableCategories: Category[] = ['fresh_drop', 't-shirts', 'sets', 'accessories', 'last_drop'];

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-12 relative">
      <style>{printStyles}</style>

      {/* --- ORDER DETAILS DRAWER (SLIDE-OVER) --- */}
      <div className={`fixed inset-0 z-50 flex justify-end transition-all duration-300 pointer-events-none ${selectedOrder ? 'bg-black/20' : ''}`}>
          <div className={`bg-white h-full w-full max-w-xl shadow-2xl border-l border-black flex flex-col pointer-events-auto transform transition-transform duration-300 ${selectedOrder ? 'translate-x-0' : 'translate-x-full'}`}>
              
              {/* Drawer Header */}
              {selectedOrder && (
                <>
                <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                             <h2 className="font-jura font-bold text-2xl uppercase">ЗАКАЗ #{selectedOrder.id.slice(0,8)}</h2>
                             {getStatusBadge(selectedOrder.status)}
                        </div>
                        <p className="font-mono text-xs text-zinc-400">
                             {new Date(selectedOrder.created_at).toLocaleString()}
                        </p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-zinc-200 rounded-full">
                        <X size={24}/>
                    </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    
                    {/* Items */}
                    <section>
                        <h3 className="font-bold text-sm uppercase mb-4 border-b pb-2">Товары в заказе</h3>
                        <div className="space-y-4">
                            {selectedOrder.order_items.map((item, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="w-16 h-20 bg-zinc-100 border flex-shrink-0">
                                        <img src={item.images[0]} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm uppercase">{item.name}</div>
                                        <div className="text-xs font-mono text-zinc-500">
                                            Размер: {item.selectedSize} | Кол-во: {item.quantity}
                                        </div>
                                        <div className="text-sm font-bold mt-1">
                                            {item.price.toLocaleString()} ₽
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Customer Info */}
                    <section className="bg-zinc-50 p-4 border border-zinc-200">
                        <h3 className="font-bold text-sm uppercase mb-4 flex items-center gap-2">
                             <Users size={16}/> Клиент
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                             <div>
                                 <span className="block text-zinc-400 text-[10px]">ФИО</span>
                                 {selectedOrder.customer_info.firstName} {selectedOrder.customer_info.lastName}
                             </div>
                             <div>
                                 <span className="block text-zinc-400 text-[10px]">ТЕЛЕФОН</span>
                                 {selectedOrder.customer_info.phone}
                             </div>
                             <div className="col-span-2">
                                 <span className="block text-zinc-400 text-[10px]">EMAIL</span>
                                 {selectedOrder.customer_info.email}
                             </div>
                             <div className="col-span-2">
                                 <span className="block text-zinc-400 text-[10px] flex items-center gap-1"><MapPin size={10}/> АДРЕС ДОСТАВКИ</span>
                                 <span className="uppercase break-words">{selectedOrder.customer_info.city}, {selectedOrder.customer_info.address}</span>
                             </div>
                             <div className="col-span-2">
                                 <span className="block text-zinc-400 text-[10px]">МЕТОД ДОСТАВКИ</span>
                                 {selectedOrder.customer_info.deliveryMethod === 'cdek_point' ? 'CDEK (ПВЗ)' : 'CDEK (Курьер)'}
                             </div>
                             {selectedOrder.customer_info.comment && (
                                 <div className="col-span-2 bg-yellow-50 p-2 border border-yellow-100">
                                     <span className="block text-zinc-400 text-[10px]">КОММЕНТАРИЙ</span>
                                     {selectedOrder.customer_info.comment}
                                 </div>
                             )}
                        </div>
                    </section>

                    {/* Financials */}
                    <section>
                        <div className="flex justify-between border-b border-dashed border-zinc-300 py-2">
                            <span>Сумма товаров</span>
                            <span>{selectedOrder.total_price} ₽</span> 
                            {/* Note: Logic simplified for total display */}
                        </div>
                         {selectedOrder.customer_info.promoCode && (
                            <div className="flex justify-between border-b border-dashed border-zinc-300 py-2 text-green-600">
                                <span>Промокод ({selectedOrder.customer_info.promoCode})</span>
                                <span>Скидка применена</span>
                            </div>
                        )}
                        <div className="flex justify-between py-2 font-bold text-xl">
                            <span>ИТОГО</span>
                            <span>{selectedOrder.total_price.toLocaleString()} ₽</span>
                        </div>
                    </section>

                </div>

                {/* Drawer Footer Actions */}
                <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex flex-col gap-3">
                    <div className="flex gap-2">
                        <select 
                            value={selectedOrder.status}
                            onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                            className="flex-1 border border-zinc-300 p-2 text-sm font-mono uppercase bg-white focus:outline-none focus:border-blue-600"
                        >
                            <option value="new">НОВЫЙ</option>
                            <option value="paid">ОПЛАЧЕН</option>
                            <option value="assembly">НА СБОРКЕ</option>
                            <option value="ready">СОБРАН</option>
                            <option value="shipping">В ДОСТАВКЕ</option>
                            <option value="completed">ВЫПОЛНЕН</option>
                            <option value="cancelled">ОТМЕНЕН</option>
                        </select>
                        <button 
                            onClick={handlePrint}
                            className="bg-black text-white px-4 py-2 flex items-center gap-2 hover:bg-zinc-800"
                        >
                            <Printer size={16}/> Печать
                        </button>
                    </div>
                </div>

                {/* --- HIDDEN PRINT AREA --- */}
                <div id="printable-area" className="hidden">
                    <div className="text-center mb-8 border-b-2 border-black pb-4">
                        <h1 className="text-4xl font-bold uppercase mb-2">PRINT PROJECT</h1>
                        <p className="font-mono text-sm">НАКЛАДНАЯ К ЗАКАЗУ #{selectedOrder.id.slice(0,8).toUpperCase()}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="font-bold border-b border-black mb-2">ОТПРАВИТЕЛЬ</h3>
                            <p className="text-sm">ИП Давлетшина Ю.В.</p>
                            <p className="text-sm">Казань, ул. Баумана 1</p>
                        </div>
                        <div>
                            <h3 className="font-bold border-b border-black mb-2">ПОЛУЧАТЕЛЬ</h3>
                            <p className="text-sm uppercase">{selectedOrder.customer_info.firstName} {selectedOrder.customer_info.lastName}</p>
                            <p className="text-sm">{selectedOrder.customer_info.phone}</p>
                            <p className="text-sm uppercase">{selectedOrder.customer_info.city}, {selectedOrder.customer_info.address}</p>
                        </div>
                    </div>

                    <table className="w-full text-left border-collapse border border-black mb-8">
                        <thead>
                            <tr className="bg-zinc-100">
                                <th className="border border-black p-2 text-sm">Наименование</th>
                                <th className="border border-black p-2 text-sm">Размер</th>
                                <th className="border border-black p-2 text-sm">Кол-во</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedOrder.order_items.map((item, i) => (
                                <tr key={i}>
                                    <td className="border border-black p-2">{item.name}</td>
                                    <td className="border border-black p-2 text-center">{item.selectedSize}</td>
                                    <td className="border border-black p-2 text-center">{item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-between items-end border-t-2 border-black pt-4">
                        <div className="text-sm">
                            <p>Комплектовщик: _________________</p>
                            <p className="mt-4">Дата: {new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="text-xl font-bold">
                            ВСЕГО ПОЗИЦИЙ: {selectedOrder.order_items.reduce((a,c) => a + c.quantity, 0)}
                        </div>
                    </div>
                </div>
                </>
              )}
          </div>
      </div>

      <div className="container mx-auto px-4">
        
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-8 border-b border-black pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${session ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-mono text-xs text-zinc-500">{session ? 'СЕССИЯ АКТИВНА' : 'РЕЖИМ ПРОСМОТРА'}</span>
            </div>
            <h1 className="font-jura text-4xl font-bold uppercase">ERP SYSTEM</h1>
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {[
                    { id: 'orders', label: 'ЗАКАЗЫ', icon: ShoppingCart }, 
                    { id: 'products', label: 'СКЛАД', icon: Package }, 
                    { id: 'collections', label: 'КОЛЛЕКЦИИ', icon: Layers }, 
                    { id: 'promocodes', label: 'ПРОМО', icon: Tag },
                    { id: 'users', label: 'КЛИЕНТЫ', icon: Users } 
                ].map(tab => (
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

        {/* --- ORDERS TAB --- */}
        {activeTab === 'orders' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 border border-zinc-200">
                    <h2 className="font-jura text-xl font-bold uppercase flex gap-2"><ShoppingCart size={18} /> ЗАКАЗЫ ({orders.length})</h2>
                    <div className="flex gap-2">
                        <button onClick={() => window.location.reload()} className="p-2 border hover:bg-zinc-100"><RefreshCcw size={16}/></button>
                    </div>
                </div>

                <div className="bg-white border border-black overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-100 border-b border-black font-mono text-xs uppercase text-zinc-500">
                                <th className="p-4 w-20">#ID</th>
                                <th className="p-4">Клиент</th>
                                <th className="p-4 text-center">Сумма</th>
                                <th className="p-4 text-center">Статус</th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {orders.map(order => (
                                <tr 
                                    key={order.id} 
                                    onClick={() => setSelectedOrder(order)}
                                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                                >
                                    <td className="p-4 font-mono font-bold text-xs text-blue-900">
                                        #{order.id.slice(0,6).toUpperCase()}
                                        <div className="text-[10px] text-zinc-400 font-normal mt-1">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-sm uppercase">{order.customer_info.firstName} {order.customer_info.lastName}</div>
                                        <div className="font-mono text-xs text-zinc-500">{order.customer_info.phone}</div>
                                    </td>
                                    <td className="p-4 text-center font-jura font-bold text-sm">
                                        {order.total_price.toLocaleString()} ₽
                                    </td>
                                    <td className="p-4 text-center">
                                        {getStatusBadge(order.status)}
                                    </td>
                                    <td className="p-4 text-center text-zinc-300 group-hover:text-blue-600">
                                        <Eye size={18}/>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- PRODUCTS TAB (INVENTORY) --- */}
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
                        <div>
                            <label className="text-[10px] font-mono text-red-400">СТАРАЯ ЦЕНА (SALE)</label>
                            <input type="number" className="w-full bg-zinc-50 border border-zinc-200 p-2 font-jura" value={productForm.old_price} onChange={e => setProductForm({...productForm, old_price: Number(e.target.value)})} />
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
            
            {/* INVENTORY LIST */}
            <div className="lg:col-span-2 space-y-2">
                <h2 className="font-jura text-xl font-bold uppercase mb-4 flex gap-2"><Package size={18} /> Склад ({products.length})</h2>
                {products.map(p => {
                    // Calculate Total Stock
                    const totalStock = p.variants ? p.variants.reduce((acc, v) => acc + v.stock, 0) : 0;
                    const isLowStock = totalStock > 0 && totalStock < 3;
                    const isSoldOut = totalStock === 0;

                    return (
                        <div key={p.id} className={`flex gap-4 border p-2 items-center ${isSoldOut ? 'bg-red-50 border-red-200' : isLowStock ? 'bg-orange-50 border-orange-200' : 'bg-white border-zinc-200'}`}>
                            <div className="relative">
                                <img src={p.images[0]} className={`w-12 h-16 object-cover bg-zinc-100 ${isSoldOut ? 'grayscale' : ''}`} />
                                {isSoldOut && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center font-bold text-[8px] text-white bg-black/50 uppercase">Sold Out</div>}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className="font-bold text-sm truncate uppercase">{p.name}</div>
                                    <div className="text-xs font-mono">
                                        {p.old_price && p.old_price > 0 && <span className="line-through text-zinc-400 mr-2">{p.old_price}</span>}
                                        {p.price} ₽
                                    </div>
                                </div>
                                <div className="text-[10px] font-mono text-zinc-500 mb-2">{p.categories?.map(c => CATEGORY_LABELS[c] || c).join(', ')}</div>
                                
                                {/* Stock Badges */}
                                <div className="flex gap-1 flex-wrap">
                                    {p.variants ? (
                                        p.variants.map(v => (
                                            <span key={v.size} className={`text-[9px] px-1.5 py-0.5 border rounded-sm font-mono ${v.stock === 0 ? 'bg-zinc-200 text-zinc-400 line-through decoration-zinc-500' : v.stock < 2 ? 'bg-red-100 text-red-700 border-red-300 font-bold' : 'bg-white border-zinc-300'}`}>
                                                {v.size}: {v.stock}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[9px] text-zinc-400">Legacy Structure</span>
                                    )}
                                </div>
                            </div>
                            {session && (
                                <div className="flex gap-2">
                                    <button onClick={() => startEditProduct(p)} className="p-2 hover:bg-blue-50 text-blue-900 border rounded"><Edit2 size={14} /></button>
                                    <button onClick={() => { if(confirm('Удалить?')) deleteProduct(p.id) }} className="p-2 hover:bg-red-50 text-red-600 border rounded"><Trash2 size={14} /></button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            </div>
        )}

        {/* ... (Collections tab) ... */}
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

        {/* ... (Promocodes tab) ... */}
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

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="font-jura text-xl font-bold uppercase flex gap-2"><Users size={18} /> ПОЛЬЗОВАТЕЛИ ({allUsers.length})</h2>
                    <button onClick={() => window.location.reload()} className="p-2 border hover:bg-zinc-100"><RefreshCcw size={16}/></button>
                </div>
                
                {allUsers.length === 0 ? (
                    <div className="p-8 border border-zinc-300 bg-zinc-50 text-center">
                        <p className="font-mono text-zinc-500 text-sm">
                            НЕТ ДАННЫХ ИЛИ ОТСУТСТВУЕТ ТАБЛИЦА PUBLIC.PROFILES.
                            <br/>
                            УБЕДИТЕСЬ, ЧТО ВЫ ЗАПУСТИЛИ SQL СКРИПТ В SUPABASE.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white border border-black overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-100 border-b border-black font-mono text-xs uppercase">
                                        <th className="p-4 border-r w-[25%]">EMAIL</th>
                                        <th className="p-4 border-r w-[25%]">CONTACT INFO</th>
                                        <th className="p-4 border-r w-[15%]">ROLE</th>
                                        <th className="p-4 border-r w-[15%]">REGISTERED</th>
                                        <th className="p-4 w-[20%]">USER ID</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200">
                                    {allUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-blue-50/20 text-sm">
                                            {/* Email */}
                                            <td className="p-4 border-r font-bold align-top">
                                                {u.email}
                                            </td>
                                            
                                            {/* Contact Info (Telegram / Name) */}
                                            <td className="p-4 border-r align-top">
                                                <div className="flex flex-col gap-1">
                                                    {u.full_name && <span className="font-bold">{u.full_name}</span>}
                                                    
                                                    {u.username && (
                                                        <a href={`https://t.me/${u.username}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline font-mono text-xs">
                                                            <Send size={10} /> @{u.username}
                                                        </a>
                                                    )}
                                                    
                                                    {u.telegram_id && (
                                                        <span className="text-[10px] text-zinc-400 font-mono">TG_ID: {u.telegram_id}</span>
                                                    )}

                                                    {!u.full_name && !u.username && !u.telegram_id && (
                                                        <span className="text-zinc-400 text-xs italic">- нет данных -</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td className="p-4 border-r align-top">
                                                <span className={`px-2 py-1 text-[10px] font-mono rounded ${u.role === 'admin' ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-600 border'}`}>
                                                    {u.role.toUpperCase()}
                                                </span>
                                            </td>

                                            {/* Date */}
                                            <td className="p-4 border-r align-top font-mono text-xs text-zinc-500">
                                                {new Date(u.created_at).toLocaleDateString()}
                                                <br/>
                                                {new Date(u.created_at).toLocaleTimeString().slice(0,5)}
                                            </td>

                                            {/* ID */}
                                            <td className="p-4 align-top font-mono text-[10px] text-zinc-400 break-all">
                                                {u.id}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default Admin;
