import React, { useState, useMemo } from 'react';
import { Person, RelativeType, ConfidenceLevel } from '../types/tree';
import { X, Link2, Heart, Users, User, FileText, Flame, ShieldAlert } from 'lucide-react';

export interface ConnectOptions {
  verified: boolean;
  confidenceLevel: ConfidenceLevel;
  archiveSource?: string;
  isMainBranch?: boolean;
  linkExistingSpouseChildren?: boolean;
  eventType?: 'marriage' | 'cohabitation' | 'divorce';
}

interface ConnectPersonsModalProps {
  sourcePerson: Person;
  allPersons: Record<string, Person>;
  isOpen: boolean;
  onClose: () => void;
  onConnect: (targetId: string, relationType: RelativeType, options: ConnectOptions) => void;
  initialTargetId?: string;
}

/**
 * Checks if targetId is an ancestor of personId
 */
function isAncestorOf(persons: Record<string, Person>, personId: string, targetId: string, visited = new Set<string>()): boolean {
  if (visited.has(personId)) return false;
  visited.add(personId);

  const person = persons[personId];
  if (!person || !person.parents) return false;

  for (const parentId of person.parents) {
    if (parentId === targetId) return true;
    if (isAncestorOf(persons, parentId, targetId, visited)) return true;
  }
  return false;
}

/**
 * Checks if targetId is a descendant of personId
 */
function isDescendantOf(persons: Record<string, Person>, personId: string, targetId: string, visited = new Set<string>()): boolean {
  if (visited.has(personId)) return false;
  visited.add(personId);

  const person = persons[personId];
  if (!person || !person.children) return false;

  for (const childId of person.children) {
    if (childId === targetId) return true;
    if (isDescendantOf(persons, childId, targetId, visited)) return true;
  }
  return false;
}

