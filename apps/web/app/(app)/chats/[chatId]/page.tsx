'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsApi } from '@/services/api/chats';
import { useAuthStore } from '@/stores/useAuthStore';
import Avatar from '@/components/ui/Avatar';
import { WarriorBadge } from '@/components/ui/WarriorBadge';
import { useParams, useRouter } from 'next/navigation';
import { Send, CornerUpLeft, Check, ThumbsUp, Heart, Smile, X, Users, MessageSquare } from 'lucide-react';

interface MockReport {
  author_name: string;
  avatar_url?: string;
  date: string;
  items: string[];
  studied_by: string[]; // List of names
  studied_by_me: boolean;
  reactions: { emoji: string; count: number; mine: boolean }[];
}

export default function ChatWindowPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  const [inputText, setInputText] = useState('');
  const [replyParent, setReplyParent] = useState<any | null>(null);
  
  // Custom mock reports state (stored locally in-memory for the demo since backend doesn't support structured reports DB tables yet)
  const [mockReports, setMockReports] = useState<Record<string, MockReport>>({
    'report_1': {
      author_name: 'Елена Сорокина',
      date: '14.05 · 09:12',
      items: [
        'Замечаю, что внимание держится дольше в тишине, но рассеивается при разговоре.',
        'Практика Гудения помогает вернуть фокус в тело. Делаю по 20 минут утром.',
        'Испытываю сопротивление при начале дневной практики, но после 5 минут оно проходит.',
      ],
      studied_by: ['◈ Галя Мурзина', 'Алексей Прусиков'],
      studied_by_me: false,
      reactions: [
        { emoji: '🙏', count: 4, mine: true },
        { emoji: '❤️', count: 2, mine: false },
      ],
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chats to find current chat name
  const { data: chats = [] } = useQuery({
    queryKey: ['chats'],
    queryFn: chatsApi.list,
  });

  const currentChat = chats.find((c) => c.id === chatId);

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => chatsApi.listMessages(chatId),
    enabled: !!chatId,
  });

  // Seed default messages if empty mutation
  const seedMessagesMutation = useMutation({
    mutationFn: async () => {
      if (!currentChat) return;
      
      if (currentChat.name === 'Реанимация.Интенсив') {
        // Seed standard mockup messages
        await chatsApi.sendMessage({
          chat_id: chatId,
          content: 'SYSTEM_REPORT:report_1', // Custom identifier for reports
        });
        
        await chatsApi.sendMessage({
          chat_id: chatId,
          content: 'Корректировка по пункту 2 отчёта. Елена, попробуйте делать Гудение с закрытыми глазами и направлять всё внимание на вибрации в грудной клетке. Это снизит сопротивление ума.',
          parent_id: null, // We'll simulate thread in UI
        });
      } else {
        await chatsApi.sendMessage({
          chat_id: chatId,
          content: `Добро пожаловать в чат "${currentChat.name}"! Задавайте вопросы, делитесь отчетами и практиками.`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    },
  });

  // Auto trigger seed if empty messages
  useEffect(() => {
    if (!isLoading && messages.length === 0 && currentChat) {
      seedMessagesMutation.mutate();
    }
  }, [messages, isLoading, currentChat]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: chatsApi.sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      setInputText('');
      setReplyParent(null);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessageMutation.mutate({
      chat_id: chatId,
      content: inputText.trim(),
      parent_id: replyParent ? replyParent.id : null,
    });
  };

  const handleStudyReport = (reportId: string) => {
    setMockReports(prev => {
      const report = prev[reportId];
      if (!report) return prev;

      const userDisplayName = user?.full_name || user?.email || 'Пользователь';
      let newStudiedBy = [...report.studied_by];
      const newStudiedByMe = !report.studied_by_me;

      if (newStudiedByMe) {
        if (!newStudiedBy.includes(userDisplayName)) {
          newStudiedBy.push(userDisplayName);
        }
      } else {
        newStudiedBy = newStudiedBy.filter(name => name !== userDisplayName);
      }

      return {
        ...prev,
        [reportId]: {
          ...report,
          studied_by_me: newStudiedByMe,
          studied_by: newStudiedBy
        }
      };
    });
  };

  const handleAddReaction = (reportId: string, emoji: string) => {
    setMockReports(prev => {
      const report = prev[reportId];
      if (!report) return prev;

      let newReactions = report.reactions.map(r => {
        if (r.emoji === emoji) {
          const newMine = !r.mine;
          return {
            ...r,
            mine: newMine,
            count: newMine ? r.count + 1 : r.count - 1
          };
        }
        return r;
      });

      // If reaction not found, add it
      if (!newReactions.some(r => r.emoji === emoji)) {
        newReactions.push({ emoji, count: 1, mine: true });
      }

      // Filter out zero count reactions
      newReactions = newReactions.filter(r => r.count > 0);

      return {
        ...prev,
        [reportId]: {
          ...report,
          reactions: newReactions
        }
      };
    });
  };

  if (isLoading || !currentChat) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isWarriorChat = currentChat.name === 'Инкубатор' || currentChat.name === 'Реанимация.Интенсив';

  return (
    <div className="h-full flex flex-col bg-bg-warm">
      {/* Chat header */}
      <div className="bg-bg border-b border-line px-6 py-4 flex items-center justify-between select-none">
        <div>
          <h2 className="font-display font-semibold text-base text-ink leading-tight">
            {currentChat.name}
          </h2>
          <p className="font-mono text-[10px] text-ink-soft mt-0.5 flex items-center gap-1.5">
            <span>32 участника</span>
            <span className="text-ink-faint font-light">·</span>
            <span className="text-amber font-semibold">◈ 3 Воина</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl hover:bg-line-soft text-ink-soft hover:text-ink cursor-pointer">
            <Users className="w-4.5 h-4.5" />
          </button>
          <button className="p-2 rounded-xl hover:bg-line-soft text-ink-soft hover:text-ink cursor-pointer">
            <MessageSquare className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Messages stream */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <div className="self-center font-mono text-[9px] text-ink-faint bg-line-soft px-3 py-1.5 rounded-lg select-none uppercase tracking-wider">
          Среда, 14 мая
        </div>

        {messages.map((m) => {
          // If message is a structured report
          if (m.content.startsWith('SYSTEM_REPORT:')) {
            const reportId = m.content.split(':')[1];
            const report = mockReports[reportId];
            if (!report) return null;

            return (
              <div key={m.id} className="flex gap-3 max-w-[85%] self-start">
                <Avatar name={report.author_name} avatarUrl={report.avatar_url} size="sm" />
                <div className="flex flex-col gap-1.5">
                  {/* Report Card */}
                  <div className="bg-bg border border-line rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-bg-warm border-b border-line px-4 py-3 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-mono text-[9px] text-ink-faint uppercase tracking-wider block font-semibold">
                          Отчёт
                        </span>
                        <h4 className="font-display font-bold text-sm text-ink leading-tight">
                          {report.author_name}
                        </h4>
                      </div>
                      <span className="font-mono text-[9px] text-ink-faint">{report.date}</span>
                    </div>

                    <div className="p-4 flex flex-col gap-3">
                      {report.items.map((item, idx) => (
                        <div key={idx} className="flex gap-2.5 items-start">
                          <span className="font-mono text-xs font-semibold text-amber w-4 flex-shrink-0">
                            {idx + 1}.
                          </span>
                          <p className="text-xs text-ink leading-relaxed font-body select-text">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Report Footer: Studied Status & Reactions */}
                    <div className="border-t border-line-soft px-4 py-3 bg-bg-warm/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleStudyReport(reportId)}
                          className={`font-body font-semibold text-[11px] border px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                            report.studied_by_me
                              ? 'bg-amber border-amber text-white shadow-sm'
                              : 'bg-transparent border-amber text-amber hover:bg-amber-wash/40'
                          }`}
                        >
                          Изучен
                        </button>
                        <span className="font-mono text-[9px] text-ink-soft leading-normal">
                          Изучили: <strong className="text-amber">{report.studied_by.join(', ')}</strong>
                        </span>
                      </div>

                      {/* Reactions */}
                      <div className="flex items-center gap-1.5">
                        {report.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => handleAddReaction(reportId, r.emoji)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] transition-all cursor-pointer ${
                              r.mine
                                ? 'bg-amber-wash border-amber/35 text-amber font-semibold'
                                : 'bg-line-soft border-transparent text-ink-soft hover:bg-line-soft/80'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="font-mono text-[10px]">{r.count}</span>
                          </button>
                        ))}
                        <button
                          onClick={() => handleAddReaction(reportId, '👍')}
                          className="w-7 h-7 rounded-full border border-line-soft border-dashed flex items-center justify-center text-ink-faint hover:text-ink cursor-pointer hover:border-line"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Normal Message rendering
          // Determine if sender is a Warrior (for demo/mock purposes, let's treat admin and specific names as Warrior)
          const senderName = m.sender?.full_name || m.sender?.email || 'Пользователь';
          const isWarriorSender = m.sender?.role === 'WARRIOR' || m.sender?.role === 'MASTER' || m.sender?.role === 'ADMIN' || senderName.includes('Галя');
          
          // Check if this message is a thread reply
          const isReply = !!m.parent_id;

          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[85%] self-start ${isReply ? 'ml-12 border-l-2 border-amber pl-4' : ''}`}
            >
              <Avatar
                name={senderName}
                avatarUrl={m.sender?.avatar_url}
                isWarrior={isWarriorSender}
                size="sm"
              />
              <div className="flex flex-col gap-1">
                {/* Bubble wrapper */}
                <div
                  className={`rounded-2xl px-4 py-3 border shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                    isWarriorSender
                      ? 'bg-warrior-bg border-[#F0DFB8]'
                      : 'bg-bg border-line'
                  }`}
                >
                  <div className="flex items-baseline gap-2 mb-1 select-none">
                    <span
                      className={`font-display font-bold text-xs ${
                        isWarriorSender ? 'text-amber flex items-center gap-0.5' : 'text-ink font-semibold'
                      }`}
                    >
                      {isWarriorSender && '◈ '}
                      {senderName}
                    </span>
                    <span className="font-mono text-[9px] text-ink-faint">
                      {new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-ink leading-relaxed font-body select-text">
                    {m.content}
                  </p>
                </div>

                {/* Actions: reply trigger */}
                <div className="flex items-center gap-3 px-1 select-none">
                  <button
                    onClick={() => setReplyParent(m)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-ink-soft hover:text-amber transition-all cursor-pointer"
                  >
                    <CornerUpLeft className="w-3 h-3" />
                    Ответить (Тред)
                  </button>
                  <span className="text-[9px] text-amber-bright font-semibold">◈ Читают Воины</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="bg-bg border-t border-line p-4 flex flex-col gap-3">
        {/* Reply Preview Banner */}
        {replyParent && (
          <div className="flex items-center justify-between gap-4 bg-bg-warm border border-line rounded-xl px-3 py-2 animate-in slide-in-from-bottom-2 duration-150 select-none">
            <div className="flex items-center gap-2 text-xs text-ink-soft">
              <CornerUpLeft className="w-4 h-4 text-amber" />
              <span>
                Ответ на сообщение от{' '}
                <strong className="text-ink">
                  {replyParent.sender?.full_name || replyParent.sender?.email || 'Пользователь'}
                </strong>
                : <span className="italic">"{replyParent.content.slice(0, 40)}..."</span>
              </span>
            </div>
            <button
              onClick={() => setReplyParent(null)}
              className="p-1 rounded-md hover:bg-line text-ink-faint hover:text-ink cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sendMessageMutation.isPending}
            placeholder={replyParent ? "Написать ответ в тред..." : "Написать сообщение..."}
            className="flex-1 bg-bg-warm border border-line rounded-2xl px-4 py-3.5 text-xs text-ink outline-none transition-all placeholder:text-ink-faint focus:border-amber select-text"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sendMessageMutation.isPending}
            className="w-11 h-11 rounded-full bg-amber hover:bg-amber-bright disabled:opacity-50 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 flex-shrink-0"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
