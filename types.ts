export type Category = 't-shirts' | 'sets' | 'sale' | 'accessories';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: Category;
  images: string[];
  sizes: string[];
  isNew?: boolean;
}

export interface CartItem extends Product {
  selectedSize: string;
  quantity: number;
}

export interface AppContextType {
  products: Product[];
  cart: CartItem[];
  isMenuOpen: boolean;
  isCartOpen: boolean;
  toggleMenu: () => void;
  toggleCart: () => void;
  addToCart: (product: Product, size: string) => void;
  removeFromCart: (productId: string, size: string) => void;
  addProduct: (product: Product) => void;
}
