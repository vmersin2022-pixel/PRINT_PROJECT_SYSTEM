import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu as MenuIcon } from 'lucide-react';
import { useApp } from '../../context';

const Header: React.FC = () => {
  const { toggleMenu, toggleCart, cart } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Check if we are on the home page
  const isHome = location.pathname === '/';
  
  // Logic: 
  // If on Home page AND at the top (not scrolled), background is Black -> Text White.
  // Otherwise (Scrolled OR Not Home), background is White -> Text Black.
  const isDarkBg = isHome && !scrolled;

  const textColorClass = isDarkBg ? 'text-white' : 'text-black';
  const hoverColorClass = isDarkBg ? 'group-hover:text-blue-500' : 'group-hover:text-blue-600';
  const underlineColorClass = isDarkBg ? 'bg-blue-500' : 'bg-blue-600';

  return (
    <header className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur border-b border-zinc-200 py-3' : 'bg-transparent py-6'}`}>
      <div className={`container mx-auto px-4 md:px-8 flex justify-between items-center relative transition-colors duration-300 ${textColorClass}`}>
        {/* Left: Menu Trigger */}
        <button onClick={toggleMenu} className="group flex items-center gap-3">
          <MenuIcon className={`w-6 h-6 transition-colors ${hoverColorClass}`} />
          <div className="hidden md:flex flex-col items-start">
            <span className="font-jura text-xs tracking-widest font-bold group-hover:translate-x-1 transition-transform">
              КАТАЛОГ
            </span>
          </div>
        </button>

        {/* Center: Logo */}
        <Link to="/" className="absolute left-1/2 -translate-x-1/2 text-center group flex flex-col items-center">
          <h1 className="font-jura text-2xl md:text-3xl font-bold tracking-[0.2em] group-hover:scale-105 transition-transform uppercase">
            PRINT PROJECT
          </h1>
          <span className={`text-[10px] font-mono tracking-wider lowercase mt-1 transition-colors ${isDarkBg ? 'text-zinc-400' : 'text-zinc-500'}`}>
            БРЕНД-КУРАТОР ПРИНТОВ
          </span>
          <div className={`h-[2px] w-0 mx-auto group-hover:w-full transition-all duration-500 mt-1 ${underlineColorClass}`} />
        </Link>

        {/* Right: Cart */}
        <button onClick={toggleCart} className="group flex items-center gap-3 relative">
          <span className="hidden md:block font-jura text-xs tracking-widest group-hover:-translate-x-1 transition-transform font-bold">
            КОРЗИНА ({totalItems})
          </span>
          <ShoppingBag className={`w-6 h-6 transition-colors ${hoverColorClass}`} />
          {totalItems > 0 && (
            <span className="md:hidden absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-mono">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;