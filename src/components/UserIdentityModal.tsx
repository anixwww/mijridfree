import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Check, Search, X, User } from 'lucide-react';
import { Person } from '../types/tree';
import { SilhouetteAvatar } from './SilhouetteAvatar';

interface UserIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  allPersons: Record<string, Person>;
  currentUserPersonId: string | null;
  currentCustomName?: { firstName: string; lastName: string } | null;
  onSaveIdentity: (personId: string | null, customName?: { firstName: string; lastName: string }) => void;
}

export const UserIdentityModal: React.FC<UserIdentityModalProps> = ({
  isOpen,
  onClose,
  allPersons,
  currentUserPersonId,
  onSaveIdentity,
}) => {
  const [query, setQuery] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(currentUserPersonId);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPersonId(currentUserPersonId);
      setQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, currentUserPersonId]);

  const personsList = useMemo(() => {
    return Object.values(allPersons).sort((a, b) => {
      const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim();
      const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim();
      return nameA.localeCompare(nameB, 'uk');
    });
  }, [allPersons]);

  // Filter persons based on typed query (empty until user types)
  const matchingPersons = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    const terms = q.split(/\s+/).filter(Boolean);
    return personsList.filter((p) => {
      const fullName = `${p.firstName || ''} ${p.lastName || ''} ${p.maidenName || ''} ${p.patronymic || ''} ${p.nickname || ''}`.toLowerCase();
      return terms.every((term) => fullName.includes(term));
    });
  }, [personsList, query]);

  if (!isOpen) return null;

  const handleSelectPerson = (p: Person) => {
    setSelectedPersonId(p.id);
    setQuery(`${p.firstName || ''} ${p.lastName || ''}`.trim());
  };

  const handleConfirm = () => {
    let finalPersonId = selectedPersonId;

    // If no person explicitly clicked but exactly 1 match in list, select that one
    if (!finalPersonId && matchingPersons.length === 1) {
      finalPersonId = matchingPersons[0].id;
    }

    if (!finalPersonId) return;

    const person = allPersons[finalPersonId];
    if (person) {
      onSaveIdentity(finalPersonId, {
        firstName: person.firstName || '',
        lastName: person.lastName || '',
      });
    } else {
      onSaveIdentity(finalPersonId, undefined);
    }
    onClose();
  };

  const handleClear = () => {
    setSelectedPersonId(null);
    setQuery('');
    onSaveIdentity(null, undefined);
    onClose();
  };

  const selectedPerson = selectedPersonId ? allPersons[selectedPersonId] : null;

  return (
    <div
      className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <User size={16} />
            </div>
            <h3 className="text-base font-bold text-stone-900">Введіть своє ім'я</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Закрити"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Minimal Search Input */}
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // If user changes text manually away from selected person, reset selection
                if (selectedPerson && `${selectedPerson.firstName} ${selectedPerson.lastName}` !== e.target.value) {
                  setSelectedPersonId(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
              placeholder="Введіть своє ім'я..."
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white text-stone-900 font-medium transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedPersonId(null);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* List of Persons to choose from */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-stone-500 px-0.5 font-medium">
              <span>
                {query.trim() ? `Оберіть себе зі списку (${matchingPersons.length})` : "Оберіть себе зі списку"}
              </span>
              {selectedPerson && (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Check size={12} />
                  Обрано
                </span>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 border border-stone-200 rounded-xl p-1 bg-stone-50/50">
              {!query.trim() ? (
                <div className="py-6 px-4 text-center text-xs text-stone-400 font-medium">
                  Почніть вводити ім'я або прізвище для пошуку...
                </div>
              ) : matchingPersons.length === 0 ? (
                <div className="py-6 px-4 text-center text-xs text-stone-500">
                  Осіб із таким ім'ям не знайдено. Спробуйте інше ім'я або прізвище.
                </div>
              ) : (
                matchingPersons.map((p) => {
                  const isSelected = selectedPersonId === p.id;
                  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Без імені';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPerson(p)}
                      className={`w-full p-2 rounded-xl text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-950 shadow-xs'
                          : 'bg-white hover:bg-stone-100 border border-stone-200 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SilhouetteAvatar
                          gender={p.gender}
                          avatarUrl={p.avatarUrl}
                          name={fullName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold truncate block">
                            {fullName}
                            {p.maidenName ? ` (${p.maidenName})` : ''}
                          </span>
                          {p.yearsDisplay && (
                            <span className="text-[10px] text-stone-500 font-mono block">
                              {p.yearsDisplay}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-stone-300 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Button: Підтвердження */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              disabled={!selectedPersonId && matchingPersons.length !== 1}
              onClick={handleConfirm}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                selectedPersonId || matchingPersons.length === 1
                  ? 'bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              <Check size={16} />
              <span>Підтвердити</span>
            </button>

            {currentUserPersonId && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-stone-400 hover:text-stone-700 hover:underline text-center cursor-pointer py-1"
              >
                Скинути мій вибір
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
