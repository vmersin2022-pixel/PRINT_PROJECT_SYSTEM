import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { MoveRight } from 'lucide-react';

const CollectionsPage: React.FC = () => {
  const { collections } = useApp();
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
                <span className="text-black font-bold">КОЛЛЕКЦИИ</span>
            </div>
            <h1 className="font-jura text-5xl md:text-7xl font-bold uppercase tracking-tight">
                ТВОИ СОСТОЯНИЯ & <br /> СЕРИИ
            </h1>
            <p className="mt-4 font-montserrat text-sm md:text-base text-zinc-600 max-w-2xl">
                Состояния — про настроение. <br />
                Подборки — про персонажей, мемы и культурные коды. <br />
                Выбирай то, что совпадает с тобой сейчас. <br />
                Выбирай свой вайб.
            </p>
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {collections.length === 0 ? (
                <div className="col-span-2 py-20 text-center border-2 border-dashed border-zinc-200">
                    <p className="font-jura text-xl text-zinc-400">NO COLLECTIONS FOUND</p>
                </div>
            ) : (
                collections.map((col, index) => (
                    <Link 
                        key={col.id} 
                        to={`/catalog?collection=${col.id}`}
                        className="group relative block"
                    >
                        {/* Image Container */}
                        <div className="relative aspect-[16/9] md:aspect-[3/2] overflow-hidden border border-black bg-zinc-100 mb-4">
                            <img 
                                src={col.image} 
                                alt={col.title}
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out" 
                            />
                            
                            {/* Overlay Details */}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
                            
                            {/* Hover Badge */}
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 border border-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-y-2 group-hover:translate-y-0">
                                <span className="font-mono text-xs font-bold uppercase">OPEN ARCHIVE</span>
                            </div>

                            {/* ID */}
                            <div className="absolute bottom-4 right-4 font-mono text-xs text-white mix-blend-difference">
                                [ID: {col.id}]
                            </div>
                        </div>

                        {/* Typography */}
                        <div className="flex justify-between items-end border-b border-zinc-200 pb-4 group-hover:border-blue-900 transition-colors">
                            <div>
                                <h2 className="font-jura text-3xl md:text-4xl font-bold uppercase group-hover:text-blue-900 transition-colors">
                                    {col.title}
                                </h2>
                                <p className="font-mono text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                                    {col.desc}
                                </p>
                            </div>
                            <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-4 group-hover:translate-x-0">
                                <span className="font-jura font-bold text-sm">EXPLORE</span>
                                <MoveRight size={16} />
                            </div>
                        </div>
                    </Link>
                ))
            )}
        </div>

        {/* Footer Note */}
        <div className="mt-20 pt-8 border-t border-dashed border-zinc-300 font-mono text-xs text-zinc-400 text-center">
            END OF LIST // MORE COMING SOON
        </div>

      </div>
    </div>
  );
};

export default CollectionsPage;