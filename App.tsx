import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/index';
import Catalog from './pages/catalog';
import ProductDetail from './pages/product';
import Admin from './pages/admin';
import Header from './components/layout/Header';
import Menu from './components/layout/Menu';
import Cart from './components/layout/Cart';
import Footer from './components/layout/Footer';

const App: React.FC = () => {
  return (
    <div className="font-sans text-black selection:bg-blue-900 selection:text-white">
      <Header />
      <Menu />
      <Cart />
      
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;
