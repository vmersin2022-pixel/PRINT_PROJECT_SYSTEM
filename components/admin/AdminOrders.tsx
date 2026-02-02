
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Order, OrderStatus } from '../../types';
import { Eye, RefreshCcw, Search, ChevronLeft, ChevronRight, X, Printer, Users, MapPin } from 'lucide-react';

const PAGE_SIZE = 20;

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
        let query = supabase
            .from('orders')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (searchQuery) {
            // Search by order ID or customer email/phone (via jsonb customer_info)
            // Note: Supabase complex filtering on JSONB can be tricky. 
            // We'll search by ID or strict match on top level fields if added, 
            // For now, simpler implementation: search by ID substring
            query = query.or(`id.ilike.%${searchQuery}%,customer_info->>email.ilike.%${searchQuery}%,customer_info->>phone.ilike.%${searchQuery}%`);
        }

        const { data, count, error } = await query;
        
        if (error) throw error;
        setOrders(data as Order[]);
        setTotalCount(count || 0);
    } catch (err: any) {
        console.error("Error fetching orders:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, searchQuery]);

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (!error) {
          setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
          if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null);
      }
  };

  const getStatusBadge = (status: OrderStatus) => {
      const colors: Record<OrderStatus, string> = { 
          'new': 'bg-blue-600 text-white', 'paid': 'bg-green-600 text-white', 
          'assembly': 'bg-orange-500 text-white', 'ready': 'bg-blue-400 text-white', 
          'shipping': 'bg-purple-600 text-white', 'completed': 'bg-black text-white', 
          'cancelled': 'bg-red-600 text-white' 
      };
      return <span className={`px-2 py-1 text-[10px] font-mono font-bold uppercase rounded ${colors[status]}`}>{status}</span>
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 border border-zinc-200 gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <h2 className="font-jura text-xl font-bold uppercase">ЗАКАЗЫ ({totalCount})</h2>
                <button onClick={fetchOrders} className="p-2 border hover:bg-zinc-100"><RefreshCcw size={16}/></button>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <input 
                        type="text" 
                        placeholder="ID / Email / Тел" 
                        className="w-full border border-zinc-300 pl-8 pr-4 py-2 font-mono text-sm uppercase"
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                </div>
            </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-black overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-zinc-100 border-b border-black font-mono text-xs uppercase text-zinc-500">
                        <th className="p-4 w-24">ID</th>
                        <th className="p-4">Клиент</th>
                        <th className="p-4 text-center">Сумма</th>
                        <th className="p-4 text-center">Статус</th>
                        <th className="p-4 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                    {loading ? (
                        <tr><td colSpan={5} className="p-8 text-center"><RefreshCcw className="animate-spin inline mr-2"/> Загрузка...</td></tr>
                    ) : orders.map(order => (
                        <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                            <td className="p-4 font-mono font-bold text-blue-900">
                                #{order.id.slice(0,6)}
                                <div className="text-[10px] text-zinc-400 font-normal mt-1">
                                    {new Date(order.created_at).toLocaleDateString()}
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="font-bold uppercase">{order.customer_info.firstName} {order.customer_info.lastName}</div>
                                <div className="font-mono text-xs text-zinc-500">{order.customer_info.phone}</div>
                            </td>
                            <td className="p-4 text-center font-jura font-bold">
                                {order.total_price.toLocaleString()} ₽
                            </td>
                            <td className="p-4 text-center">{getStatusBadge(order.status)}</td>
                            <td className="p-4 text-center text-zinc-300 group-hover:text-blue-600"><Eye size={18}/></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center pt-4">
            <span className="font-mono text-xs text-zinc-500">СТРАНИЦА {page + 1} ИЗ {totalPages || 1}</span>
            <div className="flex gap-2">
                <button 
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    className="p-2 border border-zinc-300 hover:bg-black hover:text-white disabled:opacity-30"
                >
                    <ChevronLeft size={16}/>
                </button>
                <button 
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 border border-zinc-300 hover:bg-black hover:text-white disabled:opacity-30"
                >
                    <ChevronRight size={16}/>
                </button>
            </div>
        </div>

        {/* ORDER DETAILS DRAWER */}
        <div className={`fixed inset-0 z-50 flex justify-end transition-all duration-300 pointer-events-none ${selectedOrder ? 'bg-black/20' : ''}`}>
          <div className={`bg-white h-full w-full max-w-xl shadow-2xl border-l border-black flex flex-col pointer-events-auto transform transition-transform duration-300 ${selectedOrder ? 'translate-x-0' : 'translate-x-full'}`}>
              {selectedOrder && (
                <>
                <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                             <h2 className="font-jura font-bold text-2xl uppercase">#{selectedOrder.id.slice(0,8)}</h2>
                             {getStatusBadge(selectedOrder.status)}
                        </div>
                        <p className="font-mono text-xs text-zinc-400">
                             {new Date(selectedOrder.created_at).toLocaleString()}
                        </p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-zinc-200 rounded-full"><X size={24}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <section>
                        <h3 className="font-bold text-sm uppercase mb-4 border-b pb-2">Товары</h3>
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
                                        <div className="text-sm font-bold mt-1">{item.price.toLocaleString()} ₽</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-zinc-50 p-4 border border-zinc-200">
                        <h3 className="font-bold text-sm uppercase mb-4 flex items-center gap-2"><Users size={16}/> Клиент</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                             <div><span className="block text-zinc-400 text-[10px]">ФИО</span>{selectedOrder.customer_info.firstName} {selectedOrder.customer_info.lastName}</div>
                             <div><span className="block text-zinc-400 text-[10px]">ТЕЛЕФОН</span>{selectedOrder.customer_info.phone}</div>
                             <div className="col-span-2"><span className="block text-zinc-400 text-[10px]">EMAIL</span>{selectedOrder.customer_info.email}</div>
                             <div className="col-span-2"><span className="block text-zinc-400 text-[10px] flex items-center gap-1"><MapPin size={10}/> АДРЕС</span><span className="uppercase">{selectedOrder.customer_info.city}, {selectedOrder.customer_info.address}</span></div>
                             {selectedOrder.customer_info.comment && (
                                 <div className="col-span-2 bg-yellow-50 p-2 border border-yellow-100"><span className="block text-zinc-400 text-[10px]">КОММЕНТАРИЙ</span>{selectedOrder.customer_info.comment}</div>
                             )}
                        </div>
                    </section>
                </div>

                <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex gap-2">
                    <select 
                        value={selectedOrder.status}
                        onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                        className="flex-1 border border-zinc-300 p-2 text-sm font-mono uppercase bg-white"
                    >
                        <option value="new">НОВЫЙ</option>
                        <option value="paid">ОПЛАЧЕН</option>
                        <option value="assembly">НА СБОРКЕ</option>
                        <option value="ready">СОБРАН</option>
                        <option value="shipping">В ДОСТАВКЕ</option>
                        <option value="completed">ВЫПОЛНЕН</option>
                        <option value="cancelled">ОТМЕНЕН</option>
                    </select>
                    <button onClick={() => window.print()} className="bg-black text-white px-4 py-2 flex items-center gap-2 hover:bg-zinc-800"><Printer size={16}/> Печать</button>
                </div>
                </>
              )}
          </div>
      </div>
    </div>
  );
};

export default AdminOrders;
