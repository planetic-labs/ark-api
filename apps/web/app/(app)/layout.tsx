'use client';

import React from 'react';
import { useSession } from '@/hooks/useSession';
import { useRouter, usePathname } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';
import { WarriorBadge } from '@/components/ui/WarriorBadge';
import {
  MessageSquare,
  Compass,
  Play,
  FileText,
  History,
  Users,
  Shield,
  Bot,
  Key,
  LogOut,
} from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useSession();
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // If loading session, show premium spinner page
  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-display text-ink-soft text-sm italic select-none">
          Подключение к Ковчегу...
        </p>
      </div>
    );
  }

  // If not authenticated, let middleware redirect
  if (!isAuthenticated || !user) {
    return null;
  }

  const isAdmin = user.role === 'ADMIN';
  const isWarrior = user.role === 'WARRIOR' || user.role === 'MASTER' || user.role === 'ADMIN';

  // Navigation Items
  const navItems = [
    { label: 'Чаты', href: ROUTES.chats, icon: MessageSquare },
    { label: 'Навигатор', href: ROUTES.navigator, icon: Compass },
    { label: 'Видео', href: ROUTES.video, icon: Play },
    { label: 'Материалы', href: ROUTES.materials, icon: FileText },
    { label: 'Летописи', href: ROUTES.chronicles, icon: History },
  ];

  // Admin Items
  const adminItems = [
    { label: 'Участники', href: ROUTES.admin.users, icon: Users },
    { label: 'Роли и Права', href: ROUTES.admin.roles, icon: Shield },
    { label: 'Боты', href: ROUTES.admin.bots, icon: Bot },
    { label: 'Сервисы', href: ROUTES.admin.services, icon: Key },
  ];

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  const isActive = (href: string) => {
    if (href === ROUTES.chats) {
      return pathname.startsWith('/chats');
    }
    if (href === ROUTES.admin.users) {
      return pathname.startsWith('/admin/users');
    }
    return pathname === href;
  };

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-bg-warm border-r border-line flex flex-col flex-shrink-0 select-none">
        {/* Header */}
        <div className="p-6 border-b border-line flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D0C6B0] to-[#AFA690] text-[#5F5848] font-display font-bold flex items-center justify-center">
            К
          </div>
          <div>
            <h2 className="font-display font-semibold text-base text-ink leading-tight">
              Ковчег
            </h2>
            <p className="font-mono text-[9px] text-ink-faint tracking-wider uppercase">
              Web Version
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-1">
          <span className="font-mono text-[9px] text-ink-faint tracking-wider uppercase px-3 mb-2 block">
            Основное
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-xs font-medium tracking-normal text-left transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-ink-soft hover:bg-line-soft hover:text-ink'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-amber-bright' : 'text-ink-faint'}`} />
                {item.label}
              </button>
            );
          })}

          {/* Admin Panel Sections */}
          {isAdmin && (
            <div className="mt-8 flex flex-col gap-1">
              <span className="font-mono text-[9px] text-amber tracking-wider uppercase px-3 mb-2 block font-semibold">
                Администрирование
              </span>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-xs font-medium text-left transition-all duration-200 cursor-pointer ${
                      active
                        ? 'bg-amber text-white shadow-sm'
                        : 'text-ink-soft hover:bg-amber-wash/50 hover:text-amber'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-ink-faint'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Footer Profile & Logout */}
        <div className="p-4 border-t border-line bg-bg flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar
              name={user.full_name || user.email}
              avatarUrl={user.avatar_url}
              isWarrior={isWarrior}
              isMe={true}
              size="sm"
            />
            <div className="flex-1 min-width-0 leading-tight">
              <div className="flex items-center gap-1">
                <span className="font-display font-bold text-xs text-ink truncate max-w-[120px]">
                  {user.full_name || 'Пользователь'}
                </span>
                {isWarrior && <WarriorBadge />}
              </div>
              <span className="font-mono text-[9px] text-ink-soft block uppercase tracking-wider">
                {user.role}
              </span>
            </div>
            <button
              onClick={() => logout()}
              title="Выйти из системы"
              className="p-2 rounded-lg hover:bg-line-soft text-ink-soft hover:text-amber transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-bg relative">
        {children}
      </main>
    </div>
  );
}
