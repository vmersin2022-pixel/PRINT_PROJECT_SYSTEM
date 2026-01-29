import React, { useState, useEffect } from 'react';
import { X, Trash2, ArrowRight, Send, Tag, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context';
import FancyButton from '../ui/FancyButton';
import { getImageUrl } from '../../utils';

const Cart: React.FC = () => {
  const { isCartOpen, toggleCart, cart, removeFromCart, activePromo, applyPromoCode, removePromoCode } = useApp();
  const navigate = useNavigate();

  // Local state for input, global state for applied promo
  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(false);

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
  const discountAmount = activePromo ? Math.round(subtotal * (activePromo.discount_percent / 100)) : 0;
  const total = subtotal - discountAmount;

  // --- LOGIC: PROMO CODE ---
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setLoading(true);
    const success = await applyPromoCode(promoInput);
    setLoading(false);
    
    if (success) {
        setPromoStatus('success');
    } else {
        setPromoStatus('error');
    }
  };

  const handleRemovePromo = () => {
      removePromoCode();
      setPromoInput('');
      setPromoStatus('idle');
  }

  // --- LOGIC: OPTION 1 (TELEGRAM) ---
  const handleTelegramOrder = () => {
    const botUsername = 'your_telegram_username'; // ЗАМЕНИТЕ НА СВОЙ ЮЗЕРНЕЙМ ИЛИ БОТА
    
    let message = `👋 Привет! Хочу оформить быстрый заказ:\n\n`;
    cart.forEach((item, idx) => {
        message += `${idx + 1}. ${item.name} | Размер: ${item.selectedSize} | x${item.quantity}\n`;
    });
    
    message += `\n💰 Сумма заказа: ${total.toLocaleString()} ₽`;
    if (activePromo) message += ` (Промокод: ${activePromo.code} -${activePromo.discount_percent}%)`;
    
    const url = `https://t.me/${botUsername}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // --- LOGIC: OPTION 3 (FULL CHECKOUT) ---
  const handleCheckout = () => {
    toggleCart(); // Close cart
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
                    <p className="text-[10px] text-green-600 font-mono mt-1">
                        СКИДКА ПРИМЕНЕНА: {activePromo.discount_percent}%
                    </p>
                )}
                {promoStatus === 'error' && <p className="text-[10px] text-red-600 font-mono mt-1">НЕВЕРНЫЙ КОД</p>}
            </div>

            {/* Totals */}
            <div className="border-t border-dashed border-zinc-300 pt-4">
                {activePromo && (
                    <div className="flex justify-between items-center mb-2 font-mono text-xs text-red-600">
                        <span>СКИДКА</span>
                        <span>-{discountAmount.toFixed(0)} ₽</span>
                    </div>
                )}
                <div className="flex justify-between items-center mb-6 font-jura text-xl font-bold">
                    <span>ИТОГО</span>
                    <span>{total.toFixed(0)} ₽</span>
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