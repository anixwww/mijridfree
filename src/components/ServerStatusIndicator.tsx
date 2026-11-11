import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Check } from 'lucide-react';

export interface ServerStatusIndicatorProps {
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
  isServerConnected?: boolean;
  onSyncServer?: () => void;
  className?: string;
}

export const ServerStatusIndicator: React.FC<ServerStatusIndicatorProps> = ({
  syncStatus = 'synced',
  isServerConnected = true,
  onSyncServer,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isOk = isServerConnected && syncStatus !== 'offline' && syncStatus !== 'error';
  const isSyncing = syncStatus === 'syncing';

  // Static config based on status (No background animation, no circle dot)
  const config = !isOk
    ? {
        label: 'Офлайн',
        tooltip: "Немає зв'язку із сервером. Натисніть для перепідключення.",
        containerClasses:
          'bg-rose-950/50 hover:bg-rose-900/60 light-theme:bg-rose-50 light-theme:hover:bg-rose-100 text-rose-300 light-theme:text-rose-700 border-rose-800/70 light-theme:border-rose-200',
        icon: <CloudOff size={14} className="text-rose-400 light-theme:text-rose-600 shrink-0" />,
      }
    : isSyncing
    ? {
        label: 'Синхронізація...',
        tooltip: 'Збереження змін на сервері...',
        containerClasses:
          'bg-amber-950/50 light-theme:bg-amber-50 text-amber-300 light-theme:text-amber-700 border-amber-800/70 light-theme:border-amber-200 cursor-wait',
        icon: <RefreshCw size={13} className="text-amber-400 light-theme:text-amber-600 animate-spin shrink-0" />,
      }
    : {
        label: 'Збережено',
        tooltip: "Зв'язок із сервером стабільний. Натисніть для ручної синхронізації.",
        containerClasses:
          'bg-stone-800/80 hover:bg-stone-700/80 light-theme:bg-stone-100/90 light-theme:hover:bg-stone-200/90 text-stone-200 light-theme:text-stone-800 border-stone-700/80 light-theme:border-stone-200',
        icon: isHovered ? (
          <RefreshCw size={13} className="text-emerald-400 light-theme:text-emerald-600 transition-transform group-hover:rotate-180 duration-500 shrink-0" />
        ) : (
          <Cloud size={14} className="text-emerald-400 light-theme:text-emerald-600 shrink-0" />
        ),
      };

  return (
    <button
      type="button"
      onClick={onSyncServer}
      disabled={isSyncing}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`h-8 px-3 rounded-full border flex items-center gap-1.5 sm:gap-2 text-xs font-semibold transition-all duration-200 cursor-pointer select-none active:scale-95 shrink-0 group ${config.containerClasses} ${className}`}
      title={config.tooltip}
      aria-label={`Стан підключення: ${config.label}`}
    >
      {/* Status Icon */}
      <span className="shrink-0 flex items-center justify-center">
        {config.icon}
      </span>

      {/* Status Label */}
      <span className="hidden sm:inline text-[11.5px] font-semibold tracking-tight">
        {config.label}
      </span>
    </button>
  );
};
