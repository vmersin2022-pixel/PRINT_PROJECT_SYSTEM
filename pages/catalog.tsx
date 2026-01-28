import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context';
import { Category } from '../types';

const Catalog: React.FC = () => {
  const { products } = useApp();
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') as Category | null;

  const filteredProducts = activeCategory 
    ? products.filter(p => p.category === activeCategory)
    : products;

  const categories: Category[] = ['t-shirts', 'sets', 'sale', 'accessories'];

  return (
    <div className="min-h-screen pt-24 pb-12 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-jura text-5xl font-bold uppercase mb-4">
            {activeCategory ? activeCategory : 'Весь Каталог'}
          </h1>
          <div className="w-24 h-1 bg-blue-900" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-12 border-b border-zinc-200 pb-8">
          <Link 
            to="/catalog"
            className={`px-4 py-2 border font-jura uppercase text-sm font-bold transition-all ${!activeCategory ? 'bg-black text-white border-black' : 'bg-white text-black border-zinc-300 hover:border-black'}`}
          >
            Все
          </Link>
          {categories.map(cat => (
            <Link 
              key={cat}
              to={`/catalog?category=${cat}`}
              className={`px-4 py-2 border font-jura uppercase text-sm font-bold transition-all ${activeCategory === cat ? 'bg-black text-white border-black' : 'bg-white text-black border-zinc-300 hover:border-black'}`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <Link key={product.id} to={`/product/${product.id}`} className="group block animate-fade-up">
                <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100 border border-zinc-200 mb-4">
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                  />
                  {/* Overlay Info on Hover */}
                  <div className="absolute inset-x-0 bottom-0 bg-white/90 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 border-t border-blue-900">
                    <p className="font-mono text-xs text-zinc-500 mb-1">ID: {product.id.padStart(4, '0')}</p>
                    <p className="font-jura text-xs uppercase font-bold text-blue-900">Подробнее &gt;</p>
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-jura font-bold text-base uppercase leading-tight group-hover:text-blue-900 transition-colors">
                      {product.name}
                    </h3>
                    <p className="font-mono text-xs text-zinc-400 mt-1 uppercase">{product.category}</p>
                  </div>
                  <span className="font-jura font-bold">${product.price}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-4 py-20 text-center border border-dashed border-zinc-300">
              <p className="font-jura text-xl text-zinc-400">ДАННЫЕ ОТСУТСТВУЮТ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Catalog;