
export type Category = 't-shirts' | 'sets' | 'accessories' | 'fresh_drop' | 'last_drop';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  categories: Category[]; // Изменено на массив для множественного выбора
  collectionIds: string[]; 
  images: string[];
  sizes: string[];
  isNew?: boolean;
  isHidden?: boolean; 
}

export interface Collection {
  id: string;
  title: string;
  desc: string;
  image: string;
  link: string;
}

export interface CartItem extends Product {
  selectedSize: string;
  quantity: number;
}

export interface AppContextType {
  products: Product[];
  collections: Collection[];
  cart: CartItem[];
  isMenuOpen: boolean;
  isCartOpen: boolean;
  toggleMenu: () => void;
  toggleCart: () => void;
  addToCart: (product: Product, size: string) => void;
  removeFromCart: (productId: string, size: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCollection: (collection: Collection) => void;
  deleteCollection: (id: string) => void;
}