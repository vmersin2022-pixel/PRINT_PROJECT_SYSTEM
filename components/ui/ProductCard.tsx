
import React, { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Product, Category } from '../../types';
import { getImageUrl } from '../../utils';
import { useApp } from '../../context';
import { Heart, Play, Lock } from 'lucide-react';

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
  const { wishlist, toggleWishlist, userProfile } = useApp();
  const [currentIdx, setCurrentIdx] = useState(0);
  const intervalRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isLiked = wishlist.includes(product.id);

  // VIP Logic
  // Assuming total_spent is available in profile. Threshold: 10000 RUB
  const isVipUser = (userProfile?.total_spent || 0) >= 10000;
  const isLocked = product.isVipOnly && !isVipUser;

  // Generate a random-looking purchase count based on ID hash
  const purchasedCount = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < product.id.length; i++) {
        hash = ((hash << 5) - hash) + product.id.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash % 898) + 42; 
  }, [product.id]);

  const handleMouseEnter = () => {
    if (isLocked) return; // Disable hover effects if locked
    if (product.images.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIdx((prev) => (prev + 1) % product.images.length);
      }, 1200);
    }
    if (videoRef.current) {
        videoRef.current.play().catch(() => {});
    }
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

  const currentMediaSrc = product.images[currentIdx] || product.images[0];
  const isVideo = (url: string) => url?.match(/\.(mp4|webm|mov)$/i);
  const isCurrentVideo = isVideo(currentMediaSrc);

  return (
    <Link 
      to={isLocked ? '#' : `/product/${product.id}`} 
      className={`group flex flex-col h-full animate-fade-up relative w-full ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={e => isLocked && e.preventDefault()}
    >
      {/* Container with Tech Border Effect */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-white/40 backdrop-blur-md border border-white/50 shadow-sm group-hover:shadow-[0_0_25px_rgba(46,89,132,0.3)] group-hover:border-blue-600 transition-all duration-300 mb-4 shrink-0">
        
        {/* Main Media Display */}
        <div className="w-full h-full p-2">
            <div className="w-full h-full relative overflow-hidden bg-zinc-100">
                 {isCurrentVideo ? (
                     <video
                        ref={videoRef}
                        src={currentMediaSrc}
                        muted
                        loop
                        playsInline
                        className={`w-full h-full object-cover scale-105 transition-transform duration-700 ${isLocked ? 'blur-md grayscale' : 'group-hover:scale-110'}`}
                     />
                 ) : (
                     <img 
                        src={getImageUrl(currentMediaSrc, 500)} 
                        alt={product.name}
                        loading="lazy"
                        className={`w-full h-full object-cover grayscale transition-all duration-500 scale-95 ${isLocked ? 'blur-sm opacity-50' : 'group-hover:grayscale-0 group-hover:scale-100'}`} 
                     />
                 )}
                 
                 {/* LOCKED OVERLAY */}
                 {isLocked && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-30">
                         <Lock size={32} className="text-white mb-2" />
                         <span className="font-jura font-bold text-white text-xs uppercase tracking-widest border border-white px-2 py-1">
                             RESTRICTED AREA
                         </span>
                     </div>
                 )}

                 {/* Video Indicator Icon if not playing */}
                 {!isLocked && isCurrentVideo && currentIdx === 0 && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border border-white/50 opacity-80 group-hover:opacity-0 transition-opacity">
                         <Play size={16} className="text-white fill-white ml-1" />
                     </div>
                 )}

                 {/* Tech Grid Overlay - RAL 5009 */}
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(46,89,132,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(46,89,132,0.1)_1px,transparent_1px)] bg-[size:20px_20px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none mix-blend-overlay" />
            </div>
        </div>
        
        {/* Progress Dots */}
        {!isLocked && product.images.length > 1 && (
            <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                {product.images.map((img, idx) => (
                    <div 
                        key={idx} 
                        className={`w-1 h-1 rounded-sm transition-colors ${idx === currentIdx ? 'bg-blue-600' : 'bg-zinc-300'}`}
                    />
                ))}
            </div>
        )}
        
        {/* --- TAGS (Top Left) --- */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start pointer-events-none z-20">
            {product.isVipOnly && (
                <span className="bg-black text-white text-[9px] px-2 py-1 font-bold font-mono tracking-widest border border-white/20 shadow-md">
                    VIP_ACCESS
                </span>
            )}
            {!isLocked && product.isNew && (
                <span className="bg-blue-600 text-white text-[9px] px-2 py-1 font-bold font-mono tracking-widest border border-blue-500 shadow-[0_0_10px_rgba(46,89,132,0.4)]">
                    NEW_DROP
                </span>
            )}
            {!isLocked && product.categories?.includes('last_drop') && (
                <span className="bg-zinc-900 text-white text-[9px] px-2 py-1 font-bold font-mono tracking-widest border border-black">
                    LAST_UNIT
                </span>
            )}
        </div>

        {/* --- ACTIONS (Top Right) --- */}
        {!isLocked && (
            <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
                {/* Purchased Count */}
                <div className="bg-white/90 backdrop-blur border border-zinc-200 text-black text-[9px] px-2 py-1 font-mono font-bold tracking-tight shadow-sm pointer-events-none">
                    КУПЛЕНО {purchasedCount} РАЗ
                </div>
                
                {/* WISHLIST BUTTON */}
                <button 
                    onClick={handleLike}
                    className={`w-8 h-8 flex items-center justify-center border transition-all duration-300 shadow-sm ${isLiked ? 'bg-red-600 border-red-600 text-white' : 'bg-white/80 border-zinc-200 text-zinc-400 hover:text-red-500 hover:border-red-500'}`}
                >
                    <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                </button>
            </div>
        )}
        
        {/* Bottom Slide-up Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur-xl p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 border-t border-blue-600 z-20">
            <p className="font-jura text-xs uppercase font-bold text-blue-600 flex justify-between items-center">
                <span>{isLocked ? "ACCESS_DENIED" : "ACCESS_ITEM"}</span>
                {!isLocked && <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse shadow-[0_0_8px_#2E5984]"/>}
            </p>
        </div>

        {/* Corner Decors */}
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Info Block */}
      <div className="flex justify-between items-start px-1 mt-auto">
        <div>
          <h3 className="font-jura font-bold text-base uppercase leading-tight group-hover:text-blue-600 transition-colors">
            {isLocked ? "SECRET_ITEM" : product.name}
          </h3>
          <p className="font-mono text-[9px] text-zinc-400 mt-1 uppercase tracking-wider">
              {product.categories?.slice(0,2).map(c => CATEGORY_LABELS[c] || c).join(' // ')}
          </p>
        </div>
        <div className="text-right whitespace-nowrap ml-2">
             <span className="font-jura font-bold block">{product.price.toLocaleString('ru-RU')} ₽</span>
             {!isLocked && (
                 <span className="text-[9px] font-mono text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity block">
                    IN_STOCK
                 </span>
             )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
