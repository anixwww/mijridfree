import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Menu,
  X,
  Download,
  BarChart3,
  Calendar,
  Heart,
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Crown,
  GripVertical,
  Check,
  Layers,
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
  onCreateNewTree?: (title: string) => void;
  onRenameTree?: (treeId: string, newTitle: string) => Promise<boolean>;
  onDeleteTree?: (treeId: string, title: string) => Promise<boolean>;
  onExportImage: () => void;
  personCount: number;
  generationCount: number;
  onSyncServer?: () => void;
  onForceRefreshFromCloud?: () => void;
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline' | 'rejected' | 'schema_mismatch';
  isServerConnected?: boolean;
  lastSavedTime?: Date | null;
  onOpenAnalytics?: () => void;
  onOpenReactionsModal?: () => void;
  totalReactionsCount?: number;
  isCalendarOpen?: boolean;
  onToggleCalendar?: () => void;
  notifications?: any[];
  onSelectNotificationPerson?: (personId: string) => void;
  onClearNotifications?: () => void;
  onOpenShortcutsModal?: () => void;
  userPersonName?: string | null;
  onOpenUserIdentity?: () => void;
  onLoadJsonFile?: (file: File) => void;
}

export interface CanvasItem {
  id: string;
  title: string;
  personCount?: number;
  isMain?: boolean;
}

const TAB_ORDER_STORAGE_KEY = 'rodovid_canvas_tab_order';

