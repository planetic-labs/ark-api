'use client';

import React, { useState } from 'react';
import { Compass, CheckCircle2, Circle, PlayCircle, Headphones, Link, ArrowRight } from 'lucide-react';

interface Material {
  id: string;
  type: 'video' | 'audio' | 'action' | 'link';
  title: string;
  description?: string;
  is_done: boolean;
}

interface Node {
  id: string;
  step: string;
  title: string;
  description: string;
  status: 'done' | 'active' | 'future';
  materials: Material[];
}

export default function NavigatorPage() {
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: 'node_1',
      step: 'Шаг 1',
      title: 'Тишина и Присутствие',
      description: 'Знакомство с базовым состоянием Работы. Удержание внимания в теле, остановка внутреннего диалога.',
      status: 'done',
      materials: [
        { id: 'mat_1_1', type: 'video', title: 'Введение в Работу · Понятие Присутствия', is_done: true },
        { id: 'mat_1_2', type: 'audio', title: 'Утренняя медитация на тишину', is_done: true },
      ],
    },
    {
      id: 'node_2',
      step: 'Шаг 2',
      title: 'Внимание как опора',
      description: 'Развитие концентрации. Упражнения на удержание внимания на объекте и его расширение на все тело.',
      status: 'active',
      materials: [
        { id: 'mat_2_1', type: 'video', title: 'Нарезка · Внимание как опора', description: 'Важно слушать до 14-й минуты', is_done: false },
        { id: 'mat_2_2', type: 'audio', title: 'Практика Гудения · Базовая инструкция', is_done: true },
        { id: 'mat_2_3', type: 'action', title: 'Отправить первый отчет в Инкубатор', is_done: false },
      ],
    },
    {
      id: 'node_3',
      step: 'Шаг 3',
      title: 'Работа с сопротивлением',
      description: 'Исследование механизмов ума, препятствующих тишине. Практика принятия и отпускания.',
      status: 'future',
      materials: [
        { id: 'mat_3_1', type: 'video', title: 'Механизмы психологической защиты', is_done: false },
        { id: 'mat_3_2', type: 'link', title: 'Статья на тему работы с умом в Brave-браузере', is_done: false },
      ],
    },
  ]);

  const toggleMaterialDone = (nodeId: string, materialId: string) => {
    setNodes(prev =>
      prev.map(node => {
        if (node.id !== nodeId) return node;

        const updatedMaterials = node.materials.map(m =>
          m.id === materialId ? { ...m, is_done: !m.is_done } : m
        );

        // Calculate if node status should change
        const allDone = updatedMaterials.every(m => m.is_done);
        let newStatus = node.status;
        if (allDone && node.status === 'active') {
          newStatus = 'done';
        } else if (!allDone && node.status === 'done') {
          newStatus = 'active';
        }

        return {
          ...node,
          status: newStatus,
          materials: updatedMaterials
        };
      })
    );
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircle className="w-4 h-4 text-amber" />;
      case 'audio': return <Headphones className="w-4 h-4 text-amber" />;
      case 'action': return <ArrowRight className="w-4 h-4 text-amber" />;
      default: return <Link className="w-4 h-4 text-amber" />;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-line pb-6 select-none">
        <h1 className="font-display font-bold text-2xl text-ink flex items-center gap-2">
          <Compass className="w-6 h-6 text-amber" />
          Навигатор Прогресса
        </h1>
        <p className="font-mono text-[10px] text-ink-soft tracking-wider uppercase mt-1">
          Последовательная траектория обучения, практик и видеоматериалов
        </p>
      </div>

      {/* Nodes Stream container */}
      <div className="flex flex-col gap-1 select-none">
        {nodes.map((node, index) => {
          const isDone = node.status === 'done';
          const isActive = node.status === 'active';
          const isFuture = node.status === 'future';

          return (
            <div key={node.id} className={`flex ${isFuture ? 'opacity-55' : ''}`}>
              {/* Rail logic */}
              <div className="flex flex-col items-center w-8 flex-shrink-0">
                {/* Dot */}
                <button
                  className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
                    isDone
                      ? 'bg-amber border-amber text-white shadow-sm'
                      : isActive
                      ? 'bg-bg border-amber-bright shadow-[0_0_0_3px_#FAF1DC]'
                      : 'bg-bg border-line'
                  }`}
                >
                  {isDone && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-bright animate-ping"></span>}
                </button>
                {/* Vert Line */}
                {index < nodes.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 my-1.5 ${
                      isDone ? 'bg-amber' : 'bg-line'
                    }`}
                  ></div>
                )}
              </div>

              {/* Node Body Card */}
              <div className="flex-1 pb-8 pl-4">
                <div className="leading-tight">
                  <span className="font-mono text-[10px] text-ink-faint uppercase tracking-wider block">
                    {node.step}
                  </span>
                  <h3 className={`font-display font-bold text-base mt-0.5 ${isDone ? 'text-ink-soft line-through' : 'text-ink'}`}>
                    {node.title} {isDone && '✓'}
                  </h3>
                  <p className="text-xs text-ink-soft mt-1.5 leading-relaxed font-body">
                    {node.description}
                  </p>
                </div>

                {/* Materials Card */}
                <div
                  className={`mt-4 bg-bg border rounded-2xl overflow-hidden max-w-xl transition-all duration-200 ${
                    isActive ? 'border-[#F0DFB8] shadow-md shadow-amber/5' : 'border-line'
                  }`}
                >
                  <div className="divide-y divide-line-soft">
                    {node.materials.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => toggleMaterialDone(node.id, m.id)}
                        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-line-soft/40 cursor-pointer transition-all duration-150"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-bg-warm border border-line flex items-center justify-center flex-shrink-0">
                            {getMaterialIcon(m.type)}
                          </div>
                          <div>
                            <span className="font-mono text-[8px] text-ink-faint uppercase block tracking-wider">
                              {m.type === 'video' ? 'Видео' : m.type === 'audio' ? 'Аудио' : m.type === 'action' ? 'Задание' : 'Ссылка'}
                            </span>
                            <span className={`text-xs font-medium font-body leading-tight ${m.is_done ? 'text-ink-soft line-through' : 'text-ink'}`}>
                              {m.title}
                            </span>
                            {m.description && (
                              <p className="text-[10px] text-ink-soft mt-0.5 font-body leading-tight">{m.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Status Checkbox */}
                        <div className="flex-shrink-0">
                          {m.is_done ? (
                            <div className="w-[18px] h-[18px] rounded-full bg-amber-bright text-white flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </div>
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full border-1.6 border-line"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
