import React, { useEffect, useRef } from 'react';
import { TelegramUser } from '../../types';

interface TelegramWidgetProps {
  botName: string;
  onAuth: (user: TelegramUser) => void;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: 'write' | null;
  usePic?: boolean;
}

const TelegramWidget: React.FC<TelegramWidgetProps> = ({ 
  botName, 
  onAuth, 
  buttonSize = 'large', 
  cornerRadius = 0, 
  requestAccess = 'write',
  usePic = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Global callback
    (window as any).onTelegramAuth = (user: TelegramUser) => {
      onAuth(user);
    };

    // 2. Create script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    if (cornerRadius) script.setAttribute('data-radius', cornerRadius.toString());
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', requestAccess || 'write');
    if (!usePic) script.setAttribute('data-userpic', 'false');
    
    script.async = true;

    // 3. Mount
    if (containerRef.current) {
      containerRef.current.innerHTML = ''; // Clear placeholder
      containerRef.current.appendChild(script);
    }

    return () => {
        // Optional cleanup
    };
  }, [botName, buttonSize, cornerRadius, requestAccess, usePic, onAuth]);

  return (
    <div 
        ref={containerRef} 
        className="flex justify-center items-center min-h-[50px] w-full"
    >
        {/* Этот блок исчезнет, когда Telegram загрузит кнопку. Если он остался - значит ошибка в настройках BotFather */}
        <div className="text-[10px] font-mono text-zinc-400 border border-dashed border-zinc-300 p-4 w-full text-center bg-zinc-50">
            <span className="font-bold text-black block mb-1">TELEGRAM WIDGET</span>
            WAITING FOR SCRIPT...<br/>
            (CHECK BOT DOMAIN SETTINGS)
        </div>
    </div>
  );
};

export default TelegramWidget;