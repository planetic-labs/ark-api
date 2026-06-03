'use client';

import React, { useState } from 'react';
import { FileText, Headphones, Quote, Plus, Play, Check, X, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

interface AudioPractice {
  id: string;
  title: string;
  duration: string;
  desc: string;
}

interface QuoteItem {
  id: string;
  text: string;
  source: string;
  time: string;
  author: string;
  status: 'approved' | 'pending';
}

export default function MaterialsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'audio' | 'quotes'>('audio');
  
  // Quotes and moderation states
  const [quotes, setQuotes] = useState<QuoteItem[]>([
    {
      id: 'q_1',
      text: 'Внимание — это единственный ресурс, которым вы действительно управляете. Куда направлено внимание, туда течет и ваша жизнь.',
      source: 'Сатсанг «Внимание как опора»',
      time: '14:22',
      author: 'Елена Сорокина',
      status: 'approved',
    },
    {
      id: 'q_2',
      text: 'Сопротивление ума — это признак того, что вы подошли близко к границе своего эго. Не бойтесь его, просто наблюдайте.',
      source: 'Сатсанг 14.05',
      time: '08:45',
      author: 'Сергей Д.',
      status: 'approved',
    },
    {
      id: 'q_3',
      text: 'Тишина — это не отсутствие звуков. Это присутствие вас самих во всем происходящем.',
      source: 'Сатсанг «Тишина и присутствие»',
      time: '32:10',
      author: 'Мария Л.',
      status: 'pending', // Pending moderation
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteSource, setNewQuoteSource] = useState('');
  const [newQuoteTime, setNewQuoteTime] = useState('');

  const audios: AudioPractice[] = [
    { id: 'a_1', title: 'Практика Гудения (Базовая)', duration: '20:00', desc: 'Утренняя практика для настройки резонанса тела и концентрации.' },
    { id: 'a_2', title: 'Медитация «Осознание Внимания»', duration: '30:00', desc: 'Наблюдение за точкой концентрации внимания и его расширение.' },
    { id: 'a_3', title: 'Тишина ума', duration: '15:00', desc: 'Короткая дневная сессия безмолвного созерцания.' },
  ];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteText.trim() || !newQuoteSource.trim()) return;

    const newQuote: QuoteItem = {
      id: `q_${Math.random().toString(36).substring(2, 9)}`,
      text: newQuoteText.trim(),
      source: newQuoteSource.trim(),
      time: newQuoteTime.trim() || '00:00',
      author: user?.full_name || user?.email || 'Пользователь',
      status: 'pending', // All new quotes require moderation
    };

    setQuotes([newQuote, ...quotes]);
    setIsModalOpen(false);
    setNewQuoteText('');
    setNewQuoteSource('');
    setNewQuoteTime('');
  };

  const handleApproveQuote = (id: string) => {
    setQuotes(quotes.map(q => q.id === id ? { ...q, status: 'approved' } : q));
  };

  const handleDeleteQuote = (id: string) => {
    setQuotes(quotes.filter(q => q.id !== id));
  };

  const isIrina = user?.full_name?.includes('Ирина') || user?.email?.includes('irina') || user?.role === 'ADMIN';

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-line pb-6 select-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber" />
            Библиотека Материалов
          </h1>
          <p className="font-mono text-[10px] text-ink-soft tracking-wider uppercase mt-1">
            Аудиозаписи ежедневных практик общины и цитатник мудрости Мастера
          </p>
        </div>

        {activeTab === 'quotes' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl px-4 py-2.5 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all cursor-pointer active:scale-95 select-none"
          >
            <Plus className="w-4 h-4" />
            Добавить цитату
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-line pb-1 select-none">
        <button
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-body transition-all cursor-pointer ${
            activeTab === 'audio'
              ? 'bg-ink text-white'
              : 'text-ink-soft hover:bg-line-soft'
          }`}
        >
          <Headphones className="w-4 h-4" />
          Аудиоматериалы
        </button>
        <button
          onClick={() => setActiveTab('quotes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-body transition-all cursor-pointer ${
            activeTab === 'quotes'
              ? 'bg-ink text-white'
              : 'text-ink-soft hover:bg-line-soft'
          }`}
        >
          <Quote className="w-4 h-4" />
          Цитатник Мастера
        </button>
      </div>

      {/* Tab Content: Audio */}
      {activeTab === 'audio' && (
        <div className="flex flex-col gap-4 max-w-xl">
          {audios.map((a) => (
            <div key={a.id} className="bg-bg border border-line rounded-2xl p-4 flex items-center justify-between gap-4 select-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-wash/50 text-amber flex items-center justify-center flex-shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-ink leading-tight">{a.title}</h3>
                  <p className="text-[11px] text-ink-soft mt-1 leading-normal font-body">{a.desc}</p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-amber font-semibold hover:text-amber-bright border border-amber/35 bg-amber-wash/30 px-3.5 py-2 rounded-xl transition-all cursor-pointer">
                <Play className="w-3.5 h-3.5 fill-current" />
                {a.duration}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Quotes */}
      {activeTab === 'quotes' && (
        <div className="flex flex-col gap-6">
          {/* Moderation queue (for Admin or Irina) */}
          {isIrina && quotes.some(q => q.status === 'pending') && (
            <div className="flex flex-col gap-3 bg-amber-wash/40 border border-amber/25 rounded-2xl p-4">
              <span className="font-mono text-[9px] text-amber tracking-wider uppercase font-semibold flex items-center gap-1.5 select-none">
                <ShieldAlert className="w-4 h-4" />
                Очередь модерации Ирины
              </span>
              
              <div className="flex flex-col gap-3 mt-1">
                {quotes.filter(q => q.status === 'pending').map((q) => (
                  <div key={q.id} className="bg-bg border border-line rounded-xl p-4 flex flex-col gap-3">
                    <p className="text-xs text-ink leading-relaxed italic font-body select-text">
                      "{q.text}"
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-ink-soft border-t border-line-soft pt-2.5 select-none">
                      <span>Источник: {q.source} ({q.time}) · Автор: {q.author}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveQuote(q.id)}
                          className="flex items-center gap-1 text-[10px] text-green-700 font-semibold hover:text-green-800 border border-green-200 bg-green-50 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          Одобрить
                        </button>
                        <button
                          onClick={() => handleDeleteQuote(q.id)}
                          className="flex items-center gap-1 text-[10px] text-red-700 font-semibold hover:text-red-800 border border-red-200 bg-red-50 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          Отклонить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved quotes stream */}
          <div className="flex flex-col gap-4">
            {quotes.filter(q => q.status === 'approved').map((q) => (
              <div key={q.id} className="bg-bg border border-line rounded-2xl p-5 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                <p className="text-xs text-ink font-body leading-relaxed select-text italic">
                  "{q.text}"
                </p>
                <div className="flex justify-between items-center text-[10px] font-mono text-ink-soft border-t border-line-soft pt-3 mt-1 select-none">
                  <span>Источник: {q.source} ({q.time})</span>
                  <span>Добавил: {q.author}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Quote Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-[460px] bg-bg border border-line rounded-[28px] p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-ink">
                  Предложить цитату
                </h3>
                <p className="font-mono text-[9px] text-ink-soft tracking-wider uppercase mt-0.5">
                  Цитаты отправляются на модерацию Ирине
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-line-soft text-ink-soft hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-ink-soft">
                  Текст цитаты
                </label>
                <textarea
                  value={newQuoteText}
                  onChange={(e) => setNewQuoteText(e.target.value)}
                  placeholder="Вставьте точные слова Мастера..."
                  rows={4}
                  className="w-full bg-bg-warm border border-line rounded-xl px-3 py-2.5 text-xs text-ink outline-none focus:border-amber select-text resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-ink-soft">
                    Сатсанг / Файл-источник
                  </label>
                  <input
                    type="text"
                    value={newQuoteSource}
                    onChange={(e) => setNewQuoteSource(e.target.value)}
                    placeholder="Например: Сатсанг 14.05"
                    className="w-full bg-bg-warm border border-line rounded-xl px-3 py-2.5 text-xs text-ink outline-none focus:border-amber select-text"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-ink-soft">
                    Тайминг
                  </label>
                  <input
                    type="text"
                    value={newQuoteTime}
                    onChange={(e) => setNewQuoteTime(e.target.value)}
                    placeholder="12:45"
                    className="w-full bg-bg-warm border border-line rounded-xl px-3 py-2.5 text-xs text-ink outline-none focus:border-amber select-text"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-line pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-transparent hover:bg-line-soft text-ink-soft font-body font-medium text-xs rounded-xl px-4 py-2.5 transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl px-5 py-2.5 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all cursor-pointer active:scale-95"
                >
                  Отправить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
