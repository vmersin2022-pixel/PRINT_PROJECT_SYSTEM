import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MoveRight, Layers } from 'lucide-react';
import FancyButton from '../components/ui/FancyButton';
import PromoSequence from '../components/ui/PromoSequence';
import ProductCard from '../components/ui/ProductCard';
import { useApp } from '../context';

const Home: React.FC = () => {
  const { products, collections } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const freshDrops = products.filter(p => p.categories?.includes('fresh_drop') && !p.isHidden);
  const otherProducts = products.filter(p => !p.categories?.includes('fresh_drop') && !p.isHidden);
  const featuredProducts = [...freshDrops.slice(0, 2), ...otherProducts.slice(0, 1)];

  const marqueeText = "МОЖНО БОЛЬШЕ НЕ СКРОЛЛИТЬ МАРКЕТПЛЕЙСЫ // МЫ УЖЕ ОТОБРАЛИ ТРЕНДЫ // ВСЕ АКТУАЛЬНЫЕ ПРИНТЫ ЗДЕСЬ //";
  
  return (
    <div className="min-h-screen">
      
      {/* --- HERO SECTION (GAME / INTERACTIVE) --- */}
      <section className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center z-20 border-b border-zinc-900">
        {/* Glow effect - RAL 5009 */}
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none animate-pulse" />

        <div className="absolute inset-0 z-0">
          <img 
            src="https://vwspjdsmdxmbzrancyhy.supabase.co/storage/v1/object/public/images/Generated-Image-January-28_-2026-10_16AM.jpeg" 
            alt="Game Interface"
            className="w-full h-full object-cover opacity-60 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
          {/* Grid updated to RAL 5009 Tint */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(46,89,132,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50" />
        </div>

        <div className="container mx-auto px-4 relative z-10 flex flex-col justify-center items-start h-full">
          <div className="max-w-3xl animate-fade-up">
            <div className="inline-flex items-center gap-2 border border-blue-600/50 bg-blue-900/20 px-3 py-1 mb-4 backdrop-blur-md">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse-fast" />
              <span className="font-mono text-xs text-blue-200 tracking-widest">INTERACTIVE_MODE</span>
            </div>

            <h2 className="font-jura text-5xl md:text-7xl font-bold uppercase text-white mb-4 leading-[0.9] drop-shadow-[0_0_25px_rgba(46,89,132,0.3)]">
              PRINT<br />PROJECT<br />
              <span className="text-transparent text-stroke-white">GAME</span>
            </h2>

            <p className="font-montserrat text-zinc-300 text-sm md:text-base max-w-lg mb-8 leading-relaxed border-l-4 border-blue-600 shadow-[calc(-4px)_0_15px_rgba(46,89,132,0.3)] pl-6 bg-black/40 p-4 backdrop-blur-md">
              Это не просто магазин. Это игра, где ты выбираешь состояние,
              а мы показываем принты, которые с ним совпадают.
              <br />
              {/* UPDATED PHRASE: RAL 5009 Gradient */}
              <span className="mt-2 block font-jura font-bold text-lg text-ral-gradient tracking-wide">
                СИНХРОНИЗИРУЙ_СВОЙ_СТИЛЬ_С_ВНУТРЕННИМ_КОДОМ.
              </span>
            </p>

            <FancyButton to="/catalog?category=sets" variant="shutter">
              АКТИВИРОВАТЬ СОСТОЯНИЕ
            </FancyButton>
          </div>
        </div>
      </section>

      {/* Infinite Seamless Marquee - RAL 5009 */}
      <div className="bg-blue-600 text-white py-3 border-y border-blue-700 overflow-hidden whitespace-nowrap flex select-none relative z-20">
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

      {/* Featured Grid - REDUCED PADDING */}
      <section className="pt-12 pb-24 bg-transparent relative overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10">
          
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                {/* RAL 5009 Pulse */}
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse shadow-[0_0_10px_#2E5984]" />
                <span className="font-mono text-xs text-blue-600 font-bold tracking-widest uppercase">
                  Incoming Signal: Fresh Drop
                </span>
              </div>
              <h2 className="font-jura text-5xl md:text-6xl font-bold uppercase leading-none text-black tracking-tight">
                СВЕЖИЙ <span className="text-zinc-400">ДРОП</span>
              </h2>
            </div>

            <Link 
              to="/catalog?category=fresh_drop" 
              className="group flex items-center gap-4 pl-6 pr-4 py-3 border-b border-zinc-300 hover:border-blue-600 transition-colors bg-white/30 backdrop-blur-sm"
            >
              <div className="text-right">
                 <span className="block font-jura font-bold text-sm uppercase group-hover:text-blue-600 transition-colors">СМОТРЕТЬ ВСЕ</span>
              </div>
              <ArrowRight className="w-5 h-5 text-black group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
            </Link>
          </div>

          <div className="relative">
             <div className="hidden md:block absolute -top-4 -left-4 w-8 h-8 border-l-2 border-t-2 border-zinc-200" />
             <div className="hidden md:block absolute -top-4 -right-4 w-8 h-8 border-r-2 border-t-2 border-zinc-200" />

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredProducts.map((product, idx) => (
                <div key={product.id} className="relative group/card">
                   <div className="absolute -top-6 left-0 font-mono text-xs text-zinc-300 group-hover/card:text-blue-600 transition-colors">
                     0{idx + 1} //
                   </div>
                   <ProductCard product={product} />
                </div>
              ))}
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
            
            <div className="relative border-l-4 border-blue-600 shadow-[calc(-4px)_0_20px_rgba(46,89,132,0.1)] pl-6 py-2 bg-white/40 backdrop-blur-md border-y border-r border-zinc-200 pr-6">
                 <h2 className="font-jura text-4xl md:text-5xl uppercase font-bold tracking-tight text-black mb-2">
                КОЛЛЕКЦИИ
                </h2>
                <p className="font-mono text-xs text-zinc-500">
                    <span className="text-blue-600 font-bold">СИСТЕМНЫЕ ДАННЫЕ:</span> отобранные серии принтов
                </p>
            </div>
           
            <div className="flex flex-col md:flex-row items-end gap-4">
               <Link to="/collections" className="font-mono text-xs text-blue-600 hover:text-white flex items-center gap-2 group border border-blue-200 px-6 py-3 hover:bg-blue-600 transition-all uppercase tracking-wider bg-white/50 backdrop-blur-sm">
                 <Layers size={14} /> [ДОСТУП К КОЛЛЕКЦИЯМ]
               </Link>
               <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
                    <span>ЛИСТАЙ</span>
                    <MoveRight className="w-4 h-4 animate-pulse text-blue-600" />
               </div>
            </div>
          </div>

          <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {collections.map((col) => (
              <Link 
                key={col.id} 
                to={`/catalog?collection=${col.id}`}
                className="group relative min-w-[85vw] md:min-w-[400px] snap-center block"
              >
                <div className="aspect-[3/4] border border-zinc-300 p-1 relative overflow-hidden bg-white/50 backdrop-blur-sm group-hover:border-blue-600 transition-colors shadow-sm group-hover:shadow-lg">
                  <div className="w-full h-full overflow-hidden relative">
                    <img 
                      src={col.image} 
                      alt={col.title}
                      className="w-full h-full object-cover grayscale opacity-90 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out" 
                    />
                    
                    <div className="absolute inset-0 bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-multiply" />
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                      <div className="bg-white/90 text-blue-600 px-6 py-3 font-jura font-bold uppercase tracking-widest text-sm border border-blue-600 backdrop-blur-md shadow-lg">
                        ACCESS_DATA
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-blue-600 z-10" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-blue-600 z-10" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-blue-600 z-10" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-blue-600 z-10" />
                </div>

                <div className="mt-4 flex justify-between items-start border-b border-zinc-300 pb-2 group-hover:border-blue-600 transition-colors">
                  <div>
                    <h3 className="font-jura text-2xl font-bold uppercase text-black group-hover:text-blue-600 transition-colors">
                      {col.title}
                    </h3>
                    <p className="font-mono text-xs text-zinc-500 mt-1">
                      {col.desc}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-zinc-400 group-hover:text-blue-600 transition-colors">
                    [0{col.id.replace('col', '').substring(0,2)}]
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
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('/public/images/Generated-Image-January-28_-2026-10_16AM.jpeg')] bg-cover bg-center grayscale opacity-30 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 via-zinc-50/50 to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(46,89,132,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(46,89,132,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="container mx-auto px-4 z-10 relative">
          <div className="max-w-6xl w-full relative">
            
            <div className="relative mb-8">
              <h1 className="font-jura text-6xl md:text-8xl lg:text-9xl font-bold uppercase leading-[0.85] mb-6 tracking-tighter mix-blend-darken text-black/90">
                НЕ<br />
                СЛУЧАЙНЫЕ<br />
                ПРИНТЫ
              </h1>
              <div className="font-montserrat text-sm md:text-base max-w-[500px] text-black font-medium leading-relaxed bg-white/40 backdrop-blur-md border-l-2 border-blue-600 p-4 shadow-lg">
                Принтов слишком много.
                Футболок — ещё больше.
                Мы убрали лишнее и собрали принты, которые хочется носить.
                Характер. Интересы. Настроение.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-12">
              {/* PRIMARY ACTION: SOLID BLACK */}
              <FancyButton to="/catalog" variant="solid" className="shadow-2xl">
                СМОТРЕТЬ ОТОБРАННЫЕ 
                ДЛЯ ТЕБЯ ПРИНТЫ
              </FancyButton>
              
              {/* SECONDARY ACTION: LINKED TO ABOUT PAGE */}
              <FancyButton to="/about" variant="solid" className="!bg-white !text-black !border-black hover:!bg-black hover:!text-white hover:!border-black shadow-lg">
                О БРЕНДЕ
              </FancyButton>
            </div>

          </div>
        </div>

        <div className="absolute bottom-4 right-4 font-mono text-xs text-blue-600 hidden md:block">
          COORD: 35.6762° N, 139.6503° E <br />
          ZONE: A-1 // STATUS: ACTIVE
        </div>
      </section>

    </div>
  );
};

export default Home;