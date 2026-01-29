import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context';
import { Category } from '../types';
import { Filter, X } from 'lucide-react';
import ProductCard from '../components/ui/ProductCard';

const Catalog: React.FC = () => {
  const { products, collections } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State for Filters
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [isNewFilter, setIsNewFilter] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Initial load from URL params
  useEffect(() => {
    const catParam = searchParams.get('category');
    const colParam = searchParams.get('collection');
    const filterParam = searchParams.get('filter');
    
    // Reset filters first
    setSelectedCategories([]);
    setSelectedCollections([]);
    setIsNewFilter(false);

    if (catParam) {
        setSelectedCategories([catParam as Category]);
    }
    if (colParam) {
        // If single collection in URL, select it
        const found = collections.find(c => c.link.includes(colParam) || c.id === colParam);
        // Special handling for 'duo' if it's not yet in the DB but linked from menu
        if(found) {
            setSelectedCollections([found.id]);
        } else if (colParam === 'duo') {
            setSelectedCollections(['duo']);
        }
    }
    if (filterParam === 'new') {
        setIsNewFilter(true);
    }
  }, [searchParams, collections]); // Re-run when URL changes

  const toggleCategory = (cat: Category) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleCollection = (id: string) => {
    setSelectedCollections(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedCollections([]);
    setIsNewFilter(false);
    setSearchParams({});
  };

  // FILTERING LOGIC
  const visibleProducts = products.filter(p => !p.isHidden);
  
  const filteredProducts = visibleProducts.filter(p => {
    // 0. New Filter (Logic for "Свежий Дроп" menu item)
    if (isNewFilter && !p.isNew) return false;

    // 1. Category Filter (OR logic between categories)
    // Checks if the product has ANY of the selected categories
    const matchesCategory = selectedCategories.length === 0 || 
        (p.categories && p.categories.some(cat => selectedCategories.includes(cat)));

    // 2. Collection Filter (OR logic)
    const matchesCollection = selectedCollections.length === 0 || 
        (Array.isArray(p.collectionIds) && p.collectionIds.some(id => selectedCollections.includes(id)));

    return matchesCategory && matchesCollection;
  });

  const categories: Category[] = ['t-shirts', 'sets', 'accessories', 'fresh_drop', 'last_drop'];
  
  const CATEGORY_LABELS: Record<Category, string> = {
    'fresh_drop': 'СВЕЖИЙ ДРОП',
    't-shirts': 'ФУТБОЛКИ',
    'sets': 'КОМПЛЕКТЫ',
    'accessories': 'АКСЕССУАРЫ',
    'last_drop': 'ЗАВЕРШАЕМ ДРОП'
  };

  // --- Dynamic Header Title Logic ---
  let pageTitle = "ВСЕ ТОВАРЫ"; // Default when no filters active
  
  // 1. Check for Fresh Drop (Category or Filter)
  if (selectedCategories.includes('fresh_drop') || isNewFilter) {
      pageTitle = "СВЕЖИЙ ДРОП";
  }
  // 2. Check for Last Drop
  else if (selectedCategories.includes('last_drop')) {
      pageTitle = "ЗАВЕРШАЕМ ДРОП";
  }
  // 3. Check for Collections
  else if (selectedCollections.length > 0) {
      if (selectedCollections.includes('duo')) {
          pageTitle = "А ЭТО ДЛЯ ДВОИХ";
      } else if (selectedCollections.length === 1) {
          const col = collections.find(c => c.id === selectedCollections[0]);
          if (col) pageTitle = col.title;
      } else {
          pageTitle = "ВЫБРАННЫЕ КОЛЛЕКЦИИ";
      }
  }
  // 4. Check for Standard Categories
  else if (selectedCategories.length === 1) {
      pageTitle = CATEGORY_LABELS[selectedCategories[0]];
  }
  // 5. Multiple categories
  else if (selectedCategories.length > 1) {
      pageTitle = "ВЫБОРКА";
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-white">
      <div className="container mx-auto px-4">
        
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-6 flex justify-between items-center border-b border-black pb-4">
            <h1 className="font-jura text-3xl font-bold uppercase">{pageTitle}</h1>
            <button onClick={() => setIsMobileFilterOpen(true)} className="flex items-center gap-2 font-mono text-sm border border-black px-4 py-2">
                <Filter size={16} /> ФИЛЬТРЫ
            </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
            
            {/* --- LEFT SIDEBAR (Vertical Menu) --- */}
            <aside className={`
                fixed inset-0 z-50 bg-white p-8 overflow-y-auto transition-transform duration-300 lg:translate-x-0 lg:static lg:z-0 lg:w-64 lg:p-0 lg:border-r lg:border-zinc-200 lg:bg-transparent lg:block
                ${isMobileFilterOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="lg:hidden flex justify-between items-center mb-8">
                    <span className="font-jura font-bold text-xl">ФИЛЬТРЫ</span>
                    <button onClick={() => setIsMobileFilterOpen(false)}><X size={24}/></button>
                </div>

                <div className="space-y-12 lg:sticky lg:top-32">
                    
                    {/* Active Filters Summary */}
                    {(selectedCategories.length > 0 || selectedCollections.length > 0 || isNewFilter) && (
                        <div className="mb-8">
                            <button onClick={clearFilters} className="text-xs font-mono text-red-600 underline hover:no-underline mb-4">
                                ОЧИСТИТЬ [X]
                            </button>
                            <div className="flex flex-wrap gap-2">
                                {isNewFilter && (
                                     <span className="text-[10px] bg-blue-900 text-white px-2 py-1 font-mono uppercase">NEW DROP</span>
                                )}
                                {selectedCategories.map(c => (
                                    <span key={c} className="text-[10px] bg-black text-white px-2 py-1 font-mono uppercase">{CATEGORY_LABELS[c]}</span>
                                ))}
                                {selectedCollections.map(id => {
                                    if (id === 'duo') return <span key={id} className="text-[10px] bg-zinc-500 text-white px-2 py-1 font-mono uppercase">ДЛЯ ДВОИХ</span>;
                                    const col = collections.find(c => c.id === id);
                                    return col ? <span key={id} className="text-[10px] bg-zinc-500 text-white px-2 py-1 font-mono uppercase">{col.title}</span> : null;
                                })}
                            </div>
                        </div>
                    )}

                    {/* Section 1: TYPE (Categories) */}
                    <div>
                        <h3 className="font-jura text-lg font-bold uppercase mb-4 border-b border-black pb-2">КАТЕГОРИИ</h3>
                        <div className="space-y-3">
                            {categories.map(cat => (
                                <div 
                                    key={cat} 
                                    onClick={() => toggleCategory(cat)}
                                    className="flex items-center gap-3 cursor-pointer group select-none"
                                >
                                    <div className={`w-4 h-4 border border-zinc-400 flex items-center justify-center transition-colors ${selectedCategories.includes(cat) ? 'bg-black border-black' : 'group-hover:border-black'}`}>
                                        {selectedCategories.includes(cat) && <div className="w-2 h-2 bg-white" />}
                                    </div>
                                    <span className={`font-mono text-sm uppercase transition-colors ${selectedCategories.includes(cat) ? 'text-black font-bold' : 'text-zinc-500 group-hover:text-black'}`}>
                                        {CATEGORY_LABELS[cat]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section 2: COLLECTIONS (Vertical List) */}
                    <div>
                        <h3 className="font-jura text-lg font-bold uppercase mb-4 border-b border-black pb-2">КОЛЛЕКЦИИ</h3>
                        {collections.length === 0 ? (
                            <p className="text-xs text-zinc-400 font-mono">НЕТ АКТИВНЫХ КОЛЛЕКЦИЙ</p>
                        ) : (
                            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {collections.map(col => (
                                    <div 
                                        key={col.id} 
                                        onClick={() => toggleCollection(col.id)}
                                        className="flex items-start gap-3 cursor-pointer group select-none"
                                    >
                                        <div className={`mt-0.5 w-4 h-4 border border-zinc-400 flex-shrink-0 flex items-center justify-center transition-colors ${selectedCollections.includes(col.id) ? 'bg-blue-900 border-blue-900' : 'group-hover:border-blue-900'}`}>
                                            {selectedCollections.includes(col.id) && <div className="w-2 h-2 bg-white" />}
                                        </div>
                                        <div>
                                            <span className={`block font-mono text-sm uppercase leading-tight transition-colors ${selectedCollections.includes(col.id) ? 'text-blue-900 font-bold' : 'text-zinc-500 group-hover:text-black'}`}>
                                                {col.title}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </aside>

            {/* --- RIGHT GRID (Products) --- */}
            <div className="flex-1">
                {/* Desktop Header */}
                <div className="hidden lg:block mb-8">
                   <h1 className="font-jura text-5xl font-bold uppercase">{pageTitle}</h1>
                   <p className="font-mono text-xs text-zinc-400 mt-2">ПОКАЗАНО {filteredProducts.length} ТОВАРОВ</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-12">
                {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                       <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <div className="col-span-3 py-20 text-center border-2 border-dashed border-zinc-200 rounded-lg">
                    <p className="font-jura text-xl text-zinc-400">ТОВАРЫ НЕ НАЙДЕНЫ</p>
                    <button onClick={clearFilters} className="mt-4 text-xs font-mono underline hover:text-blue-900">СБРОСИТЬ ФИЛЬТРЫ</button>
                    </div>
                )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Catalog;