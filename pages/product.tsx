import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import FancyButton from '../components/ui/FancyButton';
import SizeGuideModal from '../components/ui/SizeGuideModal';
import DeliveryModal from '../components/ui/DeliveryModal';
import ProductCard from '../components/ui/ProductCard';
import PromoSequence from '../components/ui/PromoSequence';
import { Ruler, ShieldCheck, Truck, ChevronLeft, ChevronRight, Send, Clock, Minus, Plus, Heart } from 'lucide-react';
import { Category } from '../types';
import { getImageUrl } from '../utils';

const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const { products, addToCart, wishlist, toggleWishlist } = useApp();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Find current product
  const product = products.find(p => p.id === id);

  // CHANGED: Array for multi-size selection
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  
  const [currentImage, setCurrentImage] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showDeliveryInfo, setShowDeliveryInfo] = useState(false);
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
    setSelectedSizes([]); // Reset sizes

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

  const isLiked = wishlist.includes(product.id);

  const CATEGORY_LABELS: Record<Category, string> = {
    'fresh_drop': 'СВЕЖИЙ ДРОП',
    't-shirts': 'ФУТБОЛКИ',
    'sets': 'КОМПЛЕКТЫ',
    'accessories': 'АКСЕССУАРЫ',
    'last_drop': 'ЗАВЕРШАЕМ ДРОП'
  };

  // Toggle Size Logic
  const toggleSize = (size: string) => {
    setSelectedSizes(prev => {
        if (prev.includes(size)) {
            return prev.filter(s => s !== size);
        } else {
            return [...prev, size];
        }
    });
  };

  // Quantity is tied to how many sizes are selected
  const quantity = selectedSizes.length > 0 ? selectedSizes.length : 1;
  const totalPrice = product.price * quantity;

  const handleAddToCart = () => {
    if (selectedSizes.length === 0) {
      alert("ВЫБЕРИТЕ РАЗМЕР");
      return;
    }
    // Add each selected size as a separate item (qty 1 per size)
    selectedSizes.forEach(size => {
        addToCart(product, size, 1);
    });
    // Reset after adding
    setSelectedSizes([]);
  };

  // --- STOCK HELPERS ---
  const getStockForSize = (size: string) => {
      // If we have variants data, use it. Otherwise assume stock is available (legacy support)
      if (product.variants && product.variants.length > 0) {
          const v = product.variants.find(v => v.size === size);
          return v ? v.stock : 0;
      }
      return 10; // Default for legacy products
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

        {/* --- MAIN PRODUCT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-24">
          
          {/* Left Column: Photos & Description (7 cols) */}
          <div className="lg:col-span-7 space-y-12">
            
            {/* Image Gallery */}
            <div className="space-y-4">
                <div className="relative aspect-[4/5] bg-zinc-100 border border-black overflow-hidden group cursor-crosshair">
                    {/* Main Image Optimized: 1000px width for high detail */}
                    <img 
                        src={getImageUrl(product.images[currentImage], 1000)} 
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
                        {/* Thumbnail Optimized: 150px width */}
                        <img src={getImageUrl(img, 150)} alt="" className="w-full h-full object-cover" />
                    </button>
                    ))}
                </div>
                )}
            </div>

            {/* Description Block - Kept here to be "glued" with images vertically */}
            <div className="border-t border-black pt-8">
              <h3 className="font-jura font-bold uppercase text-xl mb-4">Детализация</h3>
              <p className="font-montserrat text-sm md:text-base text-zinc-700 leading-relaxed max-w-2xl">
                {product.description}
              </p>
              
              {/* Features inline */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                 <div className="flex gap-3 items-start p-4 bg-zinc-50 border border-zinc-200">
                    <ShieldCheck className="text-blue-900 w-5 h-5" />
                    <div>
                      <h4 className="font-jura font-bold text-xs uppercase mb-1">Надежность</h4>
                      <p className="font-mono text-[10px] text-zinc-500">Усиленные швы и материалы премиум качества.</p>
                    </div>
                 </div>
                 <div className="flex gap-3 items-start p-4 bg-zinc-50 border border-zinc-200">
                    <Truck className="text-blue-900 w-5 h-5" />
                    <div>
                      <h4 className="font-jura font-bold text-xs uppercase mb-1">Логистика</h4>
                      <p className="font-mono text-[10px] text-zinc-500">Быстрая отправка по РФ и СНГ.</p>
                    </div>
                 </div>
              </div>
            </div>

          </div>

          {/* Right Column: Info & Actions (Sticky) (5 cols) */}
          <div className="lg:col-span-5 relative">
            <div className="lg:sticky lg:top-24 h-fit bg-white/80 backdrop-blur-sm p-1 lg:p-0">
                <div className="mb-2 flex gap-2 flex-wrap">
                    {product.categories?.map(cat => (
                        <span key={cat} className="text-[10px] uppercase font-mono bg-zinc-100 px-2 py-0.5 text-zinc-500 border border-zinc-200">
                            {CATEGORY_LABELS[cat] || cat}
                        </span>
                    ))}
                </div>
                <h1 className="font-jura text-4xl md:text-5xl font-bold uppercase leading-none mb-4">
                {product.name}
                </h1>
                <div className="flex items-center justify-between mb-8">
                    <p className="font-mono text-blue-900 font-bold text-2xl">
                    {product.price.toLocaleString('ru-RU')} ₽
                    </p>
                    <button 
                        onClick={() => toggleWishlist(product.id)}
                        className="group flex items-center gap-2 text-xs font-mono uppercase tracking-wide hover:text-red-600 transition-colors"
                    >
                        <Heart size={18} className={isLiked ? "fill-red-600 text-red-600" : ""} />
                        <span>{isLiked ? "SAVED" : "SAVE"}</span>
                    </button>
                </div>

                <div className="h-px bg-zinc-200 w-full mb-8" />

                {/* Multi-Size Selector */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-jura font-bold uppercase">Размер (Мульти-выбор)</h3>
                    </div>
                    
                    {/* ALL SIZES (Assuming S, M, L, XL, 2XL are standard, but here we iterate over what we have in DB or defaults) */}
                    <div className="flex flex-wrap gap-3">
                        {/* We use a standard list of sizes to ensure order, checking availability for each */}
                        {['S', 'M', 'L', 'XL', '2XL', '3XL'].map((size) => {
                            // Check if this size exists in the product variants
                            const variantExists = product.variants 
                                ? product.variants.some(v => v.size === size) 
                                : product.sizes.includes(size);
                            
                            if (!variantExists) return null; // Don't show if not configured for this product

                            const stock = getStockForSize(size);
                            const isSelected = selectedSizes.includes(size);
                            const isOutOfStock = stock <= 0;

                            return (
                                <button
                                    key={size}
                                    onClick={() => !isOutOfStock && toggleSize(size)}
                                    disabled={isOutOfStock}
                                    className={`
                                    relative min-w-[48px] h-12 px-4 flex items-center justify-center border font-jura font-bold transition-all duration-200
                                    ${isOutOfStock 
                                        ? 'bg-zinc-100 text-zinc-300 border-zinc-200 cursor-not-allowed decoration-slice line-through' 
                                        : isSelected 
                                            ? 'bg-blue-900 text-white border-blue-900 shadow-[4px_4px_0_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' 
                                            : 'bg-white text-black border-zinc-300 hover:border-black'}
                                    `}
                                >
                                    {size}
                                    {isOutOfStock && (
                                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] px-1 font-mono no-underline">SOLD</span>
                                    )}
                                    {!isOutOfStock && stock < 3 && (
                                        <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[8px] px-1 font-mono animate-pulse">LOW</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {selectedSizes.length === 0 && (
                        <p className="text-red-500 text-xs font-mono mt-2 animate-pulse">
                        * НЕОБХОДИМО ВЫБРАТЬ ХОТЯ БЫ ОДИН РАЗМЕР
                        </p>
                    )}
                </div>

                {/* Quantity Display (Auto-calculated) */}
                <div className="mb-8">
                    <h3 className="font-jura font-bold uppercase mb-4">Количество</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center border border-black h-12 bg-zinc-100 cursor-not-allowed">
                            <div className="w-12 h-full flex items-center justify-center text-zinc-400">
                                <Minus size={16} />
                            </div>
                            <div className="w-12 h-full flex items-center justify-center font-mono font-bold border-x border-zinc-200">
                                {quantity}
                            </div>
                            <div className="w-12 h-full flex items-center justify-center text-zinc-400">
                                <Plus size={16} />
                            </div>
                        </div>
                        <div className="font-mono text-xs text-zinc-500">
                            ИТОГО: {totalPrice.toLocaleString()} ₽
                        </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-2 font-mono">
                        КОЛИЧЕСТВО АВТОМАТИЧЕСКИ РАВНО ЧИСЛУ ВЫБРАННЫХ РАЗМЕРОВ
                    </p>
                </div>

                {/* Add to Cart Button (Solid Style) */}
                <div className="mb-6">
                    <FancyButton 
                        fullWidth 
                        variant="solid" 
                        onClick={handleAddToCart}
                    >
                        ДОБАВИТЬ В КОРЗИНУ
                    </FancyButton>
                </div>

                {/* Action Links */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button 
                    onClick={() => setShowSizeGuide(true)}
                    className="flex items-center justify-center gap-2 py-3 border border-zinc-300 hover:border-black transition-colors font-mono text-xs uppercase"
                    >
                        <Ruler size={14} /> Таблица размеров
                    </button>
                    <button 
                    onClick={() => setShowDeliveryInfo(true)}
                    className="flex items-center justify-center gap-2 py-3 border border-zinc-300 hover:border-black transition-colors font-mono text-xs uppercase"
                    >
                        <Clock size={14} /> Сроки и Доставка
                    </button>
                </div>

                {/* Telegram Contact */}
                <a 
                    href="https://t.me/your_telegram_username" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300 group"
                >
                    <Send size={18} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                    <span className="font-jura font-bold uppercase tracking-wider">Связаться в Telegram</span>
                </a>

            </div>
          </div>
        </div>

        {/* --- FULL WIDTH VIDEO SECTION (Below Grid) --- */}
        <div className="mb-24 w-full">
            <h3 className="font-jura font-bold uppercase text-2xl mb-4 text-center">ВИЗУАЛЬНЫЙ КОД</h3>
            <div className="relative w-full aspect-video border border-black overflow-hidden bg-black shadow-2xl">
                <PromoSequence />
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
      <DeliveryModal isOpen={showDeliveryInfo} onClose={() => setShowDeliveryInfo(false)} />
    </div>
  );
};

export default ProductDetail;