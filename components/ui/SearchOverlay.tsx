
import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import { useApp } from '../../context';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../../utils';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const { products } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  const filteredProducts = query.length < 2 
    ? [] 
    : products.filter(p => 
        !p.isHidden && 
        (p.name.toLowerCase().includes(query.toLowerCase()) || 
         p.categories.some(c => c.includes(query.toLowerCase())))
      ).slice(0, 5); // Limit results

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-md flex flex-col animate-fade-in">
      <div className="container mx-auto px-4 pt-8">
        <div className="flex justify-end mb-8">
          <button onClick={onClose} className="p-2 hover:rotate-90 transition-transform">
            <X size={32} />
          </button>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="relative border-b-2 border-black pb-4 mb-12">
            <input 
              ref={inputRef}
              type="text" 
              placeholder="ПОИСК ПО КАТАЛОГУ..." 
              className="w-full text-3xl md:text-5xl font-jura font-bold uppercase bg-transparent outline-none placeholder-zinc-300"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Search className="absolute right-0 top-1/2 -translate-y-1/2 text-black w-8 h-8" />
          </div>

          <div className="space-y-4">
            {query.length > 0 && query.length < 2 && (
               <p className="text-zinc-400 font-mono text-sm">ВВЕДИТЕ МИНИМУМ 2 СИМВОЛА</p>
            )}
            
            {filteredProducts.map(product => (
              <Link 
                key={product.id} 
                to={`/product/${product.id}`}
                onClick={onClose}
                className="flex items-center gap-6 group hover:bg-zinc-50 p-4 transition-colors border-b border-zinc-100 last:border-0"
              >
                <img 
                  src={getImageUrl(product.images[0], 100)} 
                  alt={product.name} 
                  className="w-16 h-20 object-cover grayscale group-hover:grayscale-0 transition-all"
                />
                <div className="flex-1">
                  <h4 className="font-jura text-xl font-bold uppercase group-hover:text-blue-600 transition-colors">
                    {product.name}
                  </h4>
                  <p className="font-mono text-xs text-zinc-500 mt-1">
                    {product.price} ₽
                  </p>
                </div>
                <ChevronRight className="text-zinc-300 group-hover:text-blue-600 group-hover:translate-x-2 transition-all" />
              </Link>
            ))}

            {query.length >= 2 && filteredProducts.length === 0 && (
                <div className="text-center py-12">
                    <p className="font-jura text-xl text-zinc-400">НИЧЕГО НЕ НАЙДЕНО</p>
                    <p className="font-mono text-xs text-zinc-500 mt-2">ПОПРОБУЙТЕ ДРУГОЙ ЗАПРОС</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
