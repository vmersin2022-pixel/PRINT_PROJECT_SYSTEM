
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Order, OrderStatus } from '../../types';
import { Eye, RefreshCcw, Search, X, Printer, Users, MapPin, Truck, Save, List, LayoutTemplate, Flame, Clock, Inbox, Zap, AlertTriangle, CheckCircle, Filter } from 'lucide-react';
import { formatPrice, formatDate } from '../../utils';

const PAGE_SIZE = 50;
const NOTIFICATION_SOUND_URL = "https://www.myinstants.com/media/sounds/cash-register-ka-ching.mp3";

const KANBAN_COLUMNS: { id: string; label: string; statuses: OrderStatus[]; color: string }[] = [
    { id: 'inbox', label: 'НОВЫЕ', statuses: ['new', 'paid'], color: 'border-l-4 border-green-500' },
    { id: 'work', label: 'В РАБОТЕ', statuses: ['assembly', 'ready'], color: 'border-l-4 border-yellow-500' },
    { id: 'logistics', label: 'ДОСТАВКА', statuses: ['shipping'], color: 'border-l-4 border-blue-500' },
    { id: 'done', label: 'ВРУЧЕН', statuses: ['completed'], color: 'border-l-4 border-zinc-500' }
];

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [userSegments, setUserSegments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list'); // Default to list for speed
  const [activeFilter, setActiveFilter] = useState<'all' | 'shipping' | 'critical' | 'vip'>('all');

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const [trackingInput, setTrackingInput] = useState('');
  const [statusInput, setStatusInput] = useState<OrderStatus>('new');
  const [isSaving, setIsSaving] = useState(false);
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- MOBILE CHECK ---
  useEffect(() => {
      const handleResize = () => {
          if (window.innerWidth < 768) {
              setViewMode('list');
          }
      };
      // Check on mount
      handleResize();
      // Optional: listen to resize
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- SLA / METRICS CALCULATION ---
  const getOrderMetrics = (order: Order) => {
      // Logic: Compare UTC timestamp from DB with Date.now() (which returns local UTC timestamp)
      // This ensures correct calculation regardless of Admin's local timezone.
      const createdTime = new Date(order.created_at).getTime(); 
      const now = Date.now();
      
      const hoursWaiting = (now - createdTime) / (1000 * 60 * 60);
      const isExpress = order.customer_info.deliveryMethod === 'cdek_door';
      const isWhale = userSegments[order.user_id || ''] === 'whale';
      
      let slaStatus: 'normal' | 'warning' | 'critical' = 'normal';
      
      // SLA Rules:
      // Critical: > 24 hours in 'new'/'paid' status
      // Warning: > 12 hours
      if (hoursWaiting > 24) slaStatus = 'critical';
      else if (hoursWaiting > 12) slaStatus = 'warning';
      
      // Score for sorting priority (Higher = Needs Attention)
      let score = Math.floor(hoursWaiting) + (isExpress ? 50 : 0) + (isWhale ? 30 : 0) + (slaStatus === 'critical' ? 100 : 0);
      
      return { score, isExpress, isWhale, hoursWaiting, slaStatus };
  };

  const fetchOrders = async (queryStr: string = searchQuery) => {
    setLoading(true);
    try {
        let query = supabase
            .from('orders')
            .select('*', { count: 'exact' })
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false });

        // Optimize: Only apply limiting in List view. Kanban needs mostly recent orders but potentially more.
        if (viewMode === 'list') {
             query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        } else {
             query = query.limit(200); 
        }

        if (queryStr) {
            query = query.or(`id.ilike.%${queryStr}%,customer_info->>email.ilike.%${queryStr}%,customer_info->>phone.ilike.%${queryStr}%`);
        }

        const { data: ordersData, count, error } = await query;
        if (error) throw error;
        
        const userIds = Array.from(new Set((ordersData as Order[]).map(o => o.user_id).filter(Boolean)));
        if (userIds.length > 0) {
            const { data: segmentsData } = await supabase.from('customer_segments').select('id, segment').in('id', userIds);
            const segmentMap: Record<string, string> = {};
            segmentsData?.forEach((s: any) => segmentMap[s.id] = s.segment);
            setUserSegments(segmentMap);
        }

        setOrders(ordersData as Order[]);
        setTotalCount(count || 0);
    } catch (err: any) {
        console.error("Error fetching orders:", err);
    } finally {
        setLoading(false);
    }
  };

  // Effect for Page and View Mode changes (Immediate)
  useEffect(() => {
      fetchOrders(searchQuery);
  }, [page, viewMode]);

  // Effect for Search (Debounced)
  useEffect(() => {
      const timer = setTimeout(() => {
          if (page !== 0) setPage(0); // Reset page on new search
          fetchOrders(searchQuery);
      }, 500);
      return () => clearTimeout(timer);
  }, [searchQuery]);

  // Realtime
  useEffect(() => {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
      const channel = supabase.channel('admin-orders-realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
            const newOrder = payload.new as Order;
            audioRef.current?.play().catch(() => {});
            setOrders(prev => [newOrder, ...prev]);
            setTotalCount(prev => prev + 1);
        }).subscribe();
      return () => { supabase.removeChannel(channel); }
  }, []);

  useEffect(() => {
      if (selectedOrder) {
          setTrackingInput(selectedOrder.tracking_number || '');
          setStatusInput(selectedOrder.status);
      }
  }, [selectedOrder]);

  // --- FILTERED ORDERS FOR VIEW ---
  const displayedOrders = orders.filter(o => {
      if (activeFilter === 'shipping') return ['ready', 'paid', 'assembly'].includes(o.status);
      if (activeFilter === 'critical') return getOrderMetrics(o).slaStatus === 'critical';
      if (activeFilter === 'vip') return getOrderMetrics(o).isWhale;
      return true;
  });

  // --- DND HANDLERS (Kanban) ---
  const handleDragStart = (e: React.DragEvent, orderId: string) => { setDraggedOrderId(orderId); e.dataTransfer.effectAllowed = 'move'; if (e.target instanceof HTMLElement) e.target.style.opacity = '0.5'; };
  const handleDragEnd = (e: React.DragEvent) => { setDraggedOrderId(null); if (e.target instanceof HTMLElement) e.target.style.opacity = '1'; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
      e.preventDefault(); if (!draggedOrderId) return;
      const column = KANBAN_COLUMNS.find(c => c.id === targetColumnId); if (!column) return;
      const newStatus = column.statuses[0];
      setOrders(prev => prev.map(o => o.id === draggedOrderId ? { ...o, status: newStatus } : o));
      try { await supabase.from('orders').update({ status: newStatus }).eq('id', draggedOrderId); } catch (err) { console.error("Move failed", err); fetchOrders(); }
      setDraggedOrderId(null);
  };

  const handleSaveAll = async () => {
      if (!selectedOrder) return; setIsSaving(true);
      try {
          const { error } = await supabase.from('orders').update({ status: statusInput, tracking_number: trackingInput }).eq('id', selectedOrder.id);
          if (error) throw error;
          const updated = { ...selectedOrder, status: statusInput, tracking_number: trackingInput };
          setSelectedOrder(updated); setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o)); alert('Заказ сохранен');
      } catch (e: any) { alert('Ошибка: ' + e.message); } finally { setIsSaving(false); }
  }

  const getStatusBadge = (status: OrderStatus) => {
      const colors: Record<OrderStatus, string> = { 'new': 'bg-blue-600 text-white', 'paid': 'bg-green-600 text-white', 'assembly': 'bg-orange-500 text-white', 'ready': 'bg-blue-400 text-white', 'shipping': 'bg-purple-600 text-white', 'completed': 'bg-zinc-800 text-white', 'cancelled': 'bg-red-600 text-white' };
      return <span className={`px-2 py-1 text-[10px] font-mono font-bold uppercase rounded ${colors[status]}`}>{status}</span>
  };

  return (
    <div className="space-y-6 pb-24 h-full flex flex-col">
        {/* HEADER CONTROLS */}
        <div className="bg-white p-4 border border-zinc-200 shrink-0 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="font-jura text-xl font-bold uppercase">ОЧЕРЕДЬ ЗАКАЗОВ</h2>
                    
                    {/* HIDE ON MOBILE */}
                    <div className="hidden md:flex bg-zinc-100 p-1 rounded border border-zinc-200">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-zinc-400 hover:text-black'}`}><List size={18} /></button>
                        <button onClick={() => setViewMode('kanban')} className={`p-2 rounded transition-colors ${viewMode === 'kanban' ? 'bg-white shadow text-blue-600' : 'text-zinc-400 hover:text-black'}`}><LayoutTemplate size={18} /></button>
                    </div>
                    
                    <button onClick={() => fetchOrders(searchQuery)} className="p-2 border hover:bg-zinc-100"><RefreshCcw size={16}/></button>
                </div>
                <div className="relative w-full md:w-64">
                    <input type="text" placeholder="ПОИСК..." className="w-full border border-zinc-300 pl-8 pr-4 py-2 font-mono text-sm uppercase" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                </div>
            </div>

            {/* QUICK FILTERS */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button onClick={() => setActiveFilter('all')} className={`px-4 py-2 font-mono text-xs uppercase border rounded-full whitespace-nowrap ${activeFilter === 'all' ? 'bg-black text-white' : 'bg-white text-zinc-500'}`}>ВСЕ</button>
                <button onClick={() => setActiveFilter('shipping')} className={`px-4 py-2 font-mono text-xs uppercase border rounded-full whitespace-nowrap flex items-center gap-2 ${activeFilter === 'shipping' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-500'}`}><Truck size={12}/> ТРЕБУЮТ ОТПРАВКИ</button>
                <button onClick={() => setActiveFilter('critical')} className={`px-4 py-2 font-mono text-xs uppercase border rounded-full whitespace-nowrap flex items-center gap-2 ${activeFilter === 'critical' ? 'bg-red-600 text-white' : 'bg-white text-zinc-500'}`}><Flame size={12}/> ПРОБЛЕМНЫЕ (SLA)</button>
                <button onClick={() => setActiveFilter('vip')} className={`px-4 py-2 font-mono text-xs uppercase border rounded-full whitespace-nowrap flex items-center gap-2 ${activeFilter === 'vip' ? 'bg-purple-600 text-white' : 'bg-white text-zinc-500'}`}><Users size={12}/> VIP</button>
            </div>
        </div>

        {/* --- VIEW: KANBAN (Hidden on small screens via CSS just in case state logic fails, though state should handle it) --- */}
        {viewMode === 'kanban' && (
            <div className="hidden md:block flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
                <div className="flex gap-4 h-full min-w-[1000px] px-1">
                    {KANBAN_COLUMNS.map(col => {
                        const columnOrders = displayedOrders.filter(o => col.statuses.includes(o.status)).sort((a, b) => getOrderMetrics(b).score - getOrderMetrics(a).score);
                        return (
                            <div key={col.id} className={`flex-1 flex flex-col bg-zinc-50 border border-zinc-200 min-w-[300px] ${col.color}`} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)}>
                                <div className="p-4 border-b border-zinc-200 bg-white sticky top-0 z-10 flex justify-between items-center"><span className="font-jura font-bold text-sm uppercase">{col.label}</span><span className="text-[10px] font-mono bg-zinc-100 px-2 py-1 rounded-full border border-zinc-200">{columnOrders.length}</span></div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {columnOrders.length === 0 ? (<div className="h-32 border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-300"><Inbox size={24} className="mb-2"/><span className="font-mono text-xs uppercase">Нет заказов</span></div>) : (columnOrders.map(order => (<div key={order.id} draggable onDragStart={(e) => handleDragStart(e, order.id)} onDragEnd={handleDragEnd} onClick={() => setSelectedOrder(order)} className="bg-white border p-4 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all relative overflow-hidden group border-zinc-200"><div className="flex justify-between items-start mb-2"><span className="font-mono text-[10px] text-zinc-400">#{order.id.slice(0,6)}</span><div className="flex gap-1">{getOrderMetrics(order).isExpress && <Truck size={12} className="text-blue-600" />}{getOrderMetrics(order).isWhale && <Users size={12} className="text-purple-600" />}</div></div><div className="mb-2"><div className="font-bold text-sm uppercase truncate">{order.customer_info.firstName} {order.customer_info.lastName}</div></div><div className="flex justify-between items-end border-t border-dashed border-zinc-100 pt-2 mt-2"><div className="font-jura font-bold text-sm">{formatPrice(order.total_price)}</div></div></div>)))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* --- VIEW: LIST (Mobile Optimized) --- */}
        {viewMode === 'list' && (
            <div className="bg-white border border-black overflow-hidden shadow-sm">
                <div className="overflow-x-auto"> {/* Added wrapper for mobile scroll */}
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-zinc-100 border-b border-black font-mono text-xs uppercase text-zinc-500">
                                <th className="p-4 w-32">ID</th>
                                <th className="p-4">Клиент</th>
                                <th className="p-4 text-center">Сумма</th>
                                <th className="p-4 text-center">Статус</th>
                                <th className="p-4 text-right">Дата</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-sm">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center"><RefreshCcw className="animate-spin inline mr-2"/> Загрузка...</td></tr>
                            ) : displayedOrders.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-zinc-400">Нет заказов</td></tr>
                            ) : (
                                displayedOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-blue-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                        <td className="p-4 font-mono font-bold text-blue-900">#{order.id.slice(0,6)}</td>
                                        <td className="p-4 font-bold uppercase">{order.customer_info.firstName} {order.customer_info.lastName}</td>
                                        <td className="p-4 text-center font-jura font-bold">{formatPrice(order.total_price)}</td>
                                        <td className="p-4 text-center">{getStatusBadge(order.status)}</td>
                                        <td className="p-4 text-right font-mono text-zinc-500 text-xs">{formatDate(order.created_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* ORDER DETAILS DRAWER (Kept same logic, just minimized code here for brevity) */}
        <div className={`fixed inset-0 z-50 flex justify-end transition-all duration-300 ${selectedOrder ? 'bg-black/20 pointer-events-auto' : 'pointer-events-none'}`} onClick={() => setSelectedOrder(null)}>
          <div onClick={e => e.stopPropagation()} className={`bg-white h-full w-full max-w-xl shadow-2xl border-l border-black flex flex-col pointer-events-auto transform transition-transform duration-300 ${selectedOrder ? 'translate-x-0' : 'translate-x-full'}`}>
              {selectedOrder && (
                <>
                <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-zinc-50"><div><div className="flex items-center gap-2 mb-1"><h2 className="font-jura font-bold text-2xl uppercase">#{selectedOrder.id.slice(0,8)}</h2>{getStatusBadge(selectedOrder.status)}</div><p className="font-mono text-xs text-zinc-400">{formatDate(selectedOrder.created_at)}</p></div><button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-zinc-200 rounded-full"><X size={24}/></button></div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="bg-blue-50 p-4 border border-blue-100"><h3 className="font-bold text-xs uppercase mb-2 flex items-center gap-2 text-blue-800"><Truck size={14}/> Трек-номер</h3><div className="flex gap-2"><input value={trackingInput} onChange={e => setTrackingInput(e.target.value)} placeholder="CDEK ID" className="flex-1 p-2 border text-sm font-mono uppercase bg-white"/></div></div>
                    <section><h3 className="font-bold text-sm uppercase mb-4 border-b pb-2">Товары</h3><div className="space-y-4">{selectedOrder.order_items.map((item, idx) => (<div key={idx} className="flex gap-4"><div className="w-16 h-20 bg-zinc-100 border flex-shrink-0"><img src={item.images[0]} className="w-full h-full object-cover" /></div><div><div className="font-bold text-sm uppercase">{item.name}</div><div className="text-xs font-mono text-zinc-500">Размер: {item.selectedSize} | Кол-во: {item.quantity}</div><div className="text-sm font-bold mt-1">{formatPrice(item.price)}</div></div></div>))}</div></section>
                    <section className="bg-zinc-50 p-4 border border-zinc-200"><h3 className="font-bold text-sm uppercase mb-4 flex items-center gap-2"><Users size={16}/> Клиент</h3><div className="grid grid-cols-2 gap-4 text-sm font-mono"><div><span className="block text-zinc-400 text-[10px]">ФИО</span>{selectedOrder.customer_info.firstName} {selectedOrder.customer_info.lastName}</div><div><span className="block text-zinc-400 text-[10px]">ТЕЛЕФОН</span>{selectedOrder.customer_info.phone}</div><div className="col-span-2"><span className="block text-zinc-400 text-[10px]">EMAIL</span>{selectedOrder.customer_info.email}</div><div className="col-span-2"><span className="block text-zinc-400 text-[10px] flex items-center gap-1"><MapPin size={10}/> АДРЕС</span><span className="uppercase">{selectedOrder.customer_info.city}, {selectedOrder.customer_info.address}</span></div></div></section>
                </div>
                <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex flex-col gap-4"><div className="flex gap-2"><div className="flex-1"><label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Статус заказа</label><select value={statusInput} onChange={(e) => setStatusInput(e.target.value as OrderStatus)} className="w-full border border-zinc-300 p-3 text-sm font-mono uppercase bg-white focus:border-blue-600 outline-none"><option value="new">НОВЫЙ</option><option value="paid">ОПЛАЧЕН</option><option value="assembly">НА СБОРКЕ</option><option value="ready">СОБРАН</option><option value="shipping">В ДОСТАВКЕ</option><option value="completed">ВЫПОЛНЕН</option><option value="cancelled">ОТМЕНЕН</option></select></div></div><button onClick={handleSaveAll} disabled={isSaving} className="w-full bg-black text-white py-4 font-jura font-bold uppercase hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">{isSaving ? <RefreshCcw className="animate-spin" size={18}/> : <Save size={18}/>} СОХРАНИТЬ ИЗМЕНЕНИЯ</button></div>
                </>
              )}
          </div>
      </div>
    </div>
  );
};

export default AdminOrders;
