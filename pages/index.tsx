import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MoveRight } from 'lucide-react';
import FancyButton from '../components/ui/FancyButton';
import PromoSequence from '../components/ui/PromoSequence';
import { useApp } from '../context';

const Home: React.FC = () => {
  const { products } = useApp();
  const featuredProducts = products.slice(0, 3);

  const collections = [
    {
      id: 'col1',
      title: 'MONOCHROME_OPS',
      desc: 'TACTICAL BASICS',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
      link: '/catalog?category=sets'
    },
    {
      id: 'col2',
      title: 'CYBER_DYE',
      desc: 'ACID GRAPHICS',
      image: 'https://images.unsplash.com/photo-1503342394128-c104d54dba01?q=80&w=1000&auto=format&fit=crop',
      link: '/catalog?category=t-shirts'
    },
    {
      id: 'col3',
      title: 'ACCESS_DENIED',
      desc: 'LIMITED ACCESSORIES',
      image: 'https://images.unsplash.com/photo-1520013817300-1f4c1cb245ef?q=80&w=1000&auto=format&fit=crop',
      link: '/catalog?category=accessories'
    },
    {
      id: 'col4',
      title: 'SYSTEM_ERROR',
      desc: 'GLITCH SERIES',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop',
      link: '/catalog?category=sale'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center border-b border-black overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542491171-881c1c9c8119?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center grayscale opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          {/* Tech Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="container mx-auto px-4 z-10 relative h-full flex flex-col justify-center">
          <div className="max-w-6xl w-full animate-fade-up relative">
            
            <div className="relative mb-8">
              <h1 className="font-jura text-6xl md:text-8xl lg:text-9xl font-bold uppercase leading-[0.85] mb-6 tracking-tighter">
                НЕ<br />
                СЛУЧАЙНЫЕ<br />
                ПРИНТЫ
              </h1>
              <p className="font-montserrat text-sm md:text-base max-w-[500px] text-blue-900 font-medium leading-relaxed">
                Принтов слишком много.
                Футболок — ещё больше.
                Мы убрали лишнее и собрали принты,которые хочется носить.
                Характер. Интересы. Настроение.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <FancyButton to="/catalog" variant="ghost">
                СМОТРЕТЬ ОТОБРАННЫЕ 
                ДЛЯ ТЕБЯ ПРИНТЫ
              </FancyButton>
              <FancyButton to="#" variant="ghost">
                О БРЕНДЕ
              </FancyButton>
            </div>

          </div>
        </div>

        {/* Decor */}
        <div className="absolute bottom-8 right-8 font-mono text-xs text-zinc-400 hidden md:block">
          COORD: 35.6762° N, 139.6503° E
          <br />
          ZONE: A-1
        </div>
        
        {/* Bottom Left Text */}
        <div className="absolute bottom-8 left-8 font-jura text-sm md:text-base text-blue-900 font-bold uppercase tracking-wider">
         
        </div>
      </section>

      {/* Marquee */}
      <div className="bg-black text-white py-3 border-y border-zinc-800 overflow-hidden whitespace-nowrap">
        <div className="animate-marquee font-jura text-sm tracking-[0.3em] uppercase flex items-center">
          <span>МОЖНО БОЛЬШЕ НЕ СКРОЛЛИТЬ МАРКЕТПЛЕЙСЫ // МЫ УЖЕ ОТОБРАЛИ ТРЕНДЫ // ВСЕ АКТУАЛЬНЫЕ ПРИНТЫ ЗДЕСЬ //</span>
          <span className="mx-8 text-blue-500">●</span>
          <span>МОЖНО БОЛЬШЕ НЕ СКРОЛЛИТЬ МАРКЕТПЛЕЙСЫ // МЫ УЖЕ ОТОБРАЛИ ТРЕНДЫ // ВСЕ АКТУАЛЬНЫЕ ПРИНТЫ ЗДЕСЬ // </span>
          <span className="mx-8 text-blue-500">●</span>
        </div>
      </div>

      {/* Featured Grid */}
      <section className="py-24 container mx-auto px-4">
        <div className="flex justify-between items-end mb-12 border-b border-black pb-4">
          <h2 className="font-jura text-4xl font-bold uppercase">Свежий Дроп</h2>
          <Link to="/catalog" className="font-mono text-sm hover:text-blue-900 flex items-center gap-2 group">
            СМОТРЕТЬ ВСЕ <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredProducts.map((product) => (
            <Link key={product.id} to={`/product/${product.id}`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden border border-zinc-200 mb-4 bg-zinc-100">
                <img 
                  src={product.images[0]} 
                  alt={product.name}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" 
                />
                {product.isNew && (
                  <div className="absolute top-4 left-4 bg-blue-900 text-white text-xs font-bold px-2 py-1 font-jura">
                    NEW
                  </div>
                )}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-900 transition-colors duration-300 pointer-events-none" />
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-jura font-bold text-lg uppercase group-hover:text-blue-900 transition-colors">
                    {product.name}
                  </h3>
                  <p className="font-mono text-xs text-zinc-500 mt-1">{product.category}</p>
                </div>
                <span className="font-jura font-bold text-lg">${product.price}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Video Statement Section */}
      <section className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden bg-black border-y border-black">
        <PromoSequence />
      </section>

      {/* Collections Scroll Section */}
      <section className="border-b border-black py-16 bg-white overflow-hidden">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="flex justify-between items-end mb-10">
            <h2 className="font-jura text-4xl md:text-5xl uppercase font-bold tracking-tight">
              Collections
            </h2>
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
              <span>DRAG_OR_SCROLL</span>
              <MoveRight className="w-4 h-4 animate-pulse" />
            </div>
          </div>

          {/* Horizontal Scroll Container */}
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0">
            {collections.map((col) => (
              <Link 
                key={col.id} 
                to={col.link} 
                className="group relative min-w-[85vw] md:min-w-[400px] snap-center block"
              >
                {/* Card Frame */}
                <div className="aspect-[3/4] border border-black p-1 relative overflow-hidden bg-zinc-100">
                  {/* Inner Image */}
                  <div className="w-full h-full overflow-hidden relative">
                    <img 
                      src={col.image} 
                      alt={col.title}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 ease-out" 
                    />
                    
                    {/* Dark Overlay on Hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Center Text (Appears on Hover) */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                      <div className="bg-white text-black px-6 py-3 font-jura font-bold uppercase tracking-widest text-sm border border-black hover:bg-blue-900 hover:text-white transition-colors">
                        Explore
                      </div>
                    </div>
                  </div>

                  {/* Corner Accents */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-black z-10" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-black z-10" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-black z-10" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-black z-10" />
                </div>

                {/* Metadata Below Card */}
                <div className="mt-4 flex justify-between items-start border-b border-zinc-200 pb-2 group-hover:border-blue-900 transition-colors">
                  <div>
                    <h3 className="font-jura text-2xl font-bold uppercase group-hover:text-blue-900 transition-colors">
                      {col.title}
                    </h3>
                    <p className="font-mono text-xs text-zinc-400 mt-1">
                      {col.desc}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-zinc-300 group-hover:text-black transition-colors">
                    [0{col.id.replace('col', '')}]
                  </span>
                </div>
              </Link>
            ))}
            
            {/* Spacer for right padding on mobile */}
            <div className="min-w-[1px] md:hidden" />
          </div>
        </div>
      </section>

      {/* ИГРА - SPLIT LAYOUT */}
      <section className="bg-black py-24 relative overflow-hidden">
        {/* Background Ambience */}
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
            
            {/* Left: Visual/Cover */}
            <div className="relative group order-2 lg:order-1 flex justify-center">
              {/* HUD Elements (Rotating Rings) */}
              <div className="absolute inset-0 border border-zinc-800/50 rounded-full scale-[1.3] opacity-0 lg:opacity-100 animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-0 border border-dashed border-zinc-700/50 rounded-full scale-[1.5] opacity-0 lg:opacity-100 animate-[spin_30s_linear_infinite_reverse]" />
              
              {/* Main Image Container */}
              <div className="relative w-full max-w-md aspect-square bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl shadow-blue-900/20">
                <img 
                  src="/images/game-cover.jpg" 
                  alt="Game Interface"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                />
                
                {/* Scanline overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50" />
                
                {/* Glitch text overlay on image */}
                <div className="absolute top-4 right-4 font-mono text-[10px] text-blue-500 animate-pulse">
                   Target_Lock [ACTIVE]
                </div>
                <div className="absolute bottom-4 left-4 font-mono text-[10px] text-white/50">
                  SYS.CORE.V.09 // UPLOAD
                </div>
                
                {/* Corner Brackets */}
                <div className="absolute top-2 left-2 w-4 h-4 border-l border-t border-white/50" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-r border-b border-white/50" />
              </div>
            </div>

            {/* Right: Content */}
            <div className="text-left order-1 lg:order-2">
               <div className="inline-flex items-center gap-2 border border-blue-900/30 bg-blue-900/10 px-3 py-1 mb-6">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  <span className="font-mono text-xs text-blue-400 tracking-widest">INTERACTIVE_MODE</span>
               </div>

               <h2 className="font-jura text-5xl md:text-7xl font-bold uppercase text-white mb-6 leading-[0.9]">
                 PRINT<br />PROJECT<br />
                 <span className="text-transparent text-stroke-white">GAME</span>
               </h2>

               <p className="font-montserrat text-zinc-400 max-w-md mb-8 leading-relaxed border-l-2 border-zinc-800 pl-4">
                 Это не просто магазин. Это игра, где ты выбираешь состояние,
                 а мы показываем принты, которые с ним совпадают.
                 <br /><br />
                 <span className="text-white font-bold">Синхронизируй свой внешний вид с внутренним кодом.</span>
               </p>

               <FancyButton to="/catalog?category=sets" variant="shutter">
                 АКТИВИРОВАТЬ СОСТОЯНИЕ
               </FancyButton>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;