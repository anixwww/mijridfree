import React, { useRef, useState, useEffect } from 'react';
import {
  Menu,
  X,
  FileUp,
  Download,
  ShieldCheck,
  Eye,
  BarChart3,
  Calendar,
  Heart,
  FolderTree,
  ChevronDown,
  Check,
  RotateCcw,
} from 'lucide-react';
import { ServerStatusIndicator } from './ServerStatusIndicator';
import { fetchServerTrees, MAIN_TREE_ID } from '../utils/fileStorage';

interface TopNavbarProps {
  isAdmin: boolean;
  onOpenAuthModal: () => void;
  onToggleAdminRole?: () => void;
  onOpenMyTrees?: () => void;
  currentTreeTitle?: string;
  currentTreeId?: string;
  isMainTree?: boolean;
  onReturnToMainTree?: () => void;
  onSelectTree?: (treeId: string) => void;
  onLoadJsonFile?: (file: File) => void;
  onExportImage: () => void;
  personCount: number;
  generationCount: number;
  onSyncServer?: () => void;
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
  isServerConnected?: boolean;
  onOpenAnalytics?: () => void;
  onOpenReactionsModal?: () => void;
  totalReactionsCount?: number;
  isCalendarOpen?: boolean;
  onToggleCalendar?: () => void;
  // Deprecated/kept optional for backwards compatibility
  onProposeCard?: () => void;
  notifications?: { id: string; type: 'new_card' | 'new_note'; personId?: string; personName: string; text: string; createdAt: string; read?: boolean }[];
  onSelectNotificationPerson?: (personId: string) => void;
  onClearNotifications?: () => void;
  onOpenShortcutsModal?: () => void;
  userPersonName?: string | null;
  onOpenUserIdentity?: () => void;
}

