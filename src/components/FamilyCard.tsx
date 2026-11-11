import React, { useState, useRef } from 'react';
import { Person, ReactionEmoji } from '../types/tree';
import { CARD_WIDTH, CARD_HEIGHT } from '../utils/treeLayout';
import { SilhouetteAvatar } from './SilhouetteAvatar';
import { getCardDates, calculateAge } from '../utils/dateUtils';
import { ClanInfo } from '../utils/lineageUtils';
import { Pin, Link2, Check, Home, Camera, ExternalLink } from 'lucide-react';

interface FamilyCardProps {
  person: Person;
  isSelected: boolean;
  isGroupSelected?: boolean;
  onSelect: (personId: string, e?: React.MouseEvent) => void;
  onEdit: (person: Person) => void;
  onToggleChronologicalPin?: (personId: string) => void;
  onToggleFullyVerified?: (personId: string) => void;
  onDragStart?: (e: React.MouseEvent, personId: string) => void;
  onLongPress?: (e: React.MouseEvent, personId: string) => void;
  onHighlightHouse?: (houseNumber: string) => void;
  onOpenMetricModal?: (person: Person, tab?: 'birth' | 'death') => void;
  isDimmed?: boolean;
  isConnectingSource?: boolean;
  isConnectingTarget?: boolean;
  // New visual enhancements
  clanInfo?: ClanInfo;
  isLineageActive?: boolean;
  isDescendantCollapsed?: boolean;
  descendantCount?: number;
  onToggleBranchCollapse?: (personId: string) => void;
  zoomLevel?: number; // for Level of Detail (LOD)
  onHoverPerson?: (personId: string | null) => void;
  isCurrentUser?: boolean;
  userPersonId?: string | null;
  onOpenClanCoatOfArmsModal?: (clan: ClanInfo) => void;
  onToggleReaction?: (personId: string, emoji: ReactionEmoji) => void;
  guestUserId?: string;
  onSelectTree?: (treeId: string) => void;
}