export const ConnectPersonsModal: React.FC<ConnectPersonsModalProps> = ({
  sourcePerson,
  allPersons,
  isOpen,
  onClose,
  onConnect,
  initialTargetId,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>(initialTargetId || '');
  const [relationType, setRelationType] = useState<RelativeType>('spouse');
  const [unionType, setUnionType] = useState<'marriage' | 'cohabitation' | 'divorce'>('marriage');
  const [searchQuery, setSearchQuery] = useState('');

  // Credibility and Archival Evidence
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>('verified');
  const [archiveSource, setArchiveSource] = useState('');
  const [isMainBranch, setIsMainBranch] = useState(false);
  const [linkExistingSpouseChildren, setLinkExistingSpouseChildren] = useState(true);

  if (!isOpen) return null;

  const sourceFullName = [sourcePerson.firstName, sourcePerson.lastName].filter(Boolean).join(' ') || '?';
  const targetPerson = selectedTargetId ? allPersons[selectedTargetId] : null;
  const targetFullName = targetPerson ? [targetPerson.firstName, targetPerson.lastName].filter(Boolean).join(' ') || '?' : '';

  // Cycle and validity check
  const cycleWarning = useMemo(() => {
    if (!selectedTargetId || !targetPerson) return null;
    if (selectedTargetId === sourcePerson.id) {
      return "Неможливо з'єднати особу із самою собою.";
    }

    if (relationType === 'parent') {
      // Target would be parent of Source.
      // If Target is already a descendant of Source, this would create an impossible biological cycle!
      if (isDescendantOf(allPersons, sourcePerson.id, selectedTargetId)) {
        return `⚠️ Генеалогічний конфлікт: ${targetFullName} вже є нащадком ${sourceFullName}. Особа не може бути батьком власного предка.`;
      }
    } else if (relationType === 'child') {
      // Target would be child of Source.
      // If Target is already an ancestor of Source, cycle!
      if (isAncestorOf(allPersons, sourcePerson.id, selectedTargetId)) {
        return `⚠️ Генеалогічний конфлікт: ${targetFullName} вже є предком ${sourceFullName}. Особа не може бути дитиною власного нащадка.`;
      }
    } else if (relationType === 'spouse') {
      if ((sourcePerson.spouses || []).includes(selectedTargetId)) {
        return `Ці особи вже зазначені як подружжя.`;
      }
    }

    return null;
  }, [selectedTargetId, targetPerson, relationType, sourcePerson, allPersons, sourceFullName, targetFullName]);

  // Filter available target persons (exclude self)
  const availablePersons = Object.values(allPersons).filter((p) => {
    if (p.id === sourcePerson.id) return false;
    if (searchQuery.trim()) {
      const full = `${p.firstName} ${p.lastName} ${p.maidenName || ''} ${p.nickname || ''} ${p.houseNumber || ''}`.toLowerCase();
      return full.includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId || cycleWarning) {
      return;
    }

    onConnect(selectedTargetId, relationType, {
      verified: confidenceLevel === 'verified',
      confidenceLevel,
      archiveSource: archiveSource.trim() || undefined,
      isMainBranch,
      linkExistingSpouseChildren: relationType === 'spouse' ? linkExistingSpouseChildren : undefined,
      eventType: relationType === 'spouse' ? unionType : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#f4f7f4] border-b border-[#d8e2d9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
              <Link2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Встановлення родинного зв'язку (лінії)
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Вихідна особа: <span className="font-semibold text-emerald-900">{sourceFullName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* 1. Relation Type Selector with clear genealogical direction */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
              Тип родинного зв'язку
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  type: 'spouse',
                  title: '💍 Подружжя / Пара',
                  desc: 'Шлюбний або цивільний союз обох осіб',
                  icon: Heart,
                  color: 'text-rose-600',
                },
                {
                  type: 'parent',
                  title: '⬆️ Батьки',
                  desc: `Обрана особа є батьком/матір'ю для ${sourceFullName}`,
                  icon: User,
                  color: 'text-emerald-700',
                },
                {
                  type: 'child',
                  title: '⬇️ Дитина',
                  desc: `Обрана особа є дитиною для ${sourceFullName}`,
                  icon: Users,
                  color: 'text-amber-700',
                },
                {
                  type: 'sibling',
                  title: '🤝 Брат / Сестра',
                  desc: `Рідний брат або сестра для ${sourceFullName}`,
                  icon: Users,
                  color: 'text-sky-700',
                },
              ].map((item) => {
                const isSelected = relationType === item.type;
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setRelationType(item.type as RelativeType)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30 font-semibold shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Icon size={14} className={isSelected ? 'text-emerald-800' : item.color} />
                      <span>{item.title}</span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-normal leading-tight">
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Union Type Selector when relation is Spouse */}
          {relationType === 'spouse' && (
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-2 animate-in fade-in duration-150">
              <label className="block text-xs font-semibold text-emerald-950 uppercase tracking-wider">
                Тип союзу (пара)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setUnionType('marriage')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    unionType === 'marriage'
                      ? 'border-emerald-700 bg-white text-emerald-950 ring-1 ring-emerald-600 font-semibold shadow-2xs'
                      : 'border-emerald-200/60 bg-emerald-50/50 text-stone-700 hover:bg-white'
                  }`}
                >
                  <span className="text-base">💍</span>
                  <span>Шлюб</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUnionType('divorce')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    unionType === 'divorce'
                      ? 'border-rose-600 bg-rose-50 text-rose-950 ring-1 ring-rose-500 font-semibold shadow-2xs'
                      : 'border-emerald-200/60 bg-emerald-50/50 text-stone-700 hover:bg-white hover:text-rose-900'
                  }`}
                >
                  <span className="text-base">💔</span>
                  <span>Розлучення</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUnionType('cohabitation')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    unionType === 'cohabitation'
                      ? 'border-emerald-700 bg-white text-emerald-950 ring-1 ring-emerald-600 font-semibold shadow-2xs'
                      : 'border-emerald-200/60 bg-emerald-50/50 text-stone-700 hover:bg-white'
                  }`}
                >
                  <span className="text-base">💚</span>
                  <span>Без шлюбу</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Target Person Selector with instant search */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Виберіть другу особу для з'єднання:
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук за іменем, прізвищем, номером дому..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-stone-50"
            />
            <div className="max-h-44 overflow-y-auto rounded-xl border border-stone-200 divide-y divide-stone-100 bg-white shadow-inner">
              {availablePersons.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-500 italic">
                  Осіб за запитом не знайдено
                </div>
              ) : (
                availablePersons.map((p) => {
                  const isSelected = selectedTargetId === p.id;
                  const pName = [p.firstName, p.lastName].filter(Boolean).join(' ') || '?';
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedTargetId(p.id)}
                      className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50 text-emerald-950 font-semibold' : 'hover:bg-stone-50 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-medium truncate">{pName}</span>
                        {p.yearsDisplay && (
                          <span className="text-[10px] text-stone-500 font-mono shrink-0">({p.yearsDisplay})</span>
                        )}
                        {p.houseNumber && (
                          <span className="text-[9px] font-mono text-emerald-800 bg-emerald-100/70 px-1 py-0.2 rounded shrink-0">
                            №{p.houseNumber}
                          </span>
                        )}
                      </div>
                      <input
                        type="radio"
                        name="target-person"
                        checked={isSelected}
                        onChange={() => setSelectedTargetId(p.id)}
                        className="accent-emerald-700 shrink-0"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Conflict / Cycle Warning Banner */}
          {cycleWarning && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 animate-in fade-in">
              <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-tight">{cycleWarning}</div>
            </div>
          )}

          {/* 3. Genealogical Credibility (Достовірність зв'язку) */}
          <div className="p-3.5 bg-[#fbfbfa] rounded-xl border border-stone-200 space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                Рівень достовірності зв'язку
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    level: 'verified' as ConfidenceLevel,
                    label: '🟢 Перевірений',
                    sub: 'Є метрика / документ',
                    color: 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600',
                  },
                  {
                    level: 'hypothetical' as ConfidenceLevel,
                    label: '⚪ Неперевірений',
                    sub: 'Версія / спогади (пунктир)',
                    color: 'border-stone-500 bg-stone-100 text-stone-900 ring-1 ring-stone-400',
                  },
                ].map((item) => {
                  const isCur = confidenceLevel === item.level;
                  return (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setConfidenceLevel(item.level)}
                      className={`py-2 px-2 rounded-lg border text-left flex flex-col transition-all ${
                        isCur
                          ? `${item.color} font-semibold shadow-2xs`
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span className="text-[11px] font-bold leading-tight">{item.label}</span>
                      <span className="text-[9.5px] text-stone-500 font-normal leading-tight mt-0.5">{item.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Archival Citation Input */}
            <div>
              <label className="block text-[11px] font-medium text-stone-700 mb-1 flex items-center gap-1">
                <FileText size={12} className="text-emerald-700" />
                <span>Архівне джерело або запис метрики (необов'язково)</span>
              </label>
              <input
                type="text"
                value={archiveSource}
                onChange={(e) => setArchiveSource(e.target.value)}
                placeholder="напр. ЦДІАЛ, фонд 201, опис 4а, спр. 115, арк. 32"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
              />
            </div>

            {/* Main lineage branch checkbox */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isMainBranch}
                onChange={(e) => setIsMainBranch(e.target.checked)}
                className="rounded text-emerald-800 focus:ring-emerald-600 accent-emerald-800 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-xs font-medium text-stone-800 flex items-center gap-1">
                <Flame size={13} className="text-amber-600" />
                <span>Пряма лінія роду (виділити лінію товстішим накресленням)</span>
              </span>
            </label>

            {/* Spouse children option */}
            {relationType === 'spouse' && targetPerson && (targetPerson.children?.length ?? 0) > 0 && (
              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-stone-200/80">
                <input
                  type="checkbox"
                  checked={linkExistingSpouseChildren}
                  onChange={(e) => setLinkExistingSpouseChildren(e.target.checked)}
                  className="rounded text-emerald-800 focus:ring-emerald-600 accent-emerald-800 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-xs text-stone-700">
                  Пов'язати з дітьми подружжя ({targetPerson.children.length} осіб)
                </span>
              </label>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={!selectedTargetId || !!cycleWarning}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Link2 size={14} />
              <span>З'єднати лінією</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
