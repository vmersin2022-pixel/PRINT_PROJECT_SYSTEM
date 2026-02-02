
import React, { useState, useEffect } from 'react';
import { X, Trash2, ArrowRight, Send, Tag, CreditCard, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context';
import FancyButton from '../ui/FancyButton';
import { getImageUrl } from '../../utils';

const Cart: React.FC = () => {
  const { isCartOpen, toggleCart, cart, removeFromCart, activePromo, applyPromoCode, removePromoCode, userProfile } = useApp();
  const navigate = useNavigate();

  // Local state
  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [promoErrorMsg, setPromoErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Points Redemption State
  const [usePoints, setUsePoints] = useState(false);

  // Sync active promo with status on mount/change
  useEffect(() => {
    if (activePromo) {
        setPromoStatus('success');
        setPromoInput(activePromo.code);
    } else {
        setPromoStatus('idle');
        setPromoInput('');
    }
  }, [activePromo]);

  if (!isCartOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // 1. PROMO DISCOUNT CALCULATION
  let discountAmount = 0;
  if (activePromo) {
      // Re-verify min amount in render to auto-disable if user removed items
      if (activePromo.min_order_amount > subtotal) {
          // If subtotal drops below limit, we don't apply math, but don't remove code yet to let user add items
          // Visual indication handled below
      } else {
          if (activePromo.discount_type === 'fixed') {
              discountAmount = activePromo.discount_value;
          } else {
              const value = activePromo.discount_value;
              discountAmount = Math.round(subtotal * (value / 100));
          }
      }
  }
  discountAmount = Math.min(discountAmount, subtotal);
  const totalAfterPromo = subtotal - discountAmount;

  // 2. POINTS CALCULATION
  // Max usage: 50% of the totalAfterPromo
  const maxPointsUsage = Math.floor(totalAfterPromo * 0.5);
  // User available points
  const userPoints = userProfile?.loyalty_points || 0;
  // Actual points to deduct if toggle is ON
  const pointsToDeduct = usePoints ? Math.min(userPoints, maxPointsUsage) : 0;

  const finalTotal = totalAfterPromo - pointsToDeduct;

  // --- LOGIC: PROMO CODE ---
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setLoading(true);
    const result = await applyPromoCode(promoInput);
    setLoading(false);
    
    if (result.success) {
        setPromoStatus('success');
        setPromoErrorMsg('');
    } else {
        setPromoStatus('error');
        setPromoErrorMsg(result.message || 'Неверный код');
    }
  };

  const handleRemovePromo = () => {
      removePromoCode();
      setPromoInput('');
      setPromoStatus('idle');
      setPromoErrorMsg('');
  }

  // --- LOGIC: OPTION 1 (TELEGRAM) ---
  const handleTelegramOrder = () => {
    const botUsername = 'your_telegram_username'; // ЗАМЕНИТЕ НА СВОЙ ЮЗЕРНЕЙМ ИЛИ БОТА
    
    let message = `👋 Привет! Хочу оформить быстрый заказ:\n\n`;
    cart.forEach((item, idx) => {
        message += `${idx + 1}. ${item.name} | Размер: ${item.selectedSize} | x${item.quantity}\n`;
    });
    
    message += `\n💰 Сумма заказа: ${finalTotal.toLocaleString()} ₽`;
    if (activePromo && discountAmount > 0) {
        const val = activePromo.discount_value;
        const label = activePromo.discount_type === 'fixed' ? `${val}₽` : `${val}%`;
        message += ` (Промокод: ${activePromo.code} -${label})`;
    }
    if (pointsToDeduct > 0) {
        message += ` (Списано баллов: ${pointsToDeduct})`;
    }
    
    const url = `https://t.me/${botUsername}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // --- LOGIC: OPTION 3 (FULL CHECKOUT) ---
  const handleCheckout = () => {
    toggleCart(); 
    navigate('/checkout'); // Go to full checkout page
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
        onClick={toggleCart}
      />
      
      <div className="relative w-full max-w-md bg-zinc-50 h-full border-l border-black flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="p-6 border-b border-black bg-white flex justify-between items-center">
          <h2 className="font-jura text-xl font-bold uppercase tracking-wider">
            КОРЗИНА
          </h2>
          <button onClick={toggleCart} className="hover:rotate-90 transition-transform">
            <X size={24} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400">
              <span className="font-jura text-lg">[ ПУСТО ]</span>
              <p className="font-montserrat text-sm mt-2">ПОКА ЗДЕСЬ ПУСТО</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={`${item.id}-${item.selectedSize}`} className="flex gap-4 bg-white p-4 border border-zinc-200 shadow-sm relative group">
                {/* Optimized Thumbnail Image: 150px width */}
                <img 
                    src={getImageUrl(item.images[0], 150)} 
                    alt={item.name} 
                    className="w-20 h-24 object-cover grayscale group-hover:grayscale-0 transition-all" 
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-jura font-bold text-sm uppercase max-w-[150px]">{item.name}</h3>
                    <button 
                      onClick={() => removeFromCart(item.id, item.selectedSize)}
                      className="text-zinc-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 font-mono text-xs text-zinc-500">
                    SIZE: {item.selectedSize} <br/>
                    QTY: {item.quantity}
                  </div>
                  <div className="mt-2 font-bold font-jura">
                    {item.price.toFixed(0)} ₽
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-6 bg-white border-t border-black space-y-4">
            
            {/* Promo Code Input */}
            <div className="relative">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input 
                            type="text" 
                            placeholder="ПРОМОКОД" 
                            value={promoInput}
                            onChange={(e) => {
                                setPromoInput(e.target.value);
                                setPromoStatus('idle');
                                setPromoErrorMsg('');
                            }}
                            disabled={!!activePromo}
                            className={`w-full bg-zinc-50 border pl-9 pr-4 py-3 font-mono text-sm focus:outline-none uppercase placeholder-zinc-400 ${!!activePromo ? 'border-green-500 text-green-700 bg-green-50' : 'border-zinc-300 focus:border-black'}`}
                        />
                    </div>
                    {activePromo ? (
                        <button 
                            onClick={handleRemovePromo}
                            className="bg-zinc-200 text-black px-4 font-jura font-bold text-xs uppercase hover:bg-red-600 hover:text-white transition-colors"
                        >
                            <X size={16}/>
                        </button>
                    ) : (
                        <button 
                            onClick={handleApplyPromo}
                            disabled={loading}
                            className="bg-black text-white px-4 font-jura font-bold text-xs uppercase hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        >
                            {loading ? '...' : 'ОК'}
                        </button>
                    )}
                </div>
                {promoStatus === 'success' && activePromo && (
                    <div className="mt-1">
                        {activePromo.min_order_amount > subtotal ? (
                            <p className="text-[10px] text-orange-600 font-mono">
                                СУММА КОРЗИНЫ МЕНЬШЕ {activePromo.min_order_amount}₽. СКИДКА НЕАКТИВНА.
                            </p>
                        ) : (
                            <p className="text-[10px] text-green-600 font-mono">
                                СКИДКА ПРИМЕНЕНА: {' '}
                                {activePromo.discount_type === 'fixed' 
                                    ? `-${activePromo.discount_value} ₽` 
                                    : `-${activePromo.discount_value}%`
                                }
                            </p>
                        )}
                    </div>
                )}
                {promoStatus === 'error' && <p className="text-[10px] text-red-600 font-mono mt-1">{promoErrorMsg}</p>}
            </div>

            {/* POINTS REDEMPTION */}
            {userPoints > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 font-bold font-jura text-sm text-yellow-800">
                            <Sparkles size={14} className="fill-yellow-600 text-yellow-600" />
                            {userPoints} БОНУСОВ
                        </div>
                        <p className="text-[10px] text-yellow-700 font-mono">
                            Доступно для списания: {Math.min(userPoints, maxPointsUsage)}
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={usePoints}
                            onChange={() => setUsePoints(!usePoints)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                </div>
            )}

            {/* Totals */}
            <div className="border-t border-dashed border-zinc-300 pt-4 space-y-1">
                {activePromo && discountAmount > 0 && (
                    <div className="flex justify-between items-center font-mono text-xs text-red-600">
                        <span>СКИДКА</span>
                        <span>-{discountAmount.toFixed(0)} ₽</span>
                    </div>
                )}
                {usePoints && pointsToDeduct > 0 && (
                    <div className="flex justify-between items-center font-mono text-xs text-yellow-600 font-bold">
                        <span>БАЛЛЫ</span>
                        <span>-{pointsToDeduct} ₽</span>
                    </div>
                )}
                <div className="flex justify-between items-center mt-3 font-jura text-xl font-bold">
                    <span>ИТОГО</span>
                    <span>{finalTotal.toFixed(0)} ₽</span>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 gap-3">
                {/* OPTION 3: FULL CHECKOUT */}
                <FancyButton fullWidth variant="solid" onClick={handleCheckout}>
                  ОФОРМИТЬ ЗАКАЗ
                </FancyButton>
                
                {/* OPTION 1: TELEGRAM */}
                <button 
                    onClick={handleTelegramOrder}
                    className="w-full py-3 border border-blue-600 text-blue-600 font-jura font-bold uppercase text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                    <Send size={16} /> Быстрый заказ в Telegram
                </button>
            </div>

            {/* Required Disclaimer */}
            <p className="text-[10px] text-zinc-400 text-center font-mono leading-tight pt-2">
                Способы оплаты и доставки можно выбрать при оформлении заказа
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
