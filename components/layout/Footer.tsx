import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-white pt-16 pb-8 px-4 border-t-4 border-blue-900">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-4">
            <h3 className="font-jura text-2xl font-bold tracking-widest">PRINT PROJECT</h3>
            <p className="font-montserrat text-zinc-400 text-sm max-w-xs">
              Advanced apparel for the modern urban environment. Engineered for utility, styled for the future.
            </p>
          </div>
          
          <div>
            <h4 className="font-jura font-bold mb-4 text-blue-500">НАВИГАЦИЯ</h4>
            <ul className="space-y-2 font-mono text-sm text-zinc-400">
              <li><a href="#" className="hover:text-white hover:underline">Каталог</a></li>
              <li><a href="#" className="hover:text-white hover:underline">Коллекции</a></li>
              <li><a href="#" className="hover:text-white hover:underline">Архив</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-jura font-bold mb-4 text-blue-500">ИНФО</h4>
            <ul className="space-y-2 font-mono text-sm text-zinc-400">
              <li><a href="#" className="hover:text-white hover:underline">Конфиденциальность</a></li>
              <li><a href="#" className="hover:text-white hover:underline">Условия</a></li>
              <li><a href="#" className="hover:text-white hover:underline">Возврат</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-jura font-bold mb-4 text-blue-500">КОНТАКТ</h4>
            <div className="border border-zinc-700 p-4">
              <p className="font-mono text-xs text-zinc-500 mb-2">ПОДПИСКА</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="EMAIL" 
                  className="bg-transparent border-b border-zinc-700 text-white w-full focus:outline-none focus:border-blue-500 font-mono text-sm py-1"
                />
                <button className="text-blue-500 font-bold font-jura hover:text-white transition-colors">
                  SEND
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs font-mono text-zinc-600">
          <p>© 2024 PRINT PROJECT SYSTEMS. ALL RIGHTS RESERVED.</p>
          <p>SYSTEM STATUS: OPERATIONAL</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;