
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Loader2, AlertTriangle } from 'lucide-react';

const VKCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithVKCode } = useApp();
  const [status, setStatus] = useState<string>('ПОЛУЧЕНИЕ КОДА...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
        setError('Вы отменили вход или произошла ошибка VK.');
        return;
    }

    if (!code) {
        navigate('/profile');
        return;
    }

    const handleLogin = async () => {
        setStatus('ОБМЕН КЛЮЧЕЙ (SECURE HANDSHAKE)...');
        const { error: authError } = await loginWithVKCode(code);
        
        if (authError) {
            console.error(authError);
            setError(authError.message || 'Ошибка авторизации на сервере');
        } else {
            setStatus('ВХОД В СИСТЕМУ...');
            // Redirect is handled by window.location.href in context, 
            // but just in case logic changes:
        }
    };

    handleLogin();
  }, [searchParams, loginWithVKCode, navigate]);

  if (error) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="font-jura text-xl font-bold uppercase mb-2">ОШИБКА ВХОДА</h2>
              <p className="font-mono text-xs text-zinc-500 mb-6">{error}</p>
              <button 
                onClick={() => navigate('/profile')}
                className="bg-black text-white px-6 py-3 font-jura font-bold uppercase text-sm"
              >
                  ВЕРНУТЬСЯ
              </button>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
        <Loader2 className="animate-spin text-blue-600 mb-6" size={40} />
        <h2 className="font-jura text-2xl font-bold uppercase tracking-widest animate-pulse">
            {status}
        </h2>
        <div className="mt-8 font-mono text-[10px] text-zinc-400">
            VK_AUTH_PROTOCOL // V.1.0
        </div>
    </div>
  );
};

export default VKCallback;
