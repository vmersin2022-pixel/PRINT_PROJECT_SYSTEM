import React from 'react';
import { X, Truck, Calendar, MapPin } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DeliveryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl border border-black p-6 md:p-12 animate-fade-up">
        <button onClick={onClose} className="absolute top-4 right-4 hover:rotate-90 transition-transform">
          <X size={24} />
        </button>
        
        <h2 className="font-jura text-2xl font-bold mb-8 uppercase border-b border-black pb-4">
          ПРОТОКОЛ ДОСТАВКИ И СРОКОВ
        </h2>

        <div className="grid gap-8">
            <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center shrink-0">
                    <Calendar size={24} className="text-blue-900"/>
                </div>
                <div>
                    <h3 className="font-jura font-bold text-lg uppercase mb-2">СРОКИ ИЗГОТОВЛЕНИЯ</h3>
                    <p className="font-montserrat text-sm text-zinc-600 leading-relaxed">
                        Большинство принтов мы печатаем под конкретный заказ, чтобы не создавать перепроизводства. 
                        Стандартный срок подготовки заказа: <span className="font-bold text-black">2-4 рабочих дня</span>.
                        <br/>
                        Для товаров из раздела "В НАЛИЧИИ" отправка осуществляется на следующий день.
                    </p>
                </div>
            </div>

            <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center shrink-0">
                    <Truck size={24} className="text-blue-900"/>
                </div>
                <div>
                    <h3 className="font-jura font-bold text-lg uppercase mb-2">ДОСТАВКА ПО РФ</h3>
                    <ul className="font-montserrat text-sm text-zinc-600 space-y-2">
                        <li className="flex justify-between border-b border-zinc-200 pb-1">
                            <span>CDEK (Пункт выдачи):</span>
                            <span className="font-bold">3-5 дней</span>
                        </li>
                        <li className="flex justify-between border-b border-zinc-200 pb-1">
                            <span>CDEK (Курьер):</span>
                            <span className="font-bold">2-4 дня</span>
                        </li>
                        <li className="flex justify-between border-b border-zinc-200 pb-1">
                            <span>Почта России:</span>
                            <span className="font-bold">5-10 дней</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center shrink-0">
                    <MapPin size={24} className="text-blue-900"/>
                </div>
                <div>
                    <h3 className="font-jura font-bold text-lg uppercase mb-2">ОТСЛЕЖИВАНИЕ</h3>
                    <p className="font-montserrat text-sm text-zinc-600 leading-relaxed">
                        Сразу после передачи заказа в службу доставки вы получите Трек-Номер (TRACK_ID) 
                        на Email и в Telegram (если привязан). Статус меняется автоматически.
                    </p>
                </div>
            </div>
        </div>
        
        <p className="mt-8 text-xs font-mono text-zinc-400 border-t border-zinc-200 pt-4">
          [ SYSTEM NOTE: СРОКИ МОГУТ БЫТЬ УВЕЛИЧЕНЫ В ПЕРИОД ДРОПОВ ]
        </p>
      </div>
    </div>
  );
};

export default DeliveryModal;