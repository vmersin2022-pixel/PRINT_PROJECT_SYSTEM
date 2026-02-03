
import React, { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Product, Category } from '../../types';
import { getImageUrl } from '../../utils';
import { useApp } from '../../context';
import { Heart, Play, Lock, ShoppingBag, Plus, Check, X, ShieldAlert, Crown } from 'lucide-react';

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
const WHALE_THRESHOLD = 15000; // Threshold to unlock Secret Drops

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { wishlist, toggleWishlist, userProfile, addToCart } = useApp();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isMobileQuickAddOpen, setIsMobileQuickAddOpen] = useState(false);
  const [successSize, setSuccessSize] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  
  const intervalRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isLiked = wishlist.includes(product.id);

  // --- WHALE / VIP LOGIC ---
  const totalSpent = userProfile?.total_spent || 0;
  const isWhale = totalSpent >= WHALE_THRESHOLD;
  const isSecretLocked = product.isVipOnly && !isWhale;
  
  // Calculate how much more needed
  const remainingToUnlock = Math.max(0, WHALE_THRESHOLD - totalSpent);

  // Generate a random-looking purchase count
  const purchasedCount = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < product.id.length; i++) {
        hash = ((hash << 5) - hash) + product.id.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash % 898) + 42; 
  }, [product.id]);

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
          triggerAccessDenied();
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

  const triggerAccessDenied = () => {
      setAccessDenied(true);
      setTimeout(() => setAccessDenied(false), 3000);
  };

  const handleCardClick = (e: React.MouseEvent) => {
      if (isSecretLocked) {
          e.preventDefault();
          triggerAccessDenied();
      }
  };

  const currentMediaSrc = product.images[currentIdx] || product.images[0];
  const isVideo = (url: string) => url?.match(/\.(mp4|webm|mov)$/i);
  const isCurrentVideo = isVideo(currentMediaSrc);

  return (
    <div className={`group flex flex-col h-full animate-blur-in relative w-full ${isSecretLocked ? 'cursor-not-allowed select-none' : ''}`}>
      
      {/* ACCESS DENIED OVERLAY (POPUP) */}
      {accessDenied && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-2 animate-fade-in pointer-events-none">
              <div className="bg-black/90 text-white p-4 border-2 border-red-600 shadow-2xl text-center backdrop-blur-md">
                  <ShieldAlert className="w-8 h-8 text-red-600 mx-auto mb-2 animate-bounce" />
                  <h3 className="font-jura font-bold text-red-500 text-lg uppercase tracking-widest">ACCESS DENIED</h3>
                  <p className="font-mono text-[10px] text-zinc-300 mt-2">
                      LEVEL REQUIRED: WHALE
                  </p>
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                      <p className="text-xs font-mono">
                          SPEND <span className="text-red-500 font-bold">{remainingToUnlock.toLocaleString()} ₽</span> MORE TO UNLOCK CLASSIFIED DROPS.
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* WRAPPER LINK */}
      <Link 
        to={isSecretLocked ? '#' : `/product/${product.id}`} 
        className="contents"
        onClick={handleCardClick}
      >
        {/* Container */}
        <div 
            className={`
                relative w-full aspect-[3/4] overflow-hidden bg-white/40 backdrop-blur-md border shadow-sm transition-all duration-300 mb-4 shrink-0
                ${isSecretLocked ? 'border-zinc-800 bg-zinc-900' : 'border-white/50 group-hover:shadow-[0_0_25px_rgba(46,89,132,0.3)] group-hover:border-blue-600'}
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
                                    ? 'blur-[15px] grayscale contrast-125 opacity-60 scale-110' 
                                    : 'grayscale group-hover:grayscale-0 scale-95 group-hover:scale-100'
                                }
                            `} 
                        />
                    )}
                    
                    {/* SECRET LOCKED OVERLAY */}
                    {isSecretLocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                            {/* Animated Scanline */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_4px] pointer-events-none opacity-50" />
                            
                            <Lock size={32} className="text-zinc-500 mb-2" />
                            <div className="border-2 border-zinc-500 px-3 py-1 bg-black/50 backdrop-blur-sm transform -rotate-12">
                                <span className="font-jura font-bold text-zinc-300 text-sm uppercase tracking-widest">
                                    TOP SECRET
                                </span>
                            </div>
                            <p className="mt-4 font-mono text-[9px] text-zinc-500 uppercase tracking-widest">
                                ACCESS LEVEL: WHALE
                            </p>
                        </div>
                    )}

                    {!isSecretLocked && isCurrentVideo && currentIdx === 0 && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border border-white/50 opacity-80 group-hover:opacity-0 transition-opacity pointer-events-none">
                            <Play size={16} className="text-white fill-white ml-1" />
                        </div>
                    )}

                    {/* Tech Grid Overlay (Visible on Unlock Hover) */}
                    {!isSecretLocked && (
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(46,89,132,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(46,89,132,0.1)_1px,transparent_1px)] bg-[size:20px_20px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none mix-blend-overlay" />
                    )}
                </div>
            </div>
            
            {/* --- TAGS (Top Left) --- */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 items-start pointer-events-none z-20">
                {product.isVipOnly && (
                    <span className={`text-[9px] px-2 py-1 font-bold font-mono tracking-widest border shadow-md flex items-center gap-1
                        ${isWhale ? 'bg-purple-900 text-white border-purple-500' : 'bg-black text-zinc-500 border-zinc-800'}
                    `}>
                        {isWhale ? <Crown size={10} className="text-yellow-400 fill-yellow-400"/> : <Lock size={10}/>}
                        {isWhale ? 'SECRET_DROP_UNLOCKED' : 'CLASSIFIED_FILE'}
                    </span>
                )}
                {!isSecretLocked && product.isNew && (
                    <span className="bg-blue-600 text-white text-[9px] px-2 py-1 font-bold font-mono tracking-widest border border-blue-500 shadow-[0_0_10px_rgba(46,89,132,0.4)]">
                        NEW_DROP
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
                    {/* Purchased Count Badge */}
                    <div className="bg-white/90 backdrop-blur border border-zinc-200 text-black text-[9px] px-2 py-1 font-mono font-bold tracking-tight shadow-sm pointer-events-none">
                        КУПЛЕНО {purchasedCount} РАЗ
                    </div>
                    
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
                    ${isSecretLocked ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-black text-white border-zinc-700'}
                `}
            >
                {isMobileQuickAddOpen ? <X size={20} /> : (
                    <div className="relative">
                        {isSecretLocked ? <Lock size={16}/> : <ShoppingBag size={18} />}
                        {!isSecretLocked && <Plus size={10} className="absolute -top-1 -right-1.5 bg-blue-600 rounded-full" strokeWidth={4} />}
                    </div>
                )}
            </button>

            {/* --- QUICK ADD OVERLAY (DESKTOP: Slide Up / MOBILE: Fade In) --- */}
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

            {/* Corner Decors */}
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-blue-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-blue-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>

        {/* Info Block */}
        <div className="flex justify-between items-start px-1 mt-auto">
            <div>
            <h3 className={`font-jura font-bold text-base uppercase leading-tight transition-colors ${isSecretLocked ? 'text-zinc-500' : 'group-hover:text-blue-600'}`}>
                {isSecretLocked ? "CLASSIFIED_OBJECT" : product.name}
            </h3>
            <p className="font-mono text-[9px] text-zinc-400 mt-1 uppercase tracking-wider">
                {product.categories?.slice(0,2).map(c => CATEGORY_LABELS[c] || c).join(' // ')}
            </p>
            </div>
            <div className="text-right whitespace-nowrap ml-2">
                <span className={`font-jura font-bold block ${isSecretLocked ? 'blur-[4px] select-none opacity-50' : ''}`}>
                    {product.price.toLocaleString('ru-RU')} ₽
                </span>
                {!isSecretLocked && (
                    <span className="text-[9px] font-mono text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity block">
                        IN_STOCK
                    </span>
                )}
            </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
