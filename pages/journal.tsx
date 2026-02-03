
import React, { useEffect } from 'react';
import { useApp } from '../context';
import { useNavigate, Link } from 'react-router-dom';
import { getImageUrl } from '../utils';
import { ArrowUpRight, FileText } from 'lucide-react';

const JournalPage: React.FC = () => {
  const { articles } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-12 bg-white">
      <div className="container mx-auto px-4">
        
        {/* Header */}
        <div className="mb-12 border-b border-black pb-6">
            <div className="flex items-center gap-2 mb-2 font-mono text-xs text-zinc-400">
                <span onClick={() => navigate('/')} className="cursor-pointer hover:text-black">ГЛАВНАЯ</span> / 
                <span className="text-black font-bold">ЖУРНАЛ</span>
            </div>
            <h1 className="font-jura text-5xl md:text-7xl font-bold uppercase tracking-tight">
                МЕДИА & <br /> КОНТЕКСТ
            </h1>
            <p className="mt-4 font-montserrat text-sm md:text-base text-zinc-600 max-w-2xl">
                Мы не просто делаем одежду. Мы исследуем культуру, технологии и визуальный код.
                Здесь собраны наши мысли, интервью и упоминания в прессе.
            </p>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-200">
                    <p className="font-jura text-xl text-zinc-400">ПОКА ПУСТО</p>
                </div>
            ) : (
                articles.map((article) => {
                    const isExternal = article.article_type === 'external';
                    const linkProps = isExternal 
                        ? { href: article.external_link, target: "_blank", rel: "noreferrer", as: "a" }
                        : { to: `/journal/${article.id}`, as: Link };

                    // Dynamic component based on link type
                    const Wrapper: any = isExternal ? 'a' : Link;

                    return (
                        <Wrapper 
                            key={article.id} 
                            {...(isExternal ? { href: article.external_link, target: "_blank", rel: "noreferrer" } : { to: `/journal/${article.id}` })}
                            className="group block h-full flex flex-col"
                        >
                            {/* Image */}
                            <div className="relative aspect-[4/3] overflow-hidden border border-black bg-zinc-100 mb-4">
                                <img 
                                    src={getImageUrl(article.cover_image, 600)} 
                                    alt={article.title}
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out" 
                                />
                                <div className="absolute top-4 left-4 bg-white px-2 py-1 border border-black text-[10px] font-bold uppercase flex items-center gap-1">
                                    {isExternal ? <ArrowUpRight size={12}/> : <FileText size={12}/>}
                                    {isExternal ? 'MEDIA' : 'ARTICLE'}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex flex-col flex-grow justify-between border-b border-zinc-200 pb-4 group-hover:border-blue-900 transition-colors">
                                <div>
                                    <div className="text-[10px] font-mono text-zinc-400 mb-2">
                                        {new Date(article.published_at).toLocaleDateString()}
                                    </div>
                                    <h2 className="font-jura text-2xl font-bold uppercase group-hover:text-blue-900 transition-colors leading-tight">
                                        {article.title}
                                    </h2>
                                </div>
                                <div className="mt-4 text-xs font-mono text-zinc-500 uppercase group-hover:text-black flex items-center gap-2">
                                    <span>Читать</span>
                                    <div className="w-8 h-px bg-zinc-300 group-hover:bg-black transition-colors" />
                                </div>
                            </div>
                        </Wrapper>
                    )
                })
            )}
        </div>

      </div>
    </div>
  );
};

export default JournalPage;
