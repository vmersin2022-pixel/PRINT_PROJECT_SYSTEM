
import React from 'react';
import { useApp } from '../../context';
import { AlertTriangle, Clock } from 'lucide-react';

const AnnouncementBar: React.FC = () => {
  const { siteConfig } = useApp();

  if (!siteConfig) return null;

  const isSaleMode = siteConfig.sale_mode;

  return (
    <div 
        className={`w-full py-2 px-4 flex justify-center items-center text-xs md:text-sm font-bold tracking-widest uppercase transition-colors duration-500 relative overflow-hidden z-[60]
        ${isSaleMode ? 'bg-red-600 text-white animate-pulse-slow' : 'bg-black text-white'}`}
    >
        {isSaleMode && (
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)] opacity-50" />
        )}
        
        <div className="relative z-10 flex items-center gap-4">
            {isSaleMode && <AlertTriangle size={16} className="animate-bounce" />}
            
            <div className="flex items-center gap-8 animate-marquee whitespace-nowrap min-w-full justify-center">
                <span>{siteConfig.announcement_text || "PRINT PROJECT SYSTEM ONLINE"}</span>
                {isSaleMode && (
                    <>
                        <span className="opacity-50 mx-4">///</span>
                        <span>LIMITED TIME OFFER</span>
                        <span className="opacity-50 mx-4">///</span>
                        <span>НЕ УПУСТИ МОМЕНТ</span>
                    </>
                )}
            </div>

            {isSaleMode && <Clock size={16} className="animate-spin-slow" />}
        </div>
    </div>
  );
};

export default AnnouncementBar;
