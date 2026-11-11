import React, { useState, useRef } from 'react';
import { Person, ConnectionMeta, ReactionEmoji } from '../types/tree';
import { CARD_WIDTH, CARD_HEIGHT } from '../utils/treeLayout';
import { SilhouetteAvatar } from './SilhouetteAvatar';
import { getCardDates, calculateAge } from '../utils/dateUtils';
import { ClanInfo, doPersonsShareColor } from '../utils/lineageUtils';
import { Pin, Link2, Check, ArrowLeftRight, HeartCrack, Heart, Home, Camera, ExternalLink } from 'lucide-react';

interface CoupleCardProps {
  person1: Person; // Left spouse
  person2: Person; // Right spouse
  isSelected1: boolean;
  isSelected2: boolean;
  isGroupSelected1?: boolean;
  isGroupSelected2?: boolean;
  onSelect: (personId: string, e?: React.MouseEvent) => void;
  onEdit: (person: Person) => void;
  onToggleChronologicalPin?: (personId: string) => void;
  onToggleFullyVerified?: (personId: string) => void;
  onDragStart?: (e: React.MouseEvent, personId: string) => void;
  onLongPress?: (e: React.MouseEvent, personId: string) => void;
  onHighlightHouse?: (houseNumber: string) => void;
  onOpenMetricModal?: (person: Person, tab?: 'birth' | 'death') => void;
  onSwapSpouses?: (personId1: string, personId2: string) => void;
  onDisconnectCouple?: (personId1: string, personId2: string) => void;
  isDimmed1?: boolean;
  isDimmed2?: boolean;
  isConnectingSource1?: boolean;
  isConnectingSource2?: boolean;
  isConnectingTarget1?: boolean;
  isConnectingTarget2?: boolean;
  clanInfo1?: ClanInfo;
  clanInfo2?: ClanInfo;
  isLineageActive1?: boolean;
  isLineageActive2?: boolean;
  isDescendantCollapsed?: boolean;
  descendantCount?: number;
  onToggleBranchCollapse?: (personId: string) => void;
  zoomLevel?: number;
  marriageMeta?: ConnectionMeta;
  onMarriageClick?: (marriageKey: string) => void;
  clanMap?: Record<string, ClanInfo>;
  onToggleReaction?: (personId: string, emoji: ReactionEmoji) => void;
  guestUserId?: string;
  onHoverPerson?: (personId: string | null) => void;
  isCurrentUser1?: boolean;
  isCurrentUser2?: boolean;
  userPersonId?: string | null;
  onOpenClanCoatOfArmsModal?: (clan: ClanInfo) => void;
  onSelectTree?: (treeId: string) => void;
}

