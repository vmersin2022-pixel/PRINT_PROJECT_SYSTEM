
import React, { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Product, Category } from '../../types';
import { getImageUrl } from '../../utils';
import { useApp } from '../../context';
import { Heart, Play, Lock, ShoppingBag, Plus, Check, X, ShieldAlert, Crown, ArrowRight } from 'lucide-react';

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

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'OS'];

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { wishlist, toggleWishlist, userProfile, addToCart, siteConfig } = useApp();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isMobileQuickAddOpen, setIsMobileQuickAddOpen] = useState(false);
  const [successSize, setSuccessSize] = useState<string | null>(null);
  
  // New State for Velvet Rope Modal
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  
  const intervalRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isLiked = wishlist.includes(product.id);

  // --- DYNAMIC WHALE / VIP LOGIC ---
  const WHALE_THRESHOLD = siteConfig?.vip_threshold || 15000;
  
  const totalSpent = userProfile?.total_spent || 0;
  const isWhale = totalSpent >= WHALE_THRESHOLD;
  const isSecretLocked = product.isVipOnly && !isWhale;
  
  // Calculate how much more needed
  const remainingToUnlock = Math.max(0, WHALE_THRESHOLD - totalSpent);
  const progressPercent = Math.min(100, (totalSpent / WHALE_THRESHOLD) * 100);

  // PREPARE SIZES
  const availableSizes = useMemo(() => {
      let rawSizes: { size: string, stock: number }[] = [];
      
      if (product.variants && product.variants.length > 0) {
          rawSizes = product.variants.map(v => ({ size: v.size, stock: v.stock }));
      } else if (product.sizes && product.sizes.length > 0) {
          rawSizes = product.sizes.map(s => ({ size: s, stock: 10 })); // Fallback stock
      } else {
          rawSizes = ['S', 'M', 'L', 'XL'].map(s => ({ size: s, stock: 0 }));
      }

      return rawSizes.sort((a, b) => {
          const idxA = SIZE_ORDER.indexOf(a.size);
          const idxB = SIZE_ORDER.indexOf(b.size);
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });
  }, [product]);

  const handleMouseEnter = () => {
    if (isSecretLocked) return;
    if (product.images.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIdx((prev) => (prev + 1) % product.images.length);
      }, 1200);
    }
    if (videoRef.current) videoRef.current.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentIdx(0);
    if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
    }
  };

  const handleLike = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(product.id);
  };

  const handleMobileQuickAddToggle = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSecretLocked) {
          setIsUnlockModalOpen(true);
          return;
      }
      setIsMobileQuickAddOpen(!isMobileQuickAddOpen);
  };

  const handleQuickAddToCart = (e: React.MouseEvent, size: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      addToCart(product, size, 1);
      
      setSuccessSize(size);
      setTimeout(() => setSuccessSize(null), 1500);
      
      if (isMobileQuickAddOpen) {
          setTimeout(() => setIsMobileQuickAddOpen(false), 500);
      }
  };

  const handleCardClick = (e: React.MouseEvent) => {
      if (isSecretLocked) {
          e.preventDefault();
          setIsUnlockModalOpen(true);
      }
  };

  const currentMediaSrc = product.images[currentIdx] || product.images[0];
  const isVideo = (url: string) => url?.match(/\.(mp4|webm|mov)$/i);
  const isCurrentVideo = isVideo(currentMediaSrc);

  return (
    <>
    {/* --- VELVET ROPE UNLOCK MODAL --- */}
    {isUnlockModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsUnlockModalOpen(false)}>
            <div className="bg-white border border-black p-8 w-full max-w-sm relative shadow-2xl" onClick={e => e.stopPropagation()}>
                <button onClick={() => setIsUnlockModalOpen(false)} className="absolute top-4 right-4 hover:rotate-90 transition-transform"><X size={20}/></button>
                
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-6 relative">
                        <Lock size={32} className="text-zinc-400" />
                        <div className="absolute -bottom-1 -right-1 bg-black text-white text-[10px] px-2 py-0.5 font-bold uppercase">LOCKED</div>
                    </div>

                    <h3 className="font-jura text-xl font-bold uppercase mb-2">ЗАКРЫТЫЙ ДОСТУП</h3>
                    <p className="font-montserrat text-sm text-zinc-600 mb-6 leading-relaxed">
                        Этот айтем — часть закрытой коллекции для своих. <br/>
                        Чтобы разблокировать доступ, не хватает покупок.
                    </p>

                    <div className="w-full bg-zinc-100 h-2 rounded-full mb-2 overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-1000" 
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <p className="font-mono text-xs text-zinc-500 mb-8">
                        ВАШ LTV: {totalSpent.toLocaleString()} ₽ / ЦЕЛЬ: {WHALE_THRESHOLD.toLocaleString()} ₽
                    </p>

                    <button 
                        onClick={() => setIsUnlockModalOpen(false)}
                        className="w-full bg-black text-white py-3 font-jura font-bold uppercase hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                        ПРОДОЛЖИТЬ ПОКУПКИ <ArrowRight size={14}/>
                    </button>
                </div>
            </div>
        </div>
    )}

    <div className={`group flex flex-col h-full animate-blur-in relative w-full`}>
      
      {/* WRAPPER LINK */}
      <Link 
        to={isSecretLocked ? '#' : `/product/${product.id}`} 
        className="contents"
        onClick={handleCardClick}
      >
        {/* Container */}
        <div 
            className={`
                relative w-full aspect-[3/4] overflow-hidden bg-white/40 backdrop-blur-md border shadow-sm transition-all duration-300 mb-3 shrink-0
                ${isSecretLocked ? 'border-zinc-300 bg-zinc-100' : 'border-white/50 group-hover:shadow-[0_0_25px_rgba(46,89,132,0.3)] group-hover:border-blue-600'}
            `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            
            {/* Main Media Display */}
            <div className="w-full h-full p-2">
                <div className="w-full h-full relative overflow-hidden bg-zinc-100">
                    {/* Render Image/Video */}
                    {isCurrentVideo && !isSecretLocked ? (
                        <video
                            ref={videoRef}
                            src={currentMediaSrc}
                            muted loop playsInline
                            className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
                        />
                    ) : (
                        <img 
                            src={getImageUrl(currentMediaSrc, 500)} 
                            alt={product.name}
                            loading="lazy"
                            className={`w-full h-full object-cover transition-all duration-500 
                                ${isSecretLocked 
                                    // UPDATED BLUR LOGIC: Use distinct styling but visible product
                                    ? 'grayscale contrast-125 opacity-70' 
                                    : 'grayscale group-hover:grayscale-0 scale-95 group-hover:scale-100'
                                }
                            `} 
                        />
                    )}
                    
                    {/* SECRET LOCKED VISUALS (Subtle) */}
                    {isSecretLocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
                            <div className="absolute inset-0 bg-white/10" />
                            <Lock size={24} className="text-black mb-2 drop-shadow-md" />
                            <span className="font-jura font-bold text-black text-xs uppercase tracking-widest bg-white/80 px-2 py-1 backdrop-blur-sm">
                                LOCKED ITEM
                            </span>
                        </div>
                    )}

                    {!isSecretLocked && isCurrentVideo && currentIdx === 0 && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border border-white/50 opacity-80 group-hover:opacity-0 transition-opacity pointer-events-none">
                            <Play size={16} className="text-white fill-white ml-1" />
                        </div>
                    )}
                </div>
            </div>
            
            {/* --- TAGS (Top Left) --- */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 items-start pointer-events-none z-20">
                {product.isVipOnly && (
                    <span className={`text-[9px] px-2 py-1 font-bold font-mono tracking-widest border shadow-md flex items-center gap-1
                        ${isWhale ? 'bg-purple-900 text-white border-purple-500' : 'bg-white text-black border-black'}
                    `}>
                        {isWhale ? <Crown size={10} className="text-yellow-400 fill-yellow-400"/> : <Lock size={10}/>}
                        {isWhale ? 'VIP_UNLOCKED' : 'PRIVATE_CLUB'}
                    </span>
                )}
                {!isSecretLocked && product.isNew && (
                    <span className="bg-blue-600 text-white text-[9px] px-2 py-1 font-bold font-mono tracking-widest border border-blue-500 shadow-[0_0_10px_rgba(46,89,132,0.4)]">
                        NEW
                    </span>
                )}
                {!isSecretLocked && product.categories?.includes('last_drop') && (
                    <span className="bg-zinc-900 text-white text-[9px] px-2 py-1 font-bold font-mono tracking-widest border border-black">
                        LAST_UNIT
                    </span>
                )}
            </div>

            {/* --- ACTIONS (Top Right) --- */}
            {!isSecretLocked && (
                <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
                    <button 
                        onClick={handleLike}
                        className={`w-8 h-8 flex items-center justify-center border transition-all duration-300 shadow-sm ${isLiked ? 'bg-red-600 border-red-600 text-white' : 'bg-white/80 border-zinc-200 text-zinc-400 hover:text-red-500 hover:border-red-500'}`}
                    >
                        <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                    </button>
                </div>
            )}

            {/* --- MOBILE QUICK ADD BUTTON (Bottom Right) --- */}
            <button 
                onClick={handleMobileQuickAddToggle}
                className={`md:hidden absolute bottom-3 right-3 z-30 w-10 h-10 flex items-center justify-center shadow-lg border active:scale-95 transition-transform
                    ${isSecretLocked ? 'bg-zinc-100 text-black border-zinc-300' : 'bg-black text-white border-zinc-700'}
                `}
            >
                {isMobileQuickAddOpen ? <X size={20} /> : (
                    <div className="relative">
                        {isSecretLocked ? <Lock size={16}/> : <ShoppingBag size={18} />}
                        {!isSecretLocked && <Plus size={10} className="absolute -top-1 -right-1.5 bg-blue-600 rounded-full" strokeWidth={4} />}
                    </div>
                )}
            </button>

            {/* --- QUICK ADD OVERLAY --- */}
            {!isSecretLocked && (
                <div className={`
                    absolute inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur-xl border-t border-blue-600 p-3 transition-all duration-300 ease-out
                    flex flex-col justify-center
                    ${isMobileQuickAddOpen ? 'opacity-100 translate-y-0 h-1/2' : 'h-auto translate-y-full md:group-hover:translate-y-0'}
                `}>
                    <div className="flex justify-between items-center mb-2 md:hidden">
                        <span className="font-jura font-bold text-xs uppercase">Выберите размер</span>
                    </div>

                    <div className="flex flex-wrap gap-1 justify-center">
                        {availableSizes.map(({ size, stock }) => {
                            const isSoldOut = stock <= 0;
                            const isSuccess = successSize === size;

                            return (
                                <button
                                    key={size}
                                    onClick={(e) => !isSoldOut && handleQuickAddToCart(e, size)}
                                    disabled={isSoldOut}
                                    className={`
                                        h-8 min-w-[32px] px-1 flex items-center justify-center border font-mono text-[10px] font-bold transition-all duration-200
                                        ${isSuccess ? 'bg-green-600 border-green-600 text-white scale-110' : ''}
                                        ${isSoldOut 
                                            ? 'bg-zinc-100 text-zinc-300 border-zinc-200 cursor-not-allowed line-through' 
                                            : !isSuccess ? 'bg-white hover:bg-black hover:text-white border-zinc-300 hover:border-black' : ''
                                        }
                                    `}
                                >
                                    {isSuccess ? <Check size={14} /> : size}
                                </button>
                            );
                        })}
                    </div>
                    {/* Desktop Header/Label inside slide-up */}
                    <div className="hidden md:flex justify-between items-center mt-2 pt-2 border-t border-dashed border-zinc-300">
                        <span className="font-mono text-[9px] uppercase text-blue-600 font-bold tracking-widest">QUICK ADD</span>
                        <span className="font-mono text-[9px] text-zinc-400">SELECT SIZE</span>
                    </div>
                </div>
            )}
        </div>

        {/* UPDATED TYPOGRAPHY HIERARCHY */}
        <div className="flex justify-between items-start px-1 mt-auto">
            <div className="flex-1 pr-2">
                <h3 className={`font-jura font-bold text-lg leading-tight transition-colors uppercase ${isSecretLocked ? 'text-zinc-400' : 'group-hover:text-blue-600'}`}>
                    {product.name}
                </h3>
                <p className="font-mono text-[9px] text-zinc-400 mt-1 uppercase tracking-wider truncate">
                    {product.categories?.slice(0,2).map(c => CATEGORY_LABELS[c] || c).join(' / ')}
                </p>
            </div>
            <div className="text-right whitespace-nowrap">
                <span className={`font-jura font-bold text-xl block ${isSecretLocked ? 'text-zinc-300' : 'text-black'}`}>
                    {product.price.toLocaleString('ru-RU')} ₽
                </span>
            </div>
        </div>
      </Link>
    </div>
    </>
  );
};

export default ProductCard;
