/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  FileWarning,
  X,
  ChevronDown,
  DownloadCloud,
} from 'lucide-react';

export type SyncStatusType = 'synced' | 'syncing' | 'error' | 'offline' | 'rejected' | 'schema_mismatch';

export interface ServerStatusIndicatorProps {
  syncStatus?: SyncStatusType;
  isServerConnected?: boolean;
  onSyncServer?: () => void;
  onForceRefreshFromCloud?: () => void;
  lastSavedTime?: Date | null;
  className?: string;
}

export const ServerStatusIndicator: React.FC<ServerStatusIndicatorProps> = ({
  syncStatus = 'synced',
  isServerConnected = true,
  onSyncServer,
  onForceRefreshFromCloud,
  lastSavedTime,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSyncing = syncStatus === 'syncing';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Status configuration mappings
  const getStatusConfig = () => {
    if (!isServerConnected || syncStatus === 'offline') {
      return {
        label: 'Офлайн',
        title: 'Автономний режим / Немає зв’язку',
        desc: 'Відсутнє інтернет-з’єднання або сервер недоступний.',
        classes: 'bg-stone-200 hover:bg-stone-300 text-stone-700 border-stone-300',
        badgeClasses: 'bg-stone-100 text-stone-700 border-stone-200',
        icon: <CloudOff size={14} className="text-stone-500 shrink-0" />,
      };
    }
    if (syncStatus === 'rejected') {
      return {
        label: 'Доступ відхилено',
        title: 'Помилка прав доступу (Firestore Rejected)',
        desc: 'Доступ до бази даних заблоковано правилами безпеки (Missing or insufficient permissions).',
        classes: 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300',
        badgeClasses: 'bg-rose-50 text-rose-800 border-rose-200',
        icon: <ShieldAlert size={14} className="text-rose-600 shrink-0 animate-bounce" />,
      };
    }
    if (syncStatus === 'schema_mismatch') {
      return {
        label: 'Зміна схеми',
        title: 'Невідповідність схеми документа',
        desc: 'Структура даних у хмарі змінилася або несумісна із поточною версією програми.',
        classes: 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300',
        badgeClasses: 'bg-amber-50 text-amber-900 border-amber-200',
        icon: <FileWarning size={14} className="text-amber-600 shrink-0" />,
      };
    }
    if (syncStatus === 'error') {
      return {
        label: 'Помилка зв’язку',
        title: 'Помилка синхронізації з хмарою',
        desc: 'Не вдалося передати зміни до бази даних. Спробуйте синхронізувати знову.',
        classes: 'bg-orange-100 hover:bg-orange-200 text-orange-900 border-orange-300',
        badgeClasses: 'bg-orange-50 text-orange-900 border-orange-200',
        icon: <AlertTriangle size={14} className="text-orange-600 shrink-0" />,
      };
    }
    if (isSyncing) {
      return {
        label: 'Синхронізація...',
        title: 'Передача даних...',
        desc: 'Збереження змін та синхронізація з хмарою у процесі...',
        classes: 'bg-sky-100 text-sky-900 border-sky-300 cursor-wait',
        badgeClasses: 'bg-sky-50 text-sky-900 border-sky-200',
        icon: <RefreshCw size={13} className="text-sky-600 animate-spin shrink-0" />,
      };
    }
    return {
      label: 'Збережено',
      title: 'Синхронізовано з хмарою',
      desc: 'Зв’язок із Firestore та сервером стабільний. Усі зміни надійно збережено.',
      classes: 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-200',
      badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: <Cloud size={14} className="text-emerald-600 shrink-0" />,
    };
  };

  const currentConfig = getStatusConfig();

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-8 px-2.5 sm:px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer select-none active:scale-95 shadow-2xs ${currentConfig.classes} ${className}`}
        title="Стан підключення та хмарної синхронізації"
        aria-label={`Стан підключення: ${currentConfig.label}`}
        aria-expanded={isOpen}
      >
        <span className="shrink-0 flex items-center justify-center">{currentConfig.icon}</span>
        <span className="hidden sm:inline text-[11.5px] font-bold tracking-tight">
          {currentConfig.label}
        </span>
        <ChevronDown size={12} className={`transition-transform duration-200 text-stone-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Status Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-10 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-stone-200/90 p-4 z-50 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${currentConfig.badgeClasses}`}>
                {currentConfig.icon}
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900 leading-tight">{currentConfig.title}</h4>
                <span className="text-[10.5px] text-stone-500 font-medium">
                  {lastSavedTime
                    ? `Останнє збереження: ${lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : 'Хмарний синхронізатор активний'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            >
              <X size={15} />
            </button>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-xl border border-stone-100">
            {currentConfig.desc}
          </p>

          <div className="space-y-1.5 pt-1">
            {/* Sync Now Button */}
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => {
                onSyncServer?.();
                setIsOpen(false);
              }}
              className="w-full h-9 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>Синхронізувати зараз</span>
            </button>

            {/* Force Refresh from Cloud Button */}
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => {
                onForceRefreshFromCloud?.();
                setIsOpen(false);
              }}
              className="w-full h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <DownloadCloud size={14} className="text-emerald-700" />
              <span>Примусове оновлення з хмари</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
