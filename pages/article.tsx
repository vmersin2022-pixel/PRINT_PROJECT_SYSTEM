
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { getImageUrl } from '../utils';
import { ArrowLeft, Calendar, Share2 } from 'lucide-react';

const ArticlePage: React.FC = () => {
  const { id } = useParams();
  const { articles } = useApp();
  const navigate = useNavigate();
  
  const article = articles.find(a => a.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!article) {
      return <div className="min-h-screen flex items-center justify-center font-jura text-xl uppercase">Статья не найдена</div>;
  }

  const handleShare = () => {
      if (navigator.share) {
          navigator.share({
              title: article.title,
              url: window.location.href
          });
      } else {
          navigator.clipboard.writeText(window.location.href);
          alert('Ссылка скопирована');
      }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header Image */}
      <div className="relative w-full h-[50vh] md:h-[60vh] bg-black">
          <img 
            src={getImageUrl(article.cover_image, 1200)} 
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          
          <div className="absolute top-24 left-4 md:left-8">
              <button 
                onClick={() => navigate('/journal')} 
                className="bg-white/90 backdrop-blur px-4 py-2 font-mono text-xs uppercase font-bold flex items-center gap-2 hover:bg-black hover:text-white transition-colors border border-black"
              >
                  <ArrowLeft size={14}/> Назад в журнал
              </button>
          </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl -mt-32 relative z-10">
          <div className="bg-white border border-black p-6 md:p-12 shadow-2xl">
              <div className="flex justify-between items-center mb-6 text-zinc-400 font-mono text-xs uppercase border-b border-zinc-100 pb-4">
                  <div className="flex items-center gap-2">
                      <Calendar size={14}/>
                      {new Date(article.published_at).toLocaleDateString()}
                  </div>
                  <button onClick={handleShare} className="hover:text-black transition-colors"><Share2 size={16}/></button>
              </div>

              <h1 className="font-jura text-3xl md:text-5xl font-bold uppercase leading-tight mb-8">
                  {article.title}
              </h1>

              <div className="prose prose-lg prose-zinc max-w-none font-montserrat text-zinc-800 whitespace-pre-wrap leading-relaxed">
                  {article.content}
              </div>
              
              <div className="mt-12 pt-8 border-t border-black text-center">
                  <p className="font-jura font-bold text-xl uppercase tracking-widest">PRINT PROJECT MEDIA</p>
              </div>
          </div>
      </div>
      
      <div className="h-24" /> {/* Spacer */}
    </div>
  );
};

export default ArticlePage;
