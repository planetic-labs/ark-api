'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function ChatsDefaultPage() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 select-none">
      <div className="w-16 h-16 rounded-2xl bg-line-soft text-ink-faint flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8" />
      </div>
      <h3 className="font-display font-semibold text-lg text-ink">Диалог не выбран</h3>
      <p className="font-body text-xs text-ink-soft mt-1.5 max-w-[280px] leading-relaxed">
        Выберите интересующий вас чат на панели слева, чтобы присоединиться к обсуждению и практикам
      </p>
    </div>
  );
}
