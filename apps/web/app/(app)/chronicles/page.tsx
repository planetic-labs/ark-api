'use client';

import React, { useState } from 'react';
import { History, Search, Download, CornerUpLeft, Award, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { WarriorBadge } from '@/components/ui/WarriorBadge';

interface ChronicleThread {
  id: string;
  date: string;
  chat_name: string;
  student_name: string;
  student_avatar?: string;
  student_text: string;
  warrior_name: string;
  warrior_avatar?: string;
  warrior_text: string;
  is_warrior_auth: boolean;
}

export default function ChroniclesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWarriorOnly, setFilterWarriorOnly] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const threads: ChronicleThread[] = [
    {
      id: 'chr_1',
      date: '14.05.2026',
      chat_name: 'Реанимация.Интенсив',
      student_name: 'Елена Сорокина',
      student_text: 'Практика Гудения помогает вернуть фокус в тело. Делаю по 20 минут утром, но испытываю сильное сопротивление при начале дневной сессии.',
      warrior_name: 'Галя Мурзина',
      is_warrior_auth: true,
      warrior_text: 'Елена, попробуйте делать дневное Гудение с закрытыми глазами и направлять все внимание на физические вибрации в грудной клетке. Это снизит сопротивление ума, так как он перестанет визуально цепляться за объекты.',
    },
    {
      id: 'chr_2',
      date: '12.05.2026',
      chat_name: 'Инкубатор',
      student_name: 'Сергей Д.',
      student_text: 'Замечаю, что внимание держится дольше в тишине, но рассеивается сразу при начале разговоров на работе. Как удерживать фокус в диалоге?',
      warrior_name: 'Алексей Прусиков',
      is_warrior_auth: true,
      warrior_text: 'Сергей, во время разговора держите 30% своего внимания на дыхании внизу живота. Не стремитесь полностью погружаться в концепции собеседника. Постепенно это войдет в привычку.',
    },
  ];

  const filteredThreads = threads.filter(t => {
    const textMatch = t.student_text.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      t.warrior_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      t.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      t.warrior_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const roleMatch = !filterWarriorOnly || t.is_warrior_auth;
    return textMatch && roleMatch;
  });

  const generateMarkdownExport = () => {
    return filteredThreads.map(t => (
`### Летопись от ${t.date} [Чат: ${t.chat_name}]
**Ученик:** ${t.student_name}
> ${t.student_text}

**Корректировка Воина (${t.warrior_name}):**
> ${t.warrior_text}
\n---\n`
    )).join('\n');
  };

  const triggerDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([generateMarkdownExport()], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `kovcheg-chronicles-${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-line pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink flex items-center gap-2">
            <History className="w-6 h-6 text-amber" />
            Летописи Корректировок
          </h1>
          <p className="font-mono text-[10px] text-ink-soft tracking-wider uppercase mt-1">
            Единый сквозной архив всех отчетов учеников и корректировок Воинов
          </p>
        </div>

        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-1.5 bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl px-4 py-2.5 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all cursor-pointer active:scale-95"
        >
          <Download className="w-4 h-4" />
          Экспорт летописей
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-bg-warm border border-line rounded-2xl p-4 select-none">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск по тексту корректировок или авторам..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg border border-line rounded-xl pl-10 pr-4 py-2.5 text-xs text-ink outline-none transition-all placeholder:text-ink-faint focus:border-amber"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterWarriorOnly(!filterWarriorOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold font-body transition-all cursor-pointer ${
              filterWarriorOnly
                ? 'bg-amber-wash border-amber/35 text-amber'
                : 'bg-bg border-line text-ink-soft hover:bg-line-soft/40'
            }`}
          >
            <Award className="w-4 h-4" />
            Только Воины
          </button>
        </div>
      </div>

      {/* Threads list */}
      <div className="flex flex-col gap-6">
        {filteredThreads.length === 0 ? (
          <div className="bg-bg border border-line rounded-2xl p-12 text-center select-none">
            <History className="w-12 h-12 text-ink-faint mx-auto mb-3" />
            <h3 className="font-display font-semibold text-base text-ink">Летописи не найдены</h3>
            <p className="font-body text-xs text-ink-soft mt-1">Измените условия поиска или фильтрации</p>
          </div>
        ) : (
          filteredThreads.map((t) => (
            <div key={t.id} className="bg-bg border border-line rounded-2xl p-5 flex flex-col gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-line-soft pb-3 select-none">
                <span className="font-mono text-[9px] text-ink-soft uppercase bg-line-soft px-2.5 py-1 rounded-md">
                  Чат: {t.chat_name}
                </span>
                <span className="font-mono text-[9px] text-ink-faint">{t.date}</span>
              </div>

              {/* Student Report Question */}
              <div className="flex gap-3">
                <Avatar name={t.student_name} avatarUrl={t.student_avatar} size="sm" />
                <div>
                  <h4 className="font-display font-bold text-xs text-ink mb-1 select-none">{t.student_name}</h4>
                  <p className="text-xs text-ink-soft leading-relaxed font-body select-text">
                    {t.student_text}
                  </p>
                </div>
              </div>

              {/* Warrior Correction Reply */}
              <div className="ml-8 border-l-3 border-amber pl-4 flex flex-col gap-3 mt-2">
                <div className="font-mono text-[9px] text-amber uppercase tracking-wider font-semibold flex items-center gap-1 select-none">
                  <CornerUpLeft className="w-3.5 h-3.5" />
                  Корректировка
                </div>
                
                <div className="flex gap-3">
                  <Avatar name={t.warrior_name} avatarUrl={t.warrior_avatar} isWarrior={true} size="sm" />
                  <div>
                    <div className="flex items-center gap-1 mb-1 select-none">
                      <h4 className="font-display font-bold text-xs text-amber leading-none">
                        {t.warrior_name}
                      </h4>
                      <WarriorBadge />
                    </div>
                    <p className="text-xs text-ink leading-relaxed font-body bg-warrior-bg/40 border border-[#F0DFB8]/30 rounded-2xl px-4 py-3 select-text shadow-sm">
                      {t.warrior_text}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Export Markdown Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-[540px] bg-bg border border-line rounded-[28px] p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-ink">
                  Экспорт Летописей
                </h3>
                <p className="font-mono text-[9px] text-ink-soft tracking-wider uppercase mt-0.5">
                  Выгрузка отчетов и корректировок в формате Markdown
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1.5 rounded-lg hover:bg-line-soft text-ink-soft hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Markdown Preview Area */}
            <div className="flex flex-col gap-1.5 select-text">
              <label className="text-[11px] font-semibold text-ink-soft select-none">
                Предпросмотр Markdown
              </label>
              <textarea
                readOnly
                value={generateMarkdownExport()}
                rows={10}
                className="w-full bg-bg-warm border border-line rounded-xl px-3 py-2.5 font-mono text-[10px] text-ink outline-none select-all resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-line pt-4 mt-1">
              <button
                onClick={() => setShowExportModal(false)}
                className="bg-transparent hover:bg-line-soft text-ink-soft font-body font-medium text-xs rounded-xl px-4 py-2.5 transition-all cursor-pointer"
              >
                Закрыть
              </button>
              <button
                onClick={triggerDownload}
                className="flex items-center gap-1.5 bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl px-5 py-2.5 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                Скачать .md файл
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
