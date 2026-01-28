import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import FancyButton from '../components/ui/FancyButton';
import SizeGuideModal from '../components/ui/SizeGuideModal';
import ProductCard from '../components/ui/ProductCard';
import { Ruler, ShieldCheck, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Category } from '../types';

const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const { products, addToCart } = useApp();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Find current product
  const product = products.find(p => p.id === id);

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [currentImage, setCurrentImage] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Scroll function for recommendations
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Card width + gap
      scrollContainerRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // 1. Logic for Recently Viewed (LocalStorage)
  useEffect(() => {
    if (!product) return;

    // Scroll to top when product changes
    window.scrollTo(0, 0);
    setCurrentImage(0);
    setSelectedSize('');

    // Load existing history
    const storedRecent = localStorage.getItem('print_project_recent');
    let parsedRecent: string[] = storedRecent ? JSON.parse(storedRecent) : [];

    // Add current ID, remove duplicates, keep max 4
    parsedRecent = parsedRecent.filter(itemId => itemId !== product.id);
    parsedRecent.unshift(product.id);
    parsedRecent = parsedRecent.slice(0, 5); // Keep 5 items max (current + 4 viewed)

    // Save back
    localStorage.setItem('print_project_recent', JSON.stringify(parsedRecent));
    
    // Update state (exclude current product from the list we display)
    setRecentIds(parsedRecent.filter(itemId => itemId !== product.id));

  }, [id, product]);

  // 2. Compute "Recommended" (Related Products)
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    
    return products.filter(p => {
        if (p.id === product.id) return false;
        if (p.isHidden) return false;
        
        // Logic: Match any category OR collection
        const categoryMatch = p.categories?.some(c => product.categories?.includes(c));
        const collectionMatch = p.collectionIds?.some(cid => product.collectionIds?.includes(cid));
        
        return categoryMatch || collectionMatch;
    }).slice(0, 7); // Show max 7 related items
  }, [product, products]);

  // 3. Compute "Recently Viewed" objects
  const recentProducts = useMemo(() => {
      return recentIds
        .map(rid => products.find(p => p.id === rid))
        .filter(p => p !== undefined && !p.isHidden) as typeof products;
  }, [recentIds, products]);

  if (!product) {
    return <div className="min-h-screen flex items-center justify-center font-jura text-xl">ТОВАР НЕ НАЙДЕН</div>;
  }

  // Dictionary for translation
  const CATEGORY_LABELS: Record<Category, string> = {
    'fresh_drop': 'СВЕЖИЙ ДРОП',
    't-shirts': 'ФУТБОЛКИ',
    'sets': 'КОМПЛЕКТЫ',
    'accessories': 'АКСЕССУАРЫ',
    'last_drop': 'ЗАВЕРШАЕМ ДРОП'
  };

  return (
    <div className="min-h-screen pt-24 pb-12 bg-white">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-8 font-mono text-xs text-zinc-500 flex gap-2 overflow-hidden whitespace-nowrap text-ellipsis">
           <span className="cursor-pointer hover:text-black" onClick={() => navigate('/')}>ГЛАВНАЯ</span> / 
           <span className="cursor-pointer hover:text-black" onClick={() => navigate('/catalog')}>КАТАЛОГ</span> / 
           <span className="text-black font-bold uppercase truncate">{product.name}</span>
        </div>

        {/* --- MAIN PRODUCT INFO --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-24">
          
          {/* Gallery (Left - 7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-[4/5] bg-zinc-100 border border-black overflow-hidden group cursor-crosshair">
              <img 
                src={product.images[currentImage]} 
                alt={product.name} 
                className="w-full h-full object-cover grayscale hover:grayscale-0 hover:scale-110 transition-all duration-700" 
              />
              <div className="absolute top-4 left-4 font-mono text-xs bg-black text-white px-2 py-1">
                IMG_0{currentImage + 1}
              </div>
            </div>
            
            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-6 gap-2">
                {product.images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className={`aspect-square border ${currentImage === idx ? 'border-blue-900 border-2' : 'border-zinc-200'} overflow-hidden`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details (Right - 5 cols) */}
          <div className="lg:col-span-5 sticky top-24 h-fit">
            <div className="mb-2 flex gap-2 flex-wrap">
                {product.categories?.map(cat => (
                    <span key={cat} className="text-[10px] uppercase font-mono bg-zinc-100 px-2 py-0.5 text-zinc-500 border border-zinc-200">
                        {CATEGORY_LABELS[cat] || cat}
                    </span>
                ))}
            </div>
            <h1 className="font-jura text-4xl md:text-5xl font-bold uppercase leading-none mb-2">
              {product.name}
            </h1>
            <p className="font-mono text-blue-900 font-bold text-xl mb-8">
              {product.price.toLocaleString('ru-RU')} ₽
            </p>

            <div className="h-px bg-zinc-200 w-full mb-8" />

            <div className="mb-8">
              <h3 className="font-jura font-bold uppercase mb-2">Описание</h3>
              <p className="font-montserrat text-sm text-zinc-600 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Sizes */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-jura font-bold uppercase">Выберите Размер</h3>
                <button 
                  onClick={() => setShowSizeGuide(true)}
                  className="flex items-center gap-1 text-xs font-mono text-zinc-500 hover:text-blue-900 underline"
                >
                  <Ruler size={14} /> ТАБЛИЦА РАЗМЕРОВ
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`
                      min-w-[48px] h-12 px-2 flex items-center justify-center border font-jura font-bold transition-all
                      ${selectedSize === size 
                        ? 'bg-black text-white border-black' 
                        : 'bg-white text-black border-zinc-300 hover:border-black'}
                    `}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {selectedSize === '' && (
                <p className="text-red-500 text-xs font-mono mt-2 animate-pulse">
                  * ПОЖАЛУЙСТА ВЫБЕРИТЕ РАЗМЕР
                </p>
              )}
            </div>

            <FancyButton 
              fullWidth 
              variant="shutter"
              onClick={() => {
                if (!selectedSize) {
                  alert("ВЫБЕРИТЕ РАЗМЕР");
                  return;
                }
                addToCart(product, selectedSize);
              }}
            >
              Добавить в корзину
            </FancyButton>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-zinc-200">
               <div className="flex gap-3 items-start">
                  <ShieldCheck className="text-blue-900 w-5 h-5" />
                  <div>
                    <h4 className="font-jura font-bold text-xs uppercase">Надежность</h4>
                    <p className="font-mono text-[10px] text-zinc-500">Усиленные швы и материалы.</p>
                  </div>
               </div>
               <div className="flex gap-3 items-start">
                  <Truck className="text-blue-900 w-5 h-5" />
                  <div>
                    <h4 className="font-jura font-bold text-xs uppercase">Доставка</h4>
                    <p className="font-mono text-[10px] text-zinc-500">Доставляем по РФ и СНГ.</p>
                  </div>
               </div>
            </div>

          </div>
        </div>

        {/* --- RECOMMENDED SECTION (SCROLLABLE) --- */}
        {relatedProducts.length > 0 && (
          <div className="mb-24 border-t border-black pt-12">
             <div className="flex items-end justify-between mb-8">
                <div>
                    <h2 className="font-jura text-3xl font-bold uppercase">ВАМ МОЖЕТ ПОДОЙТИ</h2>
                    <span className="font-mono text-xs text-zinc-400">RECOMMENDED_SYS ({relatedProducts.length})</span>
                </div>
                {/* Navigation Buttons */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => scroll('left')} 
                        className="p-2 border border-black hover:bg-black hover:text-white transition-colors"
                        aria-label="Scroll Left"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button 
                        onClick={() => scroll('right')} 
                        className="p-2 border border-black hover:bg-black hover:text-white transition-colors"
                        aria-label="Scroll Right"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
             </div>

             {/* Scrollable Container */}
             <div 
                ref={scrollContainerRef}
                className="flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
             >
                {relatedProducts.map(p => (
                   <div key={p.id} className="min-w-[280px] md:min-w-[320px]">
                      <ProductCard product={p} />
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* --- RECENTLY VIEWED SECTION --- */}
        {recentProducts.length > 0 && (
          <div className="mb-12 border-t border-zinc-200 pt-12">
             <div className="flex items-end justify-between mb-8">
                <h2 className="font-jura text-3xl font-bold uppercase text-zinc-500">СМОТРЕЛИ РАНЕЕ</h2>
                <span className="font-mono text-xs text-zinc-300">HISTORY_LOG</span>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 opacity-75 hover:opacity-100 transition-opacity duration-500">
                {recentProducts.map(p => (
                   <ProductCard key={p.id} product={p} />
                ))}
             </div>
          </div>
        )}

      </div>
      
      <SizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </div>
  );
};

export default ProductDetail;