const FamilyCardComponent: React.FC<FamilyCardProps> = ({
  person,
  isSelected,
  isGroupSelected,
  onSelect,
  onEdit,
  onToggleChronologicalPin,
  onToggleFullyVerified,
  onDragStart,
  onLongPress,
  onHighlightHouse,
  onOpenMetricModal,
  isDimmed,
  isConnectingSource,
  isConnectingTarget,
  clanInfo,
  isLineageActive,
  isDescendantCollapsed,
  descendantCount = 0,
  onToggleBranchCollapse,
  zoomLevel = 1.0,
  onToggleReaction,
  guestUserId,
  onHoverPerson,
  isCurrentUser,
  userPersonId,
  onOpenClanCoatOfArmsModal,
  onSelectTree,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Formatted display name
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ') || '?';
  const hasNickname = !!person.nickname;
  const datesInfo = getCardDates(person);
  const personAge = calculateAge(person);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowReactionPicker(true);
      if (onLongPress) onLongPress(e, person.id);
    }, 400);

    if (onDragStart) {
      onDragStart(e, person.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
    if (dist > 6 && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Base background & accent styles based on Clan or custom color
  const effectiveBgColor = person.cardBgColor || (clanInfo ? clanInfo.bgColor : '#f4f4f5');
  const clanBorderColor = clanInfo ? clanInfo.borderColor : '#d4d4d8';
  const clanAccentColor = clanInfo ? clanInfo.color : '#52525b';

  // Level of detail check: when zooming far out (< 0.45), show simplified fast card
  const isSimplifiedView = zoomLevel < 0.45;

  return (
    <div
      data-family-card="true"
      style={{
        position: 'absolute',
        left: `${person.x}px`,
        top: `${person.y}px`,
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
      }}
      className="group select-none"
      onMouseEnter={() => {
        setIsHovered(true);
        if (onHoverPerson) onHoverPerson(person.id);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (onHoverPerson) onHoverPerson(null);
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Cross-canvas link arrow badge */}
      {(person.targetCanvasId || person.targetCanvasTitle) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (person.targetCanvasId && onSelectTree) {
              onSelectTree(person.targetCanvasId);
            }
          }}
          className="absolute -top-3 right-2 z-30 px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 transition-all cursor-pointer border border-emerald-500/50"
          title={`Перейти на полотно: ${person.targetCanvasTitle || 'Інше полотно'}`}
        >
          <ExternalLink size={10} />
          <span className="max-w-[100px] truncate">{person.targetCanvasTitle || 'Полотно'}</span>
        </button>
      )}
      {/* The Visual Card Container */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect(person.id, e);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEdit(person);
        }}
        onMouseDown={handleMouseDown}
        style={{
          backgroundColor: effectiveBgColor,
          borderColor: isSelected || isGroupSelected || isConnectingSource || isConnectingTarget 
            ? undefined 
            : isHovered 
            ? clanAccentColor 
            : clanBorderColor,
        }}
        className={`w-full h-full cursor-pointer relative rounded-2xl transition-all duration-200 ease-out flex flex-col items-center justify-between p-2 border shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.03)] hover:-translate-y-0.5
          ${
            isConnectingSource
              ? 'border-stone-800 ring-4 ring-stone-500/40 shadow-xl scale-105 z-40 animate-pulse'
              : isConnectingTarget
              ? 'border-amber-600 ring-4 ring-amber-500/50 shadow-xl scale-105 z-40 bg-stone-100/95'
              : isSelected
              ? 'border-stone-900 ring-2 ring-stone-900 shadow-[0_8px_24px_rgba(0,0,0,0.12)] scale-[1.02] z-30'
              : isGroupSelected
              ? 'border-stone-700 ring-2 ring-stone-500/80 shadow-md scale-[1.01] z-25'
              : isLineageActive
              ? 'ring-2 ring-stone-400/80 shadow-md z-20'
              : 'z-10'
          }
          ${isDimmed ? 'opacity-20 saturate-50' : 'opacity-100'}
        `}
      >
        {/* Subtle top light sheen for modern depth */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-2xl" />

        {/* Verification Status Icon Badge: Sleek top-left chip */}
        {onToggleFullyVerified ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFullyVerified(person.id);
            }}
            className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center z-25 cursor-pointer transition-all active:scale-90 shadow-2xs ${
              person.isFullyVerified
                ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 hover:bg-emerald-500/25 ring-1 ring-emerald-400/20'
                : 'bg-amber-500/15 text-amber-900 border border-amber-500/30 hover:bg-amber-500/25'
            }`}
            title={
              person.isFullyVerified
                ? "Статус: Перевірена (клацніть, щоб змінити на 'Не перевірена')"
                : "Статус: Не перевірена (клацніть, щоб змінити на 'Перевірена')"
            }
            aria-label={person.isFullyVerified ? 'Статус: Перевірена' : 'Статус: Не перевірена'}
          >
            {person.isFullyVerified ? (
              <Check size={11} strokeWidth={2.8} className="text-emerald-700 shrink-0" />
            ) : (
              <span className="font-bold text-[11px] leading-none text-amber-800 select-none pb-0.5">?</span>
            )}
          </button>
        ) : (
          <div
            className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center z-20 shadow-2xs ${
              person.isFullyVerified
                ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-900 border border-amber-500/30'
            }`}
            title={
              person.isFullyVerified
                ? "Інформацію в картці повністю перевірено й підтверджено"
                : "Інформація в картці не перевірена"
            }
          >
            {person.isFullyVerified ? (
              <Check size={10} strokeWidth={2.5} className="text-emerald-700 shrink-0" />
            ) : (
              <span className="font-bold text-[11px] leading-none text-amber-800 select-none pb-0.5">?</span>
            )}
          </div>
        )}

        {/* House Number Badge - Modern micro-tag */}
        {person.houseNumber && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (onHighlightHouse) onHighlightHouse(person.houseNumber!);
            }}
            className="absolute top-1.5 right-1.5 h-4.5 px-1.5 rounded-md bg-stone-900/[0.04] hover:bg-stone-900/[0.08] border border-black/[0.04] flex items-center gap-0.5 z-20 cursor-pointer hover:scale-105 transition-all text-stone-700"
            title={`Номер дому народження: №${person.houseNumber}`}
          >
            <Home size={9} strokeWidth={2.2} className="text-stone-600 shrink-0" />
            <span className="text-[8.5px] font-mono font-bold leading-none tracking-tight text-stone-800">
              №{person.houseNumber}
            </span>
          </div>
        )}

        {/* Chronological Pin Badge */}
        {person.isChronologicallyPinned && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleChronologicalPin) onToggleChronologicalPin(person.id);
            }}
            className="absolute -top-2 -left-1.5 w-5 h-5 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center shadow-xs border-2 border-white z-30 cursor-pointer hover:bg-black transition-transform hover:scale-110"
            title="Прикріплено хронологічно до шкали років. Натисніть, щоб відкріпити"
          >
            <Pin size={10} className="fill-current text-stone-100" />
          </div>
        )}

        {/* Current User Badge ("Це ви") */}
        {isCurrentUser && (
          <div
            className={`absolute top-1.5 ${person.houseNumber ? 'left-8' : 'right-1.5'} px-1.5 py-0.5 rounded-full bg-emerald-800 text-white flex items-center gap-1 shadow-xs border border-emerald-400/60 z-25 text-[8px] font-bold tracking-wide animate-pulse`}
            title="Це ваша картка у родинному дереві"
          >
            <span>Це ви</span>
          </div>
        )}

        {/* Clan Coat of Arms Mini Crest Badge */}
        {clanInfo?.coatOfArmsUrl && !isSimplifiedView && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenClanCoatOfArmsModal && clanInfo) onOpenClanCoatOfArmsModal(clanInfo);
            }}
            className="absolute bottom-1.5 left-1.5 w-4.5 h-4.5 rounded-full overflow-hidden border border-amber-300/80 shadow-2xs z-20 cursor-pointer hover:scale-125 transition-transform bg-white/95 ring-1 ring-black/5"
            title={`Герб роду ${clanInfo.name}${clanInfo.coatOfArmsMotto ? ` («${clanInfo.coatOfArmsMotto}»)` : ''}`}
          >
            <img
              src={clanInfo.coatOfArmsUrl}
              alt={`Герб роду ${clanInfo.name}`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        )}

        {/* Connecting Target Indicator Badge */}
        {isConnectingTarget && (
          <div className="absolute -top-2 -right-2 bg-stone-900 text-white p-1 rounded-full shadow-md z-30 animate-bounce">
            <Link2 size={11} />
          </div>
        )}

        {/* SIMPLIFIED VIEW FOR PERFORMANCE AT DISTANT ZOOM */}
        {isSimplifiedView ? (
          <div className="w-full h-full flex flex-col justify-center items-center text-center px-0.5">
            <p className="text-[10px] font-bold text-stone-900 leading-tight truncate w-full">
              {person.lastName || person.firstName}
            </p>
            <p className="text-[8.5px] font-medium text-stone-600 truncate w-full">
              {person.firstName}
            </p>
            {datesInfo.displayLine1 && (
              <p className="text-[7.5px] font-mono text-stone-500 truncate mt-0.5">
                {datesInfo.displayLine1}
              </p>
            )}
          </div>
        ) : (
          /* FULL DETAIL VIEW */
          <>
            {/* Top: Avatar with refined elevation */}
            <div className="shrink-0 relative pt-0.5 flex items-center justify-center">
              <SilhouetteAvatar
                gender={person.gender}
                avatarUrl={person.avatarUrl}
                name={fullName}
                size="md"
              />
            </div>

            {/* Middle: First & Last Name with typographic hierarchy */}
            <div className="text-center px-1 w-full flex-1 min-h-0 flex flex-col justify-center items-center gap-0.5 my-0.5 overflow-hidden">
              <span className="text-[10px] sm:text-[10.5px] font-medium text-stone-600 leading-tight truncate w-full block tracking-tight" title={person.firstName}>
                {person.firstName || ''}
              </span>
              <span className="text-[11.5px] sm:text-[12px] font-bold text-stone-900 leading-tight truncate w-full block tracking-tight" title={person.lastName}>
                {person.lastName || '?'}
              </span>
              {person.gender === 'female' && person.maidenName && (
                <span className="text-[8.5px] italic text-stone-500 leading-none truncate w-full block" title={`Дівоче: ${person.maidenName}`}>
                  ({person.maidenName})
                </span>
              )}
              {hasNickname && (
                <span className="text-[8.5px] font-serif italic text-amber-900/90 leading-none truncate w-full block" title={`«${person.nickname}»`}>
                  «{person.nickname}»
                </span>
              )}
            </div>

            {/* Bottom: Dates of Life with Clickable Metric Camera Fields */}
            {(() => {
              const hasBirthMetric = !!(
                person.birthMetricUrl ||
                person.metricDocuments?.some((d) => d.type === 'birth')
              );
              const hasDeathMetric = !!(
                person.deathMetricUrl ||
                person.metricDocuments?.some((d) => d.type === 'death')
              );

              const birthDisplay = datesInfo.displayLine1;
              const deathDisplay = datesInfo.displayLine2;

              if (!birthDisplay && !deathDisplay) {
                return (
                  <div className="shrink-0 w-full text-center pb-0.5 px-0.5 min-h-[16px] flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenMetricModal) onOpenMetricModal(person, 'birth');
                      }}
                      className={`text-[8px] px-1.5 py-0.5 rounded-full transition-all inline-flex items-center gap-1 cursor-pointer font-mono ${
                        hasBirthMetric || hasDeathMetric
                          ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 font-semibold border border-amber-300/80 shadow-2xs'
                          : 'text-stone-400 hover:text-stone-700 hover:bg-stone-900/[0.04]'
                      }`}
                      title="Додати фото з метричної книги"
                    >
                      <Camera size={8.5} className={hasBirthMetric || hasDeathMetric ? 'text-amber-800 shrink-0' : 'text-stone-400 shrink-0'} />
                      <span>+ метрика</span>
                    </button>
                  </div>
                );
              }

              return (
                <div className="shrink-0 w-full text-center pb-0.5 px-0.5 flex flex-col items-center justify-center gap-0.5">
                  {birthDisplay && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenMetricModal) onOpenMetricModal(person, 'birth');
                      }}
                      className={`text-[8.5px] font-mono tracking-tight px-1.5 py-0.5 rounded-md leading-tight max-w-full inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        hasBirthMetric
                          ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 font-semibold border border-amber-300/80 shadow-2xs'
                          : 'text-stone-700 hover:text-stone-950 hover:bg-stone-900/[0.04]'
                      }`}
                      title={
                        hasBirthMetric
                          ? `Метрика про народження підтверджена фото (натисніть для перегляду): ${birthDisplay}`
                          : `Натисніть, щоб завантажити фото з метричної книги про народження: ${birthDisplay}`
                      }
                    >
                      {hasBirthMetric && (
                        <Camera size={9} className="text-amber-800 shrink-0" />
                      )}
                      <span className="truncate">{birthDisplay}</span>
                    </button>
                  )}

                  {deathDisplay && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenMetricModal) onOpenMetricModal(person, 'death');
                      }}
                      className={`text-[8.5px] font-mono tracking-tight px-1.5 py-0.5 rounded-md leading-tight max-w-full inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        hasDeathMetric
                          ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 font-semibold border border-amber-300/80 shadow-2xs'
                          : 'text-stone-700 hover:text-stone-950 hover:bg-stone-900/[0.04]'
                      }`}
                      title={
                        hasDeathMetric
                          ? `Метрика про смерть підтверджена фото (натисніть для перегляду): ${deathDisplay}`
                          : `Натисніть, щоб завантажити фото з метричної книги про смерть: ${deathDisplay}`
                      }
                    >
                      {hasDeathMetric && (
                        <Camera size={9} className="text-amber-800 shrink-0" />
                      )}
                      <span className="truncate">{deathDisplay}</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Mini Pet Cards attached under single person card */}
      {person.pets && person.pets.length > 0 && !isSimplifiedView && (
        <div className={`absolute ${person.reactions && person.reactions.length > 0 ? '-bottom-13' : '-bottom-8'} left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-25 w-[100px]`}>
          {person.pets.map((pet) => {
            const getPetIcon = (t: string) => {
              if (t === 'cat') return '🐱';
              if (t === 'dog') return '🐶';
              if (t === 'horse') return '🐴';
              if (t === 'cow') return '🐮';
              if (t === 'bird') return '🦜';
              return '🐾';
            };
            return (
              <div
                key={pet.id}
                className="w-full bg-[#fefcf3] hover:bg-amber-50 border border-amber-300/90 rounded-lg px-1.5 py-1 flex items-center gap-1.5 shadow-xs transition-all text-left cursor-default"
                title={`Домашній улюбленець: ${pet.name}${pet.breed ? ` (${pet.breed})` : ''}`}
              >
                <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300/80 flex items-center justify-center text-[10px] shrink-0">
                  {getPetIcon(pet.type)}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className="text-[9px] font-bold text-amber-950 truncate block">
                    {pet.name}
                  </span>
                  {pet.breed && (
                    <span className="text-[7.5px] text-amber-800/90 font-medium truncate block">
                      {pet.breed}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reaction Picker Popup on Long Press */}
      {showReactionPicker && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-xl border border-stone-200 px-3 py-1.5 flex items-center gap-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {(['❤️', '😮', '👍', '👎', '😢'] as ReactionEmoji[]).map((em) => (
            <button
              key={em}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleReaction) onToggleReaction(person.id, em);
                setShowReactionPicker(false);
              }}
              className="text-base hover:scale-125 transition-transform p-1 cursor-pointer"
              title={em}
            >
              {em}
            </button>
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowReactionPicker(false);
            }}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Reaction Count Badges */}
      {person.reactions && person.reactions.length > 0 && !isSimplifiedView && (
        <div className="absolute -bottom-5.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-stone-200/90 rounded-full px-2 py-0.5 shadow-sm z-35 max-w-[130px] overflow-x-auto pointer-events-auto">
          {(() => {
            const counts: Record<string, number> = {};
            const userReactedEmojis = new Set<string>();
            person.reactions.forEach((r) => {
              counts[r.emoji] = (counts[r.emoji] || 0) + 1;
              if (guestUserId && r.userId === guestUserId) {
                userReactedEmojis.add(r.emoji);
              }
            });
            return Object.entries(counts).map(([em, cnt]) => {
              const isMyReact = userReactedEmojis.has(em);
              return (
                <button
                  key={em}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleReaction) onToggleReaction(person.id, em as ReactionEmoji);
                  }}
                  className={`flex items-center gap-0.5 text-[10px] px-1.5 rounded-full border transition-transform hover:scale-110 cursor-pointer ${
                    isMyReact
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                      : 'bg-stone-50 border-stone-200 text-stone-700'
                  }`}
                  title="Натисніть, щоб додати/змінити реакцію"
                >
                  <span>{em}</span>
                  <span className="text-[9px] font-mono">{cnt}</span>
                </button>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
};

export const FamilyCard = React.memo(FamilyCardComponent);
