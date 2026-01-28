import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Product, Category } from '../../types';

interface ProductCardProps {
  product: Product;
}

const CATEGORY_LABELS: Record<Category, string> = {
  'fresh_drop': 'СВЕЖИЙ ДРОП',
  't-shirts': 'ФУТБОЛКИ',
  'sets': 'КОМПЛЕКТЫ',
  'accessories': 'АКСЕССУАРЫ',
  'last_drop': 'ЗАВЕРШАЕМ ДРОП'
};

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const intervalRef = useRef<any>(null);

  const handleMouseEnter = () => {
    if (product.images.length > 1) {
      setCurrentIdx(1);
      intervalRef.current = setInterval(() => {
        setCurrentIdx((prev) => (prev + 1) % product.images.length);
      }, 1000);
    }
  };

  const handleMouseLeave = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentIdx(0);
  };

  return (
    <Link 
      to={`/product/${product.id}`} 
      className="group block animate-fade-up relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glassmorphism Card Container - RAL 5009 SHADOW */}
      <div className="relative aspect-[3/4] overflow-hidden bg-white/40 backdrop-blur-md border border-white/50 shadow-sm group-hover:shadow-[0_0_25px_rgba(46,89,132,0.3)] group-hover:border-blue-600 transition-all duration-300 mb-4">
        
        {/* Main Image Display */}
        <div className="w-full h-full p-2">
            <div className="w-full h-full relative overflow-hidden bg-zinc-50/50">
                 <img 
                    src={product.images[currentIdx] || product.images[0]} 
                    alt={product.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-95 group-hover:scale-100" 
                 />
                 
                 {/* Tech Grid Overlay on Image - RAL 5009 */}
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(46,89,132,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(46,89,132,0.1)_1px,transparent_1px)] bg-[size:20px_20px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none mix-blend-overlay" />
                 
                 {/* White Glow Flash on Hover */}
                 <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-soft-light pointer-events-none" />
            </div>
        </div>
        
        {/* Progress Dots */}
        {product.images.length > 1 && (
            <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                {product.images.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`w-1 h-1 rounded-sm ${idx === currentIdx ? 'bg-blue-600' : 'bg-zinc-300'}`}
                    />
                ))}
            </div>
        )}
        
        {/* Tags Overlay */}
        <div className="absolute top-0 left-0 flex flex-col gap-1 items-start pointer-events-none p-3 z-20">
            {product.isNew && (
                <span className="bg-blue-600 text-white text-[9px] px-2 py-1 font-bold font-mono tracking-widest border border-blue-500 shadow-[0_0_10px_rgba(46,89,132,0.4)]">
                    NEW_DROP
                </span>
            )}
            {product.categories?.includes('last_drop') && (
                <span className="bg-zinc-900 text-white text-[9px] px-2 py-1 font-bold font-mono tracking-widest border border-black">
                    LAST_UNIT
                </span>
            )}
        </div>
        
        {/* Bottom Slide-up Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur-xl p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 border-t border-blue-600 z-20">
            <p className="font-jura text-xs uppercase font-bold text-blue-600 flex justify-between items-center">
                <span>ACCESS_ITEM</span>
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse shadow-[0_0_8px_#2E5984]"/>
            </p>
        </div>

        {/* Corner Decors */}
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Info Block */}
      <div className="flex justify-between items-start px-1">
        <div>
          <h3 className="font-jura font-bold text-base uppercase leading-tight group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
          <p className="font-mono text-[9px] text-zinc-400 mt-1 uppercase tracking-wider">
              {product.categories?.slice(0,2).map(c => CATEGORY_LABELS[c] || c).join(' // ')}
          </p>
        </div>
        <div className="text-right">
             <span className="font-jura font-bold block">{product.price.toLocaleString('ru-RU')} ₽</span>
             <span className="text-[9px] font-mono text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                IN_STOCK
             </span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;