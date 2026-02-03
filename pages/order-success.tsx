
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Package } from 'lucide-react';
import FancyButton from '../components/ui/FancyButton';

const OrderSuccess: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: Clear any lingering state if needed
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-12 bg-white flex flex-col items-center justify-center text-center px-4">
        
        <div className="mb-8 relative">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center border-2 border-green-500 animate-fade-up">
                <CheckCircle size={48} className="text-green-600" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-black text-white text-[10px] font-mono px-2 py-1 uppercase tracking-widest">
                Confirmed
            </div>
        </div>

        <h1 className="font-jura text-4xl md:text-6xl font-bold uppercase mb-4 tracking-tighter">
            ЗАКАЗ ОФОРМЛЕН
        </h1>

        <div className="max-w-md mx-auto space-y-6">
            <p className="font-montserrat text-zinc-600">
                Спасибо за выбор PRINT PROJECT. <br/>
                Мы уже получили данные и начали обработку.
            </p>

            <div className="bg-zinc-50 border border-zinc-200 p-6 text-left space-y-4">
                <div className="flex items-start gap-3">
                    <Package className="text-blue-600 shrink-0" size={20} />
                    <div>
                        <h3 className="font-bold font-jura uppercase text-sm">Что дальше?</h3>
                        <p className="text-xs text-zinc-500 mt-1 font-mono">
                            Детали заказа отправлены вам на Email. Как только мы передадим посылку в доставку, вы получите Трек-номер.
                        </p>
                    </div>
                </div>
            </div>

            <div className="pt-4">
                <FancyButton onClick={() => navigate('/catalog')} variant="solid">
                    ВЕРНУТЬСЯ В МАГАЗИН <ArrowRight className="ml-2 w-4 h-4"/>
                </FancyButton>
            </div>
            
            <p className="text-[10px] text-zinc-400 font-mono mt-8">
                SYSTEM_ID: ORDER_PROCESS_COMPLETE
            </p>
        </div>
    </div>
  );
};

export default OrderSuccess;
