import React, { useState, useEffect } from 'react';

const PromoSequence: React.FC = () => {
  const [time, setTime] = useState(0);
  const DURATION = 20; // seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => (prev + 0.1) % DURATION);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Helpers to check current phase
  const isPhase = (start: number, end: number) => time >= start && time < end;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-jura select-none">
      
      {/* --- SCENE 1: 0-3s --- 
          "ПРИНТОВ СЛИШКОМ МНОГО" 
          Slow scroll grid */}
      {isPhase(0, 3) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          {/* Moving Grid Background */}
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] animate-[slideInRight_10s_linear_infinite]" />
          <h2 className="relative z-10 text-4xl md:text-6xl font-bold uppercase text-white tracking-widest animate-fade-in text-center px-4">
            Ты знаешь это чувство.<br />Когда открываешь маркетплейс —<br />и там тысячи футболок.
          </h2>
        </div>
      )}

      {/* --- SCENE 2: 3-6s --- 
          "ФУТБОЛОК — ЕЩЁ БОЛЬШЕ" 
          Rapid background changes (simulated noise) */}
      {isPhase(3, 6) && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          {/* Glitchy Background */}
          <div className={`absolute inset-0 bg-white opacity-10 ${Math.floor(time * 10) % 2 === 0 ? 'invert' : ''}`} />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30" />
          
          <h2 className="relative z-10 text-4xl md:text-6xl font-bold uppercase text-white tracking-tighter scale-110 animate-pulse text-center px-4">
            Много принтов. —<br />Много шума.<br />Много всего сразу.
          </h2>
        </div>
      )}

      {/* --- SCENE 3: 6-9s --- 
          "МЫ УБРАЛИ ЛИШНЕЕ" 
          Clean, stark void */}
      {isPhase(6, 9) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white transition-colors duration-100">
          <h2 className="text-3xl md:text-5xl font-bold uppercase text-black tracking-[0.2em] animate-fade-up text-center px-8">
            И в какой-то момент<br />ты просто перестаёшь выбирать.
          </h2>
        </div>
      )}

      {/* --- SCENE 4: 9-13s --- 
          "ОСТАВИЛИ ТО, ЧТО ХОЧЕТСЯ НОСИТЬ" 
          Slow pan of product */}
      {isPhase(9, 13) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
         <div className="absolute inset-0 opacity-20">
          <img 
           src="https://picsum.photos/seed/vx01/1920/1080" 
           alt="Background" 
           className="w-full h-full object-cover grayscale animate-[fadeUp_10s_ease-out_forwards] scale-125"
          />
         </div>
    
         <div className="relative z-10 max-w-7xl text-center px-5 flex flex-col gap-6">
         {/* Первая строка: появляется сразу после 14 сек */}
          {time > 9.5 && time < 13 && (
           <h2 className="text-4xl md:text-6xl font-bold uppercase text-white tracking-widest animate-slide-up">
           Мы сделали иначе.
           </h2>
          )}

         {/* Вторая строка: появляется через 1.5 сек после первой (14 + 1.5 = 15.5) */}
          {time > 11.5 && time < 13 && (
           <h2 className="text-2xl md:text-4xl font-medium uppercase text-white/90 tracking-widest animate-slide-up">
           Мы не собираем всё подряд. Мы отсматриваем, <br className="hidden md:block" /> 
           сравниваем и убираем лишнее.
           </h2>
          )}
         </div>
        </div>
      )}

      {/* --- SCENE 5: 13-16s --- 
          "ХАРАКТЕР / НАСТРОЕНИЕ / ИНТЕРЕСЫ" 
          Staggered words */}
      {isPhase(13, 16) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4 md:gap-8">
          <div className="absolute inset-0 border-[20px] border-zinc-900/50" />
          <h2 className="text-3xl md:text-5xl font-bold uppercase text-transparent text-stroke-white animate-fade-in">
            Здесь — не витрина маркетплейса.
          </h2>
          {time > 14 && (
            <h2 className="text-3xl md:text-5xl font-bold uppercase text-white animate-fade-in">
              Здесь — только актуальные принты,
            </h2>
          )}
          {time > 15 && (
             <h2 className="text-3xl md:text-5xl font-bold uppercase text-white animate-fade-in">
               которые действительно хочется носить.
             </h2>
          )}
        </div>
      )}

      {/* --- SCENE 6: 16-18s --- 
          "НЕ СЛУЧАЙНЫЕ ПРИНТЫ" 
          Anchor text */}
      {isPhase(16, 18) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
         <div className="flex flex-col items-center space-y-4">
          <h2 className="text-4xl md:text-6xl font-bold uppercase text-white tracking-[0.5em] animate-slide-up">
           Характер.
          </h2>
          <h2 className="text-4xl md:text-6xl font-bold uppercase text-white/50 tracking-[0.5em] animate-slide-up [animation-delay:200ms]">
           Настроение.
          </h2>
          <h2 className="text-4xl md:text-6xl font-bold uppercase text-white/20 tracking-[0.5em] animate-slide-up [animation-delay:400ms]">
           Контекст.
          </h2>
         </div>
        </div>
      )}

      {/* --- SCENE 7: 18-20s --- 
          "PRINT PROJECT" 
          Logo */}
      {isPhase(18, 20.1) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
          <h1 className="text-4xl md:text-7xl font-bold uppercase text-black tracking-tighter mb-2 animate-fade-up">
            PRINT PROJECT
          </h1>
          <p className="font-mono text-sm md:text-sm text-zinc-500 lowercase tracking-[0.3em] animate-fade-in">
            бренд-куратор принтов<br/>Когда больше не нужно искать.
          </p>
        </div>
      )}

      {/* --- OVERLAYS (Always visible) --- */}
      
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-zinc-800 w-full z-50">
        <div 
          className="h-full bg-blue-900 transition-all duration-100 ease-linear"
          style={{ width: `${(time / DURATION) * 100}%` }}
        />
      </div>

      {/* Timer / REC */}
      <div className="absolute top-8 left-8 flex gap-3 items-center z-50 font-mono text-xs mix-blend-difference text-white">
        <div className={`w-3 h-3 bg-red-600 rounded-full ${Math.floor(time) % 2 === 0 ? 'opacity-100' : 'opacity-20'}`} />
        <span>REC [{time.toFixed(2)}s]</span>
      </div>

      <div className="absolute top-8 right-8 font-mono text-xs mix-blend-difference text-white">
         SEQ_ID: 001_PROMO
      </div>

      {/* Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none z-40" />
    </div>
  );
};

export default PromoSequence;