const CoupleCardComponent: React.FC<CoupleCardProps> = ({
  person1,
  person2,
  isSelected1,
  isSelected2,
  isGroupSelected1,
  isGroupSelected2,
  onSelect,
  onEdit,
  onToggleChronologicalPin,
  onToggleFullyVerified,
  onDragStart,
  onLongPress,
  onHighlightHouse,
  onOpenMetricModal,
  onSwapSpouses,
  onDisconnectCouple,
  isDimmed1,
  isDimmed2,
  isConnectingSource1,
  isConnectingSource2,
  isConnectingTarget1,
  isConnectingTarget2,
  clanInfo1,
  clanInfo2,
  isLineageActive1,
  isLineageActive2,
  isDescendantCollapsed,
  descendantCount = 0,
  onToggleBranchCollapse,
  zoomLevel = 1.0,
  marriageMeta,
  onMarriageClick,
  clanMap,
  onToggleReaction,
  guestUserId,
  onHoverPerson,
  isCurrentUser1,
  isCurrentUser2,
  userPersonId,
  onOpenClanCoatOfArmsModal,
  onSelectTree,
}) => {
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [, setIsUnionHovered] = useState(false);
  const [activeReactionPersonId, setActiveReactionPersonId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const dates1 = getCardDates(person1);
  const dates2 = getCardDates(person2);

  const personAge1 = calculateAge(person1);
  const personAge2 = calculateAge(person2);

  const fullName1 = [person1.firstName, person1.lastName].filter(Boolean).join(' ') || '?';
  const fullName2 = [person2.firstName, person2.lastName].filter(Boolean).join(' ') || '?';

  // Check if both spouses share the same color (e.g. same clan or same custom background)
  const sharedColorCheck = doPersonsShareColor(person1, person2, clanMap);
  const isColorMatched = sharedColorCheck.shares;
  const matchedStrokeColor = sharedColorCheck.color || '#64748b';

  const handleMouseDown = (e: React.MouseEvent, person: Person) => {
    if (e.button !== 0) return;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveReactionPersonId(person.id);
      if (onLongPress) onLongPress(e, person.id);
    }, 400);

    if (onDragStart) {
      // Dragging either spouse moves the whole couple card unit
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

  const effectiveBg1 = person1.cardBgColor || (clanInfo1 ? clanInfo1.bgColor : '#f4f4f5');
  const effectiveBg2 = person2.cardBgColor || (clanInfo2 ? clanInfo2.bgColor : '#f4f4f5');

  const border1 = isColorMatched ? matchedStrokeColor : (clanInfo1 ? clanInfo1.borderColor : '#d4d4d8');
  const border2 = isColorMatched ? matchedStrokeColor : (clanInfo2 ? clanInfo2.borderColor : '#d4d4d8');

  const isSimplified = zoomLevel < 0.45;
  const marriageKey = [person1.id, person2.id].sort().join('::');

  // Overall couple geometry: left position is left spouse x, top is min y
  const coupleX = Math.min(person1.x, person2.x);
  const coupleY = Math.min(person1.y, person2.y);
  const totalWidth = CARD_WIDTH * 2 + 10; // 218px


  return (
    <div
      data-family-card="true"
      data-couple-card="true"
      style={{
        position: 'absolute',
        left: `${coupleX}px`,
        top: `${coupleY}px`,
        width: `${totalWidth}px`,
        height: `${CARD_HEIGHT}px`,
      }}
      className="group select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Floating Action Bar on hover: Swap and Disconnect */}
      {(onSwapSpouses || onDisconnectCouple) && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-150 flex items-center gap-1.5 z-40 whitespace-nowrap">
          {onSwapSpouses && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwapSpouses(person1.id, person2.id);
              }}
              className="bg-white hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-300 hover:border-amber-400 rounded-full px-2 py-0.5 shadow-md text-[9px] font-bold flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-all"
              title="Змінити картки місцями (ліворуч ⇄ праворуч)"
            >
              <ArrowLeftRight size={10} className="text-amber-600" />
              <span>Змінити місцями</span>
            </button>
          )}

          {onDisconnectCouple && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDisconnectCouple(person1.id, person2.id);
              }}
              className="bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-900 border border-rose-300 hover:border-rose-400 rounded-full px-2 py-0.5 shadow-md text-[9px] font-bold flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-all"
              title="Роз'єднати пару (розлучення) — розділити на дві окремі картки"
            >
              <HeartCrack size={10} className="text-rose-600" />
              <span>Роз'єднати</span>
            </button>
          )}
        </div>
      )}

      {/* Two Separate Cards Joined Visually by Central Union Medallion */}
      <div className="w-full h-full relative flex items-center justify-between">
        {/* LEFT SPOUSE CARD */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(person1.id, e);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onEdit(person1);
          }}
          onMouseDown={(e) => handleMouseDown(e, person1)}
          onMouseEnter={() => {
            setHoveredPersonId(person1.id);
            if (onHoverPerson) onHoverPerson(person1.id);
          }}
          onMouseLeave={() => {
            setHoveredPersonId(null);
            if (onHoverPerson) onHoverPerson(null);
          }}
          style={{
            backgroundColor: effectiveBg1,
            borderColor: isSelected1 ? '#1c1917' : isGroupSelected1 ? '#52525b' : border1,
            width: `${CARD_WIDTH}px`,
          }}
          className={`h-full cursor-pointer relative rounded-2xl transition-all duration-200 ease-out flex flex-col items-center justify-between p-2 border shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 ${
            isConnectingSource1
              ? 'ring-4 ring-stone-500/40 shadow-xl z-40 animate-pulse border-stone-800'
              : isConnectingTarget1
              ? 'ring-4 ring-amber-500/50 shadow-xl z-40 bg-stone-100/95 border-amber-600'
              : isSelected1
              ? 'ring-2 ring-stone-900 shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-30 scale-[1.02]'
              : isGroupSelected1
              ? 'ring-2 ring-stone-600 shadow-md z-25 scale-[1.01]'
              : isLineageActive1
              ? 'ring-2 ring-stone-400/80 shadow-md z-20'
              : ''
          } ${isDimmed1 ? 'opacity-20 saturate-50' : 'opacity-100'}`}
        >
          {/* Subtle top light sheen for modern depth */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-2xl" />

          {/* Group selection checkmark badge */}
          {isGroupSelected1 && !isSelected1 && (
            <div className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-stone-700 text-white flex items-center justify-center text-[9px] font-bold z-20 shadow-2xs">
              ✓
            </div>
          )}

          {/* Quick Verification Control for Person 1 */}
          {onToggleFullyVerified ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullyVerified(person1.id);
              }}
              className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center z-25 cursor-pointer transition-all active:scale-90 shadow-2xs ${
                person1.isFullyVerified
                  ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 hover:bg-emerald-500/25 ring-1 ring-emerald-400/20'
                  : 'bg-amber-500/15 text-amber-900 border border-amber-500/30 hover:bg-amber-500/25'
              }`}
              title={
                person1.isFullyVerified
                  ? "Статус: Перевірена (клацніть, щоб змінити на 'Не перевірена')"
                  : "Статус: Не перевірена (клацніть, щоб змінити на 'Перевірена')"
              }
              aria-label={person1.isFullyVerified ? 'Статус: Перевірена' : 'Статус: Не перевірена'}
            >
              {person1.isFullyVerified ? (
                <Check size={11} strokeWidth={2.8} className="text-emerald-700 shrink-0" />
              ) : (
                <span className="font-bold text-[11px] leading-none text-amber-800 select-none pb-0.5">?</span>
              )}
            </button>
          ) : (
            <div
              className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center z-20 shadow-2xs ${
                person1.isFullyVerified
                  ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-900 border border-amber-500/30'
              }`}
              title={
                person1.isFullyVerified
                  ? "Інформацію перевірено та підтверджено"
                  : "Інформація в картці не перевірена"
              }
            >
              {person1.isFullyVerified ? (
                <Check size={10} strokeWidth={2.5} className="text-emerald-700 shrink-0" />
              ) : (
                <span className="font-bold text-[11px] leading-none text-amber-800 select-none pb-0.5">?</span>
              )}
            </div>
          )}

          {/* House Number Badge for Person 1 */}
          {person1.houseNumber && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onHighlightHouse) onHighlightHouse(person1.houseNumber!);
              }}
              className="absolute top-1.5 right-1.5 h-4.5 px-1.5 rounded-md bg-stone-900/[0.04] hover:bg-stone-900/[0.08] border border-black/[0.04] flex items-center gap-0.5 z-20 cursor-pointer hover:scale-105 transition-all text-stone-700"
              title={`Дім: №${person1.houseNumber}`}
            >
              <Home size={9} strokeWidth={2.2} className="text-stone-600 shrink-0" />
              <span className="text-[8.5px] font-mono font-bold leading-none tracking-tight text-stone-800">
                №{person1.houseNumber}
              </span>
            </div>
          )}

          {/* Chronological Pin Badge */}
          {person1.isChronologicallyPinned && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleChronologicalPin) onToggleChronologicalPin(person1.id);
              }}
              className="absolute -top-2 -left-1.5 w-5 h-5 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center shadow-xs border-2 border-white z-20 cursor-pointer hover:bg-black transition-transform hover:scale-110"
              title="Прикріплено до шкали років"
            >
              <Pin size={10} className="fill-current text-stone-100" />
            </div>
          )}

          {/* Connecting target badge */}
          {isConnectingTarget1 && (
            <div className="absolute -top-2 -left-2 bg-stone-900 text-white p-1 rounded-full shadow-md z-30 animate-bounce">
              <Link2 size={11} />
            </div>
          )}

          {/* Clan Coat of Arms Mini Crest Badge for Person 1 */}
          {clanInfo1?.coatOfArmsUrl && !isSimplified && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenClanCoatOfArmsModal && clanInfo1) onOpenClanCoatOfArmsModal(clanInfo1);
              }}
              className="absolute bottom-1.5 left-1.5 w-4.5 h-4.5 rounded-full overflow-hidden border border-amber-300/80 shadow-2xs z-20 cursor-pointer hover:scale-125 transition-transform bg-white/95 ring-1 ring-black/5"
              title={`Герб роду ${clanInfo1.name}${clanInfo1.coatOfArmsMotto ? ` («${clanInfo1.coatOfArmsMotto}»)` : ''}`}
            >
              <img
                src={clanInfo1.coatOfArmsUrl}
                alt={`Герб роду ${clanInfo1.name}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          )}

          {/* Person 1 Cross-canvas Link */}
          {(person1.targetCanvasId || person1.targetCanvasTitle) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (person1.targetCanvasId && onSelectTree) {
                  onSelectTree(person1.targetCanvasId);
                }
              }}
              className="absolute -top-3 left-1 z-30 px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 transition-all cursor-pointer border border-emerald-500/50"
              title={`Перейти на полотно: ${person1.targetCanvasTitle || 'Інше полотно'}`}
            >
              <ExternalLink size={10} />
              <span className="max-w-[70px] truncate">{person1.targetCanvasTitle || 'Полотно'}</span>
            </button>
          )}

          {/* Current User Badge ("Це ви") for Person 1 */}
          {isCurrentUser1 && (
            <div
              className={`absolute top-1.5 ${person1.houseNumber ? 'left-8' : 'right-1.5'} px-1.5 py-0.5 rounded-full bg-emerald-800 text-white flex items-center gap-1 shadow-xs border border-emerald-400/60 z-25 text-[8px] font-bold tracking-wide animate-pulse`}
              title="Це ваша картка у родинному дереві"
            >
              <span>Це ви</span>
            </div>
          )}

          {/* Content: Simplified or Full */}
          {isSimplified ? (
            <div className="w-full h-full flex flex-col justify-center items-center text-center px-0.5">
              <p className="text-[10px] font-bold text-stone-900 leading-tight truncate w-full">
                {person1.lastName || person1.firstName}
              </p>
              <p className="text-[8.5px] font-medium text-stone-600 truncate w-full">
                {person1.firstName}
              </p>
              {dates1.displayLine1 && (
                <p className="text-[7.5px] font-mono text-stone-500 truncate mt-0.5">
                  {dates1.displayLine1}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Avatar with refined elevation */}
              <div className="shrink-0 relative pt-0.5 flex items-center justify-center">
                <SilhouetteAvatar
                  gender={person1.gender}
                  avatarUrl={person1.avatarUrl}
                  name={fullName1}
                  size="md"
                />
              </div>

              {/* Middle: First & Last Name with typographic hierarchy */}
              <div className="text-center px-1 w-full flex-1 min-h-0 flex flex-col justify-center items-center gap-0.5 my-0.5 overflow-hidden">
                <span className="text-[10px] sm:text-[10.5px] font-medium text-stone-600 leading-tight truncate w-full block tracking-tight" title={person1.firstName}>
                  {person1.firstName || ''}
                </span>
                <span className="text-[11.5px] sm:text-[12px] font-bold text-stone-900 leading-tight truncate w-full block tracking-tight" title={person1.lastName}>
                  {person1.lastName || '?'}
                </span>
                {person1.gender === 'female' && person1.maidenName && (
                  <span className="text-[8.5px] italic text-stone-500 leading-none truncate w-full block" title={`Дівоче: ${person1.maidenName}`}>
                    ({person1.maidenName})
                  </span>
                )}
                {person1.nickname && (
                  <span className="text-[8.5px] font-serif italic text-amber-900/90 leading-none truncate w-full block" title={`«${person1.nickname}»`}>
                    «{person1.nickname}»
                  </span>
                )}
              </div>

              {/* Dates & Metrics */}
              <div className="shrink-0 w-full text-center pb-0.5 px-0.5 min-h-[16px] flex items-center justify-center">
                {(() => {
                  const hasBirthMetric1 = !!(
                    person1.birthMetricUrl ||
                    person1.metricDocuments?.some((d) => d.type === 'birth')
                  );
                  const hasDeathMetric1 = !!(
                    person1.deathMetricUrl ||
                    person1.metricDocuments?.some((d) => d.type === 'death')
                  );

                  const birthDisplay1 = dates1.displayLine1;
                  const deathDisplay1 = dates1.displayLine2;

                  if (!birthDisplay1 && !deathDisplay1) {
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenMetricModal) onOpenMetricModal(person1, 'birth');
                        }}
                        className={`text-[8px] px-1.5 py-0.5 rounded-full transition-all inline-flex items-center gap-1 cursor-pointer font-mono ${
                          hasBirthMetric1 || hasDeathMetric1
                            ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 font-semibold border border-amber-300/80 shadow-2xs'
                            : 'text-stone-400 hover:text-stone-700 hover:bg-stone-900/[0.04]'
                        }`}
                        title="Додати фото з метричної книги"
                      >
                        <Camera size={8.5} className={hasBirthMetric1 || hasDeathMetric1 ? 'text-amber-800 shrink-0' : 'text-stone-400 shrink-0'} />
                        <span>+ метрика</span>
                      </button>
                    );
                  }

                  return (
                    <div className="shrink-0 w-full text-center pb-0.5 px-0.5 flex flex-col items-center justify-center gap-0.5">
                      {birthDisplay1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenMetricModal) onOpenMetricModal(person1, 'birth');
                          }}
                          className={`text-[8.5px] font-mono tracking-tight px-1.5 py-0.5 rounded-md leading-tight max-w-full inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            hasBirthMetric1
                              ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 font-semibold border border-amber-300/80 shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-stone-900/[0.04]'
                          }`}
                          title={
                            hasBirthMetric1
                              ? `Метрика про народження підтверджена фото (натисніть для перегляду): ${birthDisplay1}`
                              : `Натисніть, щоб завантажити фото з метричної книги про народження: ${birthDisplay1}`
                          }
                        >
                          {hasBirthMetric1 && (
                            <Camera size={9} className="text-amber-800 shrink-0" />
                          )}
                          <span className="truncate">{birthDisplay1}</span>
                        </button>
                      )}

                      {deathDisplay1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenMetricModal) onOpenMetricModal(person1, 'death');
                          }}
                          className={`text-[8.5px] font-mono tracking-tight px-1.5 py-0.5 rounded-md leading-tight max-w-full inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            hasDeathMetric1
                              ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 font-semibold border border-amber-300/80 shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-stone-900/[0.04]'
                          }`}
                          title={
                            hasDeathMetric1
                              ? `Метрика про смерть підтверджена фото (натисніть для перегляду): ${deathDisplay1}`
                              : `Натисніть, щоб завантажити фото з метричної книги про смерть: ${deathDisplay1}`
                          }
                        >
                          {hasDeathMetric1 && (
                            <Camera size={9} className="text-amber-800 shrink-0" />
                          )}
                          <span className="truncate">{deathDisplay1}</span>
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Person 1 Reaction Badges */}
                {person1.reactions && person1.reactions.length > 0 && !isSimplified && (
                  <div className="absolute -bottom-5.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-stone-200/90 rounded-full px-2 py-0.5 shadow-sm z-35 max-w-[110px] overflow-x-auto pointer-events-auto">
                    {(() => {
                      const counts: Record<string, number> = {};
                      const userReacted = new Set<string>();
                      person1.reactions.forEach((r) => {
                        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
                        if (guestUserId && r.userId === guestUserId) userReacted.add(r.emoji);
                      });
                      return Object.entries(counts).map(([em, cnt]) => {
                        const isMy = userReacted.has(em);
                        return (
                          <button
                            key={em}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleReaction) onToggleReaction(person1.id, em as ReactionEmoji);
                            }}
                            className={`flex items-center gap-0.5 text-[9.5px] px-1 rounded-full border ${isMy ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold' : 'bg-stone-50 border-stone-200 text-stone-700'}`}
                          >
                            <span>{em}</span>
                            <span className="text-[8.5px]">{cnt}</span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* CENTRAL UNION RINGS OR PAIR MEDALLION */}
        {(() => {
          const isDivorced = marriageMeta?.eventType === 'divorce';
          const isCohabitation = !isDivorced && (marriageMeta?.eventType === 'cohabitation' || (marriageMeta?.label && marriageMeta.label.toLowerCase().includes('без шлюбу')));
          return (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onMarriageClick) onMarriageClick(marriageKey);
              }}
              onMouseEnter={() => setIsUnionHovered(true)}
              onMouseLeave={() => setIsUnionHovered(false)}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-md border flex items-center justify-center cursor-pointer transition-transform hover:scale-115 z-30 ${
                isDivorced
                  ? 'bg-rose-50 border-rose-400'
                  : isCohabitation
                  ? 'bg-emerald-50 border-emerald-400'
                  : 'bg-white'
              }`}
              style={{
                borderColor: isDivorced
                  ? '#e11d48'
                  : isCohabitation
                  ? '#059669'
                  : isColorMatched
                  ? matchedStrokeColor
                  : '#d97706',
                boxShadow: isDivorced
                  ? '0 1px 6px rgba(225, 29, 72, 0.3)'
                  : isColorMatched
                  ? `0 1px 6px ${matchedStrokeColor}40`
                  : '0 1px 4px rgba(0,0,0,0.12)',
              }}
              title={
                isDivorced
                  ? marriageMeta?.eventDate
                    ? `Розлучена пара (${marriageMeta.eventDate}) · Натисніть для редагування або роз'єднання`
                    : 'Розлучена пара · Натисніть для налаштування або роз\'єднання на окремі картки'
                  : isCohabitation
                  ? marriageMeta?.eventDate
                    ? `Пара без шлюбу (${marriageMeta.eventDate}) · Натисніть для налаштування`
                    : 'Пара (без шлюбу / цивільний союз) · Натисніть для налаштування'
                  : marriageMeta?.eventDate
                  ? `Подружжя (${marriageMeta.eventDate}) · Натисніть для редагування шлюбу`
                  : 'Подружжя · Натисніть для налаштування шлюбу'
              }
            >
              {isDivorced ? (
                <HeartCrack size={13} className="text-rose-600" />
              ) : isCohabitation ? (
                <Heart size={13} className="text-emerald-700 fill-emerald-100" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
                  <circle
                    cx="9"
                    cy="12"
                    r="5"
                    stroke={isColorMatched ? matchedStrokeColor : '#d97706'}
                    strokeWidth="2"
                  />
                  <circle
                    cx="15"
                    cy="12"
                    r="5"
                    stroke={isColorMatched ? matchedStrokeColor : '#b45309'}
                    strokeWidth="2"
                  />
                </svg>
              )}

              {/* Marriage / Pair Date Badge if configured */}
              {marriageMeta?.eventDate && !isSimplified && (
                <span
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded text-[7.5px] font-mono font-bold shadow-2xs whitespace-nowrap ${
                    isDivorced
                      ? 'bg-rose-100 text-rose-950 border border-rose-300'
                      : isCohabitation
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {isDivorced ? `💔 ${marriageMeta.eventDate}` : marriageMeta.eventDate}
                </span>
              )}
            </div>
          );
        })()}

        {/* RIGHT SPOUSE CARD */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(person2.id, e);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onEdit(person2);
          }}
          onMouseDown={(e) => handleMouseDown(e, person2)}
          onMouseEnter={() => {
            setHoveredPersonId(person2.id);
            if (onHoverPerson) onHoverPerson(person2.id);
          }}
          onMouseLeave={() => {
            setHoveredPersonId(null);
            if (onHoverPerson) onHoverPerson(null);
          }}
          style={{
            backgroundColor: effectiveBg2,
            borderColor: isSelected2 ? '#1c1917' : isGroupSelected2 ? '#52525b' : border2,
            width: `${CARD_WIDTH}px`,
          }}
          className={`h-full cursor-pointer relative rounded-2xl transition-all duration-200 ease-out flex flex-col items-center justify-between p-2 border shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 ${
            isConnectingSource2
              ? 'ring-4 ring-stone-500/40 shadow-xl z-40 animate-pulse border-stone-800'
              : isConnectingTarget2
              ? 'ring-4 ring-amber-500/50 shadow-xl z-40 bg-stone-100/95 border-amber-600'
              : isSelected2
              ? 'ring-2 ring-stone-900 shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-30 scale-[1.02]'
              : isGroupSelected2
              ? 'ring-2 ring-stone-600 shadow-md z-25 scale-[1.01]'
              : isLineageActive2
              ? 'ring-2 ring-stone-400/80 shadow-md z-20'
              : ''
          } ${isDimmed2 ? 'opacity-20 saturate-50' : 'opacity-100'}`}
        >
          {/* Subtle top light sheen for modern depth */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-2xl" />

          {/* Group selection checkmark badge */}
          {isGroupSelected2 && !isSelected2 && (
            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-stone-700 text-white flex items-center justify-center text-[9px] font-bold z-20 shadow-2xs">
              ✓
            </div>
          )}

          {/* Quick Verification Control for Person 2 */}
          {onToggleFullyVerified ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullyVerified(person2.id);
              }}
              className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center z-25 cursor-pointer transition-all active:scale-90 shadow-2xs ${
                person2.isFullyVerified
                  ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 hover:bg-emerald-500/25 ring-1 ring-emerald-400/20'
                  : 'bg-amber-500/15 text-amber-900 border border-amber-500/30 hover:bg-amber-500/25'
              }`}
              title={
                person2.isFullyVerified
                  ? "Статус: Перевірена (клацніть, щоб змінити на 'Не перевірена')"
                  : "Статус: Не перевірена (клацніть, щоб змінити на 'Перевірена')"
              }
              aria-label={person2.isFullyVerified ? 'Статус: Перевірена' : 'Статус: Не перевірена'}
            >
              {person2.isFullyVerified ? (
                <Check size={11} strokeWidth={2.8} className="text-emerald-700 shrink-0" />
              ) : (
                <span className="font-bold text-[11px] leading-none text-amber-800 select-none pb-0.5">?</span>
              )}
            </button>
          ) : (
            <div
              className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center z-20 shadow-2xs ${
                person2.isFullyVerified
                  ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-900 border border-amber-500/30'
              }`}
              title={
                person2.isFullyVerified
                  ? "Інформацію перевірено та підтверджено"
                  : "Інформація в картці не перевірена"
              }
            >
              {person2.isFullyVerified ? (
                <Check size={10} strokeWidth={2.5} className="text-emerald-700 shrink-0" />
              ) : (
                <span className="font-bold text-[11px] leading-none text-amber-800 select-none pb-0.5">?</span>
              )}
            </div>
          )}

          {/* House Number Badge for Person 2 */}
          {person2.houseNumber && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onHighlightHouse) onHighlightHouse(person2.houseNumber!);
              }}
              className="absolute top-1.5 right-1.5 h-4.5 px-1.5 rounded-md bg-stone-900/[0.04] hover:bg-stone-900/[0.08] border border-black/[0.04] flex items-center gap-0.5 z-20 cursor-pointer hover:scale-105 transition-all text-stone-700"
              title={`Дім: №${person2.houseNumber}`}
            >
              <Home size={9} strokeWidth={2.2} className="text-stone-600 shrink-0" />
              <span className="text-[8.5px] font-mono font-bold leading-none tracking-tight text-stone-800">
                №{person2.houseNumber}
              </span>
            </div>
          )}

          {/* Chronological Pin Badge */}
          {person2.isChronologicallyPinned && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleChronologicalPin) onToggleChronologicalPin(person2.id);
              }}
              className="absolute -top-2 -left-1.5 w-5 h-5 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center shadow-xs border-2 border-white z-20 cursor-pointer hover:bg-black transition-transform hover:scale-110"
              title="Прикріплено до шкали років"
            >
              <Pin size={10} className="fill-current text-stone-100" />
            </div>
          )}

          {/* Connecting target badge */}
          {isConnectingTarget2 && (
            <div className="absolute -top-2 -right-2 bg-stone-900 text-white p-1 rounded-full shadow-md z-30 animate-bounce">
              <Link2 size={11} />
            </div>
          )}

          {/* Clan Coat of Arms Mini Crest Badge for Person 2 */}
          {clanInfo2?.coatOfArmsUrl && !isSimplified && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenClanCoatOfArmsModal && clanInfo2) onOpenClanCoatOfArmsModal(clanInfo2);
              }}
              className="absolute bottom-1.5 left-1.5 w-4.5 h-4.5 rounded-full overflow-hidden border border-amber-300/80 shadow-2xs z-20 cursor-pointer hover:scale-125 transition-transform bg-white/95 ring-1 ring-black/5"
              title={`Герб роду ${clanInfo2.name}${clanInfo2.coatOfArmsMotto ? ` («${clanInfo2.coatOfArmsMotto}»)` : ''}`}
            >
              <img
                src={clanInfo2.coatOfArmsUrl}
                alt={`Герб роду ${clanInfo2.name}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          )}

          {/* Person 2 Cross-canvas Link */}
          {(person2.targetCanvasId || person2.targetCanvasTitle) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (person2.targetCanvasId && onSelectTree) {
                  onSelectTree(person2.targetCanvasId);
                }
              }}
              className="absolute -top-3 right-1 z-30 px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 transition-all cursor-pointer border border-emerald-500/50"
              title={`Перейти на полотно: ${person2.targetCanvasTitle || 'Інше полотно'}`}
            >
              <ExternalLink size={10} />
              <span className="max-w-[70px] truncate">{person2.targetCanvasTitle || 'Полотно'}</span>
            </button>
          )}

          {/* Current User Badge ("Це ви") for Person 2 */}
          {isCurrentUser2 && (
            <div
              className={`absolute top-1.5 ${person2.houseNumber ? 'left-8' : 'right-1.5'} px-1.5 py-0.5 rounded-full bg-emerald-800 text-white flex items-center gap-1 shadow-xs border border-emerald-400/60 z-25 text-[8px] font-bold tracking-wide animate-pulse`}
              title="Це ваша картка у родинному дереві"
            >
              <span>Це ви</span>
            </div>
          )}

          {/* Content: Simplified or Full */}
          {isSimplified ? (
            <div className="w-full h-full flex flex-col justify-center items-center text-center px-0.5">
              <p className="text-[10px] font-bold text-stone-900 leading-tight truncate w-full">
                {person2.lastName || person2.firstName}
              </p>
              <p className="text-[8.5px] font-medium text-stone-600 truncate w-full">
                {person2.firstName}
              </p>
              {dates2.displayLine1 && (
                <p className="text-[7.5px] font-mono text-stone-500 truncate mt-0.5">
                  {dates2.displayLine1}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Avatar with refined elevation */}
              <div className="shrink-0 relative pt-0.5 flex items-center justify-center">
                <SilhouetteAvatar
                  gender={person2.gender}
                  avatarUrl={person2.avatarUrl}
                  name={fullName2}
                  size="md"
                />
              </div>

              {/* Middle: First & Last Name with typographic hierarchy */}
              <div className="text-center px-1 w-full flex-1 min-h-0 flex flex-col justify-center items-center gap-0.5 my-0.5 overflow-hidden">
                <span className="text-[10px] sm:text-[10.5px] font-medium text-stone-600 leading-tight truncate w-full block tracking-tight" title={person2.firstName}>
                  {person2.firstName || ''}
                </span>
                <span className="text-[11.5px] sm:text-[12px] font-bold text-stone-900 leading-tight truncate w-full block tracking-tight" title={person2.lastName}>
                  {person2.lastName || '?'}
                </span>
                {person2.gender === 'female' && person2.maidenName && (
                  <span className="text-[8.5px] italic text-stone-500 leading-none truncate w-full block" title={`Дівоче: ${person2.maidenName}`}>
                    ({person2.maidenName})
                  </span>
                )}
                {person2.nickname && (
                  <span className="text-[8.5px] font-serif italic text-amber-900/90 leading-none truncate w-full block" title={`«${person2.nickname}»`}>
                    «{person2.nickname}»
                  </span>
                )}
              </div>

              {/* Dates & Metrics */}
              <div className="shrink-0 w-full text-center pb-0.5 px-0.5 min-h-[16px] flex items-center justify-center">
                {(() => {
                  const hasBirthMetric2 = !!(
                    person2.birthMetricUrl ||
                    person2.metricDocuments?.some((d) => d.type === 'birth')
                  );
                  const hasDeathMetric2 = !!(
                    person2.deathMetricUrl ||
                    person2.metricDocuments?.some((d) => d.type === 'death')
                  );

                  const birthDisplay2 = dates2.displayLine1;
                  const deathDisplay2 = dates2.displayLine2;

                  if (!birthDisplay2 && !deathDisplay2) {
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenMetricModal) onOpenMetricModal(person2, 'birth');
                        }}
                        className={`text-[8px] px-1.5 py-0.5 rounded-full transition-all inline-flex items-center gap-1 cursor-pointer font-mono ${
                          hasBirthMetric2 || hasDeathMetric2
                            ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 font-semibold border border-amber-300/80 shadow-2xs'
                            : 'text-stone-400 hover:text-stone-700 hover:bg-stone-900/[0.04]'
                        }`}
                        title="Додати фото з метричної книги"
                      >
                        <Camera size={8.5} className={hasBirthMetric2 || hasDeathMetric2 ? 'text-amber-800 shrink-0' : 'text-stone-400 shrink-0'} />
                        <span>+ метрика</span>
                      </button>
                    );
                  }

                  return (
                    <div className="shrink-0 w-full text-center pb-0.5 px-0.5 flex flex-col items-center justify-center gap-0.5">
                      {birthDisplay2 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenMetricModal) onOpenMetricModal(person2, 'birth');
                          }}
                          className={`text-[8.5px] font-mono tracking-tight px-1.5 py-0.5 rounded-md leading-tight max-w-full inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            hasBirthMetric2
                              ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 font-semibold border border-amber-300/80 shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-stone-900/[0.04]'
                          }`}
                          title={
                            hasBirthMetric2
                              ? `Метрика про народження підтверджена фото (натисніть для перегляду): ${birthDisplay2}`
                              : `Натисніть, щоб завантажити фото з метричної книги про народження: ${birthDisplay2}`
                          }
                        >
                          {hasBirthMetric2 && (
                            <Camera size={9} className="text-amber-800 shrink-0" />
                          )}
                          <span className="truncate">{birthDisplay2}</span>
                        </button>
                      )}

                      {deathDisplay2 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenMetricModal) onOpenMetricModal(person2, 'death');
                          }}
                          className={`text-[8.5px] font-mono tracking-tight px-1.5 py-0.5 rounded-md leading-tight max-w-full inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            hasDeathMetric2
                              ? 'bg-amber-100/90 hover:bg-amber-200 text-amber-950 font-semibold border border-amber-300/80 shadow-2xs'
                              : 'text-stone-700 hover:text-stone-950 hover:bg-stone-900/[0.04]'
                          }`}
                          title={
                            hasDeathMetric2
                              ? `Метрика про смерть підтверджена фото (натисніть для перегляду): ${deathDisplay2}`
                              : `Натисніть, щоб завантажити фото з метричної книги про смерть: ${deathDisplay2}`
                          }
                        >
                          {hasDeathMetric2 && (
                            <Camera size={9} className="text-amber-800 shrink-0" />
                          )}
                          <span className="truncate">{deathDisplay2}</span>
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Person 2 Reaction Badges */}
                {person2.reactions && person2.reactions.length > 0 && !isSimplified && (
                  <div className="absolute -bottom-5.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-stone-200/90 rounded-full px-2 py-0.5 shadow-sm z-35 max-w-[110px] overflow-x-auto pointer-events-auto">
                    {(() => {
                      const counts: Record<string, number> = {};
                      const userReacted = new Set<string>();
                      person2.reactions.forEach((r) => {
                        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
                        if (guestUserId && r.userId === guestUserId) userReacted.add(r.emoji);
                      });
                      return Object.entries(counts).map(([em, cnt]) => {
                        const isMy = userReacted.has(em);
                        return (
                          <button
                            key={em}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleReaction) onToggleReaction(person2.id, em as ReactionEmoji);
                            }}
                            className={`flex items-center gap-0.5 text-[9.5px] px-1 rounded-full border ${isMy ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold' : 'bg-stone-50 border-stone-200 text-stone-700'}`}
                          >
                            <span>{em}</span>
                            <span className="text-[8.5px]">{cnt}</span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reaction Picker Popup for Person 1 */}
      {activeReactionPersonId === person1.id && (
        <div className="absolute -top-12 left-1/4 -translate-x-1/2 bg-white rounded-full shadow-xl border border-stone-200 px-3 py-1.5 flex items-center gap-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {(['❤️', '😮', '👍', '👎', '😢'] as ReactionEmoji[]).map((em) => (
            <button
              key={em}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleReaction) onToggleReaction(person1.id, em);
                setActiveReactionPersonId(null);
              }}
              className="text-base hover:scale-125 transition-transform p-1 cursor-pointer"
            >
              {em}
            </button>
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveReactionPersonId(null);
            }}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Reaction Picker Popup for Person 2 */}
      {activeReactionPersonId === person2.id && (
        <div className="absolute -top-12 right-1/4 translate-x-1/2 bg-white rounded-full shadow-xl border border-stone-200 px-3 py-1.5 flex items-center gap-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {(['❤️', '😮', '👍', '👎', '😢'] as ReactionEmoji[]).map((em) => (
            <button
              key={em}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleReaction) onToggleReaction(person2.id, em);
                setActiveReactionPersonId(null);
              }}
              className="text-base hover:scale-125 transition-transform p-1 cursor-pointer"
            >
              {em}
            </button>
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveReactionPersonId(null);
            }}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pets Banner for Couple (wide banner on the full width of couple cards or individual spouse mini-cards) */}
      {(() => {
        const couplePets = [
          ...(person1.pets || []).filter((p) => p.isCouplePet),
          ...(person2.pets || []).filter((p) => p.isCouplePet),
        ];
        const pets1 = (person1.pets || []).filter((p) => !p.isCouplePet);
        const pets2 = (person2.pets || []).filter((p) => !p.isCouplePet);

        const getPetIcon = (t: string) => {
          if (t === 'cat') return '🐱';
          if (t === 'dog') return '🐶';
          if (t === 'horse') return '🐴';
          if (t === 'cow') return '🐮';
          if (t === 'bird') return '🦜';
          return '🐾';
        };
        const hasReactions1 = Boolean(person1.reactions && person1.reactions.length > 0 && !isSimplified);
        const hasReactions2 = Boolean(person2.reactions && person2.reactions.length > 0 && !isSimplified);
        const hasAnyReaction = hasReactions1 || hasReactions2;

        return (
          <>
            {/* Wide Couple Pet Banner */}
            {couplePets.length > 0 && !isSimplified && (
              <div className={`absolute ${hasAnyReaction ? '-bottom-13' : '-bottom-7'} left-0 w-full bg-[#fefcf3] hover:bg-amber-50 border border-amber-300/90 rounded-xl px-2.5 py-1 text-[9.5px] font-semibold text-amber-950 shadow-xs flex items-center justify-center gap-3 z-25 transition-all cursor-default`}>
                {couplePets.map((pet) => (
                  <div key={pet.id} className="flex items-center gap-1.5 truncate" title={`Улюбленець пари: ${pet.name}${pet.breed ? ` (${pet.breed})` : ''}`}>
                    <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300/80 flex items-center justify-center text-[10px] shrink-0">
                      {getPetIcon(pet.type)}
                    </div>
                    <div className="min-w-0 flex-1 leading-tight text-left">
                      <span className="text-[9.5px] font-bold text-amber-950 truncate block">{pet.name}</span>
                      {pet.breed && <span className="text-[7.5px] font-medium text-amber-800/90 truncate block">{pet.breed}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Spouse 1 Individual Pet Mini-Card */}
            {pets1.length > 0 && !isSimplified && (
              <div className={`absolute ${hasReactions1 ? '-bottom-13' : '-bottom-8'} left-12 -translate-x-1/2 flex flex-col items-center gap-1 z-25 w-[96px]`}>
                {pets1.map((pet) => (
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
                ))}
              </div>
            )}

            {/* Spouse 2 Individual Pet Mini-Card */}
            {pets2.length > 0 && !isSimplified && (
              <div className={`absolute ${hasReactions2 ? '-bottom-13' : '-bottom-8'} right-12 translate-x-1/2 flex flex-col items-center gap-1 z-25 w-[96px]`}>
                {pets2.map((pet) => (
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
                ))}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};

export const CoupleCard = React.memo(CoupleCardComponent);
