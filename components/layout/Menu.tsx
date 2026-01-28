import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { useApp } from '../../context';

const Menu: React.FC = () => {
  const { isMenuOpen, toggleMenu } = useApp();
  const location = useLocation();

  React.useEffect(() => {
    if (isMenuOpen) toggleMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  if (!isMenuOpen) return null;

  const links = [
    { name: 'Главная', path: '/' },
    { name: 'Каталог', path: '/catalog' },
    { name: 'Футболки', path: '/catalog?category=t-shirts' },
    { name: 'Комплекты', path: '/catalog?category=sets' },
    { name: 'Sale', path: '/catalog?category=sale' },
    { name: 'Admin', path: '/admin' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
        onClick={toggleMenu}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full border-l border-black p-8 flex flex-col animate-slide-in-right">
        <div className="flex justify-between items-center mb-12">
          <span className="font-mono text-xs text-zinc-400">NAV_SYS_V.2.0</span>
          <button onClick={toggleMenu} className="hover:rotate-90 transition-transform duration-300">
            <X size={32} />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-6">
          {links.map((link) => (
            <Link 
              key={link.name} 
              to={link.path}
              className="font-jura text-4xl uppercase font-bold tracking-wider hover:text-blue-900 hover:pl-4 transition-all duration-300 flex items-center group"
            >
              <span className="opacity-0 group-hover:opacity-100 -ml-4 transition-opacity text-blue-900 mr-2 text-xl">
                <ChevronRight />
              </span>
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="border-t border-black pt-8">
          <p className="font-montserrat text-sm text-zinc-500 leading-relaxed">
            PRINT PROJECT INC.<br/>
            TATARSTAN — KAZAN — ALABUGA<br/>
            EST. 2022
          </p>
        </div>
      </div>
    </div>
  );
};

export default Menu;