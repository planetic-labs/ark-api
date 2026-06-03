'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsApi } from '@/services/api/chats';
import { useAuthStore } from '@/stores/useAuthStore';
import Avatar from '@/components/ui/Avatar';
import { WarriorBadge } from '@/components/ui/WarriorBadge';
import { useRouter, usePathname } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { Search, Volume2, Compass, Film, MessageSquare, Bell } from 'lucide-react';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatsLayout({ children }: ChatLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'main' | 'all'>('main');

  // Fetch chats
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: chatsApi.list,
  });

  // Init default chats if empty mutation
  const initChatsMutation = useMutation({
    mutationFn: async () => {
      const defaults = [
        { name: 'Инкубатор', is_group: true, members: [] },
        { name: 'Реанимация.Интенсив', is_group: true, members: [] },
        { name: 'Текущие материалы Работы+', is_group: true, members: [] },
        { name: 'Технический', is_group: true, members: [] },
        { name: 'Общение внутриКовчега', is_group: true, members: [] },
      ];
      for (const chat of defaults) {
        await chatsApi.create(chat);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });

  // Auto trigger init if loaded and empty
  React.useEffect(() => {
    if (!isLoading && chats.length === 0) {
      initChatsMutation.mutate();
    }
  }, [chats, isLoading]);

  const handleChatClick = (chatId: string) => {
    router.push(ROUTES.chat(chatId));
  };

  // Mock static preview content corresponding to the design mockup for better wow-effect
  const getChatMockData = (name: string) => {
    const defaultMocks: Record<string, { preview: string; time: string; count?: number; isAmber?: boolean; hasPractice?: boolean; practiceText?: string; author?: string; isWarriorAuthor?: boolean }> = {
      'Инкубатор': {
        author: 'Мария Л.:',
        preview: 'Отчёт — 4 пункта, прошу корректировку',
        time: '11:20',
        count: 2,
        isAmber: false,
      },
      'Реанимация.Интенсив': {
        author: '◈ Галя Мурзина:',
        isWarriorAuthor: true,
        preview: 'Корректировка по пункту 2 отчёта…',
        time: '10:48',
        count: 5,
        isAmber: true,
      },
      'Текущие материалы Работы+': {
        preview: 'Новая нарезка · «Внимание как опора»',
        time: '09:30',
        count: 1,
        isAmber: false,
      },
      'Технический': {
        preview: 'Расписание практик · ссылки Zoom — в закрепе',
        time: '08:15',
        hasPractice: true,
        practiceText: 'идёт Гудение до 15:40',
      },
      'Общение внутриКовчега': {
        preview: 'Сергей Д.: Благодарю за сегодняшний Сатсанг 🙏',
        time: 'вчера',
      },
    };
    return defaultMocks[name] || { preview: 'Нет сообщений', time: '12:00' };
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel: Chats list */}
      <div className="w-[340px] border-r border-line bg-bg flex flex-col flex-shrink-0 select-none">
        {/* Satsang App Header Banner */}
        <div className="bg-ink p-4 text-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[9px] text-amber-bright uppercase tracking-wider block font-medium">
                Сатсанг назначен
              </span>
              <h3 className="font-display font-semibold text-sm mt-0.5">
                Сегодня в 20:00
              </h3>
            </div>
            <button className="bg-amber-bright hover:bg-amber text-white font-body font-semibold text-[11px] rounded-lg px-3 py-1.5 transition-all cursor-pointer">
              Напомнить
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-line">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск чатов..."
              className="w-full bg-bg-warm border border-line rounded-xl pl-9 pr-4 py-2 text-xs text-ink outline-none transition-all placeholder:text-ink-faint focus:border-amber"
            />
          </div>
        </div>

        {/* Tabs for Основные vs Все */}
        <div className="px-4 py-3 flex gap-2 border-b border-line">
          <button
            onClick={() => setActiveTab('main')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all cursor-pointer ${
              activeTab === 'main'
                ? 'bg-ink text-white'
                : 'text-ink-soft hover:bg-line-soft'
            }`}
          >
            Основные
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-ink text-white'
                : 'text-ink-soft hover:bg-line-soft'
            }`}
          >
            Все
          </button>
        </div>

        {/* Chats list stream */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            chats.map((chat) => {
              const mock = getChatMockData(chat.name || '');
              const active = pathname === ROUTES.chat(chat.id);
              const isWarrior = chat.name === 'Инкубатор' || chat.name === 'Реанимация.Интенсив';

              return (
                <div
                  key={chat.id}
                  onClick={() => handleChatClick(chat.id)}
                  className={`flex gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-150 ${
                    active ? 'bg-line-soft' : 'hover:bg-line-soft/40'
                  }`}
                >
                  <Avatar
                    name={chat.name || 'Чат'}
                    isWarrior={isWarrior}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`font-display font-semibold text-xs leading-tight truncate ${chat.name === 'Технический' || chat.name === 'Общение внутриКовчега' ? 'text-ink-soft' : 'text-ink'}`}>
                        {chat.name}
                      </span>
                      <span className="font-mono text-[9px] text-ink-faint flex-shrink-0">{mock.time}</span>
                    </div>

                    <p className={`text-[11px] leading-normal truncate mt-1 ${mock.count ? 'text-ink font-medium' : 'text-ink-soft'}`}>
                      {mock.author && (
                        <span className={mock.isWarriorAuthor ? 'text-amber font-semibold' : 'text-ink font-semibold'}>
                          {mock.author}{' '}
                        </span>
                      )}
                      {mock.preview}
                    </p>

                    {mock.hasPractice && (
                      <div className="flex items-center gap-1.5 mt-2 bg-amber-wash/65 rounded-lg px-2 py-1 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-bright animate-pulse"></span>
                        <span className="font-mono text-[9px] text-amber font-semibold">{mock.practiceText}</span>
                      </div>
                    )}

                    {mock.count && (
                      <div className="flex justify-end mt-1">
                        <span className={`min-w-[18px] h-[18px] px-1 rounded-full font-mono text-[10px] text-white flex items-center justify-center ${mock.isAmber ? 'bg-amber' : 'bg-ink'}`}>
                          {mock.count}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel: Active chat window */}
      <div className="flex-1 bg-bg-warm relative overflow-hidden">
        {children}
      </div>
    </div>
  );
}
