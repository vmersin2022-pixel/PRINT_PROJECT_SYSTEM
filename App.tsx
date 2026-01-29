import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Home from './pages/index';
import Catalog from './pages/catalog';
import ProductDetail from './pages/product';
import Admin from './pages/admin';
import CollectionsPage from './pages/collections';
import ServicePage from './pages/service';
import AboutPage from './pages/about';
import Checkout from './pages/checkout';
import WishlistPage from './pages/wishlist';
import ProfilePage from './pages/profile'; 
import Header from './components/layout/Header';
import Menu from './components/layout/Menu';
import Cart from './components/layout/Cart';
import Footer from './components/layout/Footer';
import CustomCursor from './components/ui/CustomCursor';
import { Loader2 } from 'lucide-react';

// New Component to handle the Auth Redirects vs 404s
const AuthRedirectHandler = () => {
  const location = useLocation();
  // HashRouter treats "#access_token=..." as the pathname "/access_token=..."
  // We check if the current "path" looks like a Supabase token
  const isAuthCallback = location.pathname.includes('access_token') || 
                         location.pathname.includes('type=recovery') ||
                         location.pathname.includes('error_description');

  if (isAuthCallback) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 font-jura">
          <Loader2 className="animate-spin mb-4 text-blue-600" size={32} />
          <h2 className="text-xl font-bold uppercase">Авторизация...</h2>
          <p className="font-mono text-xs text-zinc-400 mt-2">SYSTEM_HANDSHAKE_INIT</p>
        </div>
      );
  }

  // If it's just a random wrong URL, go to Home
  return <Navigate to="/" replace />;
};

const App: React.FC = () => {
  // Text for vertical marquees
  const leftText = "SYSTEM_ONLINE // V.2.04 // SECURE_CONNECTION // TRACKING_OFF // ";
  const rightText = "SCROLL_Y // INTERFACE_READY // NEXUS_SHELL // URBAN_GEAR // ";

  return (
    <div className="font-sans text-black selection:bg-blue-600 selection:text-white relative">
      {/* Global Visual Effects */}
      <CustomCursor />
      <div className="bg-noise" />
      
      {/* Vertical Marquees (Fixed on sides) */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-8 z-30 flex-col justify-center items-center border-r border-zinc-200/50 bg-white/30 backdrop-blur-sm pointer-events-none">
        <div className="h-full w-full relative overflow-hidden">
             <div className="absolute top-0 left-0 animate-marquee-vertical whitespace-nowrap writing-mode-vertical text-[10px] font-mono text-zinc-400 py-4 opacity-50 origin-center rotate-180">
                {leftText.repeat(10)}
             </div>
        </div>
      </div>

      <div className="hidden lg:flex fixed right-0 top-0 bottom-0 w-8 z-30 flex-col justify-center items-center border-l border-zinc-200/50 bg-white/30 backdrop-blur-sm pointer-events-none">
        <div className="h-full w-full relative overflow-hidden">
             <div className="absolute top-0 left-0 animate-marquee-vertical whitespace-nowrap writing-mode-vertical text-[10px] font-mono text-zinc-400 py-4 opacity-50">
                {rightText.repeat(10)}
             </div>
        </div>
      </div>

      <Header />
      <Menu />
      <Cart />
      
      {/* Main Content with padding for side marquees */}
      <main className="lg:px-8 transition-all duration-300">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/service/:slug" element={<ServicePage />} />
          
          {/* Modified Catch-All to support Auth Tokens */}
          <Route path="*" element={<AuthRedirectHandler />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;