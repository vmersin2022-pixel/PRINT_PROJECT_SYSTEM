
import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, ArrowRight, Send, Tag, CreditCard, Sparkles, Zap, Gift } from 'lucide-react';
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
  
  // Animation state for totals
  const [animatedTotal, setAnimatedTotal] = useState(0);

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
      if (activePromo.min_order_amount > subtotal) {
          // Promo inactive visual logic handled in render
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
  const maxPointsUsage = Math.floor(totalAfterPromo * 0.5);
  const userPoints = userProfile?.loyalty_points || 0;
  const pointsToDeduct = usePoints ? Math.min(userPoints, maxPointsUsage) : 0;

  const finalTotal = totalAfterPromo - pointsToDeduct;

  // --- ANIMATED TOTAL EFFECT ---
  useEffect(() => {
      // Simple easing animation for number
      let start = animatedTotal;
      const end = finalTotal;
      if (start === end) return;

      const duration = 500;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function (easeOutQuad)
          const ease = 1 - (1 - progress) * (1 - progress);
          
          const current = start + (end - start) * ease;
          setAnimatedTotal(current);

          if (progress < 1) {
              requestAnimationFrame(animate);
          }
      };
      
      requestAnimationFrame(animate);
  }, [finalTotal]);

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

  const handleCheckout = () => {
    toggleCart(); 
    navigate('/checkout'); 
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

            {/* SMART POINTS UI */}
            {userPoints > 0 ? (
                <div className={`p-4 border transition-all duration-300 ${usePoints ? 'bg-black border-black text-white shadow-lg transform scale-105' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2 font-bold font-jura text-sm">
                            <Sparkles size={16} className={usePoints ? "fill-yellow-400 text-yellow-400" : "fill-yellow-600 text-yellow-600"} />
                            <span className={usePoints ? "text-white" : "text-yellow-800"}>{userPoints} БОНУСОВ</span>
                        </div>
                        <p className={`text-[10px] font-mono ${usePoints ? "text-zinc-400" : "text-yellow-700"}`}>
                            Доступно: {Math.min(userPoints, maxPointsUsage)}
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => setUsePoints(!usePoints)}
                        className={`w-full py-2 font-jura font-bold uppercase text-xs flex items-center justify-center gap-2 transition-all border ${usePoints ? 'bg-white text-black border-white hover:bg-zinc-200' : 'bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-500'}`}
                    >
                        {usePoints ? (
                            <>ОТМЕНИТЬ СПИСАНИЕ</>
                        ) : (
                            <><Zap size={14}/> ПРИМЕНИТЬ MAX BOOST</>
                        )}
                    </button>
                </div>
            ) : (
                <div className="p-4 bg-zinc-50 border border-zinc-200 flex gap-3 items-center">
                    <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center shrink-0">
                        <Gift size={14} className="text-white" />
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase leading-tight">
                        Совершите первую покупку, чтобы начать копить <span className="text-black font-bold">кешбэк 5%</span>
                    </p>
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
                <div className="flex justify-between items-center mt-3 font-jura text-2xl font-bold">
                    <span>ИТОГО</span>
                    <span className="flex items-center">
                        {/* Animated Number Logic Display */}
                        {Math.floor(animatedTotal).toLocaleString()} ₽
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 gap-3">
                <FancyButton fullWidth variant="solid" onClick={handleCheckout}>
                  ОФОРМИТЬ ЗАКАЗ
                </FancyButton>
            </div>

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
