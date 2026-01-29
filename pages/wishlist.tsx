import React, { useEffect, useMemo } from 'react';
import { useApp } from '../context';
import ProductCard from '../components/ui/ProductCard';
import { Heart, ArrowRight } from 'lucide-react';
import FancyButton from '../components/ui/FancyButton';

const WishlistPage: React.FC = () => {
  const { wishlist, products } = useApp();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Filter products that are in the wishlist array
  const likedProducts = useMemo(() => {
      return products.filter(p => wishlist.includes(p.id));
  }, [wishlist, products]);

  return (
    <div className="min-h-screen pt-24 pb-12 bg-white">
      <div className="container mx-auto px-4">
        
        {/* Header */}
        <div className="mb-12 border-b border-black pb-6 flex justify-between items-end">
            <div>
                <h1 className="font-jura text-4xl md:text-5xl font-bold uppercase mb-2">Избранное</h1>
                <p className="font-mono text-xs text-zinc-500">SAVED_ITEMS // COLLECTION</p>
            </div>
            <div className="font-jura font-bold text-xl">
                {likedProducts.length} ITEMS
            </div>
        </div>

        {/* Content */}
        {likedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {likedProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        ) : (
            <div className="py-24 text-center border-2 border-dashed border-zinc-200">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart size={32} className="text-zinc-300" />
                </div>
                <h2 className="font-jura text-2xl font-bold uppercase mb-4 text-zinc-400">
                    СПИСОК ПУСТ
                </h2>
                <p className="font-montserrat text-sm text-zinc-500 max-w-md mx-auto mb-8">
                    Вы пока ничего не добавили в избранное. <br/>
                    Сохраняйте понравившиеся принты, чтобы не потерять.
                </p>
                <div className="flex justify-center">
                    <FancyButton to="/catalog" variant="solid">
                        ПЕРЕЙТИ В КАТАЛОГ <ArrowRight className="ml-2 w-4 h-4"/>
                    </FancyButton>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default WishlistPage;