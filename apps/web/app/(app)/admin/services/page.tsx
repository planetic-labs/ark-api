'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/services/api/users';
import { Plus, Key, Copy, Check, Eye, Trash2, X, RefreshCw } from 'lucide-react';

export default function ServicesAdminPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read:chats', 'write:messages']);
  
  // Single-use token display states
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch services
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: usersApi.listServices,
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: (data: { name: string; scopes: string[] }) =>
      usersApi.createService(data.name, data.scopes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setGeneratedToken(data.token);
      setNewName('');
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.message || 'Ошибка создания сервисного клиента');
    },
  });

  // Revoke service mutation
  const revokeServiceMutation = useMutation({
    mutationFn: (id: string) => usersApi.revokeService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  // Activate service mutation
  const activateServiceMutation = useMutation({
    mutationFn: (id: string) => usersApi.activateService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newName.trim()) {
      setFormError('Укажите название сервиса');
      return;
    }
    createServiceMutation.mutate({
      name: newName.trim(),
      scopes: selectedScopes,
    });
  };

  const handleCopy = () => {
    if (!generatedToken) return;
    navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  const scopesList = [
    { key: 'read:chats', desc: 'Чтение чатов и списка сообщений' },
    { key: 'write:messages', desc: 'Отправка сообщений' },
    { key: 'manage:users', desc: 'Управление пользователями' },
    { key: 'manage:roles', desc: 'Управление ролями и правами' },
    { key: 'transcribe', desc: 'Доступ к транскрипции' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6 select-none">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">
            Интеграции и Сервисные Клиенты
          </h1>
          <p className="font-mono text-[10px] text-ink-soft tracking-wider uppercase mt-1">
            Управление токенами доступа для ботов и внешних систем
          </p>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setGeneratedToken(null);
            setCopied(false);
            setFormError('');
          }}
          className="flex items-center gap-2 bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl px-4 py-3 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Создать клиента
        </button>
      </div>

      {/* Services List / Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-amber border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-bg border border-line rounded-2xl p-12 text-center select-none">
          <Key className="w-12 h-12 text-ink-faint mx-auto mb-3" />
          <h3 className="font-display font-semibold text-base text-ink">Нет активных интеграций</h3>
          <p className="font-body text-xs text-ink-soft mt-1">Создайте первого сервисного клиента для доступа по API</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {services.map((s) => (
            <div
              key={s.id}
              className={`bg-bg border border-line rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 ${
                !s.is_active ? 'opacity-65 bg-bg-warm/30' : ''
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${s.is_active ? 'bg-amber-wash/50 text-amber' : 'bg-line-soft text-ink-soft'}`}>
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink leading-tight">
                      {s.name}
                    </h3>
                    <p className="font-mono text-[9px] text-ink-soft mt-0.5 uppercase tracking-wider">
                      ID: {s.id}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 text-[9px] font-mono rounded-full uppercase border font-semibold select-none ${
                    s.is_active
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {s.is_active ? 'Активен' : 'Отозван'}
                </span>
              </div>

              {/* Scopes & info */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1">
                  {s.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="px-2 py-0.5 bg-line-soft text-ink font-mono text-[9px] rounded-lg"
                    >
                      {scope}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-ink-soft border-t border-line-soft pt-2.5 mt-1 select-none">
                  <span>Создан: {new Date(s.created_at).toLocaleDateString('ru-RU')}</span>
                  <span>Использован: {s.last_used_at ? new Date(s.last_used_at).toLocaleDateString('ru-RU') : 'Никогда'}</span>
                </div>
              </div>

              {/* Card actions */}
              <div className="flex items-center justify-end border-t border-line-soft pt-3 mt-1">
                {s.is_active ? (
                  <button
                    onClick={() => revokeServiceMutation.mutate(s.id)}
                    disabled={revokeServiceMutation.isPending}
                    className="flex items-center gap-1.5 text-xs text-amber font-semibold hover:text-amber-bright cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Отозвать токен
                  </button>
                ) : (
                  <button
                    onClick={() => activateServiceMutation.mutate(s.id)}
                    disabled={activateServiceMutation.isPending}
                    className="flex items-center gap-1.5 text-xs text-green-700 font-semibold hover:text-green-800 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Активировать
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Service Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-[480px] bg-bg border border-line rounded-[28px] p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-ink">
                  Создать Сервисного Клиента
                </h3>
                <p className="font-mono text-[9px] text-ink-soft tracking-wider uppercase mt-0.5">
                  Регистрация внешнего приложения или бота
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-line-soft text-ink-soft hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Generated token screen */}
            {generatedToken ? (
              <div className="flex flex-col gap-4">
                <div className="bg-amber-wash border border-amber/20 rounded-2xl p-4 flex flex-col gap-2 select-text">
                  <p className="font-display text-xs text-amber font-semibold leading-normal select-none">
                    ⚠️ Сохраните этот токен! Он показывается только один раз. Вы больше не сможете его увидеть.
                  </p>
                  
                  <div className="flex items-center justify-between gap-3 bg-bg border border-line rounded-xl px-3 py-2.5 mt-2">
                    <span className="font-mono text-xs text-ink truncate select-all">{generatedToken}</span>
                    <button
                      onClick={handleCopy}
                      type="button"
                      className="p-2 rounded-lg hover:bg-line-soft text-ink-soft hover:text-ink cursor-pointer flex-shrink-0"
                    >
                      {copied ? <Check className="w-4.5 h-4.5 text-green-600" /> : <Copy className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl px-5 py-3 cursor-pointer"
                  >
                    Готово
                  </button>
                </div>
              </div>
            ) : (
              /* Input Form screen */
              <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-ink-soft">
                    Название сервиса / Имя бота
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Например: Бот-транскрибатор"
                    className="w-full bg-bg-warm border border-line rounded-xl px-3 py-2.5 text-xs text-ink outline-none focus:border-amber select-text"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className="text-[11px] font-semibold text-ink-soft">
                    Scopes (Разрешения)
                  </label>
                  <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto bg-bg-warm/50 border border-line rounded-xl p-3">
                    {scopesList.map((scope) => {
                      const checked = selectedScopes.includes(scope.key);
                      return (
                        <button
                          key={scope.key}
                          type="button"
                          onClick={() => toggleScope(scope.key)}
                          className="flex items-center gap-2.5 py-1.5 text-left cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="w-3.5 h-3.5 rounded text-amber border-line focus:ring-amber"
                          />
                          <div className="leading-tight">
                            <span className="font-mono text-[10px] text-ink font-semibold">{scope.key}</span>
                            <p className="text-[9px] text-ink-soft">{scope.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {formError && (
                  <div className="text-[11px] text-amber font-medium bg-amber-wash rounded-xl px-3 py-2">
                    {formError}
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
                    disabled={createServiceMutation.isPending}
                    className="bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl px-5 py-2.5 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all cursor-pointer"
                  >
                    {createServiceMutation.isPending ? 'Создание...' : 'Создать'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
