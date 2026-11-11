import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Target,
  Focus,
  Undo2,
  Calendar,
  GitFork,
  X,
  BarChart3,
  Layers,
  ChevronDown,
  Check,
  Shield,
  Map,
} from 'lucide-react';
import { Person } from '../types/tree';
import { ClanInfo } from '../utils/lineageUtils';
import { isPersonInYearRange } from '../utils/timelineUtils';
import { SilhouetteAvatar } from './SilhouetteAvatar';

interface CanvasControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToContent: () => void;
  onCenterOnFirstPerson: () => void;
  showTimeline: boolean;
  onToggleTimeline: () => void;
  showMiniMap?: boolean;
  onToggleMiniMap?: () => void;
  persons: Record<string, Person>;
  onSelectAndCenter: (personId: string) => void;
  onOpenMyTrees?: () => void;
  // Undo action
  onUndo?: () => void;
  canUndo?: boolean;
  // Visual lineage & clan enhancements
  isLineageFocus: boolean;
  onToggleLineageFocus: () => void;
  selectedPersonName?: string;
  selectedClanFilter: string | null;
  onSelectClanFilter: (clanName: string | null) => void;
  clanList: ClanInfo[];
  selectedCount?: number;
  onClearSelection?: () => void;
  hasUserPerson?: boolean;
  // Card Freeze / Lock protection
  isLayoutLocked?: boolean;
  onToggleLockLayout?: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToContent,
  onCenterOnFirstPerson,
  showTimeline,
  onToggleTimeline,
  showMiniMap,
  onToggleMiniMap,
  persons,
  onSelectAndCenter,
  onOpenMyTrees,
  onUndo,
  canUndo,
  isLineageFocus,
  onToggleLineageFocus,
  selectedPersonName,
  selectedClanFilter,
  onSelectClanFilter,
  clanList,
  selectedCount = 0,
  onClearSelection,
  hasUserPerson,
  isLayoutLocked,
  onToggleLockLayout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isClanDropdownOpen, setIsClanDropdownOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Global hotkeys: / or Ctrl+F / Cmd+K to open search, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in input/textarea/modal
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputFocused = activeTag === 'input' || activeTag === 'textarea';

      if (e.key === 'Escape') {
        if (isSearchOpen || isSearchExpanded) {
          setIsSearchOpen(false);
          if (!searchQuery.trim()) setIsSearchExpanded(false);
          searchInputRef.current?.blur();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setIsSearchExpanded(true);
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
        return;
      }

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        setIsSearchExpanded(true);
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isSearchExpanded, searchQuery]);

  // Click outside to dismiss search popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchOpen(false);
        if (!searchQuery.trim()) {
          setIsSearchExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter persons by name, maiden name, nickname, house number, year, or year range (e.g. "1900-1920" or "1916")
  const searchResult = useMemo(() => {
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return { filtered: [], parsedRange: null, parsedYear: null };

    // 1. Check for year range pattern (e.g. "1900-1920", "1900 - 1920", "1900..1920")
    const rangeMatch = rawQuery.match(/\b(1[6-9]\d{2}|20\d{2})\s*[\-–—\.\.]+\s*(1[6-9]\d{2}|20\d{2})\b/);

    let minYear: number | null = null;
    let maxYear: number | null = null;
    let singleYear: number | null = null;
    let textQuery = rawQuery;

    if (rangeMatch) {
      const y1 = parseInt(rangeMatch[1], 10);
      const y2 = parseInt(rangeMatch[2], 10);
      minYear = Math.min(y1, y2);
      maxYear = Math.max(y1, y2);
      textQuery = rawQuery.replace(rangeMatch[0], '').trim();
    } else {
      // 2. Check for single 4-digit year pattern (e.g. "1916")
      const singleMatch = rawQuery.match(/\b(1[6-9]\d{2}|20\d{2})\b/);
      if (singleMatch) {
        singleYear = parseInt(singleMatch[1], 10);
        minYear = singleYear;
        maxYear = singleYear;
        textQuery = rawQuery.replace(singleMatch[0], '').trim();
      }
    }

    const lowerText = textQuery.toLowerCase();

    const filtered = Object.values(persons).filter((p) => {
      // Check year range constraint if specified
      if (minYear !== null && maxYear !== null) {
        const matchesYear = isPersonInYearRange(p, minYear, maxYear);
        if (!matchesYear) return false;
      }

      // Check text portion (name, maiden name, nickname, profession, places, dates, house number)
      if (lowerText) {
        const houseStr = p.houseNumber ? `№${p.houseNumber} дім ${p.houseNumber} house ${p.houseNumber}` : '';
        const fullText = `${p.firstName} ${p.lastName} ${p.maidenName || ''} ${p.nickname || ''} ${p.profession || ''} ${p.birthPlace || ''} ${p.residencePlace || ''} ${p.yearsDisplay || ''} ${houseStr}`.toLowerCase();

        const words = lowerText.split(/\s+/).filter(Boolean);
        const matchesText = words.every((word) => fullText.includes(word));
        if (!matchesText) return false;
      }

      return true;
    });

    return {
      filtered,
      parsedRange: minYear !== null && maxYear !== null && minYear !== maxYear ? ([minYear, maxYear] as [number, number]) : null,
      parsedYear: singleYear,
    };
  }, [searchQuery, persons]);

  const filteredPersons = searchResult.filtered;

  return (
    <>


      {/* Multi-Selection Floating Pill (Appears right above bottom menu when multiple cards are selected) */}
      {selectedCount > 1 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="bg-stone-900/95 backdrop-blur-md text-stone-100 text-xs font-medium px-3.5 py-1.5 rounded-full shadow-xl border border-stone-700/80 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-stone-400 ring-2 ring-stone-400/40 animate-pulse" />
            <span>
              Виділено <strong className="text-white font-bold">{selectedCount}</strong> карток
            </span>
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="ml-1 text-[11px] font-semibold text-stone-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-stone-800 transition-colors cursor-pointer"
                title="Зняти виділення (Esc)"
              >
                Зняти
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modern Floating Bottom Dock */}
      <nav aria-label="Панель керування деревом" className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-16px)]">
        <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 shadow-[0_16px_40px_-8px_rgba(28,25,23,0.14),0_2px_8px_rgba(28,25,23,0.04)] rounded-2xl px-1.5 sm:px-2 py-1.5 flex items-center gap-1 sm:gap-2 transition-all overflow-x-auto no-scrollbar">

          {/* 1. History (Undo Action) */}
          {onUndo && (
            <>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`h-8 w-8 sm:w-auto sm:px-2.5 rounded-xl flex items-center justify-center sm:gap-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-95 shrink-0 ${
                  canUndo
                    ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900'
                    : 'bg-stone-100/50 text-stone-400 cursor-not-allowed opacity-50'
                }`}
                title={canUndo ? 'Скасувати останню дію (Ctrl+Z)' : 'Немає дій для скасування'}
                aria-label="Скасувати"
              >
                <Undo2 size={14} className={canUndo ? 'text-stone-600' : 'text-stone-400'} />
                <span className="hidden xl:inline">Скасувати</span>
              </button>
              <div className="h-5 w-px bg-stone-200/80 shrink-0" />
            </>
          )}

          {/* 2. Zoom Controls Segmented Cluster */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-xl gap-0.5 shrink-0">
            <button
              onClick={onZoomOut}
              className="h-7 w-7 rounded-lg text-stone-700 hover:text-stone-900 hover:bg-stone-200/60 transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
              title="Зменшити масштаб"
              aria-label="Зменшити масштаб"
            >
              <ZoomOut size={14} className="text-stone-600" />
            </button>

            <button
              onClick={onResetZoom}
              className="h-7 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-mono font-semibold text-stone-700 hover:bg-stone-200/60 hover:text-stone-900 transition-all cursor-pointer min-w-[38px] sm:min-w-[46px] text-center flex items-center justify-center shrink-0"
              title="Масштаб (клікніть для повернення на 100%)"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={onZoomIn}
              className="h-7 w-7 rounded-lg text-stone-700 hover:text-stone-900 hover:bg-stone-200/60 transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
              title="Збільшити масштаб"
              aria-label="Збільшити масштаб"
            >
              <ZoomIn size={14} className="text-stone-600" />
            </button>
          </div>

          <div className="h-5 w-px bg-stone-200/80 shrink-0" />

          {/* 3. Navigation & Layer Toggles */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">

            {/* Center on person */}
            <button
              onClick={onCenterOnFirstPerson}
              className="h-8 px-2 sm:px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 font-semibold text-xs shrink-0"
              title={
                hasUserPerson
                  ? 'Відцентрувати екран на моїй картці'
                  : 'Центрувати на обраній або головній картці'
              }
              aria-label="Центрувати екран"
            >
              <Target size={14} className="text-stone-600" />
              <span className="hidden md:inline font-semibold">
                Центрувати
              </span>
            </button>

            {/* Lineage focus toggle */}
            <button
              onClick={onToggleLineageFocus}
              className={`h-8 px-2 sm:px-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 font-semibold text-xs shrink-0 ${
                isLineageFocus
                  ? 'bg-stone-300 text-stone-900 font-bold'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900'
              }`}
              title={
                isLineageFocus
                  ? `Вимкнути фокус ${selectedPersonName ? `(${selectedPersonName})` : ''}`
                  : 'Увімкнути фокус (по чоловічій лінії)'
              }
            >
              <Focus size={14} className={isLineageFocus ? 'text-stone-900' : 'text-stone-600'} />
              <span className="hidden sm:inline">
                Фокус
              </span>
            </button>

            {/* Timeline ruler toggle */}
            <button
              onClick={onToggleTimeline}
              className={`h-8 w-8 sm:w-auto sm:px-2.5 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center sm:gap-1.5 font-semibold text-xs shrink-0 ${
                showTimeline
                  ? 'bg-stone-300 text-stone-900 font-bold'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900'
              }`}
              title={showTimeline ? 'Приховати шкалу років' : 'Показати шкалу років зліва'}
              aria-label="Шкала часу"
            >
              <Calendar size={14} className={showTimeline ? 'text-stone-900' : 'text-stone-600'} />
              <span className="hidden xl:inline">Роки</span>
            </button>

            {/* MiniMap radar toggle button */}
            {onToggleMiniMap && (
              <button
                onClick={onToggleMiniMap}
                className={`h-8 px-2 sm:px-2.5 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 font-semibold text-xs shrink-0 ${
                  showMiniMap
                    ? 'bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900'
                }`}
                title={showMiniMap ? 'Сховати міні-карту огляду' : 'Показати міні-карту огляду'}
                aria-label="Міні-карта огляду"
              >
                <Map size={14} className={showMiniMap ? 'text-emerald-700' : 'text-stone-600'} />
                <span className="hidden sm:inline">Огляд</span>
              </button>
            )}

            {/* Card Freeze / Lock Layout Protection Toggle - Animated Lock Icon */}
            {onToggleLockLayout && (
              <button
                onClick={onToggleLockLayout}
                className={`h-8 w-8 rounded-xl transition-all cursor-pointer active:scale-90 flex items-center justify-center shrink-0 group ${
                  isLayoutLocked
                    ? 'bg-stone-300 text-stone-900 font-bold shadow-2xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900'
                }`}
                title={
                  isLayoutLocked
                    ? 'Заморожено (клацніть, щоб розблокувати)'
                    : 'Заморозити положення карток'
                }
                aria-label={isLayoutLocked ? 'Розблокувати розміщення карток' : 'Заморозити розміщення карток'}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-all duration-300 ${
                    isLayoutLocked ? 'text-stone-900 scale-105' : 'text-stone-600 group-hover:text-stone-900 scale-95'
                  }`}
                >
                  <path
                    d="M7 11V7a5 5 0 0 1 10 0v4"
                    className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-[17px_11px]"
                    style={{
                      transform: isLayoutLocked ? 'none' : 'translateY(-3.5px) rotate(-28deg)',
                    }}
                  />
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2.5"
                    ry="2.5"
                    className={isLayoutLocked ? 'fill-stone-900 stroke-stone-900' : 'fill-none stroke-current'}
                  />
                  <circle
                    cx="12"
                    cy="16"
                    r="1.2"
                    className={isLayoutLocked ? 'fill-white stroke-white' : 'fill-stone-600 stroke-stone-600'}
                  />
                  <path
                    d="M12 17.2v1.5"
                    className={isLayoutLocked ? 'stroke-white' : 'stroke-stone-600'}
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            )}



            {/* Redesigned Clan Filter Dropdown */}
            {clanList.length > 1 && onSelectClanFilter && (() => {
              const activeClan = clanList.find((c) => c.name === selectedClanFilter);
              const personCount = Object.keys(persons).length;
              return (
                <div className="relative">
                  <button
                    onClick={() => setIsClanDropdownOpen(!isClanDropdownOpen)}
                    className={`h-8 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                      selectedClanFilter
                        ? 'bg-stone-300 text-stone-900 font-bold'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900'
                    }`}
                    title="Фільтрувати родовід за прізвищем / родом"
                  >
                    <Layers size={14} className={selectedClanFilter ? 'text-stone-900' : 'text-stone-600'} />
                    {activeClan ? (
                      <span className="hidden md:flex items-center gap-1.5">
                        {activeClan.coatOfArmsUrl ? (
                          <img
                            src={activeClan.coatOfArmsUrl}
                            alt={`Герб ${activeClan.name}`}
                            className="w-3.5 h-3.5 object-contain rounded-xs shrink-0"
                          />
                        ) : (
                          <span
                            className="w-2 h-2 rounded-full shrink-0 bg-stone-600"
                          />
                        )}
                        <span className="font-bold text-stone-900 truncate max-w-[90px]">{activeClan.name}</span>
                      </span>
                    ) : (
                      <span className="hidden md:flex items-center gap-1">
                        <span>Фільтр</span>
                      </span>
                    )}
                    <ChevronDown
                      size={12}
                      className={`text-stone-400 transition-transform duration-150 ${isClanDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Clan Clear Button when filtered */}
                  {selectedClanFilter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClanFilter(null);
                        setIsClanDropdownOpen(false);
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stone-700 hover:bg-stone-900 text-white flex items-center justify-center text-[9px] shadow-xs cursor-pointer"
                      title="Скинути фільтр роду"
                    >
                      <X size={10} />
                    </button>
                  )}

                  {/* Dropdown Menu - aligned to right on small screens so it never overflows */}
                  {isClanDropdownOpen && (
                    <div className="absolute right-0 sm:right-auto sm:left-0 bottom-11 bg-white/95 backdrop-blur-xl border border-stone-200/90 shadow-2xl rounded-2xl p-1.5 w-64 max-w-[calc(100vw-32px)] max-h-72 overflow-y-auto flex flex-col gap-0.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2.5 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                        Фільтр за родами ({clanList.length})
                      </div>

                      {/* All Clans Option */}
                      <button
                        onClick={() => {
                          onSelectClanFilter(null);
                          setIsClanDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs font-medium transition-colors cursor-pointer ${
                          selectedClanFilter === null
                            ? 'bg-stone-100 text-stone-950 font-bold'
                            : 'text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-stone-400" />
                          <span>Усі роди</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-[10.5px] text-stone-400 font-mono">
                          <span>{personCount}</span>
                          {selectedClanFilter === null && <Check size={12} className="text-stone-700" />}
                        </span>
                      </button>

                      <div className="h-px bg-stone-100 my-1" />

                      {/* Individual Clans */}
                      {clanList.map((clan) => {
                        const isSelected = selectedClanFilter === clan.name;
                        return (
                          <button
                            key={clan.name}
                            onClick={() => {
                              onSelectClanFilter(clan.name);
                              setIsClanDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-stone-100 text-stone-950 font-bold'
                                : 'text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              {clan.coatOfArmsUrl ? (
                                <img
                                  src={clan.coatOfArmsUrl}
                                  alt={`Герб ${clan.name}`}
                                  className="w-4 h-4 object-contain rounded-xs shrink-0"
                                />
                              ) : (
                                <span
                                  className="w-2 h-2 rounded-full shrink-0 shadow-2xs bg-stone-400"
                                />
                              )}
                              <span className="truncate">{clan.name}</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-[10.5px] text-stone-400 font-mono shrink-0">
                              <span>{clan.count}</span>
                              {isSelected && <Check size={12} className="text-stone-700" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

          </div>

          <div className="h-5 w-px bg-stone-200/80" />

          {/* 4. Collapsible Smart Search */}
          <div ref={searchContainerRef} className="relative">
            {!isSearchExpanded && !searchQuery ? (
              <button
                onClick={() => {
                  setIsSearchExpanded(true);
                  setIsSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className="h-8 w-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                title="Швидкий пошук особи, року чи дому (/)"
                aria-label="Пошук"
              >
                <Search size={14} className="text-stone-600" />
              </button>
            ) : (
              <div className="relative flex items-center animate-in fade-in slide-in-from-right-2 duration-150">
                <Search
                  size={14}
                  className="absolute left-2.5 text-stone-500 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Пошук особи, року, дому..."
                  value={searchQuery}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  className="h-8 w-40 sm:w-56 md:w-64 text-xs pl-8 pr-7 rounded-xl bg-stone-100 text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-stone-300 transition-all font-medium"
                  title="Швидкий пошук: ім'я, дівоче прізвище, № будинку або рік (напр. 1916 чи 1900-1920)"
                />
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                    setIsSearchExpanded(false);
                  }}
                  className="absolute right-2 p-0.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
                  title="Згорнути пошук (Esc)"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Search Results Dropdown Popover */}
            {isSearchOpen && (
              <div
                className="absolute bottom-12 right-0 sm:right-auto sm:left-0 w-80 sm:w-92 max-w-[calc(100vw-32px)] max-h-80 overflow-y-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-stone-200/90 py-1.5 z-50 divide-y divide-stone-100 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-3.5 py-2 text-[10.5px] uppercase font-bold text-stone-500 bg-stone-50/80 flex items-center justify-between">
                  <span>
                    {searchQuery.trim()
                      ? `Знайдено ${filteredPersons.length} осіб`
                      : 'Введіть ім’я, рік або номер дому:'}
                  </span>
                  {searchResult.parsedRange && (
                    <span className="flex items-center gap-1 text-[9.5px] font-mono font-bold text-stone-800 bg-stone-200 px-2 py-0.5 rounded-full lowercase">
                      <Calendar size={10} />
                      {searchResult.parsedRange[0]}–{searchResult.parsedRange[1]} рр.
                    </span>
                  )}
                  {searchResult.parsedYear && !searchResult.parsedRange && (
                    <span className="flex items-center gap-1 text-[9.5px] font-mono font-bold text-stone-800 bg-stone-200 px-2 py-0.5 rounded-full lowercase">
                      <Calendar size={10} />
                      Рік: {searchResult.parsedYear}
                    </span>
                  )}
                </div>

                {!searchQuery.trim() ? (
                  <div className="p-3 text-xs text-stone-500 space-y-1.5">
                    <p className="font-medium text-stone-700">Підказки для швидкого пошуку:</p>
                    <ul className="text-[11px] space-y-1 text-stone-600 list-disc list-inside">
                      <li>За роком: <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-stone-800 font-bold">1916</code></li>
                      <li>За періодом: <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-stone-800 font-bold">1900-1930</code></li>
                      <li>За номером дому: <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-stone-800 font-bold">№286</code> або <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-stone-800 font-bold">дім 329</code></li>
                      <li>За дівочим прізвищем або прізвиськом</li>
                    </ul>
                  </div>
                ) : filteredPersons.length === 0 ? (
                  <div className="px-4 py-5 text-xs text-stone-500 text-center space-y-1">
                    <p className="font-semibold text-stone-700">Нікого не знайдено</p>
                    <p className="text-[11px] text-stone-400">
                      Спробуйте інше написання імені або введіть період (напр. <code className="bg-stone-100 px-1 rounded">1900-1920</code>)
                    </p>
                  </div>
                ) : (
                  filteredPersons.map((p) => {
                    const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || '?';
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectAndCenter(p.id);
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-stone-100 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <SilhouetteAvatar
                            gender={p.gender}
                            avatarUrl={p.avatarUrl}
                            name={fullName}
                            size="sm"
                          />
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-stone-800 group-hover:text-stone-950 transition-colors truncate">
                                {fullName}
                              </span>
                              {p.gender === 'female' && p.maidenName && (
                                <span className="text-[10px] italic text-stone-500 truncate">
                                  ({p.maidenName})
                                </span>
                              )}
                              {p.houseNumber && (
                                <span
                                  className="text-[9px] font-mono font-bold text-stone-700 bg-stone-100 px-1.5 py-0.2 rounded-full shrink-0"
                                  title={`Номер дому: №${p.houseNumber}`}
                                >
                                  №{p.houseNumber}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10.5px] text-stone-500 font-mono">
                              {p.yearsDisplay && <span>{p.yearsDisplay}</span>}
                              {p.nickname && <span className="italic text-stone-500 font-sans">«{p.nickname}»</span>}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded-lg shrink-0 opacity-80 group-hover:opacity-100 transition-all">
                          Перейти →
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>



        </div>
      </nav>
    </>
  );
};
