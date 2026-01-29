import React, { useState, useEffect } from 'react';

const PromoSequence: React.FC = () => {
  const [time, setTime] = useState(0);
  const DURATION = 25; // seconds

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
          <div className="absolute inset-0 bg-[url('https://vwspjdsmdxmbzrancyhy.supabase.co/storage/v1/object/public/images/Gemini_Generated_Image_aw82iuaw82iuaw82.png')] bg-cover bg-center opacity-30" />
          <h2 className="relative z-10 text-4xl md:text-6xl font-bold uppercase text-white tracking-widest animate-fade-in text-center px-4">
            Ты знаешь это чувство.<br />Когда открываешь маркетплейс —<br />и там тысячи футболок.
          </h2>
        </div>
      )}
       {isPhase(3, 6) && (
  <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
    
    {(() => {
      const imageUrl = "https://vwspjdsmdxmbzrancyhy.supabase.co/storage/v1/object/public/images/Gemini_Generated_Image_di98jrdi98jrdi98.png"; // Вставь свою ссылку
      return (
        <>
          {/* LAYER 1: КИСЛОТНЫЙ ГЛИТЧ-ФОН */}
          <div className="absolute inset-0 z-0">
            <div 
              className={`absolute inset-0 opacity-30 transition-colors duration-75
                ${Math.floor(time * 15) % 3 === 0 ? 'bg-fuchsia-700' : ''}
                ${Math.floor(time * 15) % 3 === 1 ? 'bg-cyan-900' : ''}
                ${Math.floor(time * 15) % 3 === 2 ? 'bg-yellow-600' : ''}
              `} 
            />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay" />
          </div>

          {/* LAYER 2: "ВЗРЫВ" ПРИНТОВ (Затемненный) */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Основной слой изображения - делаем темнее через opacity-50 и bg-black */}
            <div 
              className="absolute inset-0 bg-cover bg-center scale-110 mix-blend-screen opacity-40 grayscale-[0.5]"
              style={{ backgroundImage: `url('${imageUrl}')` }}
            />
            
            {/* РАДИАЛЬНЫЙ ГРАДИЕНТ ДЛЯ ЧИТАЕМОСТИ (Виньетка в центре) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(0,0,0,0.8)_0%,_transparent_70%)] z-10" />
          </div>

          {/* LAYER 3: ГЛИТЧ-ТЕКСТ (Улучшенная читаемость) */}
          <div className="relative z-30 text-center px-4 select-none drop-shadow-[0_0_15px_rgba(0,0,0,1)]">
            <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] relative">
              
              {/* Слой подложки для букв (чтобы шум не просвечивал сквозь них) */}
              <span className="absolute inset-0 text-black blur-[2px] translate-y-1">
                Много принтов.<br />Много шума.<br />Много всего сразу.
              </span>

              {/* Красный слой-фантом */}
              <span className={`absolute inset-0 text-red-500 mix-blend-lighten
                ${Math.floor(time * 20) % 2 === 0 ? '-translate-x-2 opacity-70' : 'opacity-0'}
              `}>
                Много принтов.<br />Много шума.<br />Много всего сразу.
              </span>
              
              {/* Голубой слой-фантом */}
              <span className={`absolute inset-0 text-cyan-400 mix-blend-lighten
                ${Math.floor(time * 20) % 2 === 0 ? 'translate-x-2 opacity-70' : 'opacity-0'}
              `}>
                Много принтов.<br />Много шума.<br />Много всего сразу.
              </span>
              
              {/* Основной белый текст */}
              <span className="relative text-white drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]">
                Много принтов.<br />
                <span className="text-yellow-400">Много шума.</span><br />
                МНОГО ВСЕГО СРАЗУ.
              </span>
            </h2>
            
            {/* Дополнительная плашка-шум под текстом для "грязного" стиля */}
            <div className="mt-4 font-mono text-xs text-zinc-500 tracking-[0.3em] animate-pulse">
              [ SYSTEM OVERLOAD: DATA OVERFLOW ]
            </div>
          </div>
        </>
      );
    })()}
  </div>
)}
      {/* --- SCENE 3: 6-9s --- 
    "И В КАКОЙ-ТО МОМЕНТ..." 
    Стерильная пустота, эффект зависания системы */}
{isPhase(6, 9) && (
  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 overflow-hidden">
    
    {/* Слой очень легкого зернистого шума (эффект выключенного ТВ) */}
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

    {/* Центральный блок текста */}
    <div className="relative z-10 flex flex-col items-center">
      
      {/* Иконка "замершего" процесса — намек на то, что мозг перегружен */}
      <div className="mb-10 w-8 h-8 border border-zinc-800 border-t-zinc-500 rounded-full animate-[spin_4s_linear_infinite] opacity-30" />

      <h2 className="text-xl md:text-3xl font-mono text-zinc-400 text-center px-6 leading-relaxed uppercase tracking-[0.25em]">
        {/* Первая строка появляется почти сразу */}
        <span className="block opacity-0 animate-[fadeIn_0.8s_ease_forwards_0.5s]">
          И в какой-то момент
        </span>
        
        {/* Вторая строка с акцентом появляется через секунду */}
        <span className="block mt-4 text-zinc-600 opacity-0 animate-[fadeIn_1.2s_ease_forwards_1.5s]">
          ты просто <span className="text-zinc-100 underline decoration-zinc-800 underline-offset-8">перестаёшь выбирать.</span>
        </span>
      </h2>

      {/* Мигающий курсор терминала в конце */}
      <div className="mt-8 w-2 h-5 bg-zinc-700 animate-pulse opacity-50" />
    </div>

    {/* Виньетка, сужающая пространство к центру */}
    <div className="absolute inset-0 bg-[radial-gradient(circle,_transparent_20%,_rgba(0,0,0,0.6)_100%)]" />
  </div>
)}

        {/* --- SCENE 4: 9-13s --- 
    "МЫ СДЕЛАЛИ ИНАЧЕ" 
    Чистый визуал, мгновенный фон, ускоренный текст */}
{isPhase(9, 13) && (
  <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-zinc-100">
    
    {/* 1 & 2. ФОН: Мгновенный, без задержек, увеличенная видимость (opacity-40 вместо 10) */}
    <div className="absolute inset-0 z-0">
      <img 
        src="https://vwspjdsmdxmbzrancyhy.supabase.co/storage/v1/object/public/images/Gemini_Generated_Image_yyhmaiyyhmaiyyhm.png" 
        alt="Background" 
        className="w-full h-full object-cover animate-[kenBurns_20s_linear_infinite]"
      />
      {/* Легкое наложение для читаемости, но не перекрывающее картинку */}
      <div className="absolute inset-0 bg-white/30" /> 
    </div>

    {/* Тонкая эстетичная сетка */}
    <div className="absolute inset-0 z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />

    <div className="relative z-20 max-w-7xl text-center px-5 flex flex-col gap-6 md:gap-8">
      
      {/* Первая строка: Появляется почти сразу (9.1с) */}
      {time > 9.1 && (
        <h2 className="text-4xl md:text-7xl font-black uppercase text-zinc-900 tracking-[0.15em] animate-fade-up">
          Мы сделали иначе.
        </h2>
      )}

      {/* 3. ВТОРАЯ ФРАЗА: Улучшенная читаемость и контраст */}
{time > 10.2 && (
  <div className="flex flex-col items-center gap-4 animate-fade-up">
    <div className="w-12 h-[2px] bg-blue-600 mb-2 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
    
    <p className="text-xl md:text-3xl font-normal uppercase text-zinc-800 tracking-[0.15em] leading-relaxed drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]">
      Мы не собираем всё подряд. <br className="hidden md:block" /> 
      Мы отсматриваем, сравниваем <br className="hidden md:block" />
      <span className="text-black font-black">и убираем лишнее.</span>
    </p>
  </div>
)}
    </div>

    {/* Эффект блика */}
    <div className="absolute inset-0 z-30 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_4s_infinite] pointer-events-none" />
  </div>
)}
         {/* --- SCENE 5: 13-17s --- 
          "КУРАТОРСКИЙ ФОКУС" 
          Lifestyle, ракурс 3/4, серая гамма и живой текст */}
      {isPhase(13, 17) && (
        <div className="absolute inset-0 flex items-center justify-start overflow-hidden bg-[#1a1a1a]">
          
          {/* 1. ФОН: Медленный наезд (Zoom In) */}
          <div className="absolute inset-0 z-0">
            <img 
              src="https://vwspjdsmdxmbzrancyhy.supabase.co/storage/v1/object/public/images/Gemini_Generated_Image_42k3e242k3e242k3.png" 
              alt="Lifestyle Context" 
              className="w-full h-full object-cover grayscale opacity-90 animate-[zoomIn_10s_ease-out_forwards]"
            />
            {/* 2. ГРАДИЕНТ: Затемнение только слева */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          </div>

          {/* 3. ТИПОГРАФИКА: Слева на "стене" */}
          <div className="relative z-10 max-w-4xl px-8 md:px-24 flex flex-col gap-6 md:gap-10">
            <div className="animate-fade-in-left">
              <h2 className="text-2xl md:text-4xl font-light text-zinc-300 uppercase tracking-widest">
                Здесь — <span className="relative inline-block text-white font-normal">
                  не витрина
                  <span className="absolute left-0 top-1/2 w-full h-[2px] bg-red-500 origin-left animate-[scaleX_0.5s_ease-in-out_forwards_0.8s] scale-x-0" />
                </span>
              </h2>
              <p className="text-xl md:text-2xl text-zinc-400 mt-1 lowercase font-mono opacity-80">
                маркетплейса.
              </p>
            </div>

            {time > 14.2 && (
              <div className="animate-fade-in-left">
                <h2 className="text-3xl md:text-6xl font-black text-white uppercase leading-tight tracking-tight">
                  Здесь — только <br />
                  <span className="text-blue-500">актуальные</span> принты,
                </h2>
              </div>
            )}

            {time > 15.2 && (
              <div className="animate-fade-in-left border-l-4 border-blue-600 pl-6 py-1">
                <p className="text-xl md:text-3xl font-medium text-zinc-200">
                  которые действительно <br />
                  <span className="text-white italic">хочется носить.</span>
                </p>
              </div>
            )}
          </div>

          <div className="absolute bottom-10 right-10 flex flex-col items-end opacity-20">
            <span className="text-white font-mono text-[10px] tracking-[0.3em] uppercase">Selection_Unit_05</span>
            <div className="w-20 h-px bg-white mt-1" />
          </div>
        </div>
      )}

      {/* --- SCENE 6: 17-25s --- 
          "PRINT PROJECT: ФИНАЛ" 
          Брендинг и широкая архитектурная стрелка */}
      {isPhase(17, 25) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] overflow-hidden">
          
          {/* Анимированный фон: синее свечение */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.12)_0%,transparent_70%)]" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* 1. ТРИАДА */}
            <div className="flex gap-4 md:gap-8 mb-12">
              {['Характер.', 'Настроение.', 'Контекст.'].map((word, i) => (
                <span 
                  key={word}
                  style={{ animationDelay: `${i * 0.2}s` }}
                  className="text-sm md:text-xl font-mono text-blue-500 uppercase tracking-[0.3em] opacity-0 animate-fade-in"
                >
                  {word}
                </span>
              ))}
            </div>

            {/* 2. БРЕНД (с 18.5с) */}
            {time > 18.5 && (
              <div className="flex flex-col items-center animate-[scaleUp_0.8s_ease-out_forwards]">
                <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic">
                  Print <span className="text-blue-600">Project</span>
                </h1>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-500 to-transparent mt-4" />
                <p className="mt-4 text-lg md:text-2xl font-light text-zinc-400 uppercase tracking-[0.5em]">
                  бренд-куратор принтов
                </p>
              </div>
            )}

            {/* 3. СЛОГАН (с 20с) */}
            {time > 20 && (
              <div className="mt-16 animate-fade-up">
                <h2 className="text-xl md:text-3xl font-medium text-white/80 tracking-wide">
                  Когда больше <span className="text-white font-bold underline decoration-blue-600 underline-offset-8">не нужно искать.</span>
                </h2>
              </div>
            )}
          </div>

          {/* 4. ШИРОКАЯ СТРЕЛКА (с 21с) */}
          {time > 21 && (
            <div className="absolute bottom-10 flex flex-col items-center w-full animate-fade-in z-20">
              <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.6em] mb-4 ml-[0.6em] animate-pulse">
                смотреть коллекцию
              </span>
              <div className="relative flex flex-col items-center group cursor-pointer">
                <div className="w-[1px] h-16 bg-gradient-to-b from-blue-600 via-white to-transparent opacity-50" />
                <div className="relative flex items-center justify-center">
                  <div className="w-16 md:w-24 h-[2px] bg-gradient-to-r from-transparent to-white rotate-[25deg] origin-right -mr-[1px]" />
                  <div className="w-1 h-1 bg-white rotate-45" />
                  <div className="w-16 md:w-24 h-[2px] bg-gradient-to-l from-transparent to-white -rotate-[25deg] origin-left -ml-[1px]" />
                </div>
                <div className="absolute -bottom-4 w-32 h-8 bg-blue-600/20 blur-2xl rounded-full opacity-50" />
              </div>
              <button 
                className="absolute inset-0 w-full h-full cursor-pointer opacity-0" 
                onClick={() => window.scrollTo({top: window.innerHeight, behavior: 'smooth'})}
              />
            </div>
          )}
        </div>
      )}

      {/* --- OVERLAYS (Остаются видимыми всегда поверх сцен) --- */}
      
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

      {/* Metadata */}
      <div className="absolute top-8 right-8 font-mono text-xs mix-blend-difference text-white">
         SEQ_ID: 001_PROMO
      </div>

      {/* Scanlines Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none z-40" />

    {/* Здесь закрывается основной контейнер твоего Dashboard.tsx */}
    </div>
  );
};

export default PromoSequence;