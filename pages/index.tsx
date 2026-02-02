
import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MoveRight, Layers, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import FancyButton from '../components/ui/FancyButton';
import PromoSequence from '../components/ui/PromoSequence';
import ProductCard from '../components/ui/ProductCard';
import { useApp } from '../context';
import { getImageUrl } from '../utils';

// --- COUNTDOWN COMPONENT ---
const HeroCountdown: React.FC<{ targetDate: string }> = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

    useEffect(() => {
        const calculate = () => {
            const diff = +new Date(targetDate) - +new Date();
            if (diff > 0) {
                return {
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((diff / 1000 / 60) % 60),
                    seconds: Math.floor((diff / 1000) % 60)
                };
            }
            return null;
        };
        setTimeLeft(calculate());
        const timer = setInterval(() => setTimeLeft(calculate()), 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    if (!timeLeft) return null;

    return (
        <div className="flex gap-4 font-jura text-white drop-shadow-md animate-fade-in mt-6">
            {['days', 'hours', 'minutes', 'seconds'].map((unit) => (
                <div key={unit} className="flex flex-col items-center bg-red-600/80 backdrop-blur border border-red-500 p-2 min-w-[60px]">
                    <span className="text-2xl md:text-3xl font-bold">
                        {(timeLeft as any)[unit].toString().padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-mono uppercase opacity-80">{unit}</span>
                </div>
            ))}
        </div>
    );
};

const Home: React.FC = () => {
  const { products, collections, siteConfig } = useApp();
  const productsScrollRef = useRef<HTMLDivElement>(null);
  const collectionsScrollRef = useRef<HTMLDivElement>(null);
  
  // Get all Fresh Drop products instead of slicing just 3, so we can scroll them
  const freshDrops = products.filter(p => p.categories?.includes('fresh_drop') && !p.isHidden);
  
  // If no fresh drops, fallback to some items for display
  const displayProducts = freshDrops.length > 0 
    ? freshDrops 
    : products.filter(p => !p.isHidden).slice(0, 8);

  const marqueeText = "МОЖНО БОЛЬШЕ НЕ СКРОЛЛИТЬ МАРКЕТПЛЕЙСЫ // МЫ УЖЕ ОТОБРАЛИ ТРЕНДЫ // ВСЕ АКТУАЛЬНЫЕ ПРИНТЫ ЗДЕСЬ //";

  // Generic scroll handler
  const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
        const scrollAmount = ref === collectionsScrollRef ? 450 : 340; 
        ref.current.scrollBy({
            left: direction === 'right' ? scrollAmount : -scrollAmount,
            behavior: 'smooth'
        });
    }
  };
  
  // Defaults if CMS not loaded yet
  const heroImage = siteConfig?.hero_image || "https://vwspjdsmdxmbzrancyhy.supabase.co/storage/v1/object/public/images/Generated-Image-January-28_-2026-10_16AM.jpeg";
  const heroTitle = siteConfig?.hero_title || "PRINT PROJECT GAME";
  const heroSubtitle = siteConfig?.hero_subtitle || "СИНХРОНИЗИРУЙ_СВОЙ_СТИЛЬ_С_ВНУТРЕННИМ_КОДОМ.";
  const isSaleMode = siteConfig?.sale_mode;

  return (
    <div className="min-h-screen">
      
      {/* --- HERO SECTION (DYNAMIC FROM CMS) --- */}
      <section className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center z-20 border-b border-zinc-900">
        
        {/* Sale Mode Overlay Effect */}
        {isSaleMode && (
            <div className="absolute inset-0 z-10 pointer-events-none bg-red-900/10 mix-blend-overlay animate-pulse-slow" />
        )}

        {/* Glow effect */}
        <div className={`absolute top-1/2 left-1/4 w-[500px] h-[500px] rounded-full blur-[150px] pointer-events-none animate-pulse ${isSaleMode ? 'bg-red-600/20' : 'bg-blue-600/20'}`} />

        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Hero"
            className="w-full h-full object-cover opacity-60 mix-blend-screen transition-opacity duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(46,89,132,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50" />
        </div>

        <div className="container mx-auto px-4 relative z-10 flex flex-col justify-center items-start h-full">
          <div className="max-w-3xl animate-fade-up">
            <div className={`inline-flex items-center gap-2 border px-3 py-1 mb-4 backdrop-blur-md ${isSaleMode ? 'border-red-600/50 bg-red-900/20' : 'border-blue-600/50 bg-blue-900/20'}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse-fast ${isSaleMode ? 'bg-red-600' : 'bg-blue-600'}`} />
              <span className={`font-mono text-xs tracking-widest ${isSaleMode ? 'text-red-200' : 'text-blue-200'}`}>
                  {isSaleMode ? 'SALE_MODE_ACTIVE' : 'INTERACTIVE_MODE'}
              </span>
            </div>

            <h2 
                className="font-jura text-5xl md:text-7xl font-bold uppercase text-white mb-4 leading-[0.9] drop-shadow-[0_0_25px_rgba(46,89,132,0.3)] whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: heroTitle.replace(/\n/g, '<br/>') }}
            />

            <p className={`font-montserrat text-zinc-300 text-sm md:text-base max-w-lg mb-8 leading-relaxed border-l-4 shadow-[calc(-4px)_0_15px_rgba(46,89,132,0.3)] pl-6 bg-black/40 p-4 backdrop-blur-md ${isSaleMode ? 'border-red-600' : 'border-blue-600'}`}>
              <span className="block font-jura font-bold text-lg text-white tracking-wide mb-2">
                {heroSubtitle}
              </span>
              Это не просто магазин. Это игра, где ты выбираешь состояние,
              а мы показываем принты, которые с ним совпадают.
            </p>

            {/* SALE TIMER */}
            {isSaleMode && siteConfig?.sale_end_date && (
                <div className="mb-8">
                    <p className="text-red-500 font-mono text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Clock size={12}/> До конца акции:
                    </p>
                    <HeroCountdown targetDate={siteConfig.sale_end_date} />
                </div>
            )}

            <FancyButton to="/catalog?category=sets" variant="shutter" className={isSaleMode ? '!border-red-600 hover:!bg-red-600' : ''}>
              АКТИВИРОВАТЬ СОСТОЯНИЕ
            </FancyButton>
          </div>
        </div>
      </section>

      {/* Infinite Seamless Marquee */}
      <div className={`${isSaleMode ? 'bg-red-600 border-red-700' : 'bg-blue-600 border-blue-700'} text-white py-3 border-y overflow-hidden whitespace-nowrap flex select-none relative z-20`}>
        <div className="animate-marquee shrink-0 flex items-center min-w-full">
            <span className="font-jura text-sm tracking-[0.3em] uppercase mr-8">{marqueeText}</span>
            <span className="mx-8 text-white/50">●</span>
            <span className="font-jura text-sm tracking-[0.3em] uppercase mr-8">{marqueeText}</span>
            <span className="mx-8 text-white/50">●</span>
        </div>
        <div className="animate-marquee shrink-0 flex items-center min-w-full">
            <span className="font-jura text-sm tracking-[0.3em] uppercase mr-8">{marqueeText}</span>
            <span className="mx-8 text-white/50">●</span>
            <span className="font-jura text-sm tracking-[0.3em] uppercase mr-8">{marqueeText}</span>
            <span className="mx-8 text-white/50">●</span>
        </div>
      </div>

      {/* Featured Grid */}
      <section className="pt-12 pb-24 bg-transparent relative overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10">
          
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <span className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${isSaleMode ? 'bg-red-600 text-red-600' : 'bg-blue-600 text-blue-600'}`} />
                <span className={`font-mono text-xs font-bold tracking-widest uppercase ${isSaleMode ? 'text-red-600' : 'text-blue-600'}`}>
                  Incoming Signal: Fresh Drop
                </span>
              </div>
              <h2 className="font-jura text-5xl md:text-6xl font-bold uppercase leading-none text-black tracking-tight">
                СВЕЖИЙ <span className="text-zinc-400">ДРОП</span>
              </h2>
            </div>

            <div className="flex items-center gap-4">
                 <div className="flex gap-2">
                    <button onClick={() => scroll(productsScrollRef, 'left')} className="p-3 border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all"><ChevronLeft size={20} /></button>
                    <button onClick={() => scroll(productsScrollRef, 'right')} className="p-3 border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all"><ChevronRight size={20} /></button>
                </div>
                <Link to="/catalog?category=fresh_drop" className="group hidden sm:flex items-center gap-4 pl-6 pr-4 py-3 border-b border-zinc-300 hover:border-blue-600 transition-colors bg-white/30 backdrop-blur-sm">
                    <div className="text-right">
                        <span className="block font-jura font-bold text-sm uppercase group-hover:text-blue-600 transition-colors">СМОТРЕТЬ ВСЕ</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-black group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
                </Link>
            </div>
          </div>

          <div className="relative">
             <div 
                ref={productsScrollRef}
                className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
             >
              {displayProducts.map((product, idx) => (
                <div key={product.id} className="min-w-[70vw] md:min-w-[300px] snap-center">
                    <ProductCard product={product} />
                </div>
              ))}
               <div className="min-w-[1px] md:hidden" />
             </div>
          </div>
        </div>
      </section>

      {/* Video Statement Section */}
      <section className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden bg-black border-y border-black z-20">
        <PromoSequence />
      </section>

      {/* Collections Scroll Section */}
      <section className="border-b border-zinc-200 py-16 bg-transparent overflow-hidden relative group/section">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(46,89,132,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(46,89,132,0.02)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-zinc-300 pb-6 gap-6">
            
            <div className={`relative border-l-4 shadow-[calc(-4px)_0_20px_rgba(46,89,132,0.1)] pl-6 py-2 bg-white/40 backdrop-blur-md border-y border-r border-zinc-200 pr-6 ${isSaleMode ? 'border-red-600' : 'border-blue-600'}`}>
                 <h2 className="font-jura text-4xl md:text-5xl uppercase font-bold tracking-tight text-black mb-2">
                КОЛЛЕКЦИИ
                </h2>
                <p className="font-mono text-xs text-zinc-500">
                    <span className={`${isSaleMode ? 'text-red-600' : 'text-blue-600'} font-bold`}>СИСТЕМНЫЕ ДАННЫЕ:</span> отобранные серии принтов
                </p>
            </div>
           
            <div className="flex flex-col md:flex-row items-end gap-4">
                <div className="flex gap-2">
                    <button onClick={() => scroll(collectionsScrollRef, 'left')} className="p-3 border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all"><ChevronLeft size={20} /></button>
                    <button onClick={() => scroll(collectionsScrollRef, 'right')} className="p-3 border border-zinc-300 hover:border-black hover:bg-black hover:text-white transition-all"><ChevronRight size={20} /></button>
                </div>
               
               <Link to="/collections" className={`font-mono text-xs flex items-center gap-2 group border px-6 py-3 transition-all uppercase tracking-wider bg-white/50 backdrop-blur-sm h-[46px] ${isSaleMode ? 'border-red-200 text-red-600 hover:bg-red-600 hover:text-white' : 'border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white'}`}>
                 <Layers size={14} /> [ВСЕ КОЛЛЕКЦИИ]
               </Link>
            </div>
          </div>

          <div 
            ref={collectionsScrollRef}
            className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {collections.map((col) => (
              <Link 
                key={col.id} 
                to={`/catalog?collection=${col.id}`}
                className="group relative min-w-[85vw] md:min-w-[400px] snap-center block flex flex-col h-full"
              >
                <div className={`aspect-[3/4] border p-1 relative overflow-hidden bg-white/50 backdrop-blur-sm transition-colors shadow-sm group-hover:shadow-lg ${isSaleMode ? 'border-zinc-300 group-hover:border-red-600' : 'border-zinc-300 group-hover:border-blue-600'}`}>
                  <div className="w-full h-full overflow-hidden relative">
                    <img 
                      src={getImageUrl(col.image, 600)}
                      alt={col.title}
                      className="w-full h-full object-cover grayscale opacity-90 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out" 
                    />
                    
                    <div className="absolute inset-0 bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-multiply" />
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                      <div className={`bg-white/90 px-6 py-3 font-jura font-bold uppercase tracking-widest text-sm border backdrop-blur-md shadow-lg ${isSaleMode ? 'text-red-600 border-red-600' : 'text-blue-600 border-blue-600'}`}>
                        ACCESS_DATA
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-start border-b border-zinc-300 pb-2 transition-colors">
                  <div>
                    <h3 className="font-jura text-2xl font-bold uppercase text-black">
                      {col.title}
                    </h3>
                    <p className="font-mono text-xs text-zinc-500 mt-1">
                      {col.desc}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-zinc-400">
                    [0{col.id.substring(0,2)}]
                  </span>
                </div>
              </Link>
            ))}
            <div className="min-w-[1px] md:hidden" />
          </div>
        </div>
      </section>

      {/* --- PHILOSOPHY SECTION (UPDATED) --- */}
      <section className="relative pt-12 pb-24 border-t border-zinc-200 overflow-hidden bg-transparent">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('/public/images/Generated-Image-January-28_-2026-10_16AM.jpeg')] bg-cover bg-center grayscale opacity-30 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 via-zinc-50/50 to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(46,89,132,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(46,89,132,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="container mx-auto px-4 z-10 relative">
          <div className="max-w-6xl w-full relative">
            <div className="relative mb-8">
              <h1 className="font-jura text-6xl md:text-8xl lg:text-9xl font-bold uppercase leading-[0.85] mb-6 tracking-tighter mix-blend-darken text-black/90">
                НЕ<br />СЛУЧАЙНЫЕ<br />ПРИНТЫ
              </h1>
              <div className={`font-montserrat text-sm md:text-base max-w-[500px] text-black font-medium leading-relaxed bg-white/40 backdrop-blur-md border-l-2 p-4 shadow-lg ${isSaleMode ? 'border-red-600' : 'border-blue-600'}`}>
                Принтов слишком много. Футболок — ещё больше.
                Мы убрали лишнее и собрали принты, которые хочется носить.
                Характер. Интересы. Настроение.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-12">
              <FancyButton to="/catalog" variant="solid" className="shadow-2xl">
                СМОТРЕТЬ ОТОБРАННЫЕ ДЛЯ ТЕБЯ ПРИНТЫ
              </FancyButton>
              <FancyButton to="/about" variant="solid" className="!bg-white !text-black !border-black hover:!bg-black hover:!text-white hover:!border-black shadow-lg">
                О БРЕНДЕ
              </FancyButton>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
