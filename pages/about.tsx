import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FancyButton from '../components/ui/FancyButton';
import { Target, Users, Gem, ArrowRight, Activity } from 'lucide-react';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-12 bg-white selection:bg-blue-600 selection:text-white">
      <div className="container mx-auto px-4">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-12 border-b border-black pb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 mb-2 font-mono text-xs text-zinc-400">
                <span onClick={() => navigate('/')} className="cursor-pointer hover:text-black">HOME</span> / 
                <span className="text-black font-bold">MANIFESTO</span>
            </div>
            <div className="hidden md:flex items-center gap-2 font-mono text-xs text-blue-600">
                <Activity size={14} className="animate-pulse" />
                <span>SYSTEM_STATUS: TRANSPARENT</span>
            </div>
        </div>

        {/* HERO SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-24 items-center">
            <div>
                <h1 className="font-jura text-6xl md:text-8xl font-bold uppercase leading-[0.85] mb-8 tracking-tighter">
                    МЫ НЕ<br />
                    ПРОСТО<br />
                    <span className="text-transparent text-stroke-blue-600 text-stroke-1">МАГАЗИН</span>
                </h1>
                <div className="pl-6 border-l-4 border-blue-600 py-2">
                    <p className="font-montserrat text-lg md:text-xl font-bold uppercase leading-tight">
                        PRINT PROJECT — ЭТО БРЕНД-КУРАТОР.
                    </p>
                    <p className="font-montserrat text-zinc-600 mt-4 leading-relaxed max-w-md">
                        В мире визуального шума мы ищем смыслы. Мы не создаем "мерч". Мы создаем одежду, которая говорит за тебя, когда ты молчишь.
                    </p>
                </div>
            </div>
            <div className="relative h-[500px] w-full border border-black p-2 bg-zinc-100">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,#2E5984_1px,transparent_1px)] bg-[size:20px_20px] opacity-10" />
                <div className="w-full h-full bg-black overflow-hidden relative group">
                    <img 
                        src="https://picsum.photos/800/1200?grayscale" 
                        alt="Process" 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-700" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                         <span className="font-jura text-white text-9xl font-bold opacity-10 select-none">DNA</span>
                    </div>
                </div>
            </div>
        </div>

        {/* VALUES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            
            <div className="border-t border-black pt-6 group hover:bg-zinc-50 transition-colors p-4">
                <div className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center mb-6 shadow-[4px_4px_0px_black]">
                    <Target size={24} />
                </div>
                <h3 className="font-jura text-2xl font-bold uppercase mb-4">ОТБОР</h3>
                <p className="font-mono text-sm text-zinc-600 leading-relaxed">
                    Мы отсматриваем тысячи визуальных образов. В коллекцию попадает менее 1%. Только то, что имеет вес, стиль и актуальность.
                </p>
            </div>

            <div className="border-t border-black pt-6 group hover:bg-zinc-50 transition-colors p-4">
                <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-6 shadow-[4px_4px_0px_#2E5984]">
                    <Gem size={24} />
                </div>
                <h3 className="font-jura text-2xl font-bold uppercase mb-4">КАЧЕСТВО</h3>
                <p className="font-mono text-sm text-zinc-600 leading-relaxed">
                    Принт важен, но база важнее. Мы используем плотный хлопок, который держит форму. DTF и шелкография для долговечности.
                </p>
            </div>

            <div className="border-t border-black pt-6 group hover:bg-zinc-50 transition-colors p-4">
                <div className="w-12 h-12 bg-white border border-black text-black flex items-center justify-center mb-6 shadow-[4px_4px_0px_black]">
                    <Users size={24} />
                </div>
                <h3 className="font-jura text-2xl font-bold uppercase mb-4">КОНТЕКСТ</h3>
                <p className="font-mono text-sm text-zinc-600 leading-relaxed">
                    Наши коллекции — это отражение поп-культуры, музыки, искусства и цифровой эстетики. Это код, по которому "свои" узнают "своих".
                </p>
            </div>
        </div>

        {/* MANIFESTO TEXT */}
        <div className="bg-zinc-900 text-white p-8 md:p-16 relative overflow-hidden mb-24">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20" />
            
            <div className="relative z-10 max-w-4xl mx-auto text-center">
                <h2 className="font-jura text-4xl md:text-5xl font-bold uppercase mb-8">
                    "ТВОЯ ОДЕЖДА — ЭТО ИНТЕРФЕЙС"
                </h2>
                <div className="font-montserrat text-lg md:text-xl font-light leading-relaxed space-y-6 text-zinc-300">
                    <p>
                        Мы верим, что в эпоху перепотребления нужно выбирать точнее. 
                        Не покупать лишнее. Покупать то, что резонирует.
                    </p>
                    <p>
                        PRINT PROJECT был создан в Казани в 2022 году как ответ на визуальный хаос масс-маркета. 
                        Мы превращаем хаос в систему.
                    </p>
                </div>
                <div className="mt-12 flex justify-center">
                     <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PRINTPROJECT_MANIFESTO" alt="QR" className="bg-white p-2 mix-blend-screen opacity-80" />
                </div>
            </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center justify-center text-center pb-12">
            <h2 className="font-jura text-3xl font-bold uppercase mb-6">Готов найти свой код?</h2>
            <FancyButton to="/catalog" variant="solid" className="shadow-xl">
                ПЕРЕЙТИ В КАТАЛОГ <ArrowRight className="ml-2 w-4 h-4" />
            </FancyButton>
        </div>

      </div>
    </div>
  );
};

export default AboutPage;