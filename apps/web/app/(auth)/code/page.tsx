'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

function CodeVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const { verifyCode, isVerifying } = useAuth();

  useEffect(() => {
    if (!email) {
      router.push(ROUTES.auth.index);
    }
  }, [email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setStatusMsg('Код должен состоять из 6 цифр');
      return;
    }

    try {
      const response = await verifyCode({ email, code });
      if (response.next === 'setup_profile') {
        router.push(`${ROUTES.auth.setup}?token=${encodeURIComponent(response.setup_token || '')}`);
      } else if (response.next === 'approved' || response.next === 'home') {
        setIsSuccess(true);
        setStatusMsg('Авторизация успешна! Перенаправление...');
        setTimeout(() => {
          router.push(ROUTES.chats);
        }, 1000);
      } else if (response.next === 'pending_approval') {
        setStatusMsg('Ваш аккаунт ожидает подтверждения Администратором. Пожалуйста, свяжитесь с поддержкой.');
      }
    } catch (e: any) {
      setStatusMsg(e.message || 'Введен неверный код или срок его действия истек');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 text-center mb-2">
        <p className="font-body text-xs text-ink-soft select-none">
          Мы отправили 6-значный код на <strong className="text-ink font-semibold">{email}</strong>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="code" className="font-body text-xs font-semibold text-ink-soft select-none">
          Код подтверждения
        </label>
        <input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          disabled={isVerifying || isSuccess}
          className="w-full bg-bg-warm border border-line rounded-xl px-4 py-3 text-center tracking-[0.3em] font-mono text-lg text-ink outline-none transition-all placeholder:text-ink-faint focus:border-amber focus:ring-1 focus:ring-amber"
          required
        />
      </div>

      {statusMsg && (
        <div
          className={`text-xs font-medium rounded-xl px-3 py-2 ${
            isSuccess
              ? 'text-green-800 bg-green-50'
              : 'text-amber bg-amber-wash'
          }`}
        >
          {statusMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={isVerifying || isSuccess}
        className="w-full bg-[#B9770C] hover:bg-[#E0951A] active:scale-[0.98] disabled:opacity-50 text-white font-body font-semibold text-sm rounded-xl py-3 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isVerifying ? 'Проверка...' : 'Войти'}
      </button>

      <button
        type="button"
        onClick={() => router.push(ROUTES.auth.index)}
        className="w-full bg-transparent text-ink-soft hover:text-ink font-body font-medium text-xs py-1 transition-all cursor-pointer"
      >
        Изменить email
      </button>
    </form>
  );
}

export default function CodeVerificationPage() {
  return (
    <Suspense fallback={<div className="text-center font-body text-sm text-ink-soft select-none">Загрузка...</div>}>
      <CodeVerificationContent />
    </Suspense>
  );
}
