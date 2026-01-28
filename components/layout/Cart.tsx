import React from 'react';
import { X, Trash2, ArrowRight } from 'lucide-react';
import { useApp } from '../../context';
import FancyButton from '../ui/FancyButton';

const Cart: React.FC = () => {
  const { isCartOpen, toggleCart, cart, removeFromCart } = useApp();

  if (!isCartOpen) return null;

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

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
                <img src={item.images[0]} alt={item.name} className="w-20 h-24 object-cover grayscale group-hover:grayscale-0 transition-all" />
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
          <div className="p-6 bg-white border-t border-black">
            <div className="flex justify-between items-center mb-6 font-jura text-lg font-bold">
              <span>ИТОГО</span>
              <span>{total.toFixed(0)} ₽</span>
            </div>
            <FancyButton fullWidth variant="shutter" onClick={() => alert('Checkout flow initiated')}>
              ОФОРМИТЬ ЗАКАЗ
            </FancyButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;