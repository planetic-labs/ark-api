'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi, Role } from '@/services/api/roles';
import { Plus, Shield, Check, Trash2, CheckSquare, Square } from 'lucide-react';

export default function RolesAdminPage() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRolePermissions, setEditRolePermissions] = useState<string[]>([]);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch roles
  const { data: roles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
  });

  // Fetch permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApi.listPermissions,
  });

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  // Sync edit form when selected role changes
  React.useEffect(() => {
    if (selectedRole) {
      setEditRoleName(selectedRole.name);
      setEditRolePermissions(selectedRole.permissions || []);
      setIsCreatingNew(false);
    }
  }, [selectedRole]);

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; permissions: string[] }) =>
      rolesApi.create(data.name, data.permissions),
    onSuccess: (newRole) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSuccessMsg(`Роль "${newRole.name}" успешно создана!`);
      setIsCreatingNew(false);
      setSelectedRoleId(newRole.id);
      setNewRoleName('');
      setNewRolePermissions([]);
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Ошибка при создании роли');
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: (data: { id: string; name: string; permissions: string[] }) =>
      rolesApi.update(data.id, data.name, data.permissions),
    onSuccess: (updatedRole) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSuccessMsg(`Роль "${updatedRole.name}" успешно обновлена!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Ошибка при обновлении роли');
    },
  });

  // Make default role mutation
  const makeDefaultRoleMutation = useMutation({
    mutationFn: (id: string) => rolesApi.makeDefault(id),
    onSuccess: (updatedRole) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSuccessMsg(`Роль "${updatedRole.name}" теперь выдается по умолчанию!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Ошибка при смене роли по умолчанию');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newRoleName.trim()) {
      setErrorMsg('Введите название роли');
      return;
    }
    createRoleMutation.mutate({
      name: newRoleName.trim(),
      permissions: newRolePermissions,
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedRoleId || !editRoleName.trim()) return;
    updateRoleMutation.mutate({
      id: selectedRoleId,
      name: editRoleName.trim(),
      permissions: editRolePermissions,
    });
  };

  const toggleNewPermission = (key: string) => {
    if (newRolePermissions.includes(key)) {
      setNewRolePermissions(newRolePermissions.filter((p) => p !== key));
    } else {
      setNewRolePermissions([...newRolePermissions, key]);
    }
  };

  const toggleEditPermission = (key: string) => {
    if (editRolePermissions.includes(key)) {
      setEditRolePermissions(editRolePermissions.filter((p) => p !== key));
    } else {
      setEditRolePermissions([...editRolePermissions, key]);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6 select-none">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">
            Управление Ролями и Правами
          </h1>
          <p className="font-mono text-[10px] text-ink-soft tracking-wider uppercase mt-1">
            Конфигурация глобальных ролей доступа и назначение прав по умолчанию
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreatingNew(true);
            setSelectedRoleId(null);
            setNewRoleName('');
            setNewRolePermissions([]);
            setErrorMsg('');
          }}
          className="flex items-center gap-2 bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl px-4 py-3 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all cursor-pointer select-none active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Создать роль
        </button>
      </div>

      {successMsg && (
        <div className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3 font-medium">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="text-xs text-amber bg-amber-wash border border-amber/20 rounded-xl px-4 py-3 font-medium">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Side: Roles list */}
        <div className="bg-bg border border-line rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="font-display font-semibold text-sm text-ink select-none">
            Список ролей
          </h3>
          {isRolesLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {roles.map((r) => {
                const active = r.id === selectedRoleId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                      active
                        ? 'border-amber bg-amber-wash/30 text-amber shadow-sm font-semibold'
                        : 'border-line hover:bg-line-soft/40 text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${active ? 'text-amber' : 'text-ink-faint'}`} />
                      <span className="font-body text-xs">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.is_default && (
                        <span className="px-2 py-0.5 border border-amber/30 text-amber bg-amber-wash text-[9px] font-mono rounded-full select-none uppercase">
                          Дефолт
                        </span>
                      )}
                      {r.is_system && (
                        <span className="px-2 py-0.5 border border-line bg-line-soft text-ink-soft text-[9px] font-mono rounded-full select-none uppercase">
                          Системная
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Role detail/creation */}
        <div className="md:col-span-2">
          {/* Creation panel */}
          {isCreatingNew && (
            <form onSubmit={handleCreateSubmit} className="bg-bg border border-line rounded-2xl p-6 flex flex-col gap-5">
              <div className="flex justify-between items-center border-b border-line-soft pb-4">
                <div>
                  <h3 className="font-display font-semibold text-base text-ink select-none">
                    Создание новой роли
                  </h3>
                  <p className="font-mono text-[9px] text-ink-soft tracking-wider uppercase mt-0.5">
                    Укажите название и набор разрешений
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-ink-soft select-none">Название роли</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Например: Куратор"
                  className="w-full bg-bg-warm border border-line rounded-xl px-4 py-2.5 text-xs text-ink outline-none focus:border-amber"
                  required
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-semibold text-ink-soft select-none">Разрешения роли</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-bg-warm/50 border border-line rounded-xl p-4">
                  {permissions.map((p) => {
                    const checked = newRolePermissions.includes(p.key);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleNewPermission(p.key)}
                        className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-line-soft text-left transition-all cursor-pointer"
                      >
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-ink-faint mt-0.5 flex-shrink-0" />
                        )}
                        <div className="leading-tight">
                          <span className="font-mono text-[11px] text-ink font-semibold">{p.key}</span>
                          {p.description && (
                            <p className="text-[9px] text-ink-soft mt-0.5">{p.description}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="bg-transparent hover:bg-line-soft text-ink-soft font-body font-medium text-xs rounded-xl px-4 py-2.5 transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createRoleMutation.isPending}
                  className="bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl px-5 py-2.5 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all cursor-pointer"
                >
                  {createRoleMutation.isPending ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          )}

          {/* Edit/View panel */}
          {selectedRole && (
            <form onSubmit={handleUpdateSubmit} className="bg-bg border border-line rounded-2xl p-6 flex flex-col gap-5">
              <div className="flex justify-between items-center border-b border-line-soft pb-4">
                <div>
                  <h3 className="font-display font-semibold text-base text-ink select-none">
                    Детали роли: {selectedRole.name}
                  </h3>
                  <p className="font-mono text-[9px] text-ink-soft tracking-wider uppercase mt-0.5">
                    {selectedRole.is_system ? 'Просмотр системной роли (редактирование заблокировано)' : 'Редактирование параметров роли'}
                  </p>
                </div>
                
                {!selectedRole.is_default && (
                  <button
                    type="button"
                    disabled={makeDefaultRoleMutation.isPending}
                    onClick={() => makeDefaultRoleMutation.mutate(selectedRole.id)}
                    className="flex items-center gap-1.5 text-xs text-amber font-semibold hover:text-amber-bright border border-amber/35 bg-amber-wash/30 px-3 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Сделать по умолчанию
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-ink-soft select-none">Название роли</label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  disabled={selectedRole.is_system || selectedRole.name.toLowerCase() === 'admin'}
                  className="w-full bg-bg-warm border border-line rounded-xl px-4 py-2.5 text-xs text-ink outline-none focus:border-amber disabled:opacity-60"
                  required
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-semibold text-ink-soft select-none">Разрешения роли</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-bg-warm/50 border border-line rounded-xl p-4">
                  {permissions.map((p) => {
                    const checked = editRolePermissions.includes(p.key);
                    const disabled = selectedRole.is_system || selectedRole.name.toLowerCase() === 'admin';
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleEditPermission(p.key)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg hover:bg-line-soft text-left transition-all cursor-pointer ${disabled ? 'opacity-70' : ''}`}
                      >
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-ink-faint mt-0.5 flex-shrink-0" />
                        )}
                        <div className="leading-tight">
                          <span className="font-mono text-[11px] text-ink font-semibold">{p.key}</span>
                          {p.description && (
                            <p className="text-[9px] text-ink-soft mt-0.5">{p.description}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {(!selectedRole.is_system && selectedRole.name.toLowerCase() !== 'admin') && (
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={updateRoleMutation.isPending}
                    className="bg-amber hover:bg-amber-bright text-white font-body font-semibold text-xs rounded-xl px-5 py-2.5 shadow-[0_4px_12px_rgba(185,119,12,0.15)] transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {updateRoleMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                </div>
              )}
            </form>
          )}

          {!isCreatingNew && !selectedRole && (
            <div className="bg-bg border border-line border-dashed rounded-2xl p-16 text-center select-none">
              <Shield className="w-12 h-12 text-ink-faint mx-auto mb-3" />
              <h3 className="font-display font-semibold text-base text-ink">Роль не выбрана</h3>
              <p className="font-body text-xs text-ink-soft mt-1">Выберите роль из списка слева для настройки или создайте новую</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
