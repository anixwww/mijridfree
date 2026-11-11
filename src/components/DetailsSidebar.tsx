import React, { useState, useMemo, useEffect } from 'react';
import { Person, RelativeType, ConnectionMeta } from '../types/tree';
import { SilhouetteAvatar } from './SilhouetteAvatar';
import { formatPersonLifeDates, formatSingleDate, calculateAge } from '../utils/dateUtils';
import {
  X,
  Edit2,
  Pencil,
  Trash2,
  Heart,
  Users,
  User,
  Clock,
  Pin,
  Link2,
  Clipboard,
  Check,
  CheckCircle2,
  HelpCircle,
  Palette,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  HeartCrack,
  Plus,
  Camera,
  BookOpen,
  Image as ImageIcon,
  Dog,
  Briefcase,
  MapPin,
  UserCheck,
  Sparkles,
  RotateCcw,
  Settings,
  Shield,
  Copy,
  Home,
  ArrowRight,
} from 'lucide-react';
import { ClanInfo, getClanName } from '../utils/lineageUtils';

interface DetailsSidebarProps {
  person: Person | null;
  allPersons: Record<string, Person>;
  isOpen: boolean;
  isAdmin?: boolean;
  userPersonId?: string | null;
  onClose: () => void;
  onEdit: (person: Person) => void;
  onDelete: (personId: string) => void;
  onAddRelative: (targetPerson: Person, relationType: RelativeType) => void;
  onSelectPerson: (personId: string) => void;
  onToggleRelationVerification?: (personId: string, relativeId: string) => void;
  onToggleFullyVerified?: (personId: string) => void;
  onAlignChronologically?: (personId: string) => void;
  onToggleChronologicalPin?: (personId: string) => void;
  onOpenConnectModal?: (person: Person) => void;
  onOpenMetricModal?: (person: Person, tab?: 'birth' | 'death') => void;
  onDisconnectSpouse?: (personId1: string, personId2: string) => void;
  onEditMarriageConnection?: (connectionId: string) => void;
  connectionOverrides?: Record<string, ConnectionMeta>;
  copiedCardColor?: string | null;
  onCopyColor?: (color: string) => void;
  onPasteColor?: (personId: string) => void;
  onSetCardColor?: (personId: string, color: string) => void;
  onUpdatePerson?: (person: Person) => void;
  clanMap?: Record<string, ClanInfo>;
  onOpenClanCoatOfArmsModal?: (clan: ClanInfo) => void;
  onDeleteReaction?: (personId: string, reactionIdOrIdx: string | number) => void;
  onOpenReactionsModal?: () => void;
  onSetUserPersonId?: (personId: string) => void;
}

