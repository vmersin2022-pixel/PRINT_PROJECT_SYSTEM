
import { User } from '@supabase/supabase-js';

export type Category = 't-shirts' | 'sets' | 'accessories' | 'fresh_drop' | 'last_drop';

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  categories: Category[]; 
  collectionIds: string[]; 
  images: string[];
  sizes: string[]; // Остается как список "доступных" размеров для быстрого отображения в каталоге
  variants?: ProductVariant[]; // Полная информация о складе
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

export interface Order {
  id: string;
  created_at: string;
  status: 'new' | 'paid' | 'shipping' | 'completed' | 'cancelled';
  total_price: number;
  customer_info: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    comment?: string;
    deliveryMethod: string;
    // New fields for promo tracking
    promoCode?: string;
    discountAmount?: number;
  };
  order_items: CartItem[];
  payment_method: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
}

// NEW: User Profile from public table
export interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface AppContextType {
  products: Product[];
  collections: Collection[];
  cart: CartItem[];
  orders: Order[]; // All orders (Admin view)
  userOrders: Order[]; // Current user's orders
  promocodes: PromoCode[];
  activePromo: PromoCode | null;
  
  allUsers: UserProfile[]; // NEW: List of all registered users for Admin

  wishlist: string[];
  user: User | null; // Supabase User
  isSessionLoading: boolean; // NEW: Track if we are checking session
  
  isMenuOpen: boolean;
  isCartOpen: boolean;
  
  toggleMenu: () => void;
  toggleCart: () => void;
  addToCart: (product: Product, size: string, quantity?: number) => void;
  removeFromCart: (productId: string, size: string) => void;
  clearCart: () => void;
  
  // Auth
  loginWithMagicLink: (email: string) => Promise<{ error: any }>;
  loginWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signupWithPassword: (email: string, password: string) => Promise<{ data: any; error: any }>;
  loginWithGoogle: () => Promise<{ error: any }>;
  logout: () => Promise<void>;

  // Products
  addProduct: (product: Product, variants: {size: string, stock: number}[]) => void;
  updateProduct: (id: string, updates: Partial<Product>, variants?: {size: string, stock: number}[]) => void;
  deleteProduct: (id: string) => void;
  
  // Collections
  addCollection: (collection: Collection) => void;
  deleteCollection: (id: string) => void;

  // Orders
  createOrder: (order: Omit<Order, 'id' | 'created_at'>) => Promise<boolean>;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;

  // Promocodes
  applyPromoCode: (code: string) => Promise<boolean>;
  removePromoCode: () => void;
  addPromoCodeDb: (code: string, percent: number) => Promise<void>;
  togglePromoCodeDb: (id: string, currentState: boolean) => Promise<void>;
  deletePromoCodeDb: (id: string) => Promise<void>;

  // Wishlist
  toggleWishlist: (productId: string) => void;

  // System
  refreshData: () => Promise<void>;
}