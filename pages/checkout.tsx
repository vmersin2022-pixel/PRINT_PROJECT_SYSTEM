import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import { useNavigate } from 'react-router-dom';
import FancyButton from '../components/ui/FancyButton';
import { ShieldCheck, CreditCard, Loader2 } from 'lucide-react';
import AddressInput from '../components/ui/AddressInput';
import { formatPhoneNumber } from '../utils';

const Checkout: React.FC = () => {
  const { cart, activePromo, createOrder, clearCart } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0) {
        navigate('/catalog');
    }
  }, [cart, navigate]);

  const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      comment: ''
  });

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sbp' | 'split'>('card');
  const [deliveryMethod, setDeliveryMethod] = useState<'cdek_point' | 'cdek_door'>('cdek_point');

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discountAmount = activePromo ? Math.round(subtotal * (activePromo.discount_percent / 100)) : 0;
  const deliveryPrice = deliveryMethod === 'cdek_door' ? 550 : 350;
  const total = subtotal - discountAmount + deliveryPrice;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      let val = e.target.value;
      
      // Auto-format phone
      if (e.target.name === 'phone') {
          val = formatPhoneNumber(val);
      }

      setFormData({ ...formData, [e.target.name]: val });
  };

  // Special handler for AddressInput to also set city if available
  const handleAddressChange = (newAddress: string, city?: string) => {
      setFormData(prev => ({
          ...prev,
          address: newAddress,
          city: city || prev.city // Only overwrite city if provided by DaData
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      // Create Order in DB
      // We embed promo details into customer_info to avoid changing DB schema structure immediately
      const success = await createOrder({
          status: 'new',
          total_price: total,
          customer_info: {
              ...formData,
              deliveryMethod,
              promoCode: activePromo?.code,
              discountAmount: discountAmount
          },
          order_items: cart,
          payment_method: paymentMethod
      });

      setLoading(false);

      if (success) {
          alert('ЗАКАЗ УСПЕШНО СОЗДАН!\n\nНомер заказа и детали отправлены на email.\nСейчас вы будете перенаправлены на оплату (Демо).');
          clearCart(); // This also clears localStorage promo
          navigate('/');
      }
  };

  if (cart.length === 0) return null;

  return (
    <div className="min-h-screen pt-24 pb-12 bg-zinc-50">
      <div className="container mx-auto px-4 max-w-6xl">
        
        <div className="mb-8 border-b border-black pb-4 flex justify-between items-end">
            <h1 className="font-jura text-4xl md:text-5xl font-bold uppercase">Оформление</h1>
            <span className="font-mono text-xs text-zinc-400 hidden sm:block">SECURE_CONNECTION_ESTABLISHED</span>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* --- LEFT COLUMN: FORMS --- */}
            <div className="lg:col-span-7 space-y-12">
                
                {/* 1. CONTACT INFO */}
                <section>
                    <h3 className="font-jura text-xl font-bold uppercase mb-6 flex items-center gap-2">
                        <span className="bg-black text-white w-6 h-6 flex items-center justify-center text-xs">1</span>
                        Контактные данные
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                            name="firstName" placeholder="ИМЯ" required
                            className="bg-white border border-zinc-300 p-4 font-mono text-sm focus:outline-none focus:border-blue-600 uppercase"
                            onChange={handleInputChange}
                            value={formData.firstName}
                        />
                        <input 
                            name="lastName" placeholder="ФАМИЛИЯ" required
                            className="bg-white border border-zinc-300 p-4 font-mono text-sm focus:outline-none focus:border-blue-600 uppercase"
                            onChange={handleInputChange}
                            value={formData.lastName}
                        />
                        <input 
                            name="phone" placeholder="+7 (___) ___-__-__" type="tel" required
                            className="bg-white border border-zinc-300 p-4 font-mono text-sm focus:outline-none focus:border-blue-600 uppercase"
                            onChange={handleInputChange}
                            value={formData.phone}
                            maxLength={18}
                        />
                        <input 
                            name="email" placeholder="E-MAIL" type="email" required
                            className="bg-white border border-zinc-300 p-4 font-mono text-sm focus:outline-none focus:border-blue-600 uppercase"
                            onChange={handleInputChange}
                            value={formData.email}
                        />
                    </div>
                </section>

                {/* 2. DELIVERY */}
                <section>
                    <h3 className="font-jura text-xl font-bold uppercase mb-6 flex items-center gap-2">
                        <span className="bg-black text-white w-6 h-6 flex items-center justify-center text-xs">2</span>
                        Доставка
                    </h3>
                    
                    {/* Method Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div 
                            onClick={() => setDeliveryMethod('cdek_point')}
                            className={`cursor-pointer border p-4 flex items-start gap-3 transition-all ${deliveryMethod === 'cdek_point' ? 'border-blue-600 bg-blue-50/50' : 'border-zinc-300 bg-white hover:border-zinc-400'}`}
                        >
                            <div className={`w-4 h-4 rounded-full border border-zinc-400 mt-1 flex items-center justify-center ${deliveryMethod === 'cdek_point' ? 'border-blue-600' : ''}`}>
                                {deliveryMethod === 'cdek_point' && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                            </div>
                            <div>
                                <h4 className="font-bold font-jura uppercase">CDEK (Пункт выдачи)</h4>
                                <p className="text-xs font-mono text-zinc-500 mt-1">3-5 дней • 350 ₽</p>
                            </div>
                        </div>
                        <div 
                            onClick={() => setDeliveryMethod('cdek_door')}
                            className={`cursor-pointer border p-4 flex items-start gap-3 transition-all ${deliveryMethod === 'cdek_door' ? 'border-blue-600 bg-blue-50/50' : 'border-zinc-300 bg-white hover:border-zinc-400'}`}
                        >
                            <div className={`w-4 h-4 rounded-full border border-zinc-400 mt-1 flex items-center justify-center ${deliveryMethod === 'cdek_door' ? 'border-blue-600' : ''}`}>
                                {deliveryMethod === 'cdek_door' && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                            </div>
                            <div>
                                <h4 className="font-bold font-jura uppercase">CDEK (Курьер)</h4>
                                <p className="text-xs font-mono text-zinc-500 mt-1">2-3 дня • 550 ₽</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <input 
                            name="city" placeholder="ГОРОД" required
                            className="bg-white border border-zinc-300 p-4 font-mono text-sm focus:outline-none focus:border-blue-600 uppercase"
                            onChange={handleInputChange}
                            value={formData.city}
                        />
                        
                        {/* DA DATA ADDRESS INPUT */}
                        <AddressInput 
                            name="address"
                            placeholder={deliveryMethod === 'cdek_point' ? "АДРЕС ПУНКТА ВЫДАЧИ" : "УЛИЦА, ДОМ, КВАРТИРА"}
                            required
                            className="w-full bg-white border border-zinc-300 p-4 font-mono text-sm focus:outline-none focus:border-blue-600 uppercase"
                            value={formData.address}
                            onChange={handleAddressChange}
                        />

                        <textarea 
                            name="comment" placeholder="КОММЕНТАРИЙ К ЗАКАЗУ (ОПЦИОНАЛЬНО)" rows={2}
                            className="bg-white border border-zinc-300 p-4 font-mono text-sm focus:outline-none focus:border-blue-600 uppercase"
                            onChange={handleInputChange}
                            value={formData.comment}
                        />
                    </div>
                </section>

                {/* 3. PAYMENT */}
                <section>
                    <h3 className="font-jura text-xl font-bold uppercase mb-6 flex items-center gap-2">
                        <span className="bg-black text-white w-6 h-6 flex items-center justify-center text-xs">3</span>
                        Оплата
                    </h3>
                    
                    <div className="space-y-3">
                        {/* CARD */}
                        <div 
                            onClick={() => setPaymentMethod('card')}
                            className={`cursor-pointer border p-4 flex items-center justify-between transition-all ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50/50' : 'border-zinc-300 bg-white'}`}
                        >
                            <div className="flex items-center gap-3">
                                <CreditCard size={20} className={paymentMethod === 'card' ? 'text-blue-600' : 'text-zinc-400'} />
                                <span className="font-bold font-jura uppercase">БАНКОВСКАЯ КАРТА</span>
                            </div>
                            {paymentMethod === 'card' && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                        </div>

                        {/* SBP */}
                        <div 
                            onClick={() => setPaymentMethod('sbp')}
                            className={`cursor-pointer border p-4 flex items-center justify-between transition-all ${paymentMethod === 'sbp' ? 'border-blue-600 bg-blue-50/50' : 'border-zinc-300 bg-white'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="font-mono text-xs font-bold border border-current px-1 rounded">SBP</div>
                                <span className="font-bold font-jura uppercase">СБП (БЫСТРЫЙ ПЛАТЕЖ)</span>
                            </div>
                            {paymentMethod === 'sbp' && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                        </div>

                         {/* SPLIT */}
                         <div 
                            onClick={() => setPaymentMethod('split')}
                            className={`cursor-pointer border p-4 flex items-center justify-between transition-all ${paymentMethod === 'split' ? 'border-blue-600 bg-blue-50/50' : 'border-zinc-300 bg-white'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="font-bold font-jura uppercase">ОПЛАТА ДОЛЯМИ / СПЛИТ</span>
                                <span className="bg-black text-white text-[9px] px-1 font-mono">0%</span>
                            </div>
                            {paymentMethod === 'split' && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                        </div>
                    </div>
                    
                    <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500 font-mono">
                        <ShieldCheck size={14} className="text-green-600"/>
                        ПЛАТЕЖИ ОБРАБАТЫВАЮТСЯ ЧЕРЕЗ ЗАЩИЩЕННЫЙ ШЛЮЗ (YOOKASSA/TINKOFF)
                    </div>
                </section>

            </div>

            {/* --- RIGHT COLUMN: SUMMARY --- */}
            <div className="lg:col-span-5">
                <div className="bg-white border border-black p-6 lg:sticky lg:top-24">
                    <h3 className="font-jura text-xl font-bold uppercase mb-6">ВАШ ЗАКАЗ</h3>
                    
                    <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {cart.map((item) => (
                            <div key={`${item.id}-${item.selectedSize}`} className="flex gap-4">
                                <img src={item.images[0]} className="w-16 h-20 object-cover border border-zinc-200" />
                                <div>
                                    <p className="font-jura font-bold text-sm uppercase">{item.name}</p>
                                    <p className="font-mono text-xs text-zinc-500">
                                        {item.selectedSize} x {item.quantity}
                                    </p>
                                    <p className="font-mono text-sm mt-1">{item.price.toLocaleString()} ₽</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-dashed border-zinc-300 pt-4 space-y-2 font-mono text-sm text-zinc-600">
                        <div className="flex justify-between">
                            <span>ТОВАРЫ ({cart.reduce((a,c) => a + c.quantity, 0)})</span>
                            <span>{subtotal.toLocaleString()} ₽</span>
                        </div>
                        {activePromo && (
                             <div className="flex justify-between text-green-700">
                                <span>ПРОМОКОД ({activePromo.code})</span>
                                <span>-{discountAmount.toLocaleString()} ₽</span>
                             </div>
                        )}
                        <div className="flex justify-between">
                            <span>ДОСТАВКА</span>
                            <span>{deliveryPrice} ₽</span>
                        </div>
                    </div>

                    <div className="border-t border-black mt-4 pt-4 flex justify-between items-end mb-6">
                        <span className="font-jura text-lg font-bold">ИТОГО К ОПЛАТЕ</span>
                        <span className="font-jura text-2xl font-bold text-blue-900">{total.toLocaleString()} ₽</span>
                    </div>

                    <FancyButton 
                        type="submit" 
                        fullWidth 
                        variant="solid" 
                        className={loading ? 'opacity-70 pointer-events-none' : ''}
                        onClick={handleSubmit as any}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16}/> ОБРАБОТКА...</span>
                        ) : (
                            'ОПЛАТИТЬ ЗАКАЗ'
                        )}
                    </FancyButton>
                    
                    <p className="text-[10px] text-zinc-400 text-center mt-4 leading-tight">
                        Нажимаю кнопку, вы соглашаетесь с условиями <br/> Публичной оферты и Политики конфиденциальности
                    </p>
                </div>
            </div>

        </form>
      </div>
    </div>
  );
};

export default Checkout;