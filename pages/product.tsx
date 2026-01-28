import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import FancyButton from '../components/ui/FancyButton';
import SizeGuideModal from '../components/ui/SizeGuideModal';
import { Ruler, ShieldCheck, Truck } from 'lucide-react';

const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const { products, addToCart } = useApp();
  const navigate = useNavigate();
  const product = products.find(p => p.id === id);

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [currentImage, setCurrentImage] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!product) {
    return <div className="min-h-screen flex items-center justify-center font-jura text-xl">ТОВАР НЕ НАЙДЕН</div>;
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-white">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-8 font-mono text-xs text-zinc-500 flex gap-2">
           <span className="cursor-pointer hover:text-black" onClick={() => navigate('/')}>ГЛАВНАЯ</span> / 
           <span className="cursor-pointer hover:text-black" onClick={() => navigate('/catalog')}>КАТАЛОГ</span> / 
           <span className="text-black font-bold">ITEM_{product.id}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Gallery (Left - 7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-[4/5] bg-zinc-100 border border-black overflow-hidden group cursor-crosshair">
              <img 
                src={product.images[currentImage]} 
                alt={product.name} 
                className="w-full h-full object-cover grayscale hover:grayscale-0 hover:scale-110 transition-all duration-700" 
              />
              <div className="absolute top-4 left-4 font-mono text-xs bg-black text-white px-2 py-1">
                IMG_0{currentImage + 1}
              </div>
            </div>
            
            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className={`aspect-square border ${currentImage === idx ? 'border-blue-900 border-2' : 'border-zinc-200'} overflow-hidden`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details (Right - 5 cols) */}
          <div className="lg:col-span-5 sticky top-24 h-fit">
            <h1 className="font-jura text-4xl md:text-5xl font-bold uppercase leading-none mb-2">
              {product.name}
            </h1>
            <p className="font-mono text-blue-900 font-bold text-xl mb-8">
              ${product.price.toFixed(2)} USD
            </p>

            <div className="h-px bg-zinc-200 w-full mb-8" />

            <div className="mb-8">
              <h3 className="font-jura font-bold uppercase mb-2">Описание</h3>
              <p className="font-montserrat text-sm text-zinc-600 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Sizes */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-jura font-bold uppercase">Выберите Размер</h3>
                <button 
                  onClick={() => setShowSizeGuide(true)}
                  className="flex items-center gap-1 text-xs font-mono text-zinc-500 hover:text-blue-900 underline"
                >
                  <Ruler size={14} /> ТАБЛИЦА РАЗМЕРОВ
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`
                      w-12 h-12 flex items-center justify-center border font-jura font-bold transition-all
                      ${selectedSize === size 
                        ? 'bg-black text-white border-black' 
                        : 'bg-white text-black border-zinc-300 hover:border-black'}
                    `}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {selectedSize === '' && (
                <p className="text-red-500 text-xs font-mono mt-2 animate-pulse">
                  * ПОЖАЛУЙСТА ВЫБЕРИТЕ РАЗМЕР
                </p>
              )}
            </div>

            <FancyButton 
              fullWidth 
              variant="shutter"
              onClick={() => {
                if (!selectedSize) {
                  alert("ВЫБЕРИТЕ РАЗМЕР");
                  return;
                }
                addToCart(product, selectedSize);
              }}
            >
              Добавить в корзину
            </FancyButton>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-zinc-200">
               <div className="flex gap-3 items-start">
                  <ShieldCheck className="text-blue-900 w-5 h-5" />
                  <div>
                    <h4 className="font-jura font-bold text-xs uppercase">Надежность</h4>
                    <p className="font-mono text-[10px] text-zinc-500">Усиленные швы и материалы.</p>
                  </div>
               </div>
               <div className="flex gap-3 items-start">
                  <Truck className="text-blue-900 w-5 h-5" />
                  <div>
                    <h4 className="font-jura font-bold text-xs uppercase">Доставка</h4>
                    <p className="font-mono text-[10px] text-zinc-500">Доставляем по всему миру.</p>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>
      
      <SizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </div>
  );
};

export default ProductDetail;