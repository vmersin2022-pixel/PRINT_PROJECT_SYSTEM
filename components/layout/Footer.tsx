
import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context';

const Footer: React.FC = () => {
  const { userProfile } = useApp();

  return (
    <footer className="bg-black text-white pt-16 pb-8 px-4 border-t-4 border-blue-900">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-4">
            <h3 className="font-jura text-2xl font-bold tracking-widest">PRINT PROJECT</h3>
            <p className="font-montserrat text-zinc-400 text-sm max-w-xs">
              бренд-куратор принтов.
              Отбираем визуальные идеи из культуры и превращаем их в принты, которые совпадают с характером и настроением людей.
            </p>
          </div>
          
          <div>
            <h4 className="font-jura font-bold mb-4 text-blue-500">СИСТЕМА</h4>
            <ul className="space-y-2 font-mono text-sm text-zinc-400">
              <li><Link to="/catalog" className="hover:text-white hover:underline">Отбор</Link></li>
              <li><Link to="/catalog?category=fresh_drop" className="hover:text-white hover:underline">Свежий Дроп</Link></li>
              <li><Link to="/collections" className="hover:text-white hover:underline">Состояния</Link></li>
              <li><Link to="/collections" className="hover:text-white hover:underline">Игра</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-jura font-bold mb-4 text-blue-500">ИНФОРМАЦИЯ</h4>
            <ul className="space-y-2 font-mono text-sm text-zinc-400">
              <li><Link to="/service/promo" className="hover:text-white hover:underline">Промокоды и Купоны</Link></li>
              <li><Link to="/service/delivery" className="hover:text-white hover:underline">Доставка и приемка</Link></li>
              <li><Link to="/service/return" className="hover:text-white hover:underline">Возврат и обмен</Link></li>
              <li><Link to="/service/how-to-order" className="hover:text-white hover:underline">Оформить заказ</Link></li>
              <li><Link to="/service/docs" className="hover:text-white hover:underline">Документы</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-jura font-bold mb-4 text-blue-500">ДОСТУП К ОБНОВЛЕНИЯМ</h4>
            <div className="relative border-l-4 border-white shadow-[calc(-4px)_0_15px_rgba(59,130,246,0.8)] pl-6 bg-black/20 p-4 backdrop-blur-sm">
              <p className="font-mono text-xs text-zinc-400 mb-4 leading-relaxed">
                <span className="text-white font-bold"></span> Получай новые дропы и отобранные принты первым.
              </p>
              <div className="flex gap-2 items-end">
                <input 
                  type="email" 
                  placeholder="EMAIL" 
                  className="bg-transparent border-b border-zinc-600 text-white w-full focus:outline-none focus:border-blue-500 font-mono text-sm py-1 placeholder-zinc-700 transition-colors uppercase"
                />
                <button className="text-blue-500 font-bold font-jura hover:text-white transition-colors tracking-widest text-sm uppercase">
                  ПОДПИСАТЬСЯ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Legal & Copyright Section */}
        <div className="border-t border-zinc-800 pt-8">
            {/* Legal Links */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 mb-8 justify-start text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              <Link to="/service/offer" className="hover:text-white hover:underline transition-colors">Договор оферты</Link>
              <Link to="/service/privacy-policy" className="hover:text-white hover:underline transition-colors">Политика конфиденциальности</Link>
              <Link to="/service/terms" className="hover:text-white hover:underline transition-colors">Пользовательское соглашение</Link>
              <Link to="/service/data-consent" className="hover:text-white hover:underline transition-colors">Согласие на обработку данных</Link>
              <Link to="/service/data-policy" className="hover:text-white hover:underline transition-colors">Положение по обработке данных</Link>
            </div>

            {/* Bottom Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center text-xs font-mono text-zinc-600 pt-4 border-t border-zinc-900">
                <p>© 2024 PRINT PROJECT SYSTEMS. ALL RIGHTS RESERVED.</p>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <span className="w-1.5 h-1.5 bg-green-900 rounded-full animate-pulse"></span>
                    <span>SYSTEM STATUS:</span>
                    {/* Only show Link to Admin if user is admin */}
                    {userProfile?.role === 'admin' ? (
                        <Link 
                            to="/admin" 
                            className="hover:text-zinc-500 transition-colors cursor-crosshair select-none text-red-900"
                            title="SYS_ROOT_ACCESS"
                        >
                            OPERATIONAL (ADMIN)
                        </Link>
                    ) : (
                        <span className="select-none">OPERATIONAL</span>
                    )}
                </div>
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
