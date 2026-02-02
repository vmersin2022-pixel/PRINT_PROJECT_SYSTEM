
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu as MenuIcon, Heart, User, Search } from 'lucide-react';
import { useApp } from '../../context';
import SearchOverlay from '../ui/SearchOverlay';

const Header: React.FC = () => {
  const { toggleMenu, toggleCart, cart, wishlist, user } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const wishlistCount = wishlist.length;

  const isHome = location.pathname === '/';
  const isDarkBg = isHome && !scrolled;

  const textColorClass = isDarkBg ? 'text-white' : 'text-black';
  const hoverColorClass = isDarkBg ? 'group-hover:text-blue-500' : 'group-hover:text-blue-600';
  const underlineColorClass = isDarkBg ? 'bg-blue-500' : 'bg-blue-600';

  return (
    <>
    <header className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur border-b border-zinc-200 py-4' : 'bg-transparent py-6'}`}>
      <div className={`container mx-auto px-4 md:px-8 flex justify-between items-center relative transition-colors duration-300 ${textColorClass}`}>
        
        {/* Left: Menu & Search */}
        <div className="flex items-center gap-6">
            <button onClick={toggleMenu} className="group flex items-center gap-3">
            <MenuIcon className={`w-6 h-6 transition-colors ${hoverColorClass}`} />
            <div className="hidden md:flex flex-col items-start">
                <span className="font-jura text-xl tracking-widest font-bold group-hover:translate-x-1 transition-transform">
                КАТАЛОГ
                </span>
            </div>
            </button>
            
            <button onClick={() => setIsSearchOpen(true)} className="group hidden md:flex items-center gap-2">
                <Search className={`w-5 h-5 transition-colors ${hoverColorClass}`} />
                <span className="font-mono text-xs uppercase tracking-wider opacity-60 group-hover:opacity-100">Поиск</span>
            </button>
        </div>

        {/* Center: Logo */}
        <Link 
            to="/" 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center group flex flex-col items-center"
        >
          <h1 className={`font-jura font-bold tracking-[0.2em] group-hover:scale-105 transition-all duration-300 uppercase ${scrolled ? 'text-xl' : 'text-2xl md:text-3xl'}`}>
            PRINT PROJECT
          </h1>
          <div className={`overflow-hidden transition-all duration-300 flex flex-col items-center ${scrolled ? 'max-h-0 opacity-0' : 'max-h-8 opacity-100 mt-1'}`}>
            <span className={`text-[15px] font-mono tracking-wider lowercase whitespace-nowrap transition-colors ${isDarkBg ? 'text-zinc-400' : 'text-zinc-500'}`}>
                БРЕНД-КУРАТОР ПРИНТОВ
            </span>
          </div>
          <div className={`h-[2px] w-0 mx-auto group-hover:w-full transition-all duration-500 ${scrolled ? 'mt-0' : 'mt-1'} ${underlineColorClass}`} />
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-4 md:gap-6">
            
            {/* Mobile Search Trigger */}
            <button onClick={() => setIsSearchOpen(true)} className="md:hidden">
                <Search className={`w-6 h-6 transition-colors ${hoverColorClass}`} />
            </button>

            <Link to="/wishlist" className="group flex items-center gap-3 relative" title="Избранное">
                <Heart className={`w-6 h-6 transition-colors ${hoverColorClass}`} />
                {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-mono">
                    {wishlistCount}
                    </span>
                )}
            </Link>

            <Link to="/profile" className="group hidden sm:flex items-center gap-3 relative" title="Личный кабинет">
                <User className={`w-6 h-6 transition-colors ${hoverColorClass} ${user ? 'fill-current' : ''}`} />
            </Link>

            <button onClick={toggleCart} className="group flex items-center gap-3 relative">
                <span className="hidden md:block font-jura text-xs tracking-widest group-hover:-translate-x-1 transition-transform font-bold">
                    КОРЗИНА ({totalItems})
                </span>
                <ShoppingBag className={`w-6 h-6 transition-colors ${hoverColorClass}`} />
                {totalItems > 0 && (
                    <span className="md:hidden absolute -top-1 -right-1 bg-blue-500 text-white text-[15px] w-4 h-4 flex items-center justify-center rounded-full font-mono">
                    {totalItems}
                    </span>
                )}
            </button>
        </div>
      </div>
    </header>
    <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Header;
