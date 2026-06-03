import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-bg rounded-[32px] border border-line p-8 md:p-10 shadow-[0_20px_50px_-12px_rgba(40,33,20,0.15)] flex flex-col">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-[#D0C6B0] to-[#AFA690] text-[#5F5848] font-display text-3xl font-bold flex items-center justify-center mb-3 select-none">
            К
          </div>
          <h1 className="font-display font-semibold text-2xl text-ink tracking-tight select-none">
            Ковчег
          </h1>
          <p className="font-mono text-[11px] text-ink-soft tracking-wider uppercase mt-1 select-none">
            Корпоративный мессенджер
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
