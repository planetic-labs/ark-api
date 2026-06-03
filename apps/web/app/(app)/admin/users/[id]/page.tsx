'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/services/api/users';
import { rolesApi } from '@/services/api/roles';
import Avatar from '@/components/ui/Avatar';
import { WarriorBadge } from '@/components/ui/WarriorBadge';
import { useRouter, useParams } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { ArrowLeft, Save, Trash2, CheckSquare, Square } from 'lucide-react';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // Deactivation process states
  const [deactivateStep, setDeactivateStep] = useState(0); // 0 = idle, 1 = confirm input
  const [confirmName, setConfirmName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch target user data
  const { data: user, isLoading: isUserLoading, error: userError } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.get(userId),
    enabled: !!userId,
  });

  // Fetch all permissions in system
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApi.listPermissions,
  });

  // Fetch all roles in system
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
  });

  // Populate state when user data is loaded
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setAvatarUrl(user.avatar_url || '');
      setSelectedRoles(user.roles || []);
      setSelectedPermissions((user as any).personal_permissions || []);
    }
  }, [user]);

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (data: any) => usersApi.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccessMessage('Профиль успешно обновлен!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Ошибка при обновлении профиля');
    },
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: () => usersApi.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      router.push(ROUTES.admin.users);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Ошибка при отключении участника');
      setDeactivateStep(0);
      setConfirmName('');
    },
  });

  if (isUserLoading) {
    return (
      <div className="h-full w-full bg-bg flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-amber border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <h3 className="font-display font-semibold text-lg text-ink">Участник не найден</h3>
        <button
          onClick={() => router.push(ROUTES.admin.users)}
          className="mt-4 inline-flex items-center gap-2 text-xs text-amber font-semibold hover:text-amber-bright cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Вернуться к списку
        </button>
      </div>
    );
  }

  const handleSave = () => {
    setErrorMessage('');
    setSuccessMessage('');
    updateUserMutation.mutate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      avatar_url: avatarUrl.trim() || null,
      roles: selectedRoles,
      personal_permissions: selectedPermissions,
    });
  };

  const toggleRole = (roleName: string) => {
    if (selectedRoles.includes(roleName)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== roleName));
    } else {
      setSelectedRoles([...selectedRoles, roleName]);
    }
  };

  const togglePermission = (permKey: string) => {
    if (selectedPermissions.includes(permKey)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permKey));
    } else {
      setSelectedPermissions([...selectedPermissions, permKey]);
    }
  };

  const handleDeactivate = () => {
    if (deactivateStep === 0) {
      setDeactivateStep(1);
    } else {
      if (confirmName.trim() === (user.full_name || '').trim()) {
        deactivateUserMutation.mutate();
      } else {
        setErrorMessage('Введенное имя не совпадает с именем участника');
      }
    }
  };

  const isDeactivationConfirmed = confirmName.trim() === (user.full_name || '').trim();
  const isWarrior = user.role === 'WARRIOR' || user.role === 'MASTER' || user.role === 'ADMIN';

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Back to list and Title */}
      <div className="flex flex-col gap-4 border-b border-line pb-6">
        <button
          onClick={() => router.push(ROUTES.admin.users)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft hover:text-ink transition-all cursor-pointer select-none self-start"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
          Назад к списку участников
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-4">
            <Avatar
              name={user.full_name || user.email}
              avatarUrl={user.avatar_url}
              isWarrior={isWarrior}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-bold text-2xl text-ink">
                  {user.full_name || 'Без имени'}
                </h1>
                {isWarrior && <WarriorBadge />}
              </div>
              <p className="font-mono text-[10px] text-ink-soft tracking-wider uppercase">
                ID: {user.id} · Email: {user.email}
              </p>
            </div>
          </div>
          
          {user.is_active && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={updateUserMutation.isPending}
                className="flex items-center gap-2 bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl px-4 py-3 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Сохранить профиль
              </button>
            </div>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3 font-medium">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="text-xs text-amber bg-amber-wash border border-amber/20 rounded-xl px-4 py-3 font-medium">
          {errorMessage}
        </div>
      )}

      {/* Main card panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: General Profile Data */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="bg-bg border border-line rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="font-display font-semibold text-base text-ink select-none">
              Личные данные
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-ink-soft select-none">Имя</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!user.is_active}
                  className="w-full bg-bg-warm border border-line rounded-xl px-4 py-2.5 text-xs text-ink outline-none focus:border-amber"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-ink-soft select-none">Фамилия</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!user.is_active}
                  className="w-full bg-bg-warm border border-line rounded-xl px-4 py-2.5 text-xs text-ink outline-none focus:border-amber"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-ink-soft select-none">Ссылка на Аватар</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                disabled={!user.is_active}
                className="w-full bg-bg-warm border border-line rounded-xl px-4 py-2.5 text-xs text-ink outline-none focus:border-amber"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-line-soft font-mono text-[10px] text-ink-soft select-none">
              <div>
                Статус: <strong className="text-ink">{user.is_active ? (user.is_approved ? 'Активен' : 'Ожидает одобрения') : 'Отключен'}</strong>
              </div>
              <div>
                Зарегистрирован: <strong className="text-ink">{new Date(user.created_at).toLocaleDateString('ru-RU')}</strong>
              </div>
            </div>
          </div>

          {/* Personal Permissions section */}
          <div className="bg-bg border border-line rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h3 className="font-display font-semibold text-base text-ink select-none">
                Персональные права (поверх ролей)
              </h3>
              <p className="font-mono text-[9px] text-ink-soft tracking-normal mt-0.5 select-none">
                Индивидуальные привилегии, выданные этому конкретному пользователю в обход его ролей
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {permissions.map((p) => {
                const checked = selectedPermissions.includes(p.key);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!user.is_active}
                    onClick={() => togglePermission(p.key)}
                    className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-line-soft/40 text-left transition-all cursor-pointer disabled:opacity-50"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-faint mt-0.5 flex-shrink-0" />
                    )}
                    <div className="leading-tight">
                      <span className="font-mono text-xs text-ink font-semibold">{p.key}</span>
                      {p.description && (
                        <p className="text-[10px] text-ink-soft mt-0.5">{p.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Roles assignments & Dangerous Actions */}
        <div className="flex flex-col gap-6">
          {/* Roles Checkboxes */}
          <div className="bg-bg border border-line rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="font-display font-semibold text-base text-ink select-none">
              Назначенные роли
            </h3>

            <div className="flex flex-col gap-2">
              {['STUDENT', 'WARRIOR', 'MASTER', 'ADMIN'].map((rName) => {
                const checked = selectedRoles.some((sr) => sr.toLowerCase() === rName.toLowerCase());
                return (
                  <button
                    key={rName}
                    type="button"
                    disabled={!user.is_active}
                    onClick={() => toggleRole(rName)}
                    className="flex items-center justify-between p-3 rounded-xl border border-line hover:border-amber transition-all text-left cursor-pointer disabled:opacity-50"
                  >
                    <span className="font-body text-xs text-ink font-medium">
                      {rName === 'ADMIN' ? 'Администратор' : rName === 'MASTER' ? 'Мастер' : rName === 'WARRIOR' ? 'Воин' : 'Ученик'}
                    </span>
                    {checked ? (
                      <CheckSquare className="w-4.5 h-4.5 text-amber" />
                    ) : (
                      <Square className="w-4.5 h-4.5 text-ink-faint" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Danger zone / Block profile */}
          <div className="bg-bg border border-amber/20 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="font-display font-semibold text-base text-amber select-none">
              Опасная зона
            </h3>

            {user.is_active ? (
              <div className="flex flex-col gap-3">
                {deactivateStep === 0 ? (
                  <>
                    <p className="text-[11px] text-ink-soft leading-normal">
                      Отключение заблокирует доступ к системе, удалит все сессии, но сохранит историю сообщений и отчетов.
                    </p>
                    <button
                      onClick={handleDeactivate}
                      className="flex items-center justify-center gap-2 w-full bg-amber-wash hover:bg-amber/15 text-amber font-body font-semibold text-xs rounded-xl py-3 border border-amber/35 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Отключить участника
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-[11px] text-ink font-semibold leading-normal bg-amber-wash rounded-xl p-3 border border-amber/20">
                      Для подтверждения введите имя участника: <strong className="underline">{user.full_name}</strong>
                    </p>
                    <input
                      type="text"
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder="Введите имя..."
                      className="w-full bg-bg-warm border border-line rounded-xl px-3 py-2.5 text-xs text-ink outline-none focus:border-amber"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDeactivateStep(0);
                          setConfirmName('');
                        }}
                        className="flex-1 bg-line-soft hover:bg-line text-ink-soft font-body font-semibold text-xs rounded-xl py-2.5 transition-all cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={handleDeactivate}
                        disabled={!isDeactivationConfirmed || deactivateUserMutation.isPending}
                        className="flex-1 bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl py-2.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        {deactivateUserMutation.isPending ? 'Отключение...' : 'Подтвердить'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-ink-soft italic text-center select-none py-2">
                Данный аккаунт отключён
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
