import React from 'react';

interface AvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  isWarrior?: boolean;
  isMe?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({
  name = '',
  avatarUrl,
  isWarrior = false,
  isMe = false,
  size = 'md',
}: AvatarProps) {
  // Sizing styles matching mockup sizes
  const sizeClasses = {
    sm: 'w-[30px] h-[30px] text-[12px] min-w-[30px]',
    md: 'w-[38px] h-[38px] text-[15px] min-w-[38px]',
    lg: 'w-[46px] h-[46px] text-[17px] min-w-[46px]',
  };

  // Ring classes for Warriors
  const ringClasses = isWarrior
    ? 'ring-2 ring-bg ring-offset-2 ring-offset-bg ring-amber-bright shadow-[0_0_0_2px_#FCFAF5,0_0_0_4px_#E0951A]'
    : '';

  // Get initials (max 2 characters)
  const getInitials = (userName: string) => {
    if (!userName) return 'U';
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Avatar'}
        className={`rounded-full object-cover ${sizeClasses[size]} ${ringClasses}`}
      />
    );
  }

  // Backing color/gradient
  const bgClass = isMe
    ? 'bg-gradient-to-br from-[#D0C6B0] to-[#AFA690] text-[#5F5848]'
    : 'bg-[#DCD5C7] text-[#7A715F]';

  return (
    <div
      className={`rounded-full flex items-center justify-center font-display font-semibold select-none ${bgClass} ${sizeClasses[size]} ${ringClasses}`}
    >
      {getInitials(name || '')}
    </div>
  );
}
export default Avatar;
