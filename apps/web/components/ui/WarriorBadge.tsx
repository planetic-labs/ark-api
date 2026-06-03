import React from 'react';
import { WARRIOR_MARKER } from '@/constants/roles';

export function WarriorBadge() {
  return (
    <span className="text-amber font-bold select-none px-0.5" title="Воин">
      {WARRIOR_MARKER}
    </span>
  );
}
