
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';

// Keep Home static for fast LCP (Largest Contentful Paint)
import Home from './pages/index';

// Lazy load other pages to split the bundle
const Catalog = lazy(() => import('./pages/catalog'));
const ProductDetail = lazy(() => import('./pages/product'));
const Admin = lazy(() => import('./pages/admin'));
const CollectionsPage = lazy(() => import('./pages/collections'));
const ServicePage = lazy(() => import('./pages/service'));
const AboutPage = lazy(() => import('./pages/about'));
const Checkout = lazy(() => import('./pages/checkout'));
const WishlistPage = lazy(() => import('./pages/wishlist'));
const ProfilePage = lazy(() => import('./pages/profile'));
const VKCallback = lazy(() => import('./pages/vk-callback'));
const JournalPage = lazy(() => import('./pages/journal'));
const ArticlePage = lazy(() => import('./pages/article'));
const OrderSuccess = lazy(() => import('./pages/order-success')); // NEW

import Header from './components/layout/Header';
import Menu from './components/layout/Menu';
import Cart from './components/layout/Cart';
import Footer from './components/layout/Footer';
import AnnouncementBar from './components/layout/AnnouncementBar';
import CustomCursor from './components/ui/CustomCursor';
import ScrollToTop from './components/ui/ScrollToTop'; // NEW
import { Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

// Loading Fallback Component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-zinc-50">
    <Loader2 className="animate-spin text-blue-600" size={40} />
  </div>
);

// New Component to handle the Auth Redirects vs 404s
const AuthRedirectHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [shouldRedirectHome, setShouldRedirectHome] = useState(false);

  // HashRouter treats "#access_token=..." as the pathname "/access_token=..."
  // We check if the current "path" looks like a Supabase token or error
  const isAuthCallback = location.pathname.includes('access_token') || 
                         location.pathname.includes('type=recovery') ||
                         location.pathname.includes('error_description') ||
                         location.pathname.includes('error=');

  useEffect(() => {
    if (isAuthCallback) {
      
      // TIMEOUT GUARD: If Supabase doesn't resolve in 6 seconds, just go to profile/home
      const timeoutId = setTimeout(() => {
          setShouldRedirectHome(true);
      }, 6000);

      // Check if session is already established
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
           clearTimeout(timeoutId);
           navigate('/profile', { replace: true });
        }
      });

      // Also listen for the event in case it happens *after* this component mounts
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
           clearTimeout(timeoutId);
           navigate('/profile', { replace: true });
        }
      });

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeoutId);
      }
    }
  }, [isAuthCallback, navigate]);

  if (shouldRedirectHome) {
      return <Navigate to="/profile" replace />;
  }

  if (isAuthCallback) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 font-jura">
          <Loader2 className="animate-spin mb-4 text-blue-600" size={32} />
          <h2 className="text-xl font-bold uppercase">Авторизация...</h2>
          <p className="font-mono text-xs text-zinc-400 mt-2">SYSTEM_HANDSHAKE_INIT</p>
          {location.pathname.includes('error') && (
              <p className="text-red-500 text-xs font-mono mt-4 max-w-md text-center">
                  Ошибка авторизации. Ссылка могла устареть.
              </p>
          )}
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
    <div className="font-sans text-black selection:bg-blue-600 selection:text-white relative flex flex-col min-h-screen">
      <ScrollToTop /> {/* Global Scroll Fix */}
      
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

      <AnnouncementBar />
      <Header />
      <Menu />
      <Cart />
      
      {/* Main Content with padding for side marquees */}
      <main className="lg:px-8 transition-all duration-300 flex-grow">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success" element={<OrderSuccess />} /> {/* NEW ROUTE */}
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/vk-callback" element={<VKCallback />} />
            <Route path="/service" element={<ServicePage />} />
            <Route path="/service/:slug" element={<ServicePage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/journal/:id" element={<ArticlePage />} />
            
            <Route path="*" element={<AuthRedirectHandler />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </div>
  );
};

export default App;
