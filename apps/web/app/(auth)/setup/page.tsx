'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

function SetupProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupToken = searchParams.get('token') || '';
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { setup, isSettingUp } = useAuth();

  useEffect(() => {
    if (!setupToken) {
      router.push(ROUTES.auth.index);
    }
  }, [setupToken, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('Пожалуйста, введите имя и фамилию');
      return;
    }

    try {
      await setup({
        setupToken,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });
      router.push(ROUTES.chats);
    } catch (e: any) {
      setErrorMsg(e.message || 'Произошла ошибка при настройке профиля');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 text-center mb-2">
        <p className="font-body text-xs text-ink-soft select-none">
          Заполните информацию о себе для первого входа в систему
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 flex flex-col gap-2">
          <label htmlFor="firstName" className="font-body text-xs font-semibold text-ink-soft select-none">
            Имя
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Алексей"
            disabled={isSettingUp}
            className="w-full bg-bg-warm border border-line rounded-xl px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:border-amber focus:ring-1 focus:ring-amber"
            required
          />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <label htmlFor="lastName" className="font-body text-xs font-semibold text-ink-soft select-none">
            Фамилия
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Прусиков"
            disabled={isSettingUp}
            className="w-full bg-bg-warm border border-line rounded-xl px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:border-amber focus:ring-1 focus:ring-amber"
            required
          />
        </div>
      </div>
      <p className="font-mono text-[9px] text-ink-soft -mt-2">
        * По правилам общины: вводите реальные имя и фамилию на русском языке
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="avatarUrl" className="font-body text-xs font-semibold text-ink-soft select-none">
          Ссылка на фотографию (аватар)
        </label>
        <input
          id="avatarUrl"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          disabled={isSettingUp}
          className="w-full bg-bg-warm border border-line rounded-xl px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:border-amber focus:ring-1 focus:ring-amber"
        />
        <p className="font-mono text-[9px] text-ink-soft">
          * По требованиям сообщества: используйте вашу реальную фотографию
        </p>
      </div>

      {errorMsg && (
        <div className="text-xs text-amber font-medium bg-amber-wash rounded-xl px-3 py-2">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={isSettingUp}
        className="w-full bg-[#B9770C] hover:bg-[#E0951A] active:scale-[0.98] disabled:opacity-50 text-white font-body font-semibold text-sm rounded-xl py-3 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isSettingUp ? 'Сохранение...' : 'Завершить настройку'}
      </button>
    </form>
  );
}

export default function SetupProfilePage() {
  return (
    <Suspense fallback={<div className="text-center font-body text-sm text-ink-soft select-none">Загрузка...</div>}>
      <SetupProfileContent />
    </Suspense>
  );
}
