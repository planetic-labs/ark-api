'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { identify, isIdentifying } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!email || !email.includes('@')) {
      setErrorMsg('Пожалуйста, введите корректный email');
      return;
    }

    try {
      const response = await identify(email);
      if (response.next === 'enter_code') {
        router.push(`${ROUTES.auth.code}?email=${encodeURIComponent(email)}`);
      } else {
        setErrorMsg(response.error || 'Пользователь не найден или доступ заблокирован');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Произошла ошибка при отправке запроса');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="font-body text-xs font-semibold text-ink-soft select-none">
          Ваш рабочий email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@domain.com"
          disabled={isIdentifying}
          className="w-full bg-bg-warm border border-line rounded-xl px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:border-amber focus:ring-1 focus:ring-amber"
          required
        />
      </div>

      {errorMsg && (
        <div className="text-xs text-amber font-medium bg-amber-wash rounded-xl px-3 py-2">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={isIdentifying}
        className="w-full bg-[#B9770C] hover:bg-[#E0951A] active:scale-[0.98] disabled:opacity-50 text-white font-body font-semibold text-sm rounded-xl py-3 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isIdentifying ? 'Отправка...' : 'Получить код'}
      </button>
    </form>
  );
}
