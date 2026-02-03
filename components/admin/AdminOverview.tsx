
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Order, ProductVariant, Product } from '../../types';
import { TrendingUp, TrendingDown, Clock, AlertTriangle, DollarSign, ShoppingBag, ArrowRight, Wallet } from 'lucide-react';
import { formatPrice } from '../../utils';

interface AdminOverviewProps {
    onChangeTab: (tab: 'orders' | 'products') => void;
}

const AdminOverview: React.FC<AdminOverviewProps> = ({ onChangeTab }) => {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        revenue: 0,
        profit: 0, // NEW: Net Profit
        profitMargin: 0, // NEW: Profit Margin %
        revenueChange: 0, 
        ordersCount: 0,
        aov: 0,
        backlog: 0,
        lowStockCount: 0
    });
    const [topProducts, setTopProducts] = useState<{name: string, count: number, revenue: number}[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Orders
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .neq('status', 'cancelled'); 

            if (ordersError) throw ordersError;
            const orders = ordersData as Order[];

            // 2. Fetch Products (for Cost Price)
            const { data: productsData } = await supabase
                .from('products')
                .select('id, cost_price, name');
            
            const productCostMap: Record<string, number> = {};
            if (productsData) {
                productsData.forEach((p: any) => {
                    productCostMap[p.id] = p.cost_price || 0;
                });
            }

            // 3. Fetch Inventory
            const { data: variantsData, error: varError } = await supabase
                .from('product_variants')
                .select('stock');
            
            if (varError) throw varError;
            const variants = variantsData as ProductVariant[];

            // --- CALCULATIONS ---

            // A. Revenue & AOV & Profit
            const revenueOrders = orders.filter(o => ['paid', 'assembly', 'ready', 'shipping', 'completed'].includes(o.status));
            const totalRevenue = revenueOrders.reduce((acc, o) => acc + o.total_price, 0);
            const aov = revenueOrders.length > 0 ? Math.round(totalRevenue / revenueOrders.length) : 0;

            // Calculate Profit
            let totalCost = 0;
            revenueOrders.forEach(order => {
                order.order_items.forEach(item => {
                    // Try to get cost from map, if not found (deleted product?), assume 0 or price*0.4 as fallback? Let's use 0 for accuracy.
                    const cost = productCostMap[item.id] || 0;
                    totalCost += cost * item.quantity;
                });
            });
            const profit = totalRevenue - totalCost;
            const profitMargin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;

            // B. Revenue Change (Today vs Yesterday)
            const today = new Date();
            today.setHours(0,0,0,0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const todayRevenue = revenueOrders
                .filter(o => new Date(o.created_at) >= today)
                .reduce((acc, o) => acc + o.total_price, 0);
            
            const yesterdayRevenue = revenueOrders
                .filter(o => {
                    const d = new Date(o.created_at);
                    return d >= yesterday && d < today;
                })
                .reduce((acc, o) => acc + o.total_price, 0);

            let revenueChange = 0;
            if (yesterdayRevenue > 0) {
                revenueChange = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100);
            } else if (todayRevenue > 0) {
                revenueChange = 100; // 100% growth if yesterday was 0
            }

            // C. Backlog (Immediate attention)
            const backlog = orders.filter(o => ['new', 'paid', 'assembly'].includes(o.status)).length;

            // D. Low Stock
            const lowStockCount = variants.filter(v => v.stock < 3).length;

            // E. Top Products
            const productStats: Record<string, {count: number, revenue: number}> = {};
            revenueOrders.forEach(order => {
                order.order_items.forEach(item => {
                    if (!productStats[item.name]) {
                        productStats[item.name] = { count: 0, revenue: 0 };
                    }
                    productStats[item.name].count += item.quantity;
                    productStats[item.name].revenue += item.price * item.quantity;
                });
            });

            const sortedTop = Object.entries(productStats)
                .map(([name, stats]) => ({ name, ...stats }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            setMetrics({
                revenue: totalRevenue,
                profit,
                profitMargin,
                revenueChange,
                ordersCount: revenueOrders.length,
                aov,
                backlog,
                lowStockCount
            });
            setTopProducts(sortedTop);

        } catch (e) {
            console.error("Dashboard error:", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center font-mono animate-pulse">ANALYZING DATA STREAMS...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. REVENUE */}
                <div className="bg-white border border-black p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={48} />
                    </div>
                    <h3 className="font-mono text-xs text-zinc-500 uppercase mb-2">Общая Выручка</h3>
                    <div className="font-jura font-bold text-3xl mb-2">{formatPrice(metrics.revenue)}</div>
                    <div className={`text-xs font-mono flex items-center gap-1 ${metrics.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {metrics.revenueChange >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                        {Math.abs(metrics.revenueChange)}% к вчерашнему дню
                    </div>
                </div>

                {/* 2. PROFIT (NEW) */}
                <div className="bg-zinc-900 text-white border border-black p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={48} />
                    </div>
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px]" />
                    <div className="relative z-10">
                        <h3 className="font-mono text-xs text-zinc-400 uppercase mb-2">Чистая Прибыль</h3>
                        <div className="font-jura font-bold text-3xl mb-2">{formatPrice(metrics.profit)}</div>
                        <div className="text-xs font-mono text-green-400">
                            МАРЖА: {metrics.profitMargin}%
                        </div>
                    </div>
                </div>

                {/* 3. BACKLOG */}
                <div 
                    onClick={() => onChangeTab('orders')}
                    className="bg-white border border-black p-6 relative overflow-hidden cursor-pointer hover:bg-red-50 transition-colors group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 text-red-600">
                        <Clock size={48} />
                    </div>
                    <h3 className="font-mono text-xs text-zinc-500 uppercase mb-2 group-hover:text-red-700">Очередь сборки</h3>
                    <div className="font-jura font-bold text-3xl mb-2 text-red-600">{metrics.backlog}</div>
                    <div className="text-xs font-mono text-red-500 flex items-center gap-1">
                        ТРЕБУЮТ ВНИМАНИЯ <ArrowRight size={12}/>
                    </div>
                </div>

                {/* 4. LOW STOCK */}
                <div 
                    onClick={() => onChangeTab('products')}
                    className="bg-white border border-black p-6 relative overflow-hidden cursor-pointer hover:bg-orange-50 transition-colors group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 text-orange-600">
                        <AlertTriangle size={48} />
                    </div>
                    <h3 className="font-mono text-xs text-zinc-500 uppercase mb-2 group-hover:text-orange-700">Low Stock Alert</h3>
                    <div className="font-jura font-bold text-3xl mb-2 text-orange-600">{metrics.lowStockCount}</div>
                    <div className="text-xs font-mono text-orange-500 flex items-center gap-1">
                        ЗАКАНЧИВАЮТСЯ <ArrowRight size={12}/>
                    </div>
                </div>
            </div>

            {/* SECOND ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* TOP PRODUCTS */}
                <div className="bg-white border border-zinc-200 p-6">
                    <h3 className="font-jura font-bold uppercase text-lg mb-6 border-b pb-2">Лидеры продаж</h3>
                    <div className="space-y-4">
                        {topProducts.length === 0 ? (
                            <p className="text-sm text-zinc-400 font-mono">Нет данных</p>
                        ) : (
                            topProducts.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-zinc-300 font-bold text-lg">0{idx + 1}</span>
                                        <div>
                                            <div className="font-bold text-sm uppercase">{p.name}</div>
                                            <div className="font-mono text-[10px] text-zinc-500">{p.count} шт. продано</div>
                                        </div>
                                    </div>
                                    <div className="font-mono text-sm font-bold text-blue-900">
                                        {formatPrice(p.revenue)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* SYSTEM STATUS */}
                <div className="bg-white border border-zinc-200 p-6">
                    <h3 className="font-jura font-bold uppercase text-lg mb-6 border-b pb-2">Средний чек (AOV)</h3>
                    <div className="flex flex-col items-center justify-center h-48">
                        <div className="text-5xl font-bold font-jura text-black mb-2">{formatPrice(metrics.aov)}</div>
                        <p className="text-sm font-mono text-zinc-500 text-center">
                            На основе {metrics.ordersCount} оплаченных заказов.<br/>
                            {metrics.aov > 5000 ? "Отличный показатель!" : "Есть потенциал для апсейла."}
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminOverview;
