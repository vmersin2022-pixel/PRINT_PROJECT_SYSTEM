import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, AppContextType, Category } from './types';

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'VX-01 OVERSIZED SHELL',
    price: 85,
    description: 'Heavyweight cotton structure with reinforced seams. Features tactical styling and weather-resistant coating. Designed for urban traversal.',
    category: 't-shirts',
    images: ['https://picsum.photos/seed/vx01/800/1000', 'https://picsum.photos/seed/vx01detail/800/1000'],
    sizes: ['S', 'M', 'L', 'XL'],
    isNew: true
  },
  {
    id: '2',
    name: 'PROTO-TYPE CARGO SET',
    price: 180,
    description: 'Full modular set including utility vest and tapered cargo trousers. Multiple storage compartments. System ready.',
    category: 'sets',
    images: ['https://picsum.photos/seed/proto/800/1000'],
    sizes: ['M', 'L', 'XL'],
  },
  {
    id: '3',
    name: 'CYBER-DECK TEE',
    price: 60,
    description: 'Standard issue distinct graphics. Breathable matrix fabric.',
    category: 'sale',
    images: ['https://picsum.photos/seed/deck/800/1000'],
    sizes: ['S', 'M', 'L'],
  },
  {
    id: '4',
    name: 'GHOST SHELL JACKET',
    price: 220,
    description: 'Translucent waterproof layer. High visibility reflective strips.',
    category: 'sets',
    images: ['https://picsum.photos/seed/ghost/800/1000'],
    sizes: ['S', 'M', 'L', 'XL'],
    isNew: true
  }
];

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(prev => !prev);
  const toggleCart = () => setIsCartOpen(prev => !prev);

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const addToCart = (product: Product, size: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.selectedSize === size);
      if (existing) {
        return prev.map(item => 
          (item.id === product.id && item.selectedSize === size)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, selectedSize: size, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, size: string) => {
    setCart(prev => prev.filter(item => !(item.id === productId && item.selectedSize === size)));
  };

  return (
    <AppContext.Provider value={{
      products,
      cart,
      isMenuOpen,
      isCartOpen,
      toggleMenu,
      toggleCart,
      addToCart,
      removeFromCart,
      addProduct
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};