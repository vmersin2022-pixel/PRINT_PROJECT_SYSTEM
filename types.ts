
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
  old_price?: number; // Marketing: Sale price
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

// UPDATED STATUSES
export type OrderStatus = 'new' | 'paid' | 'assembly' | 'ready' | 'shipping' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  user_id?: string; // Explicit link to Supabase Auth User
  created_at: string;
  status: OrderStatus;
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
  discount_percent: number; // Kept for legacy compatibility
  discount_value: number;   // New universal value field
  discount_type: 'percent' | 'fixed'; // Type of discount
  is_active: boolean;
}

// NEW: User Profile from public table (Expanded)
export interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
  username?: string;
  full_name?: string;
  telegram_id?: number;
  avatar_url?: string;
  
  // NEW FIELDS FOR SYNC
  current_cart?: CartItem[]; // JSONB column
  favorites?: string[]; // Array of Product IDs
  cart_updated_at?: string; // Timestamp
  last_abandoned_notification?: string; // Timestamp to prevent spam
}

// NEW: Telegram Data Structure
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
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
  loginWithTelegram: (user: TelegramUser) => Promise<{ error: any }>;
  loginWithVKCode: (code: string) => Promise<{ error: any }>;
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
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;

  // Promocodes
  applyPromoCode: (code: string) => Promise<boolean>;
  removePromoCode: () => void;
  addPromoCodeDb: (code: string, value: number, type: 'percent' | 'fixed') => Promise<void>;
  togglePromoCodeDb: (id: string, currentState: boolean) => Promise<void>;
  deletePromoCodeDb: (id: string) => Promise<void>;

  // Wishlist
  toggleWishlist: (productId: string) => void;

  // System
  refreshData: () => Promise<void>;
}