export const DetailsSidebar: React.FC<DetailsSidebarProps> = ({
  person,
  allPersons,
  isOpen,
  isAdmin = true,
  userPersonId,
  onClose,
  onEdit,
  onDelete,
  onAddRelative,
  onSelectPerson,
  onToggleRelationVerification,
  onToggleFullyVerified,
  onAlignChronologically,
  onToggleChronologicalPin,
  onOpenConnectModal,
  onOpenMetricModal,
  onDisconnectSpouse,
  onEditMarriageConnection,
  connectionOverrides,
  copiedCardColor,
  onCopyColor,
  onPasteColor,
  onSetCardColor,
  onUpdatePerson,
  clanMap,
  onOpenClanCoatOfArmsModal,
  onDeleteReaction,
  onOpenReactionsModal,
  onSetUserPersonId,
}) => {
  const [justCopied, setJustCopied] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption?: string; date?: string } | null>(null);


  // Quick Card Management States
  const [isColorDrawerOpen, setIsColorDrawerOpen] = useState(false);
  const [isClanDrawerOpen, setIsClanDrawerOpen] = useState(false);
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [customClanText, setCustomClanText] = useState('');

  // In-place inline edit states for badges (house number, maiden name, years)
  const [editingHouseNumber, setEditingHouseNumber] = useState(false);
  const [tempHouseNumber, setTempHouseNumber] = useState('');
  const [editingMaidenName, setEditingMaidenName] = useState(false);
  const [tempMaidenName, setTempMaidenName] = useState('');
  const [editingYears, setEditingYears] = useState(false);
  const [tempBirthYear, setTempBirthYear] = useState('');
  const [tempDeathYear, setTempDeathYear] = useState('');

  // Quick edit form values
  const [quickForm, setQuickForm] = useState({
    firstName: '',
    lastName: '',
    patronymic: '',
    clanName: '',
    maidenName: '',
    nickname: '',
    birthYear: '',
    deathYear: '',
    isDeceased: false,
    birthPlace: '',
    profession: '',
    houseNumber: '',
  });

  // Synchronize quick form when selected person changes
  useEffect(() => {
    if (person) {
      setQuickForm({
        firstName: person.firstName || '',
        lastName: person.lastName || '',
        patronymic: person.patronymic || '',
        clanName: person.clanName || '',
        maidenName: person.maidenName || '',
        nickname: person.nickname || '',
        birthYear: person.birthYear || (person.birthDate ? String(person.birthDate).slice(0, 4) : ''),
        deathYear: person.deathYear || (person.deathDate ? String(person.deathDate).slice(0, 4) : ''),
        isDeceased: !!person.isDeceased || !!person.deathDate || !!person.deathYear,
        birthPlace: person.birthPlace || '',
        profession: person.profession || '',
        houseNumber: person.houseNumber || '',
      });
      setIsQuickEditing(false);
      setIsColorDrawerOpen(false);
      setIsClanDrawerOpen(false);
      setCustomClanText('');
      setEditingHouseNumber(false);
      setEditingMaidenName(false);
      setEditingYears(false);
    }
  }, [person?.id]);

  const personClanName = person ? (person.clanName || getClanName(person)) : null;
  const personClanInfo = useMemo(() => {
    if (!personClanName || !clanMap) return null;
    return clanMap[personClanName] || null;
  }, [personClanName, clanMap]);

  // List of all clans present across the entire tree
  const availableClans = useMemo(() => {
    const set = new Set<string>();
    if (clanMap) {
      Object.keys(clanMap).forEach((c) => set.add(c));
    }
    Object.values(allPersons).forEach((p) => {
      const clan = p.clanName || getClanName(p);
      if (clan) set.add(clan);
    });
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [clanMap, allPersons]);

  const PRESET_CARD_COLORS = [
    { name: 'Персик', hex: '#ffe3d8', border: '#fca5a5' },
    { name: 'Пісок', hex: '#fdf2d8', border: '#fcd34d' },
    { name: 'Шавлія', hex: '#dcfce7', border: '#86efac' },
    { name: 'М\'ята', hex: '#d1fae5', border: '#6ee7b7' },
    { name: 'Небо', hex: '#e0f2fe', border: '#7dd3fc' },
    { name: 'Лаванда', hex: '#ede9fe', border: '#c4b5fd' },
    { name: 'Троянда', hex: '#ffe4e6', border: '#fda4af' },
    { name: 'Перлина', hex: '#f3f4f6', border: '#d1d5db' },
  ];

  if (!isOpen || !person) return null;

  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ') || '?';
  const lifeDates = formatPersonLifeDates(person);
  const formattedBirth = formatSingleDate(person.birthDay, person.birthMonth, person.birthYear, '.') || person.birthDate;
  const formattedDeath = formatSingleDate(person.deathDay, person.deathMonth, person.deathYear, '.') || person.deathDate;
  const personAge = calculateAge(person);

  // Get parent objects (deduplicated)
  const parents = Array.from(new Set(person.parents || [])).map((id) => allPersons[id]).filter(Boolean);
  // Get spouse objects (deduplicated)
  const spouses = Array.from(new Set(person.spouses || [])).map((id) => allPersons[id]).filter(Boolean);
  // Get child objects (deduplicated)
  const children = Array.from(new Set(person.children || [])).map((id) => allPersons[id]).filter(Boolean);

  // Calculate siblings: people who share at least one parent or are linked directly as siblings
  const siblings = Array.from(new Set(Object.values(allPersons).filter((other) => {
    if (other.id === person.id) return false;
    const sharesParent =
      person.parents &&
      person.parents.length > 0 &&
      other.parents?.some((pId) => person.parents.includes(pId));
    const isDirectSibling =
      person.siblings?.includes(other.id) || other.siblings?.includes(person.id);
    return sharesParent || isDirectSibling;
  })));

  const hasBiographicalDetails = !!(
    formattedBirth ||
    personAge ||
    person.birthPlace ||
    formattedDeath ||
    person.deathPlace ||
    person.residencePlace ||
    person.burialPlace ||
    person.houseNumber ||
    person.profession ||
    person.deathCause ||
    person.godparents
  );

  const parseYearInput = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return {};
    const rangeMatch = trimmed.match(/^(\d{4})\s*[\–\-–—]\s*(\d{4})$/);
    if (rangeMatch) {
      return {
        birthYear: rangeMatch[1],
        birthYearEnd: rangeMatch[2],
        isBirthDateApproximate: true,
        birthDateType: 'period' as const,
        birthDate: `${rangeMatch[1]}–${rangeMatch[2]}`,
      };
    }
    const isApprox = /^бл\.|^близько|^\~|^circa/i.test(trimmed);
    const yearMatch = trimmed.match(/\b(1[6-9]\d{2}|20\d{2})\b/);
    if (isApprox && yearMatch) {
      return {
        birthYear: yearMatch[1],
        isBirthDateApproximate: true,
        birthDateType: 'about' as const,
        birthDate: `бл. ${yearMatch[1]}`,
      };
    }
    return {
      birthYear: trimmed,
      birthDate: trimmed,
    };
  };

  const handleSaveQuickEdit = () => {
    if (!person || !onUpdatePerson) return;
    const bYearTrim = quickForm.birthYear.trim();
    const dYearTrim = quickForm.deathYear.trim();
    const parsedBirth = parseYearInput(bYearTrim);

    const updated: Person = {
      ...person,
      firstName: quickForm.firstName.trim() || 'Без імені',
      lastName: quickForm.lastName.trim() || '',
      patronymic: quickForm.patronymic.trim() || undefined,
      clanName: quickForm.clanName.trim() || undefined,
      maidenName: quickForm.maidenName.trim() || undefined,
      nickname: quickForm.nickname.trim() || undefined,
      birthPlace: quickForm.birthPlace.trim() || undefined,
      profession: quickForm.profession.trim() || undefined,
      houseNumber: quickForm.houseNumber.trim() || undefined,
      isDeceased: quickForm.isDeceased || !!dYearTrim,
      birthYear: parsedBirth.birthYear || bYearTrim || person.birthYear,
      birthYearEnd: parsedBirth.birthYearEnd || (bYearTrim ? undefined : person.birthYearEnd),
      isBirthDateApproximate: parsedBirth.isBirthDateApproximate ?? (bYearTrim ? false : person.isBirthDateApproximate),
      birthDateType: parsedBirth.birthDateType || (bYearTrim ? 'exact' : person.birthDateType),
      deathYear: dYearTrim || (quickForm.isDeceased ? person.deathYear : undefined),
      birthDate: parsedBirth.birthDate || bYearTrim || person.birthDate,
      deathDate: dYearTrim || (quickForm.isDeceased ? person.deathDate : undefined),
    };

    onUpdatePerson(updated);
    setIsQuickEditing(false);
  };

  const handleSaveHouseNumber = () => {
    if (!person || !onUpdatePerson) {
      setEditingHouseNumber(false);
      return;
    }
    const val = tempHouseNumber.trim();
    onUpdatePerson({
      ...person,
      houseNumber: val || undefined,
    });
    setEditingHouseNumber(false);
  };

  const handleSaveMaidenName = () => {
    if (!person || !onUpdatePerson) {
      setEditingMaidenName(false);
      return;
    }
    const val = tempMaidenName.trim();
    onUpdatePerson({
      ...person,
      maidenName: val || undefined,
    });
    setEditingMaidenName(false);
  };

  const handleSaveYears = () => {
    if (!person || !onUpdatePerson) {
      setEditingYears(false);
      return;
    }
    const bTrim = tempBirthYear.trim();
    const dTrim = tempDeathYear.trim();
    const parsedBirth = parseYearInput(bTrim);

    onUpdatePerson({
      ...person,
      birthYear: parsedBirth.birthYear || bTrim || undefined,
      birthYearEnd: parsedBirth.birthYearEnd || (bTrim ? undefined : person.birthYearEnd),
      isBirthDateApproximate: parsedBirth.isBirthDateApproximate ?? (bTrim ? false : person.isBirthDateApproximate),
      birthDateType: parsedBirth.birthDateType || (bTrim ? 'exact' : person.birthDateType),
      deathYear: dTrim || (person.isDeceased ? person.deathYear : undefined),
      birthDate: parsedBirth.birthDate || bTrim || person.birthDate,
      deathDate: dTrim || (person.isDeceased ? person.deathDate : undefined),
      isDeceased: person.isDeceased || !!dTrim,
    });
    setEditingYears(false);
  };

  const handleApplyClan = (clanNameValue: string) => {
    if (!person || !onUpdatePerson) return;
    const trimmed = clanNameValue.trim();
    const updated: Person = {
      ...person,
      clanName: trimmed || undefined,
    };
    onUpdatePerson(updated);
    setQuickForm((prev) => ({ ...prev, clanName: trimmed }));
    setIsClanDrawerOpen(false);
  };

  const handleApplyColor = (colorHex: string) => {
    if (!person) return;
    if (onSetCardColor) {
      onSetCardColor(person.id, colorHex);
    } else if (onUpdatePerson) {
      onUpdatePerson({ ...person, cardBgColor: colorHex });
    }
  };

  const handleCopyColor = () => {
    const color = person.cardBgColor || '#e8efe9';
    if (onCopyColor) {
      onCopyColor(color);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    }
  };

  const handlePasteColor = () => {
    if (copiedCardColor) {
      if (onPasteColor) {
        onPasteColor(person.id);
      } else {
        handleApplyColor(copiedCardColor);
      }
    }
  };

  return (
    <aside
      className="fixed top-13 right-0 bottom-0 w-full sm:w-88 max-w-full sm:max-w-md bg-white border-l border-stone-200/90 shadow-xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
    >
      {/* Top Header */}
      <div className="px-5 py-4 bg-[#f5f8f5] border-b border-[#d8e2d9] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600">
            Відомості про особу
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Existing Person Reactions List */}
        {person.reactions && person.reactions.length > 0 && (
          <div className="bg-rose-50/80 rounded-xl p-3.5 border border-rose-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                <Heart size={13} className="text-rose-600 shrink-0 fill-rose-600" />
                <span>Реакції відвідувачів ({person.reactions.length})</span>
              </h4>
              {isAdmin && onOpenReactionsModal && (
                <button
                  onClick={onOpenReactionsModal}
                  className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                >
                  Управління реакціями →
                </button>
              )}
            </div>
            <div className="space-y-2">
              {person.reactions.map((r, idx) => (
                <div
                  key={r.id || idx}
                  className="p-2.5 rounded-lg bg-white border border-rose-100 shadow-2xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{r.emoji}</span>
                    <div className="min-w-0 text-xs">
                      <div className="font-semibold text-stone-800 truncate">
                        {r.userName || 'Гість'}
                        {r.userEmail && <span className="text-stone-400 font-normal ml-1 text-[10px]">({r.userEmail})</span>}
                      </div>
                      {r.createdAt && <div className="text-[10px] text-stone-400">{r.createdAt}</div>}
                    </div>
                  </div>
                  {isAdmin && onDeleteReaction && (
                    <button
                      onClick={() => onDeleteReaction(person.id, r.id || idx)}
                      className="p-1 rounded bg-stone-100 hover:bg-rose-100 text-stone-500 hover:text-rose-700 transition-colors text-xs cursor-pointer"
                      title="Видалити реакцію"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unified Minimalist Card Management Block */}
        <div
          style={{ backgroundColor: person.cardBgColor || '#e8efe9' }}
          className="p-3.5 sm:p-4 rounded-2xl border border-stone-300/80 flex flex-col items-center text-center relative shadow-xs transition-colors"
        >
          {/* Top-Left Settings Gear Button */}
          <button
            onClick={() => onEdit(person)}
            className="absolute top-3 left-3 w-7 h-7 rounded-full bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title="Відкрити повний редактор картки з усіма полями"
            aria-label="Розширені налаштування"
          >
            <Settings size={14} className="text-stone-700" />
          </button>

          {/* Top-Right Clickable Verified Checkmark / Question Mark Icon */}
          <button
            onClick={() => onToggleFullyVerified && onToggleFullyVerified(person.id)}
            className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs border ${
              person.isFullyVerified
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-emerald-700/20'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
            }`}
            title={person.isFullyVerified ? "Статус: Перевірена (клацніть, щоб змінити на 'Не перевірена')" : "Статус: Не перевірена (клацніть, щоб змінити на 'Перевірена')"}
            aria-label={person.isFullyVerified ? 'Статус: Перевірена' : 'Статус: Не перевірена'}
          >
            {person.isFullyVerified ? (
              <Check size={14} strokeWidth={3} className="text-white shrink-0" />
            ) : (
              <span className="font-black text-[14px] leading-none text-amber-900 select-none pb-0.5">?</span>
            )}
          </button>

          {/* Avatar and Quick Gender Switcher */}
          <div className="relative flex items-center justify-center">
            <SilhouetteAvatar
              gender={person.gender}
              avatarUrl={person.avatarUrl}
              name={fullName}
              size="lg"
            />
            {isAdmin && onUpdatePerson && (
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-xl border border-stone-200 shadow-sm z-20">
                <button
                  type="button"
                  onClick={() => onUpdatePerson({ ...person, gender: 'male' })}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                    person.gender === 'male'
                      ? 'bg-blue-600 text-white shadow-xs scale-105'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                  title="Чоловіча стать (Ч)"
                >
                  ♂
                </button>
                <button
                  type="button"
                  onClick={() => onUpdatePerson({ ...person, gender: 'female' })}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                    person.gender === 'female'
                      ? 'bg-rose-600 text-white shadow-xs scale-105'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                  title="Жіноча стать (Ж)"
                >
                  ♀
                </button>
              </div>
            )}
          </div>

          {/* Name & House Number */}
          <h2 className="mt-2.5 text-base font-bold text-stone-900 leading-tight">
            {fullName}
          </h2>

          {/* User Self Badge */}
          {userPersonId === person.id && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-900 text-[11px] font-bold border border-amber-400/60">
              <UserCheck size={12} className="text-amber-700 shrink-0" />
              <span>Це ви у дереві</span>
            </div>
          )}

          {/* Quick button to set as "This is Me" if not yet user */}
          {!userPersonId && onSetUserPersonId && (
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => onSetUserPersonId(person.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-emerald-100 text-emerald-900 text-[10.5px] font-medium border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
                title="Позначити цю особу як себе у родинному дереві"
              >
                <UserCheck size={11} className="text-emerald-700" />
                <span>Позначити як «Це я»</span>
              </button>
            </div>
          )}

          {/* Clickable In-place Badges: House #, Maiden name (по мамі), Years, Nickname */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
            {/* 1. Номер дому (всередині картки) */}
            {editingHouseNumber ? (
              <div className="inline-flex items-center gap-1 text-xs bg-white border border-emerald-500 px-2 py-0.5 rounded-md shadow-2xs">
                <Home size={11} className="text-amber-800 shrink-0" />
                <span className="text-emerald-800 font-mono font-bold text-[10px]">№</span>
                <input
                  type="text"
                  autoFocus
                  value={tempHouseNumber}
                  onChange={(e) => setTempHouseNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveHouseNumber();
                    if (e.key === 'Escape') setEditingHouseNumber(false);
                  }}
                  onBlur={handleSaveHouseNumber}
                  placeholder="329"
                  className="w-12 bg-transparent text-emerald-950 font-bold focus:outline-hidden text-center text-xs font-mono"
                />
                <button
                  onClick={handleSaveHouseNumber}
                  className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  title="Зберегти"
                >
                  <Check size={11} />
                </button>
              </div>
            ) : person.houseNumber ? (
              <button
                onClick={() => {
                  setTempHouseNumber(person.houseNumber || '');
                  setEditingHouseNumber(true);
                  setEditingMaidenName(false);
                  setEditingYears(false);
                }}
                className="text-xs text-stone-800 bg-white/90 hover:bg-white px-2 py-0.5 rounded-md border border-stone-300 hover:border-amber-400 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
                title="Клікніть, щоб змінити номер дому народження"
              >
                <Home size={10} className="text-amber-800 shrink-0" />
                <span className="font-mono font-bold text-stone-900">№{person.houseNumber}</span>
                <Pencil size={9} className="text-stone-400" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setTempHouseNumber('');
                  setEditingHouseNumber(true);
                  setEditingMaidenName(false);
                  setEditingYears(false);
                }}
                className="text-xs text-stone-500 hover:text-stone-800 bg-white/60 hover:bg-white px-2 py-0.5 rounded-md border border-dashed border-stone-300 hover:border-stone-400 transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                title="Додати номер дому народження"
              >
                <Home size={10} className="text-stone-400 shrink-0" />
                <span className="text-[11px]">+ № дому</span>
              </button>
            )}


            {/* 2. Прізвище по мамі / дівоче прізвище (тільки для жінок) */}
            {person.gender === 'female' && (
              editingMaidenName ? (
                <div className="inline-flex items-center gap-1 text-xs bg-white border border-stone-400 px-2 py-0.5 rounded-md shadow-2xs">
                  <span className="text-stone-500 text-[10px]">по мамі:</span>
                  <input
                    type="text"
                    autoFocus
                    value={tempMaidenName}
                    onChange={(e) => setTempMaidenName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveMaidenName();
                      if (e.key === 'Escape') setEditingMaidenName(false);
                    }}
                    onBlur={handleSaveMaidenName}
                    placeholder="Прізвище"
                    className="w-20 bg-transparent text-stone-900 text-xs focus:outline-hidden"
                  />
                  <button
                    onClick={handleSaveMaidenName}
                    className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    title="Зберегти"
                  >
                    <Check size={11} />
                  </button>
                </div>
              ) : person.maidenName ? (
                <button
                  onClick={() => {
                    setTempMaidenName(person.maidenName || '');
                    setEditingMaidenName(true);
                    setEditingHouseNumber(false);
                    setEditingYears(false);
                  }}
                  className="text-xs text-stone-800 bg-white/80 hover:bg-white px-2 py-0.5 rounded-md border border-stone-300 hover:border-stone-400 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
                  title="Клікніть, щоб змінити дівоче прізвище / по мамі"
                >
                  <span className="text-stone-500 text-[10px]">по мамі:</span>
                  <span className="font-semibold">{person.maidenName}</span>
                  <Pencil size={9} className="text-stone-400" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTempMaidenName('');
                    setEditingMaidenName(true);
                    setEditingHouseNumber(false);
                    setEditingYears(false);
                  }}
                  className="text-[11px] text-stone-600 hover:text-stone-900 bg-white/60 hover:bg-white px-2 py-0.5 rounded-md border border-dashed border-stone-300 hover:border-stone-400 transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                  title="Клікніть, щоб вказати дівоче прізвище / по мамі"
                >
                  <span>по мамі: ...</span>
                  <Pencil size={9} className="text-stone-400" />
                </button>
              )
            )}

            {/* Прізвисько (якщо вказано) */}
            {person.nickname && (
              <span className="text-xs italic text-stone-700 bg-white/60 px-2 py-0.5 rounded-md border border-stone-200/60">
                «{person.nickname}»
              </span>
            )}

            {/* 3. Роки (клікабельно прямо там) */}
            {editingYears ? (
              <div className="inline-flex items-center gap-1 text-xs font-mono bg-white border border-emerald-500 px-2 py-0.5 rounded-md shadow-2xs">
                <input
                  type="text"
                  autoFocus
                  value={tempBirthYear}
                  onChange={(e) => setTempBirthYear(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveYears();
                    if (e.key === 'Escape') setEditingYears(false);
                  }}
                  placeholder="1910–1912"
                  className="w-24 bg-transparent text-emerald-950 font-bold focus:outline-hidden text-center"
                />
                <span className="text-stone-400">—</span>
                <input
                  type="text"
                  value={tempDeathYear}
                  onChange={(e) => setTempDeathYear(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveYears();
                    if (e.key === 'Escape') setEditingYears(false);
                  }}
                  placeholder="†"
                  className="w-12 bg-transparent text-emerald-950 font-bold focus:outline-hidden text-center"
                />
                <button
                  onClick={handleSaveYears}
                  className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  title="Зберегти"
                >
                  <Check size={11} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTempBirthYear(person.birthDate || person.birthYear || '');
                  setTempDeathYear(person.deathDate || person.deathYear || '');
                  setEditingYears(true);
                  setEditingHouseNumber(false);
                  setEditingMaidenName(false);
                }}
                className="text-xs font-mono font-medium text-emerald-950 bg-emerald-50/90 hover:bg-emerald-100/90 px-2.5 py-0.5 rounded-md border border-emerald-200/70 hover:border-emerald-400 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
                title="Клікніть, щоб змінити роки прямо тут"
              >
                <span>{lifeDates || 'Роки: ...'}</span>
                <Pencil size={9} className="text-emerald-700 opacity-60" />
              </button>
            )}
          </div>


          {/* Biographical details ONLY if at least one field is defined (Eliminates empty rectangle glitch) */}
          {hasBiographicalDetails && (
            <div className="mt-2.5 w-full bg-white/80 rounded-xl p-2.5 border border-stone-200/90 text-[11px] space-y-1.5 text-left shadow-2xs backdrop-blur-2xs">
              {formattedBirth && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Народження:</span>
                  <button
                    type="button"
                    onClick={() => onOpenMetricModal && onOpenMetricModal(person, 'birth')}
                    className={`font-mono font-medium text-xs px-2 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                      person.birthMetricUrl || person.metricDocuments?.some((d) => d.type === 'birth')
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold border border-amber-300/80 shadow-2xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                    }`}
                    title="Клацніть, щоб завантажити або переглянути фото з метричної книги"
                  >
                    <Camera
                      size={12}
                      className={
                        person.birthMetricUrl || person.metricDocuments?.some((d) => d.type === 'birth')
                          ? 'text-amber-800 shrink-0'
                          : 'text-stone-400 shrink-0'
                      }
                    />
                    <span>{formattedBirth}</span>
                    {personAge && (
                      <span className="text-[10px] font-semibold text-emerald-900 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 ml-1">
                        {personAge}
                      </span>
                    )}
                  </button>
                </div>
              )}
              {person.birthPlace && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Місце народж.:</span>
                  <span className="text-stone-800 font-medium truncate max-w-[170px]" title={person.birthPlace}>{person.birthPlace}</span>
                </div>
              )}
              {formattedDeath && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Смерть:</span>
                  <button
                    type="button"
                    onClick={() => onOpenMetricModal && onOpenMetricModal(person, 'death')}
                    className={`font-mono font-medium text-xs px-2 py-0.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                      person.deathMetricUrl || person.metricDocuments?.some((d) => d.type === 'death')
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold border border-amber-300/80 shadow-2xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                    }`}
                    title="Клацніть, щоб завантажити або переглянути фото з метричної книги"
                  >
                    <Camera
                      size={12}
                      className={
                        person.deathMetricUrl || person.metricDocuments?.some((d) => d.type === 'death')
                          ? 'text-amber-800 shrink-0'
                          : 'text-stone-400 shrink-0'
                      }
                    />
                    <span>{formattedDeath}</span>
                  </button>
                </div>
              )}
              {person.deathPlace && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Місце смерті:</span>
                  <span className="text-stone-800 font-medium truncate max-w-[170px]" title={person.deathPlace}>{person.deathPlace}</span>
                </div>
              )}
              {person.residencePlace && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Проживання:</span>
                  <span className="text-stone-800 font-medium truncate max-w-[170px]" title={person.residencePlace}>{person.residencePlace}</span>
                </div>
              )}
              {person.burialPlace && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Поховання:</span>
                  <span className="text-stone-800 font-medium truncate max-w-[170px]" title={person.burialPlace}>{person.burialPlace}</span>
                </div>
              )}
              {person.houseNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Номер дому:</span>
                  <span className="font-mono font-bold text-emerald-800">№{person.houseNumber}</span>
                </div>
              )}
              {person.profession && (
                <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                  <span className="text-stone-500">Професія:</span>
                  <span className="font-medium text-emerald-900 truncate max-w-[170px]" title={person.profession}>{person.profession}</span>
                </div>
              )}
              {person.deathCause && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Причина смерті:</span>
                  <span className="text-stone-800 italic truncate max-w-[170px]" title={person.deathCause}>{person.deathCause}</span>
                </div>
              )}
              {person.godparents && (
                <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                  <span className="text-stone-500">Хресні / Куми:</span>
                  <span className="text-stone-800 font-medium truncate max-w-[170px]" title={person.godparents}>{person.godparents}</span>
                </div>
              )}
            </div>
          )}

          {/* Minimalist Card Management Toolstrip */}
          {isAdmin && (
            <div className="mt-2.5 w-full bg-white/90 p-1.5 rounded-xl border border-stone-200/90 shadow-2xs flex items-center justify-between gap-1">
              <button
                onClick={() => {
                  setIsQuickEditing((prev) => !prev);
                  setIsColorDrawerOpen(false);
                  setIsClanDrawerOpen(false);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isQuickEditing
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200/80'
                }`}
                title="Швидко відредагувати інформацію картки тут"
              >
                <Pencil size={12} />
                <span>Редагувати</span>
              </button>

              <button
                onClick={() => {
                  setIsColorDrawerOpen((prev) => !prev);
                  setIsQuickEditing(false);
                  setIsClanDrawerOpen(false);
                }}
                className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isColorDrawerOpen
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80'
                }`}
                title="Змінити, скопіювати або вставити колір картки"
              >
                <Palette size={12} />
                <span>Колір</span>
              </button>

              {onOpenConnectModal && (
                <button
                  onClick={() => onOpenConnectModal(person)}
                  className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80 transition-colors cursor-pointer"
                  title="З'єднати з іншою гілкою або родичем"
                >
                  <Link2 size={13} />
                </button>
              )}

              <button
                onClick={() => {
                  if (person.isChronologicallyPinned) {
                    onToggleChronologicalPin && onToggleChronologicalPin(person.id);
                  } else {
                    onAlignChronologically && onAlignChronologically(person.id);
                  }
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                  person.isChronologicallyPinned
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200/80'
                }`}
                title={person.isChronologicallyPinned ? 'Відкріпити від шкали років' : 'Прикріпити до шкали років'}
              >
                {person.isChronologicallyPinned ? <Pin size={13} className="fill-current text-amber-800" /> : <Clock size={13} />}
              </button>


            </div>
          )}

          {/* Color Drawer */}
          {isColorDrawerOpen && (
            <div className="mt-2 w-full p-2.5 bg-white rounded-xl border border-stone-200 shadow-xs space-y-2 text-left animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Palette size={12} className="text-emerald-700" />
                  <span>Колір картки</span>
                </span>
                <button
                  onClick={() => setIsColorDrawerOpen(false)}
                  className="text-stone-400 hover:text-stone-700 text-xs px-1"
                >
                  ✕
                </button>
              </div>

              {/* Copy & Paste Row */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyColor}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Скопіювати цей колір фону"
                >
                  {justCopied ? (
                    <>
                      <Check size={12} className="text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Скопійовано!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} className="text-stone-500" />
                      <span>Скопіювати</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handlePasteColor}
                  disabled={!copiedCardColor}
                  className={`flex-1 py-1.5 px-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    copiedCardColor
                      ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-stone-50 border-stone-200 text-stone-400 cursor-not-allowed opacity-60'
                  }`}
                  title={copiedCardColor ? `Вставити скопійований колір (${copiedCardColor})` : 'Спочатку скопіюйте колір з іншої картки'}
                >
                  {copiedCardColor && (
                    <span
                      className="w-3 h-3 rounded-full border border-black/20 shadow-2xs shrink-0"
                      style={{ backgroundColor: copiedCardColor }}
                    />
                  )}
                  <Clipboard size={12} />
                  <span>Вставити колір</span>
                </button>
              </div>

              {/* Preset Color Swatches */}
              <div>
                <div className="text-[10px] text-stone-500 mb-1 font-medium">Гармонійні відтінки:</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {PRESET_CARD_COLORS.map((preset) => {
                    const isSelected = (person.cardBgColor || '#e8efe9').toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        onClick={() => handleApplyColor(preset.hex)}
                        className="group flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-stone-50 border border-stone-100 hover:border-stone-300 transition-all cursor-pointer"
                        title={preset.name}
                      >
                        <div
                          className="w-7 h-7 rounded-full border shadow-2xs flex items-center justify-center transition-transform group-hover:scale-105"
                          style={{ backgroundColor: preset.hex, borderColor: preset.border }}
                        >
                          {isSelected && <Check size={12} className="text-stone-800" />}
                        </div>
                        <span className="text-[9.5px] text-stone-600 truncate max-w-full font-medium">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Input */}
              <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[10px] text-stone-500">Власний колір:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={person.cardBgColor || '#e8efe9'}
                    onChange={(e) => handleApplyColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border border-stone-300"
                    title="Вибрати точний колір"
                  />
                  <span className="text-[10px] font-mono text-stone-600">
                    {person.cardBgColor || '#e8efe9'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Inline Quick Edit Form */}
          {isQuickEditing && (
            <div className="mt-2.5 w-full bg-white p-3 rounded-xl border border-emerald-300 shadow-sm space-y-2.5 text-left animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Pencil size={12} className="text-emerald-700" />
                  <span>Швидке редагування</span>
                </span>
                <button
                  onClick={() => onEdit(person)}
                  className="text-[10px] font-semibold text-emerald-800 hover:underline flex items-center gap-0.5"
                >
                  <span>Повний редактор</span>
                  <ChevronRight size={10} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-stone-600 block mb-0.5">Ім'я *</label>
                  <input
                    type="text"
                    value={quickForm.firstName}
                    onChange={(e) => setQuickForm({ ...quickForm, firstName: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-stone-300 focus:border-emerald-600 focus:outline-hidden text-xs bg-stone-50/50"
                    placeholder="Ім'я"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-stone-600 block mb-0.5">Прізвище</label>
                  <input
                    type="text"
                    value={quickForm.lastName}
                    onChange={(e) => setQuickForm({ ...quickForm, lastName: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-stone-300 focus:border-emerald-600 focus:outline-hidden text-xs bg-stone-50/50"
                    placeholder="Прізвище"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-stone-600 block mb-0.5">По батькові</label>
                  <input
                    type="text"
                    value={quickForm.patronymic}
                    onChange={(e) => setQuickForm({ ...quickForm, patronymic: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-stone-300 focus:border-emerald-600 focus:outline-hidden text-xs bg-stone-50/50"
                    placeholder="По батькові"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-stone-600 block mb-0.5">Рід (назва)</label>
                  <input
                    type="text"
                    value={quickForm.clanName}
                    onChange={(e) => setQuickForm({ ...quickForm, clanName: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-stone-300 focus:border-emerald-600 focus:outline-hidden text-xs bg-stone-50/50"
                    placeholder="Рід"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-stone-600 block mb-0.5">Рік / період нар.</label>
                  <input
                    type="text"
                    value={quickForm.birthYear}
                    onChange={(e) => setQuickForm({ ...quickForm, birthYear: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-stone-300 focus:border-emerald-600 focus:outline-hidden text-xs bg-stone-50/50 font-mono"
                    placeholder="1925 або 1910–1912"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-stone-600 block mb-0.5">Рік смерті</label>
                  <input
                    type="text"
                    value={quickForm.deathYear}
                    onChange={(e) => setQuickForm({ ...quickForm, deathYear: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-stone-300 focus:border-emerald-600 focus:outline-hidden text-xs bg-stone-50/50 font-mono"
                    placeholder="РРРР"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-stone-600 block mb-0.5">Місце народження</label>
                  <input
                    type="text"
                    value={quickForm.birthPlace}
                    onChange={(e) => setQuickForm({ ...quickForm, birthPlace: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-stone-300 focus:border-emerald-600 focus:outline-hidden text-xs bg-stone-50/50"
                    placeholder="Село / Місто"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-stone-600 block mb-0.5">Номер хати</label>
                  <input
                    type="text"
                    value={quickForm.houseNumber}
                    onChange={(e) => setQuickForm({ ...quickForm, houseNumber: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-stone-300 focus:border-emerald-600 focus:outline-hidden text-xs bg-stone-50/50 font-mono"
                    placeholder="№"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-stone-600 block mb-0.5">Професія / Заняття</label>
                <input
                  type="text"
                  value={quickForm.profession}
                  onChange={(e) => setQuickForm({ ...quickForm, profession: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border border-stone-300 focus:border-emerald-600 focus:outline-hidden text-xs bg-stone-50/50"
                  placeholder="Наприклад: коваль, вчитель"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                <button
                  onClick={handleSaveQuickEdit}
                  className="flex-1 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check size={13} />
                  <span>Зберегти зміни</span>
                </button>
                <button
                  onClick={() => setIsQuickEditing(false)}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
              </div>
            </div>
          )}

          {/* Quick Add Relative Actions in Unified Block */}
          {isAdmin && (
            <div className="mt-3 w-full pt-2.5 border-t border-stone-300/70">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <Users size={12} className="text-emerald-700" />
                  <span>Додати до картки</span>
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onAddRelative(person, 'father')}
                  className="px-2.5 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200/80 text-emerald-950 text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <User size={12} />
                  </div>
                  <span className="truncate">Батько</span>
                </button>

                <button
                  onClick={() => onAddRelative(person, 'mother')}
                  className="px-2.5 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200/80 text-emerald-950 text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <User size={12} />
                  </div>
                  <span className="truncate">Мати</span>
                </button>

                <button
                  onClick={() => onAddRelative(person, 'spouse')}
                  className="px-2.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-rose-200/80 text-rose-950 text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                  title={person.gender === 'female' ? 'Додати чоловіка' : 'Додати дружину'}
                >
                  <div className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Heart size={12} />
                  </div>
                  <span className="truncate">
                    {person.gender === 'female'
                      ? 'Чоловік'
                      : person.gender === 'male'
                      ? 'Дружина'
                      : 'Подружжя'}
                  </span>
                </button>

                <button
                  onClick={() => onAddRelative(person, 'child')}
                  className="px-2.5 py-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-200/80 text-amber-950 text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Users size={12} />
                  </div>
                  <span className="truncate">Дитина</span>
                </button>

                <button
                  onClick={() => onAddRelative(person, 'sibling')}
                  className="col-span-2 px-2.5 py-2 rounded-xl bg-white hover:bg-sky-50 border border-sky-200/80 text-sky-950 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="w-5 h-5 rounded-md bg-sky-100 text-sky-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Users size={12} />
                  </div>
                  <span>Брат / Сестра</span>
                </button>
              </div>
            </div>
          )}

          {/* Lineage / Clan Bar placed right under "Додати до картки" */}
          <div className="mt-3 w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-white/85 border border-stone-200/90 shadow-2xs backdrop-blur-2xs">
            <div className="flex items-center gap-2 min-w-0">
              {personClanInfo?.coatOfArmsUrl ? (
                <img
                  src={personClanInfo.coatOfArmsUrl}
                  alt={`Герб ${personClanInfo.name}`}
                  className="w-7 h-8 object-contain rounded drop-shadow-2xs shrink-0 cursor-pointer"
                  onClick={() => onOpenClanCoatOfArmsModal && onOpenClanCoatOfArmsModal(personClanInfo)}
                  title="Переглянути герб роду"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: personClanInfo?.badgeBg || '#fef3c7',
                    color: personClanInfo?.color || '#92400e',
                    borderColor: personClanInfo?.borderColor || '#fde68a',
                  }}
                >
                  <Shield size={14} />
                </div>
              )}
              <div className="min-w-0 text-left">
                <div className="text-[9.5px] uppercase font-bold tracking-wider text-stone-400 leading-none">
                  Рід
                </div>
                <div className="text-xs font-bold text-stone-900 truncate">
                  {person.clanName || personClanName || 'Не вказано'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {personClanInfo && onOpenClanCoatOfArmsModal && (
                <button
                  onClick={() => onOpenClanCoatOfArmsModal(personClanInfo)}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition-colors cursor-pointer"
                  title="Герб роду"
                >
                  {personClanInfo.coatOfArmsUrl ? 'Герб ✓' : '+ Герб'}
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    setIsClanDrawerOpen((prev) => !prev);
                    setIsColorDrawerOpen(false);
                    setIsQuickEditing(false);
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer border ${
                    isClanDrawerOpen
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                      : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
                  }`}
                  title="Вказати або змінити рід цієї картки"
                >
                  {isClanDrawerOpen ? 'Закрити' : 'Вказати рід'}
                </button>
              )}
            </div>
          </div>

          {/* Clan Selection Drawer */}
          {isClanDrawerOpen && (
            <div className="mt-2 w-full p-2.5 bg-white rounded-xl border border-emerald-300 shadow-xs space-y-2 text-left animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                  Вказати рід картки
                </span>
                <button
                  onClick={() => setIsClanDrawerOpen(false)}
                  className="text-stone-400 hover:text-stone-700 text-xs px-1"
                >
                  ✕
                </button>
              </div>

              {availableClans.length > 0 && (
                <div>
                  <div className="text-[10px] text-stone-500 mb-1 font-medium">Оберіть із наявних родів:</div>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                    {availableClans.map((clan) => (
                      <button
                        key={clan}
                        onClick={() => handleApplyClan(clan)}
                        className={`text-[11px] px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                          (person.clanName || personClanName) === clan
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        {clan}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1.5 border-t border-stone-100">
                <div className="text-[10px] text-stone-500 mb-1 font-medium">Або впишіть назву роду:</div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customClanText}
                    onChange={(e) => setCustomClanText(e.target.value)}
                    placeholder="Наприклад: Кобилецький"
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-emerald-600 bg-stone-50/60"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customClanText.trim()) {
                        handleApplyClan(customClanText.trim());
                      }
                    }}
                  />
                  <button
                    onClick={() => customClanText.trim() && handleApplyClan(customClanText.trim())}
                    disabled={!customClanText.trim()}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Зберегти
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 1. БІОГРАФІЯ */}
        {person.biography && (
          <div className="bg-[#f5f8f5] rounded-xl p-3.5 border border-emerald-200/80 shadow-2xs space-y-1.5">
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen size={14} className="text-emerald-800 shrink-0" />
              <span>1. Біографія</span>
            </h4>
            <p className="text-xs text-stone-800 leading-relaxed font-sans whitespace-pre-wrap">
              {person.biography}
            </p>
          </div>
        )}

        {/* 2. ГЕОГРАФІЯ */}
        {(person.birthPlace || person.residencePlace || person.migrationNotes || person.deathPlace || person.burialPlace) && (
          <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 shadow-2xs space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <MapPin size={14} className="text-emerald-700 shrink-0" />
              <span>2. Географія та місця</span>
            </h4>
            <div className="text-xs space-y-1 text-stone-800">
              {person.birthPlace && (
                <div><span className="text-stone-500 font-medium">Народження:</span> {person.birthPlace}</div>
              )}
              {person.residencePlace && (
                <div><span className="text-stone-500 font-medium">Проживання:</span> {person.residencePlace}</div>
              )}
              {person.migrationNotes && (
                <div><span className="text-stone-500 font-medium">Міграція / переїзди:</span> {person.migrationNotes}</div>
              )}
              {person.deathPlace && (
                <div><span className="text-stone-500 font-medium">Місце смерті:</span> {person.deathPlace}</div>
              )}
              {person.burialPlace && (
                <div><span className="text-stone-500 font-medium">Поховання:</span> {person.burialPlace}</div>
              )}
            </div>
          </div>
        )}

        {/* 3. НАВЧАННЯ Й ПРОФЕСІЯ */}
        {(person.education || person.profession || person.workplaceNotes) && (
          <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 shadow-2xs space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Briefcase size={14} className="text-emerald-700 shrink-0" />
              <span>3. Навчання й професія</span>
            </h4>
            <div className="text-xs space-y-1 text-stone-800">
              {person.education && (
                <div><span className="text-stone-500 font-medium">Освіта:</span> {person.education}</div>
              )}
              {person.profession && (
                <div><span className="text-stone-500 font-medium">Професія:</span> {person.profession}</div>
              )}
              {person.workplaceNotes && (
                <div><span className="text-stone-500 font-medium">Робота / служба:</span> {person.workplaceNotes}</div>
              )}
            </div>
          </div>
        )}

        {/* 4. ПОВИТУХА \ ХРЕСНІ \ КУМИ */}
        {(person.midwife || person.godparents || person.deathCause) && (
          <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 shadow-2xs space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <UserCheck size={14} className="text-emerald-700 shrink-0" />
              <span>4. Повитуха \ хресні \ куми</span>
            </h4>
            <div className="text-xs space-y-1 text-stone-800">
              {person.midwife && (
                <div><span className="text-stone-500 font-medium">Повитуха:</span> {person.midwife}</div>
              )}
              {person.godparents && (
                <div><span className="text-stone-500 font-medium">Хресні / куми:</span> {person.godparents}</div>
              )}
              {person.deathCause && (
                <div><span className="text-stone-500 font-medium">Причина смерті:</span> {person.deathCause}</div>
              )}
            </div>
          </div>
        )}

        {/* 5. ЦІКАВІ ІСТОРІЇ */}
        {(person.interestingStories || person.notes) && (
          <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/90 shadow-2xs space-y-1.5">
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-700 shrink-0" />
              <span>5. Цікаві історії</span>
            </h4>
            <p className="text-xs text-stone-800 leading-relaxed font-sans whitespace-pre-wrap">
              {person.interestingStories || person.notes}
            </p>
          </div>
        )}

        {/* Pets Section */}

        {person.pets && person.pets.length > 0 && (
          <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 shadow-2xs space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Dog size={14} className="text-emerald-700 shrink-0" />
              <span>Домашні улюбленці ({person.pets.length})</span>
            </h4>
            <div className="space-y-1.5">
              {person.pets.map((pet) => (
                <div key={pet.id} className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-stone-200 shadow-2xs">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs shrink-0">
                    {pet.type === 'cat' ? '🐱' : pet.type === 'bird' ? '🦜' : pet.type === 'horse' ? '🐴' : pet.type === 'cow' ? '🐮' : '🐶'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 truncate">{pet.name}</span>
                      {pet.isCouplePet && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-medium shrink-0">
                          Пара
                        </span>
                      )}
                    </div>
                    {pet.breed && <span className="text-[10px] text-stone-500 block truncate">{pet.breed}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Family Connections Hierarchy */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Родинні зв'язки
          </h4>

          {/* Parents */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-stone-500">Батьки:</span>
            {parents.length === 0 ? (
              <p className="text-xs text-stone-400 italic">Не вказані</p>
            ) : (
              parents.map((p) => {
                const isUnverified = person.unverifiedRelations?.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-stone-100 text-xs text-stone-800 transition-colors group"
                  >
                    <button
                      onClick={() => onSelectPerson(p.id)}
                      className="font-medium group-hover:text-emerald-800 flex items-center gap-1.5 truncate text-left"
                    >
                      <span className="truncate">{p.firstName} {p.lastName}</span>
                      {p.houseNumber && (
                        <span className="text-[9px] font-mono text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded shrink-0">
                          №{p.houseNumber}
                        </span>
                      )}
                    </button>
                    {onToggleRelationVerification && (
                      <button
                        onClick={() => onToggleRelationVerification(person.id, p.id)}
                        className={`text-[9.5px] font-medium px-1.5 py-0.5 rounded border transition-colors shrink-0 ${
                          isUnverified
                            ? 'bg-stone-100 text-stone-600 border-stone-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                        title="Змінити достовірність зв'язку"
                      >
                        {isUnverified ? '⚪ Неперевірений' : '🟢 Достовірний'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Spouses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Heart size={12} className="text-rose-600" />
                <span>
                  {person.gender === 'female' ? 'Чоловік / Подружжя' : person.gender === 'male' ? 'Дружина / Подружжя' : 'Подружжя'} ({spouses.length}):
                </span>
              </span>
            </div>

            {spouses.length === 0 ? (
              <p className="text-xs text-stone-400 italic">Немає</p>
            ) : (
              spouses.map((s) => {
                const isUnverified = person.unverifiedRelations?.includes(s.id);
                const mKey = [person.id, s.id].sort().join('::');
                const connId = `marriage:${mKey}`;
                const override = connectionOverrides?.[connId];
                const isDivorced = override?.eventType === 'divorce';
                const isCohabitation = override?.eventType === 'cohabitation';

                return (
                  <div
                    key={s.id}
                    className={`p-2 rounded-xl text-xs transition-colors border flex flex-col gap-1.5 ${
                      isDivorced
                        ? 'bg-rose-50/40 border-rose-200/70 hover:border-rose-300'
                        : isCohabitation
                        ? 'bg-emerald-50/40 border-emerald-200/70 hover:border-emerald-300'
                        : 'bg-white border-stone-200 hover:border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => onSelectPerson(s.id)}
                        className="font-semibold text-stone-900 hover:text-rose-800 flex items-center gap-1.5 truncate text-left cursor-pointer"
                      >
                        <span className="truncate">{s.firstName} {s.lastName}</span>
                        {s.maidenName && (
                          <span className="text-[10px] text-stone-500 font-normal truncate">
                            ({s.maidenName})
                          </span>
                        )}
                        {s.houseNumber && (
                          <span className="text-[9px] font-mono text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded shrink-0">
                            №{s.houseNumber}
                          </span>
                        )}
                      </button>

                      {/* Status badge */}
                      <div>
                        {isDivorced ? (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1 shrink-0"
                            title="Шлюб розірвано"
                          >
                            <span>💔 Розлучені</span>
                            {override?.eventDate && <span className="font-mono">({override.eventDate})</span>}
                          </span>
                        ) : isCohabitation ? (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1 shrink-0"
                            title="Цивільний союз без офіційного шлюбу"
                          >
                            <span>💚 Без шлюбу</span>
                          </span>
                        ) : (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1 shrink-0"
                            title="Офіційний шлюб"
                          >
                            <span>💍 Шлюб</span>
                            {override?.eventDate && <span className="font-mono">({override.eventDate})</span>}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons row */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-200/50">
                      <div className="flex items-center gap-1">
                        {onToggleRelationVerification && (
                          <button
                            onClick={() => onToggleRelationVerification(person.id, s.id)}
                            className={`text-[9.5px] font-medium px-1.5 py-0.5 rounded border transition-colors shrink-0 ${
                              isUnverified
                                ? 'bg-stone-100 text-stone-600 border-stone-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                            title="Змінити достовірність зв'язку"
                          >
                            {isUnverified ? '⚪ Неперевірений' : '🟢 Достовірний'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isDivorced ? (
                          <>
                            {isAdmin && onEditMarriageConnection && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditMarriageConnection(connId);
                                }}
                                className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-md border border-stone-200 transition-colors cursor-pointer"
                                title="Редагувати дату розлучення, архівні деталі та коментарі"
                              >
                                <Settings size={12} />
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {isAdmin && onDisconnectSpouse && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDisconnectSpouse(person.id, s.id);
                                }}
                                className="px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
                                title="Оформити розлучення — відокремити пару на дві картки з лінією розлучення"
                              >
                                <HeartCrack size={11} className="text-rose-600" />
                                <span>Розлучення</span>
                              </button>
                            )}
                            {isAdmin && onEditMarriageConnection && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditMarriageConnection(connId);
                                }}
                                className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-md border border-stone-200 transition-colors cursor-pointer"
                                title="Редагувати дату шлюбу, вінчання, архівні дані"
                              >
                                <Settings size={12} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Siblings */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-stone-500">Брати та сестри:</span>
            {siblings.length === 0 ? (
              <p className="text-xs text-stone-400 italic">Немає або не вказані</p>
            ) : (
              siblings.map((sib) => (
                <button
                  key={sib.id}
                  onClick={() => onSelectPerson(sib.id)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-sky-50 flex items-center justify-between text-xs text-stone-800 transition-colors group"
                >
                  <span className="font-medium group-hover:text-sky-800 flex items-center gap-1.5 truncate">
                    <span className="truncate">{sib.firstName} {sib.lastName}</span>
                    {sib.houseNumber && (
                      <span className="text-[9px] font-mono text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded shrink-0">
                        №{sib.houseNumber}
                      </span>
                    )}
                  </span>
                  <ChevronRight size={14} className="text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))
            )}
          </div>

          {/* Children */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-stone-500">Діти:</span>
            {children.length === 0 ? (
              <p className="text-xs text-stone-400 italic">Немає</p>
            ) : (
              children.map((c) => {
                const isUnverified = person.unverifiedRelations?.includes(c.id);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-xs text-stone-800 transition-colors group"
                  >
                    <button
                      onClick={() => onSelectPerson(c.id)}
                      className="font-medium group-hover:text-amber-800 flex items-center gap-1.5 truncate text-left"
                    >
                      <span className="truncate">{c.firstName} {c.lastName}</span>
                      {c.houseNumber && (
                        <span className="text-[9px] font-mono text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded shrink-0">
                          №{c.houseNumber}
                        </span>
                      )}
                    </button>
                    {onToggleRelationVerification && (
                      <button
                        onClick={() => onToggleRelationVerification(person.id, c.id)}
                        className={`text-[9.5px] font-medium px-1.5 py-0.5 rounded border transition-colors shrink-0 ${
                          isUnverified
                            ? 'bg-stone-100 text-stone-600 border-stone-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                        title="Змінити достовірність зв'язку"
                      >
                        {isUnverified ? '⚪ Неперевірений' : '🟢 Достовірний'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Metric Documents Section */}
        {person.metricDocuments && person.metricDocuments.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <FileText size={13} className="text-emerald-700" />
              <span>Документи та метрики ({person.metricDocuments.length})</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {person.metricDocuments.map((doc) => (
                <div 
                  key={doc.id} 
                  className="group relative rounded-lg border border-stone-200 overflow-hidden bg-stone-50 aspect-square cursor-zoom-in hover:border-emerald-500 transition-colors shadow-2xs"
                  onClick={() => {
                    // Simple full-screen preview logic could be added here
                    const win = window.open();
                    if (win) {
                      win.document.write(`<img src="${doc.url}" style="max-width:100%; height:auto;" />`);
                    }
                  }}
                >
                  <img src={doc.url} alt={doc.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <span className="text-[9px] font-bold text-white uppercase tracking-wider truncate">
                      {doc.type === 'birth' ? 'Народження' : doc.type === 'marriage' ? 'Шлюб' : doc.type === 'death' ? 'Смерть' : doc.type === 'children' ? 'Діти' : 'Інше'}
                    </span>
                    <span className="text-[8px] text-white/90 truncate leading-tight mt-0.5">{doc.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
 
        {/* Bio / Notes */}
        {person.notes && (
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <span className="text-[11px] font-semibold text-stone-600 block mb-1">
              Примітки:
            </span>
            <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
              {person.notes}
            </p>
          </div>
        )}



        {/* Danger zone (Admin only) */}
        {isAdmin && (
          <div className="pt-2 border-t border-stone-200">
            <button
              onClick={() => {
                onDelete(person.id);
                onClose();
              }}
              className="w-full px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} />
              <span>Видалити цю картку</span>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Photo Album */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-stone-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-stone-800 transition-colors z-10"
              title="Закрити"
            >
              <X size={20} />
            </button>
            <img src={lightboxPhoto.url} alt={lightboxPhoto.caption || 'Фото'} className="max-h-[75vh] w-auto object-contain bg-black" />
            {(lightboxPhoto.caption || lightboxPhoto.date) && (
              <div className="p-4 bg-stone-900 text-white space-y-0.5 border-t border-stone-800">
                {lightboxPhoto.caption && <p className="text-sm font-semibold">{lightboxPhoto.caption}</p>}
                {lightboxPhoto.date && <p className="text-xs font-mono text-stone-400">{lightboxPhoto.date}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