interface CanvasItem {
  id: string;
  title: string;
  personCount?: number;
  isMain?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  isAdmin,
  onOpenAuthModal,
  onToggleAdminRole,
  onOpenMyTrees,
  currentTreeTitle,
  currentTreeId,
  isMainTree = true,
  onReturnToMainTree,
  onSelectTree,
  onLoadJsonFile,
  onExportImage,
  personCount,
  generationCount,
  onSyncServer,
  syncStatus = 'synced',
  isServerConnected = true,
  onOpenAnalytics,
  onOpenReactionsModal,
  totalReactionsCount = 0,
  isCalendarOpen,
  onToggleCalendar,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCanvasDropdownOpen, setIsCanvasDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasList, setCanvasList] = useState<CanvasItem[]>([]);

  // Load list of available canvases/branches without any '+'
  const loadCanvases = async () => {
    const list: CanvasItem[] = [];

    // 1. Always include Main Tree
    list.push({
      id: MAIN_TREE_ID,
      title: 'Головне дерево',
      isMain: true,
      personCount: isMainTree ? personCount : undefined,
    });

    // 2. Read from localStorage index
    try {
      const raw = localStorage.getItem('rodovid_local_trees_index');
      if (raw) {
        const localList = JSON.parse(raw);
        if (Array.isArray(localList)) {
          for (const item of localList) {
            const isMain = item.id === MAIN_TREE_ID || item.id === 'default-tree' || item.id === 'main-tree';
            if (!isMain && !list.some((c) => c.id === item.id)) {
              list.push({
                id: item.id,
                title: item.title || 'Родове полотно',
                personCount: item.personCount,
                isMain: false,
              });
            }
          }
        }
      }
    } catch {}

    // 3. Read from server trees
    try {
      const serverTrees = await fetchServerTrees();
      if (Array.isArray(serverTrees)) {
        for (const st of serverTrees) {
          const isMain = st.id === MAIN_TREE_ID || st.id === 'default-tree' || st.id === 'main-tree';
          if (!isMain && !list.some((c) => c.id === st.id)) {
            list.push({
              id: st.id,
              title: st.title || 'Родове полотно',
              personCount: st.personCount,
              isMain: false,
            });
          }
        }
      }
    } catch {}

    // 4. Ensure active tree is present
    if (!isMainTree && currentTreeId && !list.some((c) => c.id === currentTreeId)) {
      list.push({
        id: currentTreeId,
        title: currentTreeTitle || 'Поточне полотно',
        personCount,
        isMain: false,
      });
    }

    setCanvasList(list);
  };

  useEffect(() => {
    loadCanvases();
  }, [currentTreeTitle, isMainTree, personCount, currentTreeId]);

  // Click outside listener for menu & canvas dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (canvasRef.current && !canvasRef.current.contains(e.target as Node)) {
        setIsCanvasDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setIsCanvasDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLoadJsonFile) {
      onLoadJsonFile(file);
      setIsMenuOpen(false);
    }
    e.target.value = '';
  };

  return (
    <header className="relative z-40 select-none">
      <div className="h-13 bg-white/95 backdrop-blur-xl border-b border-stone-200/80 px-3 sm:px-4 flex items-center justify-between gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        
        {/* Left Side: Redesigned Canvas Navigation */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Redesigned Canvas Navigation Dropdown */}
          <div ref={canvasRef} className="relative shrink-0">
            <button
              onClick={() => {
                setIsCanvasDropdownOpen((prev) => !prev);
                if (!isCanvasDropdownOpen) {
                  loadCanvases();
                }
              }}
              className={`h-8 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 border shrink-0 ${
                !isMainTree
                  ? 'px-2 bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 shadow-2xs'
                  : 'px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-900 border-stone-200/90 shadow-2xs'
              }`}
              title={isMainTree ? "Навігація між полотнами родоводу" : `Поточне полотно: ${currentTreeTitle || 'Полотно'}. Натисніть для перемикання.`}
              aria-label="Навігація між полотнами"
              aria-expanded={isCanvasDropdownOpen}
            >
              <FolderTree size={13} className={!isMainTree ? "text-amber-700 shrink-0" : "text-emerald-700 shrink-0"} />
              {isMainTree && (
                <span className="max-w-[85px] sm:max-w-[150px] truncate font-bold text-[11.5px]">
                  {currentTreeTitle || 'Головне дерево'}
                </span>
              )}
              <ChevronDown
                size={11}
                className={`text-stone-400 transition-transform ${isCanvasDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Canvas Dropdown Popover */}
            {isCanvasDropdownOpen && (
              <div className="absolute left-0 top-10 w-64 bg-white rounded-2xl shadow-2xl border border-stone-200/90 p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-2.5 py-1 flex items-center justify-between">
                  <span>Полотна та гілки</span>
                  <span className="text-stone-400 font-mono text-[10px]">{canvasList.length}</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {canvasList.map((c) => {
                    const isSelected = isMainTree ? c.isMain : c.id === currentTreeId;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          if (c.isMain && onReturnToMainTree) {
                            onReturnToMainTree();
                          } else if (onSelectTree) {
                            onSelectTree(c.id);
                          } else if (onOpenMyTrees) {
                            onOpenMyTrees();
                          }
                          setIsCanvasDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200 shadow-2xs'
                            : 'hover:bg-stone-100 text-stone-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderTree size={14} className={c.isMain ? "text-amber-600 shrink-0" : "text-stone-500 shrink-0"} />
                          <div className="min-w-0">
                            <div className="text-xs truncate">{c.title}</div>
                            {c.personCount !== undefined && (
                              <div className="text-[10px] text-stone-400 font-normal">
                                {c.personCount} осіб
                              </div>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="text-emerald-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {!isMainTree && onReturnToMainTree && (
            <button
              onClick={onReturnToMainTree}
              className="h-8 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer border border-stone-200 shrink-0"
              title="Повернутися до Головного дерева"
            >
              <RotateCcw size={12} className="text-stone-600" />
              <span className="hidden sm:inline text-[11px]">Головне</span>
            </button>
          )}
        </div>

        {/* Right Side: Server Status & Redesigned Minimal Master Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Server Status Indicator */}
          <ServerStatusIndicator
            syncStatus={syncStatus}
            isServerConnected={isServerConnected}
            onSyncServer={onSyncServer}
          />

          {/* ============================================================== */}
          {/* REDESIGNED MASTER MENU DROPDOWN                               */}
          {/* Тільки: Зміна на Адміна\Гість, Календар, Статистика, Реакції,  */}
          {/* Експорт та Імпорт. Усе решта прибрано.                         */}
          {/* Для Гостей: Календар, Статистика, Експорт та Імпорт.          */}
          {/* ============================================================== */}
          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`h-8 px-3 rounded-xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer select-none active:scale-95 shadow-xs ${
                isMenuOpen
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-200/90'
              }`}
              title="Головне меню"
              aria-label="Головне меню"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X size={15} /> : <Menu size={15} />}
              <span className="font-semibold text-xs">Меню</span>
            </button>

            {/* Redesigned Menu Dropdown */}
            {isMenuOpen && (
              <div className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-10 w-[calc(100vw-24px)] sm:w-72 max-w-sm bg-white rounded-2xl shadow-2xl border border-stone-200/90 p-2.5 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                
                {/* 1. Зміна на Адміна \ Гість (Однокліковий перемикач) */}
                <button
                  type="button"
                  onClick={() => {
                    if (isAdmin) {
                      if (onToggleAdminRole) onToggleAdminRole();
                    } else {
                      onOpenAuthModal();
                    }
                    setIsMenuOpen(false);
                  }}
                  className={`w-full p-2 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer active:scale-98 select-none ${
                    isAdmin
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200/80'
                  }`}
                  title={isAdmin ? 'Натисніть для переходу в Режим Гостя' : 'Натисніть для переходу в Режим Адміна'}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isAdmin ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-white'
                      }`}
                    >
                      {isAdmin ? <ShieldCheck size={15} /> : <Eye size={15} />}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 leading-none mb-0.5">
                        Режим
                      </div>
                      <div className="text-xs font-bold text-stone-900 truncate">
                        {isAdmin ? 'Адміністратор' : 'Гість'}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border shadow-2xs transition-colors shrink-0 ${
                    isAdmin
                      ? 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-white hover:bg-stone-100 text-stone-900 border-stone-200'
                  }`}>
                    {isAdmin ? 'Зміна на Гість' : 'Зміна на Адміна'}
                  </span>
                </button>

                {/* 2. Календар, Статистика, Реакції (тільки для Адміна) */}
                <div className="space-y-0.5">
                  {/* Календар */}
                  <button
                    onClick={() => {
                      onToggleCalendar?.();
                      setIsMenuOpen(false);
                    }}
                    className={`w-full h-9 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-left ${
                      isCalendarOpen
                        ? 'bg-stone-200 text-stone-900 font-bold'
                        : 'hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <Calendar size={15} className="text-stone-700 shrink-0" />
                    <span className="flex-1 truncate">Календар</span>
                  </button>

                  {/* Статистика */}
                  <button
                    onClick={() => {
                      onOpenAnalytics?.();
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-9 px-2.5 rounded-xl hover:bg-stone-100 text-stone-800 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                  >
                    <BarChart3 size={15} className="text-stone-700 shrink-0" />
                    <span className="flex-1 truncate">Статистика</span>
                  </button>

                  {/* Реакції (Доступно ТІЛЬКИ для Адміністратора) */}
                  {isAdmin && onOpenReactionsModal && (
                    <button
                      onClick={() => {
                        onOpenReactionsModal();
                        setIsMenuOpen(false);
                      }}
                      className="w-full h-9 px-2.5 rounded-xl hover:bg-stone-100 text-stone-800 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                    >
                      <Heart size={15} className="text-rose-600 fill-rose-600 shrink-0" />
                      <span className="flex-1 truncate">Реакції</span>
                      {totalReactionsCount > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-100 text-rose-800 font-mono font-bold">
                          {totalReactionsCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {/* 3. Експорт та Імпорт (Доступно і для Адміна, і для Гостей) */}
                <div className="pt-1.5 border-t border-stone-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-2 py-0.5">
                    Експорт та Імпорт
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        onExportImage();
                        setIsMenuOpen(false);
                      }}
                      className="h-9 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-stone-200/80"
                    >
                      <Download size={14} className="text-stone-700" />
                      <span>Експорт</span>
                    </button>

                    <button
                      onClick={() => {
                        handleImportClick();
                        setIsMenuOpen(false);
                      }}
                      className="h-9 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-stone-200/80"
                    >
                      <FileUp size={14} className="text-stone-700" />
                      <span>Імпорт</span>
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json,.ged,.gedcom,.csv"
                    onChange={handleFileChange}
                  />
                </div>

              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
