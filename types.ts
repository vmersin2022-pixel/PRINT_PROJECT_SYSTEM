
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
  cost_price?: number; // NEW: Cost of Goods Sold (Себестоимость)
  description: string;
  categories: Category[]; 
  collectionIds: string[]; 
  images: string[];
  sizes: string[]; // Остается как список "доступных" размеров для быстрого отображения в каталоге
  variants?: ProductVariant[]; // Полная информация о складе
  isNew?: boolean;
  isHidden?: boolean; 
  isVipOnly?: boolean; // NEW: VIP Access Only
  releaseDate?: string; // NEW: Drop release date (ISO string)
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
  subtotal?: number; // NEW: Sum before points/discounts
  points_used?: number; // NEW: Loyalty points used
  tracking_number?: string; // NEW: CDEK/Post tracking
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
  discount_value: number;   // Main value field
  discount_type: 'percent' | 'fixed'; // Type of discount
  is_active: boolean;
  
  // NEW: Advanced Constructor Fields
  usage_limit?: number; // Null = infinite
  usage_count: number; // Default 0
  min_order_amount: number; // Default 0
  target_audience: 'all' | 'vip_only' | 'new_users';
  created_at?: string;
}

// NEW: User Profile from public table (Expanded)
export interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
  username?: string;
  full_name?: string;
  telegram_id?: number; // Actually BigInt in DB
  avatar_url?: string;
  
  // CRM / RFM Fields (Computed by View)
  segment?: 'whale' | 'hot' | 'churn' | 'regular' | 'new';
  orders_count?: number;
  last_order_date?: string;
  
  // NEW FIELDS FOR SYNC
  current_cart?: CartItem[]; // JSONB column
  favorites?: string[]; // Array of Product IDs
  cart_updated_at?: string; // Timestamp
  last_abandoned_notification?: string; // Timestamp to prevent spam
  
  // CRM Fields
  notes?: string;
  phone?: string;
  is_blocked?: boolean;
  loyalty_points?: number;
  total_spent?: number; // NEW: For VIP calculation
  shipping_info?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      city?: string;
      address?: string;
  };
}

// NEW: Support Ticket
export interface SupportTicket {
  id: string;
  user_id: string;
  order_id: string;
  reason: string;
  description?: string;
  photo_proof?: string;
  status: 'open' | 'approved' | 'rejected' | 'closed';
  admin_response?: string;
  created_at: string;
  // Optional joined data
  user_email?: string;
  user_name?: string;
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

// NEW: Site Configuration (Headless CMS)
export interface SiteConfig {
  id: number;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  announcement_text: string;
  sale_mode: boolean;
  sale_end_date?: string;
  vip_threshold?: number; // NEW FIELD for Phase 2
}

// NEW: Journal Article
export interface Article {
  id: string;
  title: string;
  cover_image: string;
  article_type: 'internal' | 'external';
  external_link?: string;
  content?: string;
  published_at: string;
}

export interface AppContextType {
  products: Product[];
  collections: Collection[];
  cart: CartItem[];
  orders: Order[]; // All orders (Admin view)
  userOrders: Order[]; // Current user's orders
  promocodes: PromoCode[];
  activePromo: PromoCode | null;
  articles: Article[]; // NEW: Journal Articles
  
  allUsers: UserProfile[]; // NEW: List of all registered users for Admin
  userProfile: UserProfile | null; // NEW: Current user profile data
  
  siteConfig: SiteConfig | null; // NEW: Global Site Settings

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
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;

  // Products
  addProduct: (product: Product, variants: {size: string, stock: number}[]) => void;
  updateProduct: (id: string, updates: Partial<Product>, variants?: {size: string, stock: number}[]) => void;
  deleteProduct: (id: string) => void;
  
  // Collections
  addCollection: (collection: Collection) => void;
  deleteCollection: (id: string) => void;

  // Orders
  createOrder: (order: Omit<Order, 'id' | 'created_at'>, pointsUsed?: number) => Promise<boolean>; // UPDATED Signature
  updateOrderStatus: (id: string, status: OrderStatus, trackingNumber?: string) => Promise<void>;
  payForOrder: (orderId: string) => Promise<boolean>; // NEW for Edge Case

  // Promocodes
  applyPromoCode: (code: string) => Promise<{success: boolean, message?: string}>; // CHANGED return type
  removePromoCode: () => void;
  addPromoCodeDb: (promo: Partial<PromoCode>) => Promise<void>; // Updated signature
  togglePromoCodeDb: (id: string, currentState: boolean) => Promise<void>;
  deletePromoCodeDb: (id: string) => Promise<void>;

  // CMS
  updateSiteConfig: (config: Partial<SiteConfig>) => Promise<void>;

  // Wishlist
  toggleWishlist: (productId: string) => void;

  // System
  refreshData: () => Promise<void>;
}
