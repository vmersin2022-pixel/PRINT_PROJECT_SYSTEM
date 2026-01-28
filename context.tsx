import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, AppContextType, Category, Collection } from './types';
import { supabase } from './supabaseClient';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial data is kept for fallback/skeleton, but real data comes from DB
const INITIAL_PRODUCTS: Product[] = [];
const INITIAL_COLLECTIONS: Collection[] = [];

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [collections, setCollections] = useState<Collection[]>(INITIAL_COLLECTIONS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Helper to parse category string from DB to array
  const parseCategories = (catData: any): Category[] => {
    if (Array.isArray(catData)) return catData;
    if (typeof catData === 'string') {
        if (catData.includes(',')) return catData.split(',').map(s => s.trim()) as Category[];
        return [catData as Category];
    }
    return [];
  };

  // Helper to parse collectionIds from DB
  const parseCollectionIds = (data: any): string[] => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (typeof data === 'string') {
          if (data.trim().startsWith('[')) {
              try { 
                  const parsed = JSON.parse(data);
                  if (Array.isArray(parsed)) return parsed;
              } catch(e) { /* ignore */ }
          }
          if (data.includes(',')) return data.split(',').map((s: string) => s.trim());
          if (data.trim()) return [data.trim()];
      }
      return [];
  };

  // CENTRAL DATA FETCHING FUNCTION
  const refreshData = async () => {
      // 1. Fetch Products
      const { data: prodData, error: prodError } = await supabase.from('products').select('*');
      if (prodError) {
          console.error("Supabase Product Error:", prodError.message);
      } else if (prodData) {
        const typedProducts = prodData.map((p: any) => ({
            ...p,
            categories: parseCategories(p.categories || p.category),
            collectionIds: parseCollectionIds(p.collectionIds)
        }));
        setProducts(typedProducts as Product[]);
      }

      // 2. Fetch Collections
      const { data: colData, error: colError } = await supabase.from('collections').select('*');
      if (colError) {
          console.error("Supabase Collection Error:", colError.message);
      } else if (colData) {
        const typedCollections = colData.map((c: any) => ({
            ...c,
            // Use existing link or fallback to ID-based filter
            link: c.link || `/catalog?collection=${c.id}`
        }));
        setCollections(typedCollections as Collection[]);
      }
  };

  // Initial Load
  useEffect(() => {
    refreshData();
  }, []);

  const toggleMenu = () => setIsMenuOpen(prev => !prev);
  const toggleCart = () => setIsCartOpen(prev => !prev);

  // --- HELPER: Prepare Payload ---
  const prepareProductForDb = (product: Product) => {
      const dbProduct: any = { ...product };
      if (product.categories && product.categories.length > 0) {
          dbProduct.category = product.categories.join(',');
      }
      delete dbProduct.categories;
      return dbProduct;
  };

  // --- PRODUCTS CRUD (Network First) ---
  const addProduct = async (product: Product) => {
    const dbPayload = prepareProductForDb(product);
    const { error } = await supabase.from('products').insert([dbPayload]);
    
    if (error) {
        alert(`ОШИБКА СОХРАНЕНИЯ ТОВАРА:\n${error.message}\n\nПроверьте консоль и права доступа (RLS).`);
        console.error('Add Product Error:', error);
    } else {
        await refreshData(); // Sync with DB
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    // We need to merge existing product to prepare correct DB payload if categories changed
    const existing = products.find(p => p.id === id);
    if (!existing) return;
    const merged = { ...existing, ...updates };
    const dbPayload = prepareProductForDb(merged);

    const { error } = await supabase.from('products').update(dbPayload).eq('id', id);
    
    if (error) {
        alert(`ОШИБКА ОБНОВЛЕНИЯ:\n${error.message}`);
    } else {
        await refreshData();
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
        alert(`ОШИБКА УДАЛЕНИЯ:\n${error.message}`);
    } else {
        await refreshData();
    }
  };

  // --- COLLECTIONS CRUD (Network First) ---
  const addCollection = async (collection: Collection) => {
    // Ensure link is set
    const newCollection = { 
        ...collection, 
        link: collection.link || `/catalog?collection=${collection.id}` 
    };

    // Use Upsert to handle both Add and potential overwrites if ID exists
    const { error } = await supabase.from('collections').upsert([newCollection]);
    
    if (error) {
        alert(`ОШИБКА СОХРАНЕНИЯ КОЛЛЕКЦИИ:\n${error.message}\n\nВозможные причины:\n1. ID должен быть UUID (сейчас: ${collection.id})\n2. Нарушение прав RLS`);
        console.error('Save Collection Error:', error);
    } else {
        await refreshData(); // Sync with DB to show real state
    }
  };

  const deleteCollection = async (id: string) => {
    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) {
        alert(`ОШИБКА УДАЛЕНИЯ КОЛЛЕКЦИИ:\n${error.message}`);
    } else {
        await refreshData();
    }
  };

  // --- CART ---
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
      collections,
      cart,
      isMenuOpen,
      isCartOpen,
      toggleMenu,
      toggleCart,
      addToCart,
      removeFromCart,
      addProduct,
      updateProduct,
      deleteProduct,
      addCollection,
      deleteCollection
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