export const TopNavbar: React.FC<TopNavbarProps> = ({
  isAdmin,
  onOpenAuthModal,
  onToggleAdminRole,
  currentTreeTitle,
  currentTreeId,
  isMainTree = true,
  onReturnToMainTree,
  onSelectTree,
  onCreateNewTree,
  onRenameTree,
  onDeleteTree,
  onExportImage,
  personCount,
  onSyncServer,
  onForceRefreshFromCloud,
  syncStatus = 'synced',
  isServerConnected = true,
  lastSavedTime,
  onOpenAnalytics,
  onOpenReactionsModal,
  totalReactionsCount = 0,
  isCalendarOpen,
  onToggleCalendar,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [canvasList, setCanvasList] = useState<CanvasItem[]>([]);

  // Modals inside TopNavbar for Admin canvas management
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCanvasTitle, setNewCanvasTitle] = useState('');
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [renameInputTitle, setRenameInputTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  // Tab drag & drop / long-press reorder state
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPointerDownRef = useRef(false);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressActiveRef = useRef(false);

  // Load canvases and order them based on stored order
  const loadCanvases = useCallback(async () => {
    const list: CanvasItem[] = [];

    // 1. Main tree is ALWAYS first
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
            const isMain =
              item.id === MAIN_TREE_ID || item.id === 'default-tree' || item.id === 'main-tree';
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
          const isMain =
            st.id === MAIN_TREE_ID || st.id === 'default-tree' || st.id === 'main-tree';
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

    // 5. Apply custom tab order from localStorage
    try {
      const rawOrder = localStorage.getItem(TAB_ORDER_STORAGE_KEY);
      if (rawOrder) {
        const orderedIds: string[] = JSON.parse(rawOrder);
        if (Array.isArray(orderedIds)) {
          const mainItem = list[0];
          const secondary = list.slice(1);
          secondary.sort((a, b) => {
            const idxA = orderedIds.indexOf(a.id);
            const idxB = orderedIds.indexOf(b.id);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
          setCanvasList([mainItem, ...secondary]);
          return;
        }
      }
    } catch {}

    setCanvasList(list);
  }, [currentTreeId, currentTreeTitle, isMainTree, personCount]);

  useEffect(() => {
    loadCanvases();
  }, [loadCanvases]);

  // Click outside listener for menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
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
        setIsCreateModalOpen(false);
        setRenameTarget(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle reordering tab swap
  const handleSwapTabs = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    if (sourceId === MAIN_TREE_ID || targetId === MAIN_TREE_ID) {
      // Main tree stays at index 0
      return;
    }

    setCanvasList((prev) => {
      const main = prev[0];
      const rest = prev.slice(1);
      const sourceIdx = rest.findIndex((t) => t.id === sourceId);
      const targetIdx = rest.findIndex((t) => t.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;

      const updated = [...rest];
      const [moved] = updated.splice(sourceIdx, 1);
      updated.splice(targetIdx, 0, moved);

      const finalList = [main, ...updated];
      try {
        localStorage.setItem(
          TAB_ORDER_STORAGE_KEY,
          JSON.stringify(updated.map((t) => t.id))
        );
      } catch {}
      return finalList;
    });
  };

  // Mouse long-press & drag handlers
  const handleTabMouseDown = (tabId: string, e: React.MouseEvent) => {
    // Only secondary tabs can be reordered
    if (tabId === MAIN_TREE_ID) return;
    // Don't trigger if clicked on buttons or input
    if ((e.target as HTMLElement).closest('button, input')) return;

    isPointerDownRef.current = true;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    isLongPressActiveRef.current = false;

    // Start timer for long-press reorder mode (180ms)
    longPressTimerRef.current = setTimeout(() => {
      if (isPointerDownRef.current) {
        isLongPressActiveRef.current = true;
        setDraggedTabId(tabId);
      }
    }, 180);
  };

  const handleTabMouseMove = (tabId: string, e: React.MouseEvent) => {
    if (!isPointerDownRef.current || !pointerStartPosRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);

    if ((dx > 6 || dy > 6) && !isLongPressActiveRef.current && tabId !== MAIN_TREE_ID) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      isLongPressActiveRef.current = true;
      setDraggedTabId(tabId);
    }

    if (draggedTabId && tabId !== MAIN_TREE_ID && tabId !== draggedTabId) {
      setDragOverTabId(tabId);
    }
  };

  const handleGlobalMouseUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (draggedTabId && dragOverTabId && dragOverTabId !== MAIN_TREE_ID) {
      handleSwapTabs(draggedTabId, dragOverTabId);
    }
    setDraggedTabId(null);
    setDragOverTabId(null);
    isPointerDownRef.current = false;
    pointerStartPosRef.current = null;
    isLongPressActiveRef.current = false;
  }, [draggedTabId, dragOverTabId]);

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseUp]);

  // Native HTML5 drag and drop support
  const handleDragStart = (tabId: string, e: React.DragEvent) => {
    if (tabId === MAIN_TREE_ID) {
      e.preventDefault();
      return;
    }
    setDraggedTabId(tabId);
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (tabId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (tabId === MAIN_TREE_ID || tabId === draggedTabId) return;
    e.dataTransfer.dropEffect = 'move';
    setDragOverTabId(tabId);
  };

  const handleDrop = (targetId: string, e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedTabId;
    if (sourceId && targetId && sourceId !== targetId && targetId !== MAIN_TREE_ID) {
      handleSwapTabs(sourceId, targetId);
    }
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  // Create canvas submit
  const handleCreateCanvasSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCanvasTitle.trim() || !onCreateNewTree) return;
    onCreateNewTree(newCanvasTitle.trim());
    setNewCanvasTitle('');
    setIsCreateModalOpen(false);
  };

  // Rename canvas submit
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameInputTitle.trim()) return;
    if (renameTarget.id === MAIN_TREE_ID) return;

    setIsRenaming(true);
    try {
      if (onRenameTree) {
        await onRenameTree(renameTarget.id, renameInputTitle.trim());
      }
      setCanvasList((prev) =>
        prev.map((t) => (t.id === renameTarget.id ? { ...t, title: renameInputTitle.trim() } : t))
      );
      setRenameTarget(null);
    } finally {
      setIsRenaming(false);
    }
  };

  // Delete canvas confirm
  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteTarget.id === MAIN_TREE_ID) return;
    setIsDeleting(true);
    try {
      if (onDeleteTree) {
        await onDeleteTree(deleteTarget.id, deleteTarget.title);
      }
      setCanvasList((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <header className="relative z-40 select-none bg-stone-100/90 border-b border-stone-200/90">
      <div className="h-13 px-2 sm:px-4 flex items-center justify-between gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        
        {/* ================================================================ */}
        {/* BROWSER-STYLE CANVAS TABS NAVIGATION                            */}
        {/* ================================================================ */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0 py-1">
          {canvasList.map((tab) => {
            const isMain = tab.isMain || tab.id === MAIN_TREE_ID;
            const isSelected = isMain ? isMainTree : tab.id === currentTreeId;
            const isBeingDragged = draggedTabId === tab.id;
            const isDragOver = dragOverTabId === tab.id;

            return (
              <div
                key={tab.id}
                draggable={!isMain}
                onDragStart={(e) => handleDragStart(tab.id, e)}
                onDragOver={(e) => handleDragOver(tab.id, e)}
                onDragLeave={() => setDragOverTabId(null)}
                onDrop={(e) => handleDrop(tab.id, e)}
                onMouseDown={(e) => handleTabMouseDown(tab.id, e)}
                onMouseMove={(e) => handleTabMouseMove(tab.id, e)}
                onClick={() => {
                  if (isLongPressActiveRef.current) return;
                  if (isMain) {
                    if (onReturnToMainTree) onReturnToMainTree();
                  } else if (onSelectTree) {
                    onSelectTree(tab.id);
                  }
                }}
                className={`group h-8.5 rounded-t-xl rounded-b-md flex items-center gap-1.5 px-2.5 sm:px-3 text-xs transition-all cursor-pointer select-none shrink-0 border relative ${
                  isSelected
                    ? 'bg-white text-stone-900 font-bold border-stone-200/95 shadow-xs border-b-white'
                    : 'bg-stone-200/60 hover:bg-stone-200 text-stone-600 hover:text-stone-900 border-transparent hover:border-stone-300/70 font-medium'
                } ${isBeingDragged ? 'opacity-40 scale-95 shadow-inner' : ''} ${
                  isDragOver ? 'ring-2 ring-emerald-500 scale-102 bg-emerald-50/50' : ''
                }`}
                title={
                  isMain
                    ? 'Головне дерево (захищене: не видаляється і не перейменовується)'
                    : `Полотно: ${tab.title}. Затисніть мишкою для переміщення вкладки.`
                }
              >
                {/* Drag handle / indicator icon */}
                {!isMain && isAdmin ? (
                  <GripVertical
                    size={11}
                    className="text-stone-400 group-hover:text-stone-600 cursor-grab shrink-0 -ml-1 transition-colors"
                  />
                ) : null}

                {/* Tab Icon */}
                {isMain ? (
                  <Crown size={13} className="text-amber-600 fill-amber-400 shrink-0" />
                ) : (
                  <FolderTree
                    size={13}
                    className={isSelected ? 'text-emerald-700 shrink-0' : 'text-stone-500 shrink-0'}
                  />
                )}

                {/* Tab Title */}
                <span className="max-w-[100px] sm:max-w-[160px] truncate text-[11.5px] leading-none">
                  {tab.title}
                </span>

                {/* Person Count Badge */}
                {tab.personCount !== undefined && tab.personCount > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full shrink-0 ${
                      isSelected
                        ? 'bg-stone-100 text-stone-700 font-semibold'
                        : 'bg-stone-300/60 text-stone-600 font-normal'
                    }`}
                  >
                    {tab.personCount}
                  </span>
                )}

                {/* Admin Actions on Secondary Tabs: Rename & Delete */}
                {!isMain && isAdmin && (
                  <div
                    className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Rename Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setRenameTarget({ id: tab.id, title: tab.title });
                        setRenameInputTitle(tab.title);
                      }}
                      className="p-1 rounded-md text-stone-400 hover:text-stone-800 hover:bg-stone-200/80 transition-colors cursor-pointer"
                      title="Змінити назву полотна"
                      aria-label="Змінити назву"
                    >
                      <Pencil size={11} />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget({ id: tab.id, title: tab.title });
                      }}
                      className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Видалити це полотно"
                      aria-label="Видалити полотно"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Plus Button: Add New Canvas Tab (Admin only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setNewCanvasTitle('');
                setIsCreateModalOpen(true);
              }}
              className="h-8 w-8 rounded-xl bg-stone-200/60 hover:bg-emerald-600 hover:text-white text-stone-600 border border-transparent hover:border-emerald-600 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 shadow-2xs"
              title="Додати нове родове полотно (вкладку)"
              aria-label="Додати нове полотно"
            >
              <Plus size={15} />
            </button>
          )}
        </div>

        {/* ================================================================ */}
        {/* RIGHT CONTROLS: Status indicator & Redesigned Master Menu        */}
        {/* ================================================================ */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Server / Cloud Status Indicator */}
          <ServerStatusIndicator
            syncStatus={syncStatus}
            isServerConnected={isServerConnected}
            onSyncServer={onSyncServer}
            onForceRefreshFromCloud={onForceRefreshFromCloud}
            lastSavedTime={lastSavedTime}
          />

          {/* Master Menu Dropdown */}
          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`h-8 px-3 rounded-xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer select-none active:scale-95 shadow-xs ${
                isMenuOpen
                  ? 'bg-stone-900 text-white'
                  : 'bg-white hover:bg-stone-50 text-stone-900 border border-stone-200/90'
              }`}
              title="Головне меню"
              aria-label="Головне меню"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X size={15} /> : <Menu size={15} />}
              <span className="font-semibold text-xs">Меню</span>
            </button>

            {/* Menu Popover */}
            {isMenuOpen && (
              <div className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-10 w-[calc(100vw-24px)] sm:w-72 max-w-sm bg-white rounded-2xl shadow-2xl border border-stone-200/90 p-2.5 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                
                {/* Menu Items: Календар, Статистика, Реакції, Експорт */}
                <div className="space-y-0.5 pt-1">
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
                    <span className="flex-1 truncate">Календар подій</span>
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

                  {/* Реакції (тільки для Адміна) */}
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

                  {/* Експорт (такий самий як інші кнопки у меню) */}
                  <button
                    onClick={() => {
                      onExportImage();
                      setIsMenuOpen(false);
                    }}
                    className="w-full h-9 px-2.5 rounded-xl hover:bg-stone-100 text-stone-800 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                  >
                    <Download size={15} className="text-stone-700 shrink-0" />
                    <span className="flex-1 truncate">Експорт</span>
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>

      {/* ================================================================ */}
      {/* MODAL: Створення нового родового полотна (вкладки)                */}
      {/* ================================================================ */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 leading-tight">
                    Нове родове полотно
                  </h3>
                  <p className="text-[11px] text-stone-500">Створення окремої вкладки / гілки</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCanvasSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Назва полотна
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newCanvasTitle}
                  onChange={(e) => setNewCanvasTitle(e.target.value)}
                  placeholder="напр. Гілка Савчуків, Материнська лінія..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-stone-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={!newCanvasTitle.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Створити полотно
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Перейменування полотна (тільки другорядні)                */}
      {/* ================================================================ */}
      {renameTarget && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setRenameTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-stone-800 text-white flex items-center justify-center shrink-0">
                  <Pencil size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 leading-tight">
                    Зміна назви полотна
                  </h3>
                  <p className="text-[11px] text-stone-500">Вкажіть нову назву для цієї вкладки</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Нова назва полотна
                </label>
                <input
                  type="text"
                  autoFocus
                  value={renameInputTitle}
                  onChange={(e) => setRenameInputTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-stone-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={!renameInputTitle.trim() || isRenaming}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {isRenaming ? 'Збереження...' : 'Зберегти назву'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Підтвердження видалення полотна                           */}
      {/* ================================================================ */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <Trash2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-950 leading-tight">
                    Видалити родове полотно?
                  </h3>
                  <p className="text-[11px] text-rose-700">Цю дію неможливо буде скасувати</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100/50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                Ви впевнені, що хочете назавжди видалити полотно{' '}
                <strong className="text-stone-900 font-bold">«{deleteTarget.title}»</strong>? Усі
                особи та зв’язки на цьому полотні будуть видалені.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {isDeleting ? 'Видалення...' : 'Видалити полотно'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
