'use client';

import React, { useState } from 'react';
import { Plus, Bot, Key, Power, Play, Pause, Trash2, X, Info } from 'lucide-react';

interface MockBot {
  id: string;
  name: string;
  avatar_url?: string;
  description: string;
  status: 'active' | 'idle' | 'offline';
  trigger_words: string[];
  webhook_url: string;
  last_activity?: string;
}

export default function BotsAdminPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [newBotName, setNewBotName] = useState('');
  const [newBotDesc, setNewBotDesc] = useState('');
  const [newBotTriggers, setNewBotTriggers] = useState('');
  const [newBotWebhook, setNewBotWebhook] = useState('');

  const [bots, setBots] = useState<MockBot[]>([
    {
      id: 'bot_assistant',
      name: 'Бот-Ассистент Сатсанга',
      description: 'Автоматически собирает вопросы учеников перед Сатсангом и генерирует повестку дня для Мастера.',
      status: 'active',
      trigger_words: ['!вопрос', '!сатсанг', '!тема'],
      webhook_url: 'http://localhost:8000/api/v1/bots/satsang-assistant',
      last_activity: '10 минут назад',
    },
    {
      id: 'bot_transcription',
      name: 'Бот-Транскрибатор',
      description: 'Интеграция с Whisper API. Слушает голосовые сообщения в чатах и присылает текстовую расшифровку.',
      status: 'active',
      trigger_words: ['* (все аудио)'],
      webhook_url: 'http://localhost:8000/api/v1/bots/audio-whisper',
      last_activity: '2 часа назад',
    },
    {
      id: 'bot_zoom_notifier',
      name: 'Зум Оповещатель',
      description: 'Следит за календарем встреч и вывешивает адресную плашку Zoom-трансляции на главный экран.',
      status: 'idle',
      trigger_words: ['!zoom', '!созвон'],
      webhook_url: 'http://localhost:8000/api/v1/bots/zoom-notifications',
      last_activity: 'Вчера в 20:00',
    },
  ]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newBotName.trim() || !newBotDesc.trim() || !newBotWebhook.trim()) {
      setErrorMsg('Пожалуйста, заполните все обязательные поля');
      return;
    }

    const newBot: MockBot = {
      id: `bot_${Math.random().toString(36).substring(2, 9)}`,
      name: newBotName.trim(),
      description: newBotDesc.trim(),
      status: 'idle',
      trigger_words: newBotTriggers ? newBotTriggers.split(',').map((t) => t.trim()) : [],
      webhook_url: newBotWebhook.trim(),
    };

    setBots([...bots, newBot]);
    setIsModalOpen(false);
    
    // Reset form
    setNewBotName('');
    setNewBotDesc('');
    setNewBotTriggers('');
    setNewBotWebhook('');
  };

  const toggleBotStatus = (id: string) => {
    setBots(
      bots.map((b) => {
        if (b.id === id) {
          const newStatus = b.status === 'active' ? 'idle' : 'active';
          return { ...b, status: newStatus };
        }
        return b;
      })
    );
  };

  const deleteBot = (id: string) => {
    setBots(bots.filter((b) => b.id !== id));
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6 select-none">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">
            Управление Ботами
          </h1>
          <p className="font-mono text-[10px] text-ink-soft tracking-wider uppercase mt-1">
            Конфигурация автоматизированных ботов и вебхуков для чатов Ковчега
          </p>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setErrorMsg('');
          }}
          className="flex items-center gap-2 bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl px-4 py-3 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Добавить бота
        </button>
      </div>

      {/* Info notice about bots architecture */}
      <div className="bg-bg-warm border border-line rounded-2xl p-4 flex gap-3 text-xs leading-normal text-ink-soft select-none">
        <Info className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-ink block mb-0.5">Архитектура расширений:</strong>
          Боты работают как изолированные микросервисы. Каждому боту выдается уникальный токен API (через вкладку «Сервисы»), с помощью которого он слушает и публикует сообщения через WebSocket/REST.
        </div>
      </div>

      {/* Bots Grid */}
      {bots.length === 0 ? (
        <div className="bg-bg border border-line border-dashed rounded-2xl p-12 text-center select-none">
          <Bot className="w-12 h-12 text-ink-faint mx-auto mb-3" />
          <h3 className="font-display font-semibold text-base text-ink">Список ботов пуст</h3>
          <p className="font-body text-xs text-ink-soft mt-1">Добавьте вашего первого бота для интеграции с внешними системами</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bots.map((b) => (
            <div
              key={b.id}
              className={`bg-bg border border-line rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all ${
                b.status === 'offline' ? 'opacity-60 bg-bg-warm/30' : ''
              }`}
            >
              {/* Bot Info Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${b.status === 'active' ? 'bg-amber-wash/50 text-amber' : 'bg-line-soft text-ink-soft'}`}>
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink leading-tight">
                      {b.name}
                    </h3>
                    <p className="font-mono text-[9px] text-ink-faint mt-0.5">
                      ID: {b.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-[8.5px] font-mono rounded-full uppercase border font-semibold select-none ${
                      b.status === 'active'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : b.status === 'idle'
                        ? 'bg-amber-wash/20 border-amber/20 text-amber'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    {b.status === 'active' ? 'Активен' : b.status === 'idle' ? 'Спит' : 'Выключен'}
                  </span>
                </div>
              </div>

              {/* Bot description & webhook */}
              <div className="flex flex-col gap-3">
                <p className="text-xs text-ink-soft leading-normal">
                  {b.description}
                </p>

                <div className="flex flex-col gap-1 text-[10px] font-mono text-ink-soft bg-bg-warm/50 border border-line-soft rounded-xl p-3">
                  <div className="truncate">
                    <span className="text-ink select-none">Webhook:</span> <span className="select-all">{b.webhook_url}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                    <span className="text-ink select-none mr-1">Триггеры:</span>
                    {b.trigger_words.length === 0 ? (
                      <span className="text-ink-faint italic font-body">нет триггеров</span>
                    ) : (
                      b.trigger_words.map((w) => (
                        <span key={w} className="px-1.5 py-0.5 bg-line text-ink rounded-lg text-[9px]">
                          {w}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Card actions */}
              <div className="flex items-center justify-between border-t border-line-soft pt-3.5 mt-1 select-none">
                <span className="text-[10px] text-ink-faint font-mono">
                  {b.last_activity ? `Активность: ${b.last_activity}` : 'Нет активности'}
                </span>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleBotStatus(b.id)}
                    title={b.status === 'active' ? 'Остановить бота' : 'Запустить бота'}
                    className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                      b.status === 'active' ? 'text-amber hover:text-amber-bright' : 'text-green-700 hover:text-green-800'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {b.status === 'active' ? 'Остановить' : 'Запустить'}
                  </button>
                  <button
                    onClick={() => deleteBot(b.id)}
                    className="p-1 rounded-lg hover:bg-line text-ink-soft hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Bot Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-[460px] bg-bg border border-line rounded-[28px] p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-ink">
                  Добавить Бот-Интеграцию
                </h3>
                <p className="font-mono text-[9px] text-ink-soft tracking-wider uppercase mt-0.5">
                  Регистрация нового внешнего агента в чат
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
                  Название бота
                </label>
                <input
                  type="text"
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  placeholder="Например: Модератор чата"
                  className="w-full bg-bg-warm border border-line rounded-xl px-3 py-2.5 text-xs text-ink outline-none focus:border-amber select-text"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-ink-soft">
                  Описание бота
                </label>
                <textarea
                  value={newBotDesc}
                  onChange={(e) => setNewBotDesc(e.target.value)}
                  placeholder="Для чего нужен бот и какие функции выполняет..."
                  rows={2}
                  className="w-full bg-bg-warm border border-line rounded-xl px-3 py-2.5 text-xs text-ink outline-none focus:border-amber select-text resize-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-ink-soft">
                  Триггерные слова (через запятую)
                </label>
                <input
                  type="text"
                  value={newBotTriggers}
                  onChange={(e) => setNewBotTriggers(e.target.value)}
                  placeholder="!help, !ban, !stat"
                  className="w-full bg-bg-warm border border-line rounded-xl px-3 py-2.5 text-xs text-ink outline-none focus:border-amber select-text"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-ink-soft">
                  Webhook URL (для отправки событий)
                </label>
                <input
                  type="url"
                  value={newBotWebhook}
                  onChange={(e) => setNewBotWebhook(e.target.value)}
                  placeholder="https://myapi.com/webhooks/bot"
                  className="w-full bg-bg-warm border border-line rounded-xl px-3 py-2.5 text-xs text-ink outline-none focus:border-amber select-text"
                  required
                />
              </div>

              {errorMsg && (
                <div className="text-[11px] text-amber font-medium bg-amber-wash rounded-xl px-3 py-2">
                  {errorMsg}
                </div>
              )}

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
                  Добавить
                </button>
              </div>
            </form>
            
          </div>
        </div>
      )}
    </div>
  );
}
