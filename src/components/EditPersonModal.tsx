import React, { useState, useEffect } from 'react';
import { Person, Gender, MetricDocument, Pet, ConnectionMeta } from '../types/tree';
import { uploadFileToServer, fetchServerTrees } from '../utils/fileStorage';
import { formatSingleDate, parseDateString, UKRAINIAN_MONTHS, padZero } from '../utils/dateUtils';
import { checkGenderMismatch } from '../utils/genderValidation';
import { SilhouetteAvatar } from './SilhouetteAvatar';
import {
  X,
  Upload,
  Trash2,
  Heart,
  HeartCrack,
  Users,
  UserCheck,
  CheckCircle2,
  Calendar,
  MapPin,
  Briefcase,
  FileText,
  UserMinus,
  Sparkles,
  Info,
  AlertCircle,
  BookOpen,
  Dog,
  Plus,
  ChevronUp,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';


interface EditPersonModalProps {
  person: Person;
  allPersons: Record<string, Person>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Person) => void;
  onDelete: (id: string) => void;
  connectionOverrides?: Record<string, ConnectionMeta>;
}

type TabType = 'basic' | 'bio' | 'relations' | 'docs' | 'pets';

export const EditPersonModal: React.FC<EditPersonModalProps> = ({
  person,
  allPersons,
  isOpen,
  onClose,
  onSave,
  onDelete,
  connectionOverrides,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Tab 1: Basic
  const [firstName, setFirstName] = useState(person.firstName);
  const [lastName, setLastName] = useState(person.lastName);
  const [clanName, setClanName] = useState(person.clanName || '');
  const [maidenName, setMaidenName] = useState(person.maidenName || '');
  const [nickname, setNickname] = useState(person.nickname || '');
  const [gender, setGender] = useState<Gender>(person.gender);
  const [houseNumber, setHouseNumber] = useState(person.houseNumber || '');
  const [isFullyVerified, setIsFullyVerified] = useState(person.isFullyVerified || false);
  const [cardBgColor, setCardBgColor] = useState(person.cardBgColor || '#e8efe9');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(person.avatarUrl);
  const [showExtraCardDetails, setShowExtraCardDetails] = useState(false);

  const [targetCanvasId, setTargetCanvasId] = useState(person.targetCanvasId || '');
  const [targetCanvasTitle, setTargetCanvasTitle] = useState(person.targetCanvasTitle || '');
  const [serverCanvases, setServerCanvases] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    fetchServerTrees().then((list) => {
      setServerCanvases(list.map(t => ({ id: t.id, title: t.title })));
    }).catch(() => {});
  }, []);

  // Dates
  const parsedBirth = parseDateString(person.birthDate);
  const [birthDay, setBirthDay] = useState(person.birthDay || parsedBirth.day || '');
  const [birthMonth, setBirthMonth] = useState(person.birthMonth || parsedBirth.month || '');
  const [birthYear, setBirthYear] = useState(person.birthYear || parsedBirth.year || '');
  const [birthYearEnd, setBirthYearEnd] = useState(person.birthYearEnd || parsedBirth.yearEnd || '');
  const [isBirthDateApproximate, setIsBirthDateApproximate] = useState(
    Boolean(person.isBirthDateApproximate || parsedBirth.isApprox || person.birthYearEnd || parsedBirth.yearEnd)
  );
  const [birthDateType, setBirthDateType] = useState<'exact' | 'period' | 'about'>(() => {
    if (person.birthDateType) return person.birthDateType;
    if (person.birthYearEnd || parsedBirth.yearEnd) return 'period';
    if (person.isBirthDateApproximate || parsedBirth.isApprox) return 'about';
    return 'exact';
  });

  const parsedDeath = parseDateString(person.deathDate);
  const [isDeceased, setIsDeceased] = useState(
    person.isDeceased || !!person.deathDate || !!person.deathYear || !!parsedDeath.year
  );
  const [deathDay, setDeathDay] = useState(person.deathDay || parsedDeath.day || '');
  const [deathMonth, setDeathMonth] = useState(person.deathMonth || parsedDeath.month || '');
  const [deathYear, setDeathYear] = useState(person.deathYear || parsedDeath.year || '');

  const [yearsDisplay, setYearsDisplay] = useState(person.yearsDisplay || '');

  // Tab 2: Bio & Detailed Blocks
  const [biography, setBiography] = useState(person.biography || '');
  const [birthPlace, setBirthPlace] = useState(person.birthPlace || '');
  const [residencePlace, setResidencePlace] = useState(person.residencePlace || '');
  const [migrationNotes, setMigrationNotes] = useState(person.migrationNotes || '');
  const [deathPlace, setDeathPlace] = useState(person.deathPlace || '');
  const [burialPlace, setBurialPlace] = useState(person.burialPlace || '');
  const [education, setEducation] = useState(person.education || '');
  const [profession, setProfession] = useState(person.profession || '');
  const [workplaceNotes, setWorkplaceNotes] = useState(person.workplaceNotes || '');
  const [deathCause, setDeathCause] = useState(person.deathCause || '');
  const [midwife, setMidwife] = useState(person.midwife || '');
  const [godparents, setGodparents] = useState(person.godparents || '');
  const [interestingStories, setInterestingStories] = useState(
    person.interestingStories || person.notes || ''
  );

  // Tab 3: Relations
  const [parents, setParents] = useState<string[]>(person.parents || []);
  const [spouses, setSpouses] = useState<string[]>(person.spouses || []);
  const [children, setChildren] = useState<string[]>(person.children || []);
  const [siblings, setSiblings] = useState<string[]>(() => {
    const direct = person.siblings || [];
    const sharedParentSibs = Object.values(allPersons)
      .filter((other) => {
        if (other.id === person.id) return false;
        return (
          person.parents &&
          person.parents.length > 0 &&
          other.parents?.some((pId) => person.parents.includes(pId))
        );
      })
      .map((s) => s.id);
    return Array.from(new Set([...direct, ...sharedParentSibs]));
  });
  const [unverifiedRelations, setUnverifiedRelations] = useState<string[]>(
    person.unverifiedRelations || []
  );
  const [metricDocuments, setMetricDocuments] = useState<MetricDocument[]>(
    person.metricDocuments || []
  );

  // Tab 5: Pets
  const [pets, setPets] = useState<Pet[]>(person.pets || []);
  const [newPetName, setNewPetName] = useState('');
  const [newPetType, setNewPetType] = useState('dog');
  const [newPetBreed, setNewPetBreed] = useState('');
  const [newPetIsCouple, setNewPetIsCouple] = useState(false);

  if (!isOpen) return null;

  const toggleRelationVerification = (relativeId: string) => {
    setUnverifiedRelations((prev) =>
      prev.includes(relativeId) ? prev.filter((id) => id !== relativeId) : [...prev, relativeId]
    );
  };

  const handleUnlinkRelative = (type: 'parent' | 'spouse' | 'child' | 'sibling', id: string) => {
    if (type === 'parent') {
      setParents((prev) => prev.filter((pid) => pid !== id));
    } else if (type === 'spouse') {
      setSpouses((prev) => prev.filter((sid) => sid !== id));
    } else if (type === 'child') {
      setChildren((prev) => prev.filter((cid) => cid !== id));
    } else if (type === 'sibling') {
      setSiblings((prev) => prev.filter((sid) => sid !== id));
    }
  };

  const [modalError, setModalError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setModalError(null);
        const url = await uploadFileToServer(file);
        setAvatarUrl(url);
      } catch (err) {
        setModalError((err as Error).message);
      }
    }
  };

  const autoGenerateYearsDisplay = () => {
    const isPeriod = birthDateType === 'period' || Boolean(birthYearEnd.trim());
    const isApprox = birthDateType === 'about' || isBirthDateApproximate;
    const formattedBirth = formatSingleDate(
      birthDay,
      birthMonth,
      birthYear,
      '.',
      isPeriod ? birthYearEnd.trim() : undefined,
      isApprox
    );
    const formattedDeath = isDeceased ? formatSingleDate(deathDay, deathMonth, deathYear, '.') : '';
    if (formattedBirth && formattedDeath) {
      setYearsDisplay(`${formattedBirth} — ${formattedDeath}`);
    } else if (formattedBirth) {
      setYearsDisplay(isDeceased ? `${formattedBirth} —` : formattedBirth);
    } else if (formattedDeath) {
      setYearsDisplay(formattedDeath);
    } else {
      setYearsDisplay('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() && !lastName.trim()) {
      setModalError("Будь ласка, вкажіть хоча б ім'я або прізвище.");
      return;
    }

    const isPeriod = birthDateType === 'period' || Boolean(birthYearEnd.trim());
    const isApprox = birthDateType === 'about' || isBirthDateApproximate;
    const formattedBirth = formatSingleDate(
      birthDay,
      birthMonth,
      birthYear,
      '.',
      isPeriod ? birthYearEnd.trim() : undefined,
      isApprox
    );
    const formattedDeath = isDeceased ? formatSingleDate(deathDay, deathMonth, deathYear, '.') : '';

    let finalYears = yearsDisplay.trim();
    if (!finalYears || finalYears.match(/^[\d./—\s-]+$/)) {
      if (formattedBirth && formattedDeath) {
        finalYears = `${formattedBirth} — ${formattedDeath}`;
      } else if (formattedBirth) {
        finalYears = isDeceased ? `${formattedBirth} —` : formattedBirth;
      } else if (formattedDeath) {
        finalYears = formattedDeath;
      }
    }

    const updated: Person = {
      ...person,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      clanName: clanName.trim() || undefined,
      maidenName: maidenName.trim() || undefined,
      nickname: nickname.trim() || undefined,
      gender,
      yearsDisplay: finalYears || undefined,
      birthDate: formattedBirth || (birthYear.trim() ? (isPeriod && birthYearEnd.trim() ? `${birthYear.trim()}–${birthYearEnd.trim()}` : birthYear.trim()) : undefined),
      birthDay: birthDay ? padZero(birthDay) : undefined,
      birthMonth: birthMonth ? padZero(birthMonth) : undefined,
      birthYear: birthYear.trim() || undefined,
      birthYearEnd: isPeriod && birthYearEnd.trim() ? birthYearEnd.trim() : undefined,
      isBirthDateApproximate: isApprox || isPeriod,
      birthDateType,
      deathDate: formattedDeath || undefined,
      deathDay: isDeceased && deathDay ? padZero(deathDay) : undefined,
      deathMonth: isDeceased && deathMonth ? padZero(deathMonth) : undefined,
      deathYear: isDeceased && deathYear.trim() ? deathYear.trim() : undefined,
      isDeceased,
      biography: biography.trim() || undefined,
      birthPlace: birthPlace.trim() || undefined,
      residencePlace: residencePlace.trim() || undefined,
      migrationNotes: migrationNotes.trim() || undefined,
      deathPlace: isDeceased ? deathPlace.trim() || undefined : undefined,
      burialPlace: isDeceased ? burialPlace.trim() || undefined : undefined,
      education: education.trim() || undefined,
      profession: profession.trim() || undefined,
      workplaceNotes: workplaceNotes.trim() || undefined,
      deathCause: isDeceased ? deathCause.trim() || undefined : undefined,
      midwife: midwife.trim() || undefined,
      godparents: godparents.trim() || undefined,
      houseNumber: houseNumber.trim() || undefined,
      isFullyVerified,
      cardBgColor: cardBgColor || '#e8efe9',
      unverifiedRelations,
      interestingStories: interestingStories.trim() || undefined,
      notes: interestingStories.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
      parents,
      spouses,
      children,
      siblings: siblings.length > 0 ? siblings : undefined,
      metricDocuments: metricDocuments.length > 0 ? metricDocuments : undefined,
      pets: pets.length > 0 ? pets : undefined,
      targetCanvasId: targetCanvasId.trim() || undefined,
      targetCanvasTitle: targetCanvasTitle.trim() || undefined,
    };


    onSave(updated);
    onClose();
  };

  const getPerson = (id: string) => allPersons[id];

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#f4f7f4] to-[#edf3ee] border-b border-[#d8e2d9] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {gender === 'female' ? 'Ж' : 'Ч'}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
                <span>
                  {firstName || lastName
                    ? `${firstName} ${lastName}`.trim()
                    : 'Редагувати картку особи'}
                </span>
              </h3>
              <p className="text-[11px] text-stone-500 font-mono">
                ID: {person.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
            title="Закрити"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="px-3 pt-2 pb-1 bg-white border-b border-stone-100 flex gap-1 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-all shrink-0 ${
              activeTab === 'basic'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Users size={13} />
            <span>Основне</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bio')}
            className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-all shrink-0 ${
              activeTab === 'bio'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <BookOpen size={13} />
            <span>Біографія</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('relations')}
            className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-all relative shrink-0 ${
              activeTab === 'relations'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Heart size={13} />
            <span>Зв'язки</span>
            {(parents.length > 0 || spouses.length > 0 || siblings.length > 0 || children.length > 0) && (
              <span className={`text-[9px] px-1 py-0 rounded-full ${
                activeTab === 'relations' ? 'bg-emerald-950 text-white' : 'bg-stone-200 text-stone-700'
              }`}>
                {parents.length + spouses.length + siblings.length + children.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-all relative shrink-0 ${
              activeTab === 'docs'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Upload size={13} />
            <span>Документи</span>
            {metricDocuments.length > 0 && (
              <span className={`text-[9px] px-1 py-0 rounded-full ${
                activeTab === 'docs' ? 'bg-emerald-950 text-white' : 'bg-stone-200 text-stone-700'
              }`}>
                {metricDocuments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pets')}

            className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition-all relative shrink-0 ${
              activeTab === 'pets'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Dog size={13} />
            <span>Тварини</span>
            {pets.length > 0 && (
              <span className={`text-[9px] px-1 py-0 rounded-full ${
                activeTab === 'pets' ? 'bg-emerald-950 text-white' : 'bg-stone-200 text-stone-700'
              }`}>
                {pets.length}
              </span>
            )}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
              <span>{modalError}</span>
              <button
                type="button"
                onClick={() => setModalError(null)}
                className="text-rose-500 hover:text-rose-700 font-bold ml-2 text-sm"
              >
                ✕
              </button>
            </div>
          )}
          {(() => {
            const genderWarning = checkGenderMismatch(firstName, gender);
            if (!genderWarning) return null;
            return (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span className="font-medium">{genderWarning}</span>
              </div>
            );
          })()}
          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Photo & Gender */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 bg-stone-50/80 rounded-xl border border-stone-200">
                <div className="relative group shrink-0">
                  <SilhouetteAvatar
                    gender={gender}
                    avatarUrl={avatarUrl}
                    name={`${firstName} ${lastName}`}
                    size="lg"
                  />
                  <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity">
                    <Upload size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-800">Світлина та стать</span>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl(undefined)}
                        className="text-[11px] text-rose-600 hover:underline font-medium"
                      >
                        Видалити фото
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs text-stone-800 font-medium transition-colors shadow-2xs">
                      <Upload size={13} className="text-emerald-800" />
                      <span>{avatarUrl ? 'Змінити світлину' : 'Завантажити світлину'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Gender Segmented Toggle */}
                    <div className="flex items-center bg-white border border-stone-300 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setGender('male')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          gender === 'male'
                            ? 'bg-sky-800 text-white shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Чоловіча
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('female')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          gender === 'female'
                            ? 'bg-rose-800 text-white shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Жіноча
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Ім'я <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="напр. Тарас"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Прізвище
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="напр. Коваленко"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Clan / Lineage */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center justify-between">
                  <span>Рід (родинна гілка)</span>
                  <span className="text-[10.5px] text-stone-400">якщо відрізняється від прізвища</span>
                </label>
                <input
                  type="text"
                  value={clanName}
                  onChange={(e) => setClanName(e.target.value)}
                  placeholder="напр. Кобилецький або Даньків"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                />
              </div>

              {/* Cross-canvas Link */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-800 uppercase tracking-wider">
                  <ExternalLink size={14} className="text-emerald-800" />
                  <span>Стрілка-посилання на інше полотно</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Закріпіть стрілку з назвою іншого родинного полотна (дерева), щоб переходити до нього прямо з картки особи.
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Оберіть полотно з наявних</label>
                    <select
                      value={targetCanvasId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setTargetCanvasId(selectedId);
                        const found = serverCanvases.find(c => c.id === selectedId);
                        if (found) {
                          setTargetCanvasTitle(found.title);
                        } else if (!selectedId) {
                          setTargetCanvasTitle('');
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700 text-stone-900 font-medium"
                    >
                      <option value="">-- Без зв'язку з іншим полотном --</option>
                      {serverCanvases.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Назва стрілки-посилання</label>
                    <input
                      type="text"
                      value={targetCanvasTitle}
                      onChange={(e) => setTargetCanvasTitle(e.target.value)}
                      placeholder="напр. Родина Петренків"
                      className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                    />
                  </div>
                  {targetCanvasId && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetCanvasId('');
                        setTargetCanvasTitle('');
                      }}
                      className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Видалити посилання на полотно
                    </button>
                  )}
                </div>
              </div>

              {/* Maiden name, Nickname & House number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {gender === 'female' ? (
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Дівоче прізвище
                    </label>
                    <input
                      type="text"
                      value={maidenName}
                      onChange={(e) => setMaidenName(e.target.value)}
                      placeholder="напр. Коваль"
                      className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Прізвисько («придомок»)
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="напр. Чут або Кулинич"
                      className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                    />
                  </div>
                )}

                {gender === 'female' && (
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Прізвисько («придомок»)
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="напр. Чут або Кулинич"
                      className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600"
                    />
                  </div>
                )}

                {/* House Number with Doorless House SVG & Live Preview */}
                <div className={gender === 'female' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1 flex items-center gap-1.5">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4 text-emerald-800 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#f0fdf4" />
                    </svg>
                    <span>Номер дому народження (№)</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      placeholder="напр. 47 або 12а"
                      className="w-full text-sm px-3 py-2 pr-11 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600 font-mono"
                    />
                    {houseNumber && (
                      <div
                        className="absolute right-2 h-6 px-2 min-w-[24px] flex items-center justify-center bg-white rounded-full shadow-xs border border-emerald-400 pointer-events-none"
                        title="Піктограма на картці"
                      >
                        <span className="text-[10px] font-mono font-bold leading-none text-emerald-900">
                          №{houseNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>



              {/* Date of Birth */}
              <div className="p-3.5 bg-[#f7faf7] rounded-xl border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                    <Calendar size={13} className="text-emerald-700" />
                    <span>Дата народження</span>
                  </label>
                  <span className="text-[11px] text-emerald-800 font-mono font-medium">
                    {formatSingleDate(
                      birthDay,
                      birthMonth,
                      birthYear,
                      '.',
                      birthDateType === 'period' ? birthYearEnd : undefined,
                      birthDateType === 'about'
                    ) || 'Не вказано'}
                  </span>
                </div>

                {/* Mode Selector: Точна дата / Період (діапазон) / Приблизно */}
                <div className="flex items-center gap-1 bg-stone-200/60 p-0.5 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setBirthDateType('exact');
                      setIsBirthDateApproximate(false);
                    }}
                    className={`flex-1 py-1 px-2 rounded-md font-medium transition-all cursor-pointer ${
                      birthDateType === 'exact'
                        ? 'bg-white text-emerald-950 font-bold shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Точна дата
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBirthDateType('period');
                      setIsBirthDateApproximate(true);
                    }}
                    className={`flex-1 py-1 px-2 rounded-md font-medium transition-all cursor-pointer ${
                      birthDateType === 'period'
                        ? 'bg-white text-emerald-950 font-bold shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Період (діапазон років)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBirthDateType('about');
                      setIsBirthDateApproximate(true);
                    }}
                    className={`flex-1 py-1 px-2 rounded-md font-medium transition-all cursor-pointer ${
                      birthDateType === 'about'
                        ? 'bg-white text-emerald-950 font-bold shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Близько (бл.)
                  </button>
                </div>

                {birthDateType !== 'period' ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-0.5">Число</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={birthDay}
                        onChange={(e) => setBirthDay(e.target.value)}
                        placeholder="1-31"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-0.5">Місяць</label>
                      <select
                        value={birthMonth}
                        onChange={(e) => setBirthMonth(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                      >
                        <option value="">Не обрано</option>
                        {UKRAINIAN_MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-0.5">
                        {birthDateType === 'about' ? 'Рік (бл.)' : 'Рік'}
                      </label>
                      <input
                        type="text"
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        placeholder="напр. 1925"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-stone-600 mb-0.5">Рік від (початок періоду)</label>
                        <input
                          type="text"
                          value={birthYear}
                          onChange={(e) => setBirthYear(e.target.value)}
                          placeholder="напр. 1910"
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-600 mb-0.5">Рік до (кінець періоду)</label>
                        <input
                          type="text"
                          value={birthYearEnd}
                          onChange={(e) => setBirthYearEnd(e.target.value)}
                          placeholder="напр. 1912"
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white font-mono"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-stone-500 italic">
                      💡 Вказуйте період, коли точний рік народження в метриках чи переписах зазначено орієнтовно (наприклад: 1910–1912 або 1895–1900).
                    </p>
                  </div>
                )}
              </div>

              {/* Death Date Section */}
              <div className="p-3.5 bg-[#faf8f7] rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-800 flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDeceased}
                      onChange={(e) => setIsDeceased(e.target.checked)}
                      className="rounded text-stone-800 focus:ring-stone-600 accent-stone-800 w-4 h-4 cursor-pointer"
                    />
                    <span>Особа померла (вказати дату смерті)</span>
                  </label>
                  {isDeceased && (
                    <span className="text-[11px] text-stone-600 font-mono font-medium">
                      {formatSingleDate(deathDay, deathMonth, deathYear, '.') || 'Дата не вказана'}
                    </span>
                  )}
                </div>

                {isDeceased && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200 animate-in fade-in-50 duration-150">
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-0.5">Число</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={deathDay}
                        onChange={(e) => setDeathDay(e.target.value)}
                        placeholder="1-31"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-0.5">Місяць</label>
                      <select
                        value={deathMonth}
                        onChange={(e) => setDeathMonth(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                      >
                        <option value="">Не обрано</option>
                        {UKRAINIAN_MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-0.5">Рік</label>
                      <input
                        type="number"
                        value={deathYear}
                        onChange={(e) => setDeathYear(e.target.value)}
                        placeholder="напр. 1994"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Years Display Label with Auto Generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-stone-700">
                    Напис дат на картці
                  </label>
                  <button
                    type="button"
                    onClick={autoGenerateYearsDisplay}
                    className="text-[11px] font-medium text-emerald-800 hover:text-emerald-950 flex items-center gap-1 hover:underline"
                    title="Сформувати напис на основі введених чисел, місяців та років"
                  >
                    <Sparkles size={12} />
                    <span>Оновити автоматично</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={yearsDisplay}
                  onChange={(e) => setYearsDisplay(e.target.value)}
                  placeholder="напр. 08.07.1925 — 18.09.1994"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600 font-mono"
                />
              </div>

              {/* Collapsible Additional Card Settings - MOVED TO BOTTOM */}
              <div className="border border-stone-200 rounded-xl overflow-hidden mt-4">
                <button
                  type="button"
                  onClick={() => setShowExtraCardDetails((prev) => !prev)}
                  className="w-full px-3.5 py-2.5 bg-stone-50/80 hover:bg-stone-100 flex items-center justify-between text-xs font-semibold text-stone-700 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-emerald-700" />
                    <span>Колір картки та статус достовірності</span>
                  </span>
                  {showExtraCardDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showExtraCardDetails && (
                  <div className="p-3.5 space-y-3 bg-white border-t border-stone-200 animate-in fade-in-50 duration-150">
                    {/* Fully Verified Toggle */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-700" />
                        <div>
                          <p className="text-xs font-bold text-emerald-950">Повністю перевірена картка</p>
                          <p className="text-[10px] text-stone-600">Метрики та архівні дані підтверджено</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isFullyVerified}
                        onChange={(e) => setIsFullyVerified(e.target.checked)}
                        className="w-4 h-4 text-emerald-800 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>

                    {/* Card Background Color Selector */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-800">
                          Колір фону картки
                        </span>
                        <span className="text-[10px] font-mono text-stone-500 uppercase">{cardBgColor}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { name: 'Чебрецевий', hex: '#e8efe9' },
                          { name: 'Вінтажний', hex: '#fbf7ee' },
                          { name: 'Блакитний', hex: '#e0f2fe' },
                          { name: 'Рожевий', hex: '#ffe4e6' },
                          { name: 'Бурштиновий', hex: '#fef3c7' },
                          { name: 'Бузковий', hex: '#f3e8ff' },
                          { name: 'Білий', hex: '#ffffff' },
                        ].map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setCardBgColor(c.hex)}
                            style={{ backgroundColor: c.hex }}
                            className={`w-7 h-7 rounded-full border shadow-2xs transition-transform hover:scale-110 flex items-center justify-center ${
                              cardBgColor.toLowerCase() === c.hex.toLowerCase()
                                ? 'ring-2 ring-emerald-700 ring-offset-1 border-emerald-800'
                                : 'border-stone-300'
                            }`}
                            title={c.name}
                          >
                            {cardBgColor.toLowerCase() === c.hex.toLowerCase() && (
                              <span className="w-2 h-2 rounded-full bg-emerald-800"></span>
                            )}
                          </button>
                        ))}

                        <label className="flex items-center gap-1.5 ml-2 cursor-pointer text-xs text-stone-600">
                          <span>Власний:</span>
                          <input
                            type="color"
                            value={cardBgColor}
                            onChange={(e) => setCardBgColor(e.target.value)}
                            className="w-7 h-7 rounded border border-stone-300 cursor-pointer p-0.5 bg-white"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* TAB 2: DETAILED BIOGRAPHY (5 BLOCKS) */}
          {activeTab === 'bio' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* BLOCK 1: БІОГРАФІЯ */}
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-2">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-emerald-800 shrink-0" />
                  <span>1. Біографія особи</span>
                </label>
                <textarea
                  rows={4}
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  placeholder="Довільна біографія особи, історія життя, сімейний шлях..."
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-emerald-300/80 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600 leading-relaxed font-sans"
                />
              </div>

              {/* BLOCK 2: ГЕОГРАФІЯ */}
              <div className="p-3.5 bg-stone-50/80 rounded-xl border border-stone-200 space-y-3">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-700 shrink-0" />
                  <span>2. Географія та місця</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">
                      Місце народження
                    </label>
                    <input
                      type="text"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      placeholder="напр. с. Великі Дідушичі"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">
                      Місце проживання / адреса
                    </label>
                    <input
                      type="text"
                      value={residencePlace}
                      onChange={(e) => setResidencePlace(e.target.value)}
                      placeholder="напр. м. Стрий, вул. Франка"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">
                      Переїзди, міграція та еміграція
                    </label>
                    <input
                      type="text"
                      value={migrationNotes}
                      onChange={(e) => setMigrationNotes(e.target.value)}
                      placeholder="напр. Переїзд до Львова у 1938 р., еміграція до Канади (1948 р.)"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  {isDeceased && (
                    <>
                      <div>
                        <label className="block text-[11px] font-medium text-stone-700 mb-1">
                          Місце смерті
                        </label>
                        <input
                          type="text"
                          value={deathPlace}
                          onChange={(e) => setDeathPlace(e.target.value)}
                          placeholder="напр. м. Мюнхен"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-stone-700 mb-1">
                          Місце поховання / цвинтар
                        </label>
                        <input
                          type="text"
                          value={burialPlace}
                          onChange={(e) => setBurialPlace(e.target.value)}
                          placeholder="напр. Личаківський цвинтар, поле 12"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* BLOCK 3: НАВЧАННЯ Й ПРОФЕСІЯ */}
              <div className="p-3.5 bg-stone-50/80 rounded-xl border border-stone-200 space-y-3">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase size={14} className="text-emerald-700 shrink-0" />
                  <span>3. Навчання й професія</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">
                      Освіта та навчальні заклади
                    </label>
                    <input
                      type="text"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      placeholder="напр. Початкова школа с. Дідушичі, Львівська гімназія №1"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">
                      Професія / Рід занять / Посада
                    </label>
                    <input
                      type="text"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="напр. Господар, тесляр, вчитель"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">
                      Місце роботи, служба, ремесло
                    </label>
                    <input
                      type="text"
                      value={workplaceNotes}
                      onChange={(e) => setWorkplaceNotes(e.target.value)}
                      placeholder="напр. Залізниця, служба в армії (1941–1945)"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCK 4: ПОВИТУХА / ХРЕСНІ / КУМИ */}
              <div className="p-3.5 bg-stone-50/80 rounded-xl border border-stone-200 space-y-3">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={14} className="text-emerald-700 shrink-0" />
                  <span>4. Повитуха \ хресні \ куми</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">
                      Повитуха / Баба-повитуха
                    </label>
                    <input
                      type="text"
                      value={midwife}
                      onChange={(e) => setMidwife(e.target.value)}
                      placeholder="напр. баба Гафія Ковалиха"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">
                      Хресні батьки та куми
                    </label>
                    <input
                      type="text"
                      value={godparents}
                      onChange={(e) => setGodparents(e.target.value)}
                      placeholder="напр. Іван Коваль, Маріяна Слив'як"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  {isDeceased && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-stone-700 mb-1">
                        Причина смерті
                      </label>
                      <input
                        type="text"
                        value={deathCause}
                        onChange={(e) => setDeathCause(e.target.value)}
                        placeholder="напр. Природна старість, хвороба..."
                        className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* BLOCK 5: ЦІКАВІ ІСТОРІЇ */}
              <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-200/80 space-y-2">
                <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-700 shrink-0" />
                  <span>5. Цікаві історії</span>
                </label>
                <textarea
                  rows={4}
                  value={interestingStories}
                  onChange={(e) => setInterestingStories(e.target.value)}
                  placeholder="Цікаві історії з життя, курйозні випадки, родинні перекази, легенди та пам'ятні спогади..."
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-amber-300/80 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/40 focus:border-amber-600 leading-relaxed font-sans"
                />
              </div>
            </div>
          )}

          {/* TAB 3: RELATIVES & CONNECTIONS */}
          {activeTab === 'relations' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2 text-xs text-stone-600">
                <Info size={16} className="text-emerald-800 shrink-0 mt-0.5" />
                <span>
                  Тут відображаються прямі родинні зв'язки особи. Ви можете змінювати статус достовірності (зелений/сірий) або від'єднати зв'язок без видалення самої особи.
                </span>
              </div>

              {/* Parents */}
              <div className="p-3.5 bg-[#f7faf7] rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-800 uppercase tracking-wider">
                  <UserCheck size={14} className="text-emerald-700" />
                  <span>Батьки ({parents.length})</span>
                </div>
                {parents.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-1">Батьків не вказано</p>
                ) : (
                  <div className="space-y-1.5">
                    {Array.from(new Set(parents)).map((pId) => {
                      const p = getPerson(pId);
                      const isUnverified = unverifiedRelations.includes(pId);
                      return (
                        <div
                          key={pId}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-stone-200 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-stone-800 truncate">
                              {p ? `${p.firstName} ${p.lastName}`.trim() : 'Невідома особа'}
                            </span>
                            {p?.yearsDisplay && (
                              <span className="text-[10px] text-stone-500 font-mono truncate">
                                ({p.yearsDisplay})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleRelationVerification(pId)}
                              className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                                isUnverified
                                  ? 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              }`}
                            >
                              {isUnverified ? '⚪ Неперевірений' : '🟢 Достовірний'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnlinkRelative('parent', pId)}
                              className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Від'єднати батька/матір"
                            >
                              <UserMinus size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Spouses */}
              <div className="p-3.5 bg-[#fdf8f8] rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-800 uppercase tracking-wider">
                  <Heart size={14} className="text-rose-600" />
                  <span>Подружжя ({spouses.length})</span>
                </div>
                {spouses.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-1">Подружжя не вказано</p>
                ) : (
                  <div className="space-y-1.5">
                    {Array.from(new Set(spouses)).map((sId) => {
                      const s = getPerson(sId);
                      const isUnverified = unverifiedRelations.includes(sId);
                      const mKey = [person.id, sId].sort().join('::');
                      const override = connectionOverrides?.[`marriage:${mKey}`];
                      const isDivorced = override?.eventType === 'divorce';
                      const isCohabitation = override?.eventType === 'cohabitation';

                      return (
                        <div
                          key={sId}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-stone-200 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-stone-800 truncate">
                              {s ? `${s.firstName} ${s.lastName}`.trim() : 'Невідома особа'}
                            </span>
                            {s?.maidenName && (
                              <span className="text-[10px] text-stone-500 font-normal truncate">
                                ({s.maidenName})
                              </span>
                            )}
                            {s?.yearsDisplay && (
                              <span className="text-[10px] text-stone-500 font-mono truncate">
                                ({s.yearsDisplay})
                              </span>
                            )}
                            {isDivorced ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                💔 Розлучені{override?.eventDate ? ` (${override.eventDate})` : ''}
                              </span>
                            ) : isCohabitation ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                💚 Без шлюбу
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                💍 Шлюб{override?.eventDate ? ` (${override.eventDate})` : ''}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleRelationVerification(sId)}
                              className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                                isUnverified
                                  ? 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              }`}
                            >
                              {isUnverified ? '⚪ Неперевірений' : '🟢 Достовірний'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnlinkRelative('spouse', sId)}
                              className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Від'єднати подружжя"
                            >
                              <UserMinus size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Siblings */}
              <div className="p-3.5 bg-[#f6f9fc] rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-800 uppercase tracking-wider">
                  <Users size={14} className="text-sky-700" />
                  <span>Брати та сестри ({siblings.length})</span>
                </div>
                {siblings.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-1">Братів та сестер не вказано</p>
                ) : (
                  <div className="space-y-1.5">
                    {Array.from(new Set(siblings)).map((sId) => {
                      const s = getPerson(sId);
                      const isUnverified = unverifiedRelations.includes(sId);
                      return (
                        <div
                          key={sId}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-stone-200 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-stone-800 truncate">
                              {s ? `${s.firstName} ${s.lastName}`.trim() : 'Невідома особа'}
                            </span>
                            {s?.yearsDisplay && (
                              <span className="text-[10px] text-stone-500 font-mono truncate">
                                ({s.yearsDisplay})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleRelationVerification(sId)}
                              className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                                isUnverified
                                  ? 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              }`}
                            >
                              {isUnverified ? '⚪ Неперевірений' : '🟢 Достовірний'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnlinkRelative('sibling', sId)}
                              className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Від'єднати брата/сестру"
                            >
                              <UserMinus size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Children */}
              <div className="p-3.5 bg-[#f8fafd] rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-800 uppercase tracking-wider">
                  <Users size={14} className="text-sky-700" />
                  <span>Діти ({children.length})</span>
                </div>
                {children.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-1">Дітей не вказано</p>
                ) : (
                  <div className="space-y-1.5">
                    {Array.from(new Set(children)).map((cId) => {
                      const c = getPerson(cId);
                      const isUnverified = unverifiedRelations.includes(cId);
                      return (
                        <div
                          key={cId}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-stone-200 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-stone-800 truncate">
                              {c ? `${c.firstName} ${c.lastName}`.trim() : 'Невідома особа'}
                            </span>
                            {c?.yearsDisplay && (
                              <span className="text-[10px] text-stone-500 font-mono truncate">
                                ({c.yearsDisplay})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleRelationVerification(cId)}
                              className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                                isUnverified
                                  ? 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              }`}
                            >
                              {isUnverified ? '⚪ Неперевірений' : '🟢 Достовірний'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnlinkRelative('child', cId)}
                              className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Від'єднати дитину"
                            >
                              <UserMinus size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: METRIC DOCUMENTS */}
          {activeTab === 'docs' && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2 text-xs text-stone-600">
                <Info size={16} className="text-emerald-800 shrink-0 mt-0.5" />
                <span>
                  Тут ви можете завантажити скріншоти або фотографії метричних книг, свідоцтв чи інших документів, що підтверджують дані про народження, шлюб, дітей або смерть.
                </span>
              </div>

              {/* Document List */}
              <div className="space-y-3">
                {metricDocuments.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/30">
                    <FileText size={32} className="mx-auto text-stone-300 mb-2" />
                    <p className="text-xs text-stone-400 font-medium">Документів не додано</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {metricDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-start gap-3 p-3 bg-white border border-stone-200 rounded-xl shadow-2xs group relative">
                        <div className="w-20 h-20 bg-stone-100 rounded-lg overflow-hidden border border-stone-200 shrink-0">
                          <img src={doc.url} alt={doc.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                             <select 
                               value={doc.type} 
                               onChange={(e) => {
                                 const newDocs = metricDocuments.map(d => d.id === doc.id ? {...d, type: e.target.value as any} : d);
                                 setMetricDocuments(newDocs);
                               }}
                               className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border-none focus:ring-0 cursor-pointer"
                             >
                               <option value="birth">Народження</option>
                               <option value="marriage">Шлюб</option>
                               <option value="children">Діти</option>
                               <option value="death">Смерть</option>
                               <option value="other">Інше</option>
                             </select>
                             <input 
                               type="text" 
                               value={doc.date || ''} 
                               onChange={(e) => {
                                 const newDocs = metricDocuments.map(d => d.id === doc.id ? {...d, date: e.target.value} : d);
                                 setMetricDocuments(newDocs);
                               }}
                               placeholder="Рік / Дата"
                               className="text-[10px] font-mono text-stone-500 bg-transparent border-none p-0 focus:ring-0 w-24"
                             />
                          </div>
                          <input 
                            type="text" 
                            value={doc.title} 
                            onChange={(e) => {
                              const newDocs = metricDocuments.map(d => d.id === doc.id ? {...d, title: e.target.value} : d);
                              setMetricDocuments(newDocs);
                            }}
                            placeholder="Назва документа (напр. Запис у метриці)"
                            className="block w-full text-xs font-semibold text-stone-900 bg-transparent border-none p-0 focus:ring-0 truncate"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setMetricDocuments(metricDocuments.filter(d => d.id !== doc.id))}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="pt-2">
                <label className="w-full flex flex-col items-center justify-center py-4 border-2 border-dashed border-emerald-200 rounded-xl bg-emerald-50/30 hover:bg-emerald-50/50 cursor-pointer transition-colors group">
                  <Upload size={24} className="text-emerald-800 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-emerald-900">Додати фото документа / метрики</span>
                  <span className="text-[10px] text-emerald-700 mt-0.5">Виберіть файл зображення (JPG, PNG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      for (const file of files) {
                        try {
                          if (file.size > 10 * 1024 * 1024) {
                             setModalError(`Файл ${file.name} занадто великий (>10MB). Будь ласка, завантажте меншу версію.`);
                             continue;
                          }
                          const url = await uploadFileToServer(file, { isDocument: true });
                          const newDoc: MetricDocument = {
                            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                            type: 'other',
                            url: url,
                            title: file.name.replace(/\.[^/.]+$/, ""),
                          };
                          setMetricDocuments(prev => [...prev, newDoc]);
                        } catch (err) {
                          setModalError((err as Error).message);
                        }
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB: PETS */}
          {activeTab === 'pets' && (

            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2 text-xs text-stone-600">
                <Info size={16} className="text-emerald-800 shrink-0 mt-0.5" />
                <span>
                  Додавайте домашніх улюбленців! Можна прив'язати тварину безпосередньо до цієї особи або позначити її як спільну улюбленцю Пари.
                </span>
              </div>

              {/* Existing Pets List */}
              <div className="space-y-2">
                {pets.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 text-xs">
                    Тварин поки що не додано
                  </div>
                ) : (
                  pets.map((pet) => (
                    <div key={pet.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm">
                          {pet.type === 'cat' ? '🐱' : pet.type === 'bird' ? '🦜' : pet.type === 'horse' ? '🐴' : pet.type === 'cow' ? '🐮' : '🐶'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-900">{pet.name}</span>
                            {pet.isCouplePet && (
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-medium">
                                Спільна тварина Пари
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-500">
                            {pet.breed || (pet.type === 'cat' ? 'Кіт' : pet.type === 'dog' ? 'Собака' : 'Улюбленець')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPets(pets.filter((p) => p.id !== pet.id))}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Видалити тварину"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Pet Form */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus size={14} className="text-emerald-800" />
                  <span>Додати нову тварину</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">Кличка / Назва</label>
                    <input
                      type="text"
                      value={newPetName}
                      onChange={(e) => setNewPetName(e.target.value)}
                      placeholder="напр. Бровко, Рекс, Мура"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">Вид тварини</label>
                    <select
                      value={newPetType}
                      onChange={(e) => setNewPetType(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white"
                    >
                      <option value="dog">Собака 🐶</option>
                      <option value="cat">Кіт / Кішка 🐱</option>
                      <option value="bird">Птах 🦜</option>
                      <option value="horse">Конячка 🐴</option>
                      <option value="cow">Корова 🐮</option>
                      <option value="other">Інша тварина 🐾</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-1">Порода (необов'язково)</label>
                    <input
                      type="text"
                      value={newPetBreed}
                      onChange={(e) => setNewPetBreed(e.target.value)}
                      placeholder="напр. Вівчарка, Перський"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-800">
                      <input
                        type="checkbox"
                        checked={newPetIsCouple}
                        onChange={(e) => setNewPetIsCouple(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                      />
                      <span>Спільна тварина Пари</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!newPetName.trim()) {
                      setModalError('Будь ласка, вкажіть кличку тварини.');
                      return;
                    }
                    const petObj: Pet = {
                      id: `pet-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                      name: newPetName.trim(),
                      type: newPetType as any,
                      breed: newPetBreed.trim() || undefined,
                      isCouplePet: newPetIsCouple,
                    };
                    setPets((prev) => [...prev, petObj]);
                    setNewPetName('');
                    setNewPetBreed('');
                    setNewPetIsCouple(false);
                  }}
                  className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Додати улюбленця</span>
                </button>
              </div>
            </div>
          )}

          {/* Sticky Footer */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-700 font-medium">Видалити картку?</span>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(person.id);
                    onClose();
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs"
                >
                  Так, видалити
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Скасувати
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                <span>Видалити картку</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Зберегти зміни</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
