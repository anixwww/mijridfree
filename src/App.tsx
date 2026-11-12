import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FamilyTreeData, Person, RelativeType, TreeViewport, ConnectionMeta, ReactionEmoji, PersonReaction } from './types/tree';
import { sampleTreeData } from './data/initialTreeData';
import {
  AUTH_EXPIRED_EVENT,
  clearAuthToken,
  setAuthToken,
  getAuthToken,
  loginWithPassword,
  verifyStoredToken,
} from './utils/auth';
import {
  saveTreeToLocalStorage,
  loadTreeFromLocalStorage,
  loadTreeFromServerOrStorage,
  loadTreeById,
  downloadTreeJson,
  parseTreeJsonFile,
  checkServerHealth,
  MAIN_TREE_ID,
  renameTreeOnServerOrStorage,
  deleteTreeFromServerOrStorage,
} from './utils/fileStorage';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  GEN_Y_SPACING,
  generateConnections,
  calculateGenerations,
} from './utils/treeLayout';
import {
  generateTimelineTicks,
  extractBirthYear,
  yearToY,
  DEFAULT_START_YEAR,
  DEFAULT_END_YEAR,
  DEFAULT_PIXELS_PER_YEAR,
} from './utils/timelineUtils';
import { downloadTreeSvgFile, downloadTreePngFile } from './utils/treeExport';
import {
  buildClanMap,
  getClanName,
  getLineageIds,
  getPatrilinealLineageIds,
  getAllDescendantIds,
  getBranchDescendantIds,
  swapSpousePositions,
  groupPersonsIntoRenderUnits,
  normalizeCoupleCoordinates,
  ClanInfo,
} from './utils/lineageUtils';
import { TopNavbar } from './components/TopNavbar';
import { FamilyCard } from './components/FamilyCard';
import { CoupleCard } from './components/CoupleCard';
import { TreeConnections } from './components/TreeConnections';
import { CanvasControls } from './components/CanvasControls';
import { DetailsSidebar } from './components/DetailsSidebar';
import { AddRelativeModal } from './components/AddRelativeModal';
import { EditPersonModal } from './components/EditPersonModal';
import { EditConnectionModal } from './components/EditConnectionModal';
import { ConnectPersonsModal, ConnectOptions } from './components/ConnectPersonsModal';
import { ExportModal } from './components/ExportModal';
import { AuthModal } from './components/AuthModal';
import { TimelineRuler, CanvasTimelineGuidelines } from './components/TimelineRuler';
import { AnalyticsModal } from './components/AnalyticsModal';
import { UserIdentityModal } from './components/UserIdentityModal';
import { ClanCoatOfArmsModal } from './components/ClanCoatOfArmsModal';
import { MyTreesModal } from './components/MyTreesModal';
import { MetricModal } from './components/MetricModal';
import { DatesCalendarSidebar, extractCalendarEvents } from './components/DatesCalendarSidebar';
import { ReactionsModal } from './components/ReactionsModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { MiniMap } from './components/MiniMap';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import { buildSpatialGrid, getVisibleItemsFromGrid } from './utils/virtualization';
import { useAuth } from './context/AuthContext';
import { getTreeById, saveTreeToFirestore, deleteTreeFromFirestore } from './utils/firestoreTreeService';
import { Cake, Flame, X as CloseIcon, Lock, FolderTree, Copy, Clipboard, Users, Crown, Check, Trash2, X } from 'lucide-react';


interface AlignmentProposal {
  proposedX?: number;
  proposedY?: number;
  guideX?: number;
  guideY?: number;
}

interface ConnectingMode {
  sourceId: string;
  currentX: number;
  currentY: number;
  targetId: string | null;
}

export default function App() {
  // Tree State (defaults to empty tree if no saved data)
  const [tree, setTree] = useState<FamilyTreeData>(() => {
    const saved = loadTreeFromLocalStorage();
    const target = (saved && saved.persons && Object.keys(saved.persons).length > 0)
      ? saved
      : {
          id: 'my-family-tree',
          title: 'Моє родове дерево',
          description: 'Хронологічне родове дерево',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          persons: {},
          clanCoatOfArms: {},
          connectionOverrides: {},
        };
    return {
      ...target,
      persons: normalizeCoupleCoordinates(target.persons || {}, target.connectionOverrides),
    };
  });

  // Undo History Stack (up to 35 steps)
  const [historyStack, setHistoryStack] = useState<FamilyTreeData[]>([]);
  const isUndoActionRef = useRef<boolean>(false);

  const isInitialMount = useRef(true);
  const hasLoadedFromServer = useRef(false);

  // Sync and load latest persistent tree from server backend database on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedTreeId = params.get('tree');

    if (sharedTreeId) {
      getTreeById(sharedTreeId).then((sharedTree) => {
        hasLoadedFromServer.current = true;
        if (sharedTree && sharedTree.persons && Object.keys(sharedTree.persons).length > 0) {
          setTree({
            ...sharedTree,
            persons: normalizeCoupleCoordinates(sharedTree.persons, sharedTree.connectionOverrides),
          });
        }
      });
    } else {
      loadTreeFromServerOrStorage().then((serverTree) => {
        hasLoadedFromServer.current = true;
        if (serverTree && serverTree.persons && Object.keys(serverTree.persons).length > 0) {
          setTree({
            ...serverTree,
            persons: normalizeCoupleCoordinates(serverTree.persons, serverTree.connectionOverrides),
          });
        }
      });
    }
  }, []);


  // Alignment proposal state when dragging cards near others
  const [alignmentProposal, setAlignmentProposal] = useState<AlignmentProposal | null>(null);
  const [isProposalIgnored, setIsProposalIgnored] = useState<boolean>(false);
  const [proposalElapsedMs, setProposalElapsedMs] = useState<number>(0);
  const proposalStartTimeRef = useRef<number | null>(null);
  const lastProposalKeyRef = useRef<string | null>(null);



  // Authentication context
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const [currentTreeOwnerId, setCurrentTreeOwnerId] = useState<string | null>(null);

  // Single Role State: Admin vs Guest
  const [isAdmin, setIsAdmin] = useState<boolean>(() => !!getAuthToken());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReactionsModalOpen, setIsReactionsModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    verifyStoredToken().then((valid) => {
      if (!cancelled) setIsAdmin(valid);
    });
    const onExpired = () => setIsAdmin(false);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
    };
  }, []);

  // Clear any card multi-selections when switching to Guest mode
  useEffect(() => {
    if (!isAdmin) {
      setSelectedPersonIds(new Set());
      setSelectionBox(null);
    }
  }, [isAdmin]);

  const handleLoginAsAdmin = async (password: string): Promise<boolean> => {
    const ok = await loginWithPassword(password);
    if (ok) {
      setIsAdmin(true);
      showToast({
        type: 'success',
        title: 'Режим адміністратора',
        message: 'Авторизація успішна. Доступно повне редагування.',
      });
      return true;
    }
    return false;
  };

  const handleSwitchToGuest = () => {
    clearAuthToken();
    setIsAdmin(false);
    showToast({
      type: 'info',
      title: 'Режим гостя',
      message: 'Перейшли в режим гостя (лише перегляд).',
    });
  };

  const handleToggleAdminRole = () => {
    if (isAdmin) {
      clearAuthToken();
      setIsAdmin(false);
      showToast({
        type: 'info',
        title: 'Режим гостя',
        message: 'Перейшли в режим гостя (лише перегляд).',
      });
    }
  };


  const defaultPersonId =
    (tree.selectedPersonId && tree.persons[tree.selectedPersonId] ? tree.selectedPersonId : null) ||
    Object.keys(tree.persons)[0] ||
    null;

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(defaultPersonId);

  // Multi-card selection state (Ctrl+click or Rubberband box selection)
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(
    new Set(defaultPersonId ? [defaultPersonId] : [])
  );

  // Rubberband Box Selection coordinates (canvas units)
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);



  // Viewport (Panning and Zooming)
  const [viewport, setViewport] = useState<TreeViewport>({
    x: 120,
    y: 60,
    zoom: 0.9,
  });

  // UI state
  const [showTimeline, setShowTimeline] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showCalendarWidget, setShowCalendarWidget] = useState<boolean>(() => {
    return localStorage.getItem('family_tree_show_calendar_widget') === 'true';
  });
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [addingRelativeTarget, setAddingRelativeTarget] = useState<{
    target: Person | null;
    initialType: RelativeType;
  } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [connectionClickCoords, setConnectionClickCoords] = useState<{ x: number; y: number } | null>(null);
  const [connectingPerson, setConnectingPerson] = useState<Person | null>(null);
  const [preselectedTargetId, setPreselectedTargetId] = useState<string | null>(null);
  const [connectingMode, setConnectingMode] = useState<ConnectingMode | null>(null);
  const [copiedCardColor, setCopiedCardColor] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(new Date());
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...msg, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Clan & Lineage Readability States
  const [isLineageFocus, setIsLineageFocus] = useState<boolean>(false);
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);
  const [selectedClanFilter, setSelectedClanFilter] = useState<string | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [coatOfArmsModalClan, setCoatOfArmsModalClan] = useState<ClanInfo | null>(null);

  // Freeze / Lock Layout Protection State
  const [isLayoutLocked, setIsLayoutLocked] = useState<boolean>(() => {
    return localStorage.getItem('mijrid_is_layout_locked') === 'true';
  });

  const handleToggleLockLayout = useCallback(() => {
    setIsLayoutLocked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mijrid_is_layout_locked', String(next));
      } catch {}
      return next;
    });
  }, []);

  // User Identity in Tree (Who is viewing this tree)
  const [isMyTreesModalOpen, setIsMyTreesModalOpen] = useState<boolean>(false);
  const [userPersonId, setUserPersonId] = useState<string | null>(() => {
    return localStorage.getItem('family_tree_user_person_id');
  });
  const [customUserName, setCustomUserName] = useState<{ firstName: string; lastName: string } | null>(() => {
    const saved = localStorage.getItem('family_tree_user_name');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Listen to global display name update events from AuthContext / modals
  useEffect(() => {
    const handleNameUpdated = (e: any) => {
      if (e.detail) {
        const { firstName, lastName, fullName } = e.detail;
        if (firstName !== undefined && lastName !== undefined) {
          setCustomUserName({ firstName, lastName });
        } else if (fullName) {
          const parts = fullName.trim().split(/\s+/);
          setCustomUserName({ firstName: parts[0] || fullName, lastName: parts.slice(1).join(' ') || '' });
        }
      }
    };
    window.addEventListener('family_tree_user_name_updated', handleNameUpdated);
    return () => window.removeEventListener('family_tree_user_name_updated', handleNameUpdated);
  }, []);

  const [isUserIdentityModalOpen, setIsUserIdentityModalOpen] = useState<boolean>(false);

  // Auto-open identity modal for new visitors who have not chosen their card yet
  const hasPromptedUserRef = useRef(false);
  useEffect(() => {
    const savedPersonId = localStorage.getItem('family_tree_user_person_id');
    const hasPersons = Object.keys(tree.persons).length > 0;

    if (!savedPersonId && hasPersons && !hasPromptedUserRef.current) {
      hasPromptedUserRef.current = true;
      const timer = setTimeout(() => {
        setIsUserIdentityModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [tree.persons]);

  const userPerson = userPersonId ? tree.persons[userPersonId] : null;
  const userPersonName = userPerson
    ? `${userPerson.firstName || ''} ${userPerson.lastName || ''}`.trim()
    : (customUserName ? `${customUserName.firstName || ''} ${customUserName.lastName || ''}`.trim() : null);

  const [notifications, setNotifications] = useState<{
    id: string;
    type: 'new_card' | 'new_note';
    personId?: string;
    personName: string;
    text: string;
    createdAt: string;
  }[]>([]);

  // Calculate resolved display name: user customization takes precedence over Google account name
  const getResolvedDisplayName = useCallback(() => {
    if (customUserName) {
      const full = `${customUserName.firstName || ''} ${customUserName.lastName || ''}`.trim();
      if (full) return full;
    }
    const local = localStorage.getItem('family_tree_display_name');
    if (local && local.trim()) return local.trim();
    if (userProfile?.displayName && userProfile.displayName.trim()) return userProfile.displayName.trim();
    if (currentUser?.displayName && currentUser.displayName.trim()) return currentUser.displayName.trim();
    if (currentUser?.email) return currentUser.email.split('@')[0];
    return 'Гість';
  }, [customUserName, userProfile, currentUser]);



  const handleSelectNotificationPerson = (personId: string) => {
    centerOnPerson(personId);
    setSelectedPersonId(personId);
    setIsSidebarOpen(true);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Guest / User Reactions State & Helper
  const [guestUserId] = useState<string>(() => {
    let uid = localStorage.getItem('family_tree_guest_uid');
    if (!uid) {
      uid = 'guest-' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('family_tree_guest_uid', uid);
    }
    return uid;
  });

  const handleToggleReaction = useCallback((personId: string, emoji: ReactionEmoji) => {
    setTree((prev) => {
      const p = prev.persons[personId];
      if (!p) return prev;
      const reactions = [...(p.reactions || [])];
      const uidToUse = currentUser ? currentUser.uid : guestUserId;
      const existingIndex = reactions.findIndex((r) => r.emoji === emoji && (r.userId === uidToUse || r.userId === guestUserId));
      if (existingIndex >= 0) {
        reactions.splice(existingIndex, 1);
      } else {
        const authorName = getResolvedDisplayName();
        const authorEmail = currentUser?.email || undefined;
        reactions.push({
          id: `react_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          emoji,
          userId: uidToUse,
          userName: authorName,
          userEmail: authorEmail,
          createdAt: new Date().toLocaleDateString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      }
      return {
        ...prev,
        persons: {
          ...prev.persons,
          [personId]: {
            ...p,
            reactions,
          },
        },
      };
    });
  }, [guestUserId, currentUser, getResolvedDisplayName]);

  const handleDeleteReaction = useCallback((personId: string, reactionIdOrIdx: string | number) => {
    setTree((prev) => {
      const p = prev.persons[personId];
      if (!p || !p.reactions) return prev;
      let newReactions: PersonReaction[];
      if (typeof reactionIdOrIdx === 'number') {
        newReactions = p.reactions.filter((_, idx) => idx !== reactionIdOrIdx);
      } else {
        newReactions = p.reactions.filter((r, idx) => (r.id ? r.id !== reactionIdOrIdx : idx.toString() !== reactionIdOrIdx));
      }
      return {
        ...prev,
        persons: {
          ...prev.persons,
          [personId]: {
            ...p,
            reactions: newReactions,
          },
        },
      };
    });
  }, []);

  const handleClearAllReactions = useCallback(() => {
    setTree((prev) => {
      const newPersons = { ...prev.persons };
      Object.keys(newPersons).forEach((id) => {
        if (newPersons[id].reactions) {
          newPersons[id] = { ...newPersons[id], reactions: [] };
        }
      });
      return { ...prev, persons: newPersons };
    });
  }, []);

  const totalReactionsCount = useMemo(() => {
    if (!tree?.persons) return 0;
    return Object.values(tree.persons).reduce((acc, p) => acc + (p.reactions?.length || 0), 0);
  }, [tree]);

  const handleSaveClanCoatOfArms = useCallback(
    (clanName: string, coatOfArmsData: { url: string; motto?: string; description?: string } | null) => {
      setTree((prev) => {
        const current = { ...(prev.clanCoatOfArms || {}) };
        if (coatOfArmsData) {
          current[clanName] = coatOfArmsData;
        } else {
          delete current[clanName];
        }
        return {
          ...prev,
          clanCoatOfArms: current,
        };
      });
      setLastSavedTime(new Date());
    },
    []
  );

  // Metric Document Modal State
  const [metricModalTarget, setMetricModalTarget] = useState<{ person: Person; tab?: 'birth' | 'death' } | null>(null);

  const handleOpenMetricModal = useCallback((person: Person, tab: 'birth' | 'death' = 'birth') => {
    setMetricModalTarget({ person, tab });
  }, []);

  const handleSaveMetricPerson = useCallback((updatedPerson: Person) => {
    setTree((prev) => ({
      ...prev,
      persons: {
        ...prev.persons,
        [updatedPerson.id]: updatedPerson,
      },
    }));
    setLastSavedTime(new Date());
    setMetricModalTarget((prev) => prev ? { ...prev, person: updatedPerson } : null);
  }, []);

  // Dragging Canvas State
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panRafRef = useRef<number | null>(null);
  const pendingPanPosRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartRef = useRef<{
    dist: number;
    zoom: number;
    viewportX: number;
    viewportY: number;
    centerX: number;
    centerY: number;
    canvasX: number;
    canvasY: number;
  } | null>(null);
  const [highlightedHouseNumber, setHighlightedHouseNumber] = useState<string | null>(null);

  // Dragging Individual Card / Couple / Group State
  const [draggingCard, setDraggingCard] = useState<{
    id: string;
    spouseId?: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    spouseOrigX?: number;
    spouseOrigY?: number;
    movingCards: Map<string, { origX: number; origY: number; isPinned: boolean }>;
  } | null>(null);
  const cardDragRafRef = useRef<number | null>(null);
  const pendingCardDragRef = useRef<{ dx: number; dy: number } | null>(null);

  // Timer for alignment proposal 5-second ignore countdown (throttled to 500ms to avoid unnecessary re-renders)
  useEffect(() => {
    if (!draggingCard || !alignmentProposal || !proposalStartTimeRef.current) return;

    const interval = setInterval(() => {
      if (!proposalStartTimeRef.current) return;
      const elapsed = Date.now() - proposalStartTimeRef.current;
      setProposalElapsedMs(elapsed);
      if (elapsed >= 5000) {
        setIsProposalIgnored(true);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [draggingCard, alignmentProposal]);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputEmptyRef = useRef<HTMLInputElement>(null);
  const isDraggingCardRef = useRef<boolean>(false);
  const dragStartTreeRef = useRef<FamilyTreeData | null>(null);

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline' | 'rejected' | 'schema_mismatch'>('synced');
  const [isServerConnected, setIsServerConnected] = useState<boolean>(true);

  // Periodic heartbeat & connectivity detection with Google AI Studio server (60s to save CPU and network)
  useEffect(() => {
    let isMounted = true;

    const probeServer = async () => {
      const ok = await checkServerHealth();
      if (!isMounted) return;
      setIsServerConnected(ok);
      if (!ok) {
        setSyncStatus('offline');
      } else if (syncStatus === 'offline') {
        setSyncStatus('synced');
      }
    };

    // Immediate check on mount
    probeServer();

    // Heartbeat every 60 seconds (also handled instantaneously by online/offline events)
    const interval = setInterval(probeServer, 60000);

    const handleOnline = () => {
      probeServer();
    };
    const handleOffline = () => {
      setIsServerConnected(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncStatus]);

  const handleSyncServer = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const isHealthy = await checkServerHealth();
      if (!isHealthy) {
        setIsServerConnected(false);
        setSyncStatus('offline');
        showToast({
          message: "Немає зв'язку із сервером Google AI Studio. Перевірте статус сервера.",
          type: 'error',
        });
        return;
      }

      setIsServerConnected(true);
      const ok = await saveTreeToLocalStorage(tree);
      if (currentUser && (tree.id || currentTreeOwnerId === currentUser.uid)) {
        try {
          await saveTreeToFirestore(
            tree.id || `tree_${currentUser.uid}`,
            tree,
            currentUser.uid,
            currentUser.displayName || currentUser.email?.split('@')[0] || 'Користувач',
            false
          );
        } catch (err: any) {
          console.warn('Firestore manual sync error:', err);
          const errStr = err?.message || String(err);
          if (
            errStr.includes('permissions') ||
            errStr.includes('PERMISSION_DENIED') ||
            errStr.includes('permission-denied') ||
            errStr.includes('rejected')
          ) {
            setSyncStatus('rejected');
            showToast({
              message: "Доступ до Firestore відхилено (Помилка прав доступу / Permission Denied).",
              type: 'error',
            });
            return;
          } else if (errStr.includes('JSON') || errStr.includes('Unexpected') || errStr.includes('schema')) {
            setSyncStatus('schema_mismatch');
            showToast({
              message: "Невідповідність схеми документа у хмарі.",
              type: 'error',
            });
            return;
          }
        }
      }
      if (ok) {
        setIsServerConnected(true);
        setSyncStatus('synced');
        setLastSavedTime(new Date());
        showToast({
          message: "Зв'язок є! Дерево успішно збережено на сервері.",
          type: 'success',
        });
      } else {
        setSyncStatus('error');
        showToast({
          message: "Помилка при збереженні дерева на сервері.",
          type: 'error',
        });
      }
    } catch (err: any) {
      setIsServerConnected(false);
      const errStr = err?.message || String(err);
      if (
        errStr.includes('permissions') ||
        errStr.includes('PERMISSION_DENIED') ||
        errStr.includes('permission-denied') ||
        errStr.includes('rejected')
      ) {
        setSyncStatus('rejected');
        showToast({
          message: "Доступ до Firestore відхилено (Помилка прав доступу).",
          type: 'error',
        });
      } else {
        setSyncStatus('offline');
        showToast({
          message: "Немає зв'язку із сервером Google AI Studio.",
          type: 'error',
        });
      }
    }
  }, [tree, currentUser, currentTreeOwnerId, showToast]);

  const handleForceRefreshFromCloud = useCallback(async () => {
    setSyncStatus('syncing');
    showToast({
      message: "Примусове оновлення з хмари (ігноруючи локальний кеш)...",
      type: 'info',
    });
    try {
      const targetTreeId = tree.id || MAIN_TREE_ID;
      // 1. Clear local cache for this tree
      localStorage.removeItem(`rodovid_tree_${targetTreeId}`);
      if (targetTreeId === MAIN_TREE_ID) {
        localStorage.removeItem('rodovid_family_tree_v2');
      }

      // 2. Fetch directly from Firestore cloud database
      const cloudTree = await getTreeById(targetTreeId);
      if (cloudTree && cloudTree.persons && Object.keys(cloudTree.persons).length > 0) {
        setTree(cloudTree);
        setSyncStatus('synced');
        setLastSavedTime(new Date());
        showToast({
          message: "Дерево успішно оновлено з хмари (локальний кеш оновлено).",
          type: 'success',
        });
        return;
      }

      // 3. Fallback to server endpoint
      const res = await fetch(
        targetTreeId === MAIN_TREE_ID ? '/api/tree' : `/api/tree/${encodeURIComponent(targetTreeId)}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data && json.data.persons) {
          setTree(json.data);
          setSyncStatus('synced');
          setLastSavedTime(new Date());
          showToast({
            message: "Дерево успішно оновлено з сервера.",
            type: 'success',
          });
          return;
        }
      }

      setSyncStatus('schema_mismatch');
      showToast({
        message: "У хмарі не знайдено даних або структура схеми документа змінена.",
        type: 'warning',
      });
    } catch (err: any) {
      const errStr = err?.message || String(err);
      if (
        errStr.includes('permissions') ||
        errStr.includes('PERMISSION_DENIED') ||
        errStr.includes('permission-denied') ||
        errStr.includes('rejected')
      ) {
        setSyncStatus('rejected');
        showToast({
          message: "Доступ до Firestore відхилено (Помилка прав доступу / Permission Denied).",
          type: 'error',
        });
      } else if (errStr.includes('JSON') || errStr.includes('Unexpected') || errStr.includes('schema')) {
        setSyncStatus('schema_mismatch');
        showToast({
          message: "Невідповідність схеми документа у хмарі.",
          type: 'error',
        });
      } else {
        setSyncStatus('error');
        showToast({
          message: `Помилка примусового оновлення: ${errStr.slice(0, 80)}`,
          type: 'error',
        });
      }
    }
  }, [tree.id, showToast]);

  // Auto-save whenever tree changes (skips initial mount to prevent overwriting server)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Don't save if we haven't checked the server yet (prevents blank/stale local data from winning)
    if (!hasLoadedFromServer.current) return;

    // Do not trigger auto-save during card dragging
    if (isDraggingCardRef.current) return;

    // Record previous state into historyStack for Undo (unless this was an undo operation)
    if (isUndoActionRef.current) {
      isUndoActionRef.current = false;
    } else {
      setHistoryStack((prevStack) => {
        const next = [...prevStack, tree];
        if (next.length > 35) next.shift(); // Keep latest 35 states
        return next;
      });
    }

    setSyncStatus('syncing');

    // Debounce save operation to prevent spamming server and memory exhaustion
    const timer = setTimeout(async () => {
      // 1. Save locally and to local server
      const ok = await saveTreeToLocalStorage(tree);
      
      // 2. If logged in with Firebase, also persist to Firestore cloud
      if (currentUser && (tree.id || currentTreeOwnerId === currentUser.uid)) {
        try {
          await saveTreeToFirestore(
            tree.id || `tree_${currentUser.uid}`,
            tree,
            currentUser.uid,
            currentUser.displayName || currentUser.email?.split('@')[0] || 'Користувач',
            false
          );
          setCurrentTreeOwnerId(currentUser.uid);
        } catch (err) {
          console.warn('Failed to auto-sync tree to Firestore:', err);
        }
      }

      if (ok) {
        setIsServerConnected(true);
        setSyncStatus('synced');
        setLastSavedTime(new Date());
      } else {
        setIsServerConnected(false);
        setSyncStatus('offline');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [tree, currentUser, currentTreeOwnerId]);


  // Handle Undo Action
  const handleUndo = useCallback(() => {
    if (historyStack.length === 0) return;
    setHistoryStack((prevStack) => {
      if (prevStack.length === 0) return prevStack;
      const nextStack = [...prevStack];
      const previousState = nextStack.pop();
      if (previousState) {
        isUndoActionRef.current = true;
        setTree(previousState);
        setLastSavedTime(new Date());
      }
      return nextStack;
    });
  }, [historyStack]);

  // Listen to keyboard shortcut Ctrl+Z / Cmd+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger undo if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);



  // Auto-center on initial load (user's card, selected person, otherwise the first one)
  const hasCenteredTreeIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only auto-center once per tree load, do not re-center when adding/editing cards
    if (hasCenteredTreeIdRef.current === tree.id && Object.keys(tree.persons).length > 0) {
      return;
    }

    const personKeys = Object.keys(tree.persons);
    if (personKeys.length === 0) return;

    const centerTarget = () => {
      const targetId =
        (userPersonId && tree.persons[userPersonId] ? userPersonId : null) ||
        selectedPersonId ||
        personKeys[0];

      if (!targetId || !containerRef.current) return;

      const p = tree.persons[targetId];
      if (p) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const targetX = rect.width / 2 - (p.x + CARD_WIDTH / 2) * 0.9;
        const targetY = rect.height / 2 - (p.y + CARD_HEIGHT / 2) * 0.9;
        setViewport({
          x: targetX,
          y: targetY,
          zoom: 0.9,
        });
        if (userPersonId && tree.persons[userPersonId]) {
          setSelectedPersonId(userPersonId);
        }
        hasCenteredTreeIdRef.current = tree.id;
      }
    };

    centerTarget();
    const timer = setTimeout(centerTarget, 120);
    return () => clearTimeout(timer);
  }, [tree.id, userPersonId]);

  // Selected person object
  const selectedPerson = selectedPersonId ? tree.persons[selectedPersonId] || null : null;

  // Active person for patrilineal male line focus (persists even if empty canvas is clicked)
  const activeFocusPersonId = isLineageFocus
    ? (focusPersonId || selectedPersonId || Object.keys(tree.persons)[0] || null)
    : null;

  // Compute clans map and list
  const clanMap = useMemo(() => buildClanMap(tree.persons, tree.clanCoatOfArms), [tree.persons, tree.clanCoatOfArms]);
  const clanList = useMemo(() => Array.from(clanMap.values()), [clanMap]);

  // Compute active lineage IDs (strictly along male patrilineal line)
  const lineageInfo = useMemo(() => {
    if (!activeFocusPersonId || !tree.persons[activeFocusPersonId]) {
      return { ancestorIds: new Set<string>(), descendantIds: new Set<string>(), allLineageIds: new Set<string>() };
    }
    return getPatrilinealLineageIds(activeFocusPersonId, tree.persons);
  }, [activeFocusPersonId, tree.persons]);

  // All persons are visible without branch collapsing
  const visiblePersons = useMemo(() => {
    return Object.values(tree.persons);
  }, [tree.persons]);

  // Container dimensions for Viewport Culling
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Visible canvas coordinates bounding box (+ buffer for smooth scrolling/panning)
  const visibleBounds = useMemo(() => {
    const CULL_BUFFER = 450; // extra safety buffer in canvas pixels
    const minX = (-viewport.x) / viewport.zoom - CULL_BUFFER;
    const maxX = (containerSize.width - viewport.x) / viewport.zoom + CULL_BUFFER;
    const minY = (-viewport.y) / viewport.zoom - CULL_BUFFER;
    const maxY = (containerSize.height - viewport.y) / viewport.zoom + CULL_BUFFER;
    return { minX, maxX, minY, maxY };
  }, [viewport.x, viewport.y, viewport.zoom, containerSize]);

  // Nearest upcoming event for floating widget
  const nearestCalendarEvent = useMemo(() => {
    const events = extractCalendarEvents(tree.persons);
    if (events.length === 0) return null;
    const sorted = [...events].sort((a, b) => a.daysUntil - b.daysUntil);
    return sorted[0] || null;
  }, [tree.persons]);

  // Handler for card fully verified status toggle
  const handleToggleFullyVerified = useCallback((personId: string) => {
    setTree((prev) => {
      const p = prev.persons[personId];
      if (!p) return prev;
      const nextStatus = !p.isFullyVerified;
      showToast({
        type: nextStatus ? 'success' : 'info',
        title: nextStatus ? 'Картка перевірена ✓' : 'Картка не перевірена',
        message: `${p.firstName} ${p.lastName}: встановлено статус «${nextStatus ? 'Перевірена' : 'Не перевірена'}». ${nextStatus ? 'Лінії зв’язку активні.' : 'Зв’язок відображається пунктирною сірою лінією.'}`,
      });
      return {
        ...prev,
        persons: {
          ...prev.persons,
          [personId]: {
            ...p,
            isFullyVerified: nextStatus,
          },
        },
      };
    });
  }, [showToast]);

  const clanRecord = useMemo(() => Object.fromEntries(clanMap.entries()), [clanMap]);

  // Generated connection lines with verification status (green for verified, gray for unverified, or auto-colored matching card color)
  const connections = useMemo(() => {
    // Only generate connections among non-collapsed persons
    const activePersons: Record<string, Person> = {};
    visiblePersons.forEach((p) => {
      activePersons[p.id] = p;
    });

    return generateConnections(
      activePersons,
      tree.connectionOverrides,
      tree.verifiedColor || '#64748b',
      clanRecord
    );
  }, [visiblePersons, tree.connectionOverrides, tree.verifiedColor, clanRecord]);

  // Group persons into married couples (Double Card units) and singles
  const renderUnits = useMemo(() => {
    const activePersons: Record<string, Person> = {};
    visiblePersons.forEach((p) => {
      activePersons[p.id] = p;
    });
    return groupPersonsIntoRenderUnits(activePersons, tree.connectionOverrides);
  }, [visiblePersons, tree.connectionOverrides]);

  // Spatial Grid Index for Couples - Built once when renderUnits changes O(N)
  const couplesSpatialGrid = useMemo(() => {
    return buildSpatialGrid(renderUnits.couples, (c) => {
      const minX = Math.min(c.person1.x, c.person2.x);
      const minY = Math.min(c.person1.y, c.person2.y);
      const maxX = minX + CARD_WIDTH * 2 + 10;
      const maxY = minY + CARD_HEIGHT;
      return { minX, maxX, minY, maxY };
    });
  }, [renderUnits.couples]);

  // Spatial Grid Index for Singles - Built once when renderUnits changes O(N)
  const singlesSpatialGrid = useMemo(() => {
    return buildSpatialGrid(renderUnits.singles, (s) => {
      const minX = s.x;
      const minY = s.y;
      const maxX = minX + CARD_WIDTH;
      const maxY = minY + CARD_HEIGHT;
      return { minX, maxX, minY, maxY };
    });
  }, [renderUnits.singles]);

  // Fast O(K) Viewport Virtualized Render Units Lookup
  const visibleRenderUnits = useMemo(() => {
    const visibleCouples = getVisibleItemsFromGrid(couplesSpatialGrid, visibleBounds);
    const visibleSingles = getVisibleItemsFromGrid(singlesSpatialGrid, visibleBounds);

    const coupleSet = new Set(visibleCouples);
    const singleSet = new Set(visibleSingles);

    // Always include selected / active persons so they never vanish while interacted with
    if (selectedPersonId) {
      const couple = renderUnits.personToCoupleMap[selectedPersonId];
      if (couple) coupleSet.add(couple);
      const single = renderUnits.singles.find((s) => s.id === selectedPersonId);
      if (single) singleSet.add(single);
    }
    if (draggingCard) {
      const couple = renderUnits.personToCoupleMap[draggingCard.id];
      if (couple) coupleSet.add(couple);
      const single = renderUnits.singles.find((s) => s.id === draggingCard.id);
      if (single) singleSet.add(single);
    }
    if (connectingMode) {
      const couple = renderUnits.personToCoupleMap[connectingMode.sourceId];
      if (couple) coupleSet.add(couple);
      const single = renderUnits.singles.find((s) => s.id === connectingMode.sourceId);
      if (single) singleSet.add(single);
    }

    return {
      couples: Array.from(coupleSet),
      singles: Array.from(singleSet),
    };
  }, [
    couplesSpatialGrid,
    singlesSpatialGrid,
    visibleBounds,
    selectedPersonId,
    draggingCard,
    connectingMode,
    renderUnits,
  ]);

  // Calculate timeline bounds and ticks
  const { timelineTicks, startYear } = useMemo(() => {
    let minYear = DEFAULT_START_YEAR;
    let maxYear = DEFAULT_END_YEAR;

    Object.values(tree.persons).forEach((p) => {
      const yr = extractBirthYear(p);
      if (yr) {
        if (yr < minYear) minYear = Math.floor(yr / 50) * 50;
        if (yr > maxYear) maxYear = Math.ceil((yr + 20) / 10) * 10;
      }
    });

    const ticks = generateTimelineTicks(minYear, maxYear, 10, DEFAULT_PIXELS_PER_YEAR);
    return { timelineTicks: ticks, startYear: minYear };
  }, [tree.persons]);

  // Calculate stats
  const personCount = Object.keys(tree.persons).length;
  const generationsMap = useMemo(() => {
    return calculateGenerations(tree.persons);
  }, [tree.persons]);

  const generationCount = useMemo(() => {
    if (personCount === 0) return 0;
    const unique = new Set(Object.values(generationsMap));
    return Math.max(1, unique.size);
  }, [generationsMap, personCount]);

  // Center on a specific person
  const centerOnPerson = useCallback((personId: string, openSidebar = false) => {
    const p = tree.persons[personId];
    if (!p || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const targetX = rect.width / 2 - (p.x + CARD_WIDTH / 2) * viewport.zoom;
    const targetY = rect.height / 2 - (p.y + CARD_HEIGHT / 2) * viewport.zoom;
    setViewport((prev) => ({
      ...prev,
      x: targetX,
      y: targetY,
    }));
    setSelectedPersonId(personId);
    if (openSidebar) {
      setIsSidebarOpen(true);
    }
  }, [tree.persons, viewport.zoom]);

  // Handle saving user identity and centering on card
  const handleSaveUserIdentity = useCallback(
    (personId: string | null, customName?: { firstName: string; lastName: string }) => {
      localStorage.setItem('family_tree_user_prompted', 'true');

      if (personId) {
        localStorage.setItem('family_tree_user_person_id', personId);
        setUserPersonId(personId);
      } else {
        localStorage.removeItem('family_tree_user_person_id');
        setUserPersonId(null);
      }

      if (customName) {
        localStorage.setItem('family_tree_user_name', JSON.stringify(customName));
        const fullName = `${customName.firstName || ''} ${customName.lastName || ''}`.trim();
        if (fullName) {
          localStorage.setItem('family_tree_display_name', fullName);
        }
        setCustomUserName(customName);
      } else {
        localStorage.removeItem('family_tree_user_name');
        localStorage.removeItem('family_tree_display_name');
        setCustomUserName(null);
      }

      // Automatically center on person if linked
      if (personId && tree.persons[personId]) {
        centerOnPerson(personId, false);
        const p = tree.persons[personId];
        showToast({
          type: 'success',
          title: 'Вас відзначено в родовому дереві',
          message: `Вибрано: ${p.firstName} ${p.lastName}. Екран відцентровано на вашій картці.`,
        });
      }
    },
    [tree.persons, centerOnPerson, showToast]
  );

  // Fit all content into view
  const fitToContent = useCallback(() => {
    const persons = Object.values(tree.persons);
    if (persons.length === 0 || !containerRef.current) {
      setViewport({ x: 120, y: 80, zoom: 0.9 });
      return;
    }

    const minX = Math.min(...persons.map((p) => p.x));
    const minY = Math.min(...persons.map((p) => p.y));
    const maxX = Math.max(...persons.map((p) => p.x + CARD_WIDTH));
    const maxY = Math.max(...persons.map((p) => p.y + CARD_HEIGHT));

    const contentWidth = maxX - minX + 160;
    const contentHeight = maxY - minY + 160;

    const containerRect = containerRef.current.getBoundingClientRect();
    const availableWidth = containerRect.width - (isSidebarOpen ? 340 : 80);
    const availableHeight = containerRect.height - 100;

    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const newZoom = Math.min(1.2, Math.max(0.35, Math.min(scaleX, scaleY)));

    const newX = (availableWidth - contentWidth * newZoom) / 2 - minX * newZoom + 90;
    const newY = (availableHeight - contentHeight * newZoom) / 2 - minY * newZoom + 50;

    setViewport({
      x: newX,
      y: newY,
      zoom: Number(newZoom.toFixed(2)),
    });
  }, [tree.persons, isSidebarOpen]);

  // Swap Spouses left <-> right (User request)
  const handleSwapSpouses = useCallback((id1: string, id2: string) => {
    if (!isAdmin) return;
    setTree((prev) => {
      const updated = swapSpousePositions(id1, id2, prev.persons);
      return {
        ...prev,
        persons: updated,
      };
    });
  }, [isAdmin]);

  // Handle Person Card Selection (Supports Ctrl+click multi-selection for Admin)
  const handleSelectPerson = useCallback((id: string, e?: React.MouseEvent) => {
    if ((e?.ctrlKey || e?.metaKey) && isAdmin) {
      setSelectedPersonIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      setSelectedPersonId(id);
      setFocusPersonId(id);
    } else {
      setSelectedPersonId(id);
      setSelectedPersonIds(isAdmin ? new Set([id]) : new Set());
      setFocusPersonId(id);
      setIsSidebarOpen(true);
    }
  }, [isAdmin]);

  // Keyboard shortcut for Esc (clears multi-selection)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPersonIds(new Set());
        setSelectionBox(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Zoom In / Out
  const handleZoom = (delta: number) => {
    setViewport((prev) => {
      const newZoom = Math.min(2.0, Math.max(0.25, prev.zoom + delta));
      return { ...prev, zoom: Number(newZoom.toFixed(2)) };
    });
  };

  // Canvas Mouse Down (Panning or Box Selection)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setHighlightedHouseNumber(null);

    // If Ctrl or Meta is pressed on empty canvas, start Rubberband Box Selection (Admin mode only)
    if ((e.ctrlKey || e.metaKey) && isAdmin) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const canvasX = Math.round((e.clientX - rect.left - viewport.x) / viewport.zoom);
      const canvasY = Math.round((e.clientY - rect.top - viewport.y) / viewport.zoom);
      setSelectionBox({
        startX: canvasX,
        startY: canvasY,
        currentX: canvasX,
        currentY: canvasY,
      });
      return;
    }

    // Normal empty canvas click initiates panning.
    // When Focus mode is active, do NOT deselect the person so that Focus stays permanently visible and stable during canvas clicks and panning!
    if (!isLineageFocus) {
      setSelectedPersonId(null);
      setSelectedPersonIds(new Set());
    }
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - viewport.x,
      y: e.clientY - viewport.y,
    };
  };

  // Canvas Touch Start / Move / End (Mobile Panning & Pinch-to-Zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPanning(false);
      flushPanUpdate();

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;

      const rect = containerRef.current ? containerRef.current.getBoundingClientRect() : { left: 0, top: 0 };
      const canvasX = (centerX - rect.left - viewport.x) / viewport.zoom;
      const canvasY = (centerY - rect.top - viewport.y) / viewport.zoom;

      pinchStartRef.current = {
        dist: Math.max(10, dist),
        zoom: viewport.zoom,
        viewportX: viewport.x,
        viewportY: viewport.y,
        centerX,
        centerY,
        canvasX,
        canvasY,
      };
      return;
    }

    if (e.touches.length === 1) {
      pinchStartRef.current = null;
      setHighlightedHouseNumber(null);
      if (!isLineageFocus) {
        setSelectedPersonId(null);
        setSelectedPersonIds(new Set());
      }
      setIsPanning(true);
      panStartRef.current = {
        x: e.touches[0].clientX - viewport.x,
        y: e.touches[0].clientY - viewport.y,
      };
    }
  };

  const schedulePanUpdate = (x: number, y: number) => {
    pendingPanPosRef.current = { x, y };
    if (panRafRef.current === null) {
      panRafRef.current = requestAnimationFrame(() => {
        panRafRef.current = null;
        if (pendingPanPosRef.current) {
          const { x: newX, y: newY } = pendingPanPosRef.current;
          setViewport((prev) => ({
            ...prev,
            x: newX,
            y: newY,
          }));
        }
      });
    }
  };

  const flushPanUpdate = () => {
    if (panRafRef.current !== null) {
      cancelAnimationFrame(panRafRef.current);
      panRafRef.current = null;
    }
    if (pendingPanPosRef.current) {
      const { x: newX, y: newY } = pendingPanPosRef.current;
      pendingPanPosRef.current = null;
      setViewport((prev) => ({ ...prev, x: newX, y: newY }));
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentCenterX = (t1.clientX + t2.clientX) / 2;
      const currentCenterY = (t1.clientY + t2.clientY) / 2;

      const scaleFactor = currentDist / pinchStartRef.current.dist;
      const newZoom = Math.min(2.5, Math.max(0.2, Number((pinchStartRef.current.zoom * scaleFactor).toFixed(3))));

      const rect = containerRef.current ? containerRef.current.getBoundingClientRect() : { left: 0, top: 0 };
      const newViewportX = currentCenterX - rect.left - pinchStartRef.current.canvasX * newZoom;
      const newViewportY = currentCenterY - rect.top - pinchStartRef.current.canvasY * newZoom;

      setViewport({
        x: newViewportX,
        y: newViewportY,
        zoom: newZoom,
      });
      return;
    }

    if (e.touches.length === 1 && isPanning) {
      schedulePanUpdate(
        e.touches[0].clientX - panStartRef.current.x,
        e.touches[0].clientY - panStartRef.current.y
      );
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStartRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsPanning(false);
      flushPanUpdate();
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    // 0. Rubberband Box Selection (Ctrl + Drag on empty canvas)
    if (selectionBox && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = Math.round((e.clientX - rect.left - viewport.x) / viewport.zoom);
      const currentY = Math.round((e.clientY - rect.top - viewport.y) / viewport.zoom);
      setSelectionBox((prev) => (prev ? { ...prev, currentX, currentY } : null));

      const minX = Math.min(selectionBox.startX, currentX);
      const maxX = Math.max(selectionBox.startX, currentX);
      const minY = Math.min(selectionBox.startY, currentY);
      const maxY = Math.max(selectionBox.startY, currentY);

      const newlySelected = new Set<string>();
      Object.values(tree.persons).forEach((p) => {
        if (
          p.x + CARD_WIDTH >= minX &&
          p.x <= maxX &&
          p.y + CARD_HEIGHT >= minY &&
          p.y <= maxY
        ) {
          newlySelected.add(p.id);
        }
      });
      setSelectedPersonIds(newlySelected);
      if (newlySelected.size > 0 && (!selectedPersonId || !newlySelected.has(selectedPersonId))) {
        setSelectedPersonId(Array.from(newlySelected)[0]);
      }
      return;
    }

    // 1. Manual Connection Line Dragging Mode (Activated via Long Press on a card)
    if (connectingMode && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = Math.round((e.clientX - rect.left - viewport.x) / viewport.zoom);
      const currentY = Math.round((e.clientY - rect.top - viewport.y) / viewport.zoom);

      // Check if current mouse position hovers over a target person card
      let hoveredTargetId: string | null = null;
      Object.values(tree.persons).forEach((p) => {
        if (p.id === connectingMode.sourceId) return;
        if (
          currentX >= p.x - 12 &&
          currentX <= p.x + CARD_WIDTH + 12 &&
          currentY >= p.y - 12 &&
          currentY <= p.y + CARD_HEIGHT + 12
        ) {
          hoveredTargetId = p.id;
        }
      });

      setConnectingMode((prev) =>
        prev
          ? {
              ...prev,
              currentX,
              currentY,
              targetId: hoveredTargetId,
            }
          : null
      );
      return;
    }

    if (draggingCard) {
      const dx = (e.clientX - draggingCard.startX) / viewport.zoom;
      const dy = (e.clientY - draggingCard.startY) / viewport.zoom;
      const updatedX = Math.round(draggingCard.origX + dx);
      const updatedY = Math.round(draggingCard.origY + dy);

      const draggedPerson = tree.persons[draggingCard.id];
      const birthYr = draggedPerson ? extractBirthYear(draggedPerson) : null;
      const isPinned = draggedPerson?.isChronologicallyPinned && birthYr;

      // Propose alignment if card gets close to another card not in the moving set
      const SNAP_THRESHOLD = 35; // Threshold distance in pixels to trigger alignment proposal
      let bestPropX: number | undefined = undefined;
      let bestPropY: number | undefined = undefined;
      let guideX: number | undefined = undefined;
      let guideY: number | undefined = undefined;

      let minDiffX = SNAP_THRESHOLD;
      let minDiffY = SNAP_THRESHOLD;

      Object.values(tree.persons).forEach((other) => {
        if (draggingCard.movingCards.has(other.id)) return;

        // X Column alignment proposal (align left edge X)
        const diffX = Math.abs(updatedX - other.x);
        if (diffX < minDiffX) {
          minDiffX = diffX;
          bestPropX = other.x;
          guideX = other.x;
        }

        // Y Row alignment proposal (align top edge Y) if not pinned
        if (!isPinned) {
          const diffY = Math.abs(updatedY - other.y);
          if (diffY < minDiffY) {
            minDiffY = diffY;
            bestPropY = other.y;
            guideY = other.y;
          }
        }
      });

      if (bestPropX !== undefined || bestPropY !== undefined) {
        const currentPropKey = `${bestPropX}_${bestPropY}`;
        if (currentPropKey !== lastProposalKeyRef.current || !proposalStartTimeRef.current) {
          proposalStartTimeRef.current = Date.now();
          lastProposalKeyRef.current = currentPropKey;
          setIsProposalIgnored(false);
          setProposalElapsedMs(0);
        }

        const elapsed = Date.now() - (proposalStartTimeRef.current || Date.now());
        setProposalElapsedMs(elapsed);
        if (elapsed >= 5000) {
          setIsProposalIgnored(true);
        }

        setAlignmentProposal({
          proposedX: bestPropX,
          proposedY: bestPropY,
          guideX,
          guideY,
        });
      } else {
        proposalStartTimeRef.current = null;
        lastProposalKeyRef.current = null;
        setIsProposalIgnored(false);
        setProposalElapsedMs(0);
        setAlignmentProposal(null);
      }

      // RAF-throttled tree coordinate updates for smooth 60fps movement
      pendingCardDragRef.current = { dx, dy };
      if (cardDragRafRef.current === null) {
        cardDragRafRef.current = requestAnimationFrame(() => {
          cardDragRafRef.current = null;
          if (!pendingCardDragRef.current || !isDraggingCardRef.current) return;
          const { dx: curDx, dy: curDy } = pendingCardDragRef.current;
          setTree((prev) => {
            const updatedPersons: Record<string, Person> = { ...prev.persons };
            draggingCard.movingCards.forEach((info, cardId) => {
              const p = updatedPersons[cardId];
              if (!p) return;
              const newX = Math.round(info.origX + curDx);
              const newY = info.isPinned ? info.origY : Math.round(info.origY + curDy);
              updatedPersons[cardId] = {
                ...p,
                x: newX,
                y: newY,
              };
            });

            return {
              ...prev,
              persons: updatedPersons,
            };
          });
        });
      }
      return;
    }

    if (isPanning) {
      schedulePanUpdate(
        e.clientX - panStartRef.current.x,
        e.clientY - panStartRef.current.y
      );
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    flushPanUpdate();

    // Finalize rubberband selection box
    if (selectionBox) {
      setSelectionBox(null);
    }

    // If manual connection mode is active, handle drop target
    if (connectingMode) {
      const sourcePerson = tree.persons[connectingMode.sourceId];
      const targetId = connectingMode.targetId;
      setConnectingMode(null);

      if (sourcePerson && targetId && sourcePerson.id !== targetId) {
        setPreselectedTargetId(targetId);
        setConnectingPerson(sourcePerson);
      }
      return;
    }

    if (draggingCard) {
      const draggedPerson = tree.persons[draggingCard.id];
      if (draggedPerson) {
        const birthYr = extractBirthYear(draggedPerson);
        const isPinned = draggedPerson.isChronologicallyPinned && birthYr;

        let finalX = draggedPerson.x;
        let finalY = isPinned ? yearToY(birthYr, startYear, DEFAULT_PIXELS_PER_YEAR) : draggedPerson.y;

        const proposalExpired =
          isProposalIgnored ||
          (proposalStartTimeRef.current !== null && Date.now() - proposalStartTimeRef.current >= 5000);

        // 1. If alignment proposal is active AND user has NOT ignored it for 5s, use proposed coordinates
        if (alignmentProposal && !proposalExpired) {
          if (alignmentProposal.proposedX !== undefined) finalX = alignmentProposal.proposedX;
          if (!isPinned && alignmentProposal.proposedY !== undefined) finalY = alignmentProposal.proposedY;
        } else if (!proposalExpired) {
          // 2. Auto-snap small deviations (< 22px) to any nearby card's X or Y on drop
          const SNAP_DROP_TOLERANCE = 22;
          Object.values(tree.persons).forEach((other) => {
            if (draggingCard.movingCards.has(other.id)) return;
            if (Math.abs(finalX - other.x) < SNAP_DROP_TOLERANCE) {
              finalX = other.x;
            }
            if (!isPinned && Math.abs(finalY - other.y) < SNAP_DROP_TOLERANCE) {
              finalY = other.y;
            }
          });
        }
        // NOTE: If proposalExpired is true (held/ignored >= 5 seconds), finalX and finalY stay at exact user drag position!

        const deltaX = finalX - draggingCard.origX;
        const deltaY = finalY - draggingCard.origY;

        setTree((prev) => {
          const updatedPersons: Record<string, Person> = { ...prev.persons };
          draggingCard.movingCards.forEach((info, cardId) => {
            const p = updatedPersons[cardId];
            if (!p) return;
            const newX = Math.round(info.origX + deltaX);
            const newY = info.isPinned ? info.origY : Math.round(info.origY + deltaY);
            updatedPersons[cardId] = {
              ...p,
              x: newX,
              y: newY,
            };
          });

          return {
            ...prev,
            persons: updatedPersons,
          };
        });

        // Record exact pre-drag tree state for Undo
        if (dragStartTreeRef.current) {
          const preDragState = dragStartTreeRef.current;
          setHistoryStack((prevStack) => {
            const next = [...prevStack, preDragState];
            if (next.length > 35) next.shift();
            return next;
          });
          dragStartTreeRef.current = null;
        }
      }

      if (cardDragRafRef.current !== null) {
        cancelAnimationFrame(cardDragRafRef.current);
        cardDragRafRef.current = null;
      }
      pendingCardDragRef.current = null;
      isDraggingCardRef.current = false;
      setDraggingCard(null);
      setAlignmentProposal(null);
      setIsProposalIgnored(false);
      setProposalElapsedMs(0);
      proposalStartTimeRef.current = null;
      lastProposalKeyRef.current = null;
    }
  };

  // Mouse Wheel Zoom centered on cursor position (smooth and reliable)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let wheelRafId: number | null = null;
    let accumulatedDelta = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const onWheelHandler = (e: WheelEvent) => {
      // Prevent browser default page scroll or pinch bounce
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      lastMouseX = e.clientX - rect.left;
      lastMouseY = e.clientY - rect.top;

      // Determine zoom direction and speed
      const zoomIntensity = e.ctrlKey ? 0.02 : 0.0015;
      accumulatedDelta += -e.deltaY * zoomIntensity;

      if (wheelRafId === null) {
        wheelRafId = requestAnimationFrame(() => {
          wheelRafId = null;
          const delta = accumulatedDelta;
          accumulatedDelta = 0;
          const mouseX = lastMouseX;
          const mouseY = lastMouseY;

          setViewport((prev) => {
            const factor = Math.exp(delta);
            const newZoom = Math.min(2.5, Math.max(0.2, Number((prev.zoom * factor).toFixed(3))));
            if (newZoom === prev.zoom) return prev;

            // Position under cursor in canvas coordinates
            const canvasX = (mouseX - prev.x) / prev.zoom;
            const canvasY = (mouseY - prev.y) / prev.zoom;

            // Keep point under mouse cursor pinned
            const newX = mouseX - canvasX * newZoom;
            const newY = mouseY - canvasY * newZoom;

            return {
              x: Math.round(newX),
              y: Math.round(newY),
              zoom: newZoom,
            };
          });
        });
      }
    };

    container.addEventListener('wheel', onWheelHandler, { passive: false });
    return () => {
      if (wheelRafId !== null) cancelAnimationFrame(wheelRafId);
      container.removeEventListener('wheel', onWheelHandler);
    };
  }, []);

  // Card Drag Start (Supports single card, branch descendants, or multi-selected group)
  const handleCardDragStart = (e: React.MouseEvent, personId: string) => {
    if (isLayoutLocked) return;
    e.stopPropagation();
    const p = tree.persons[personId];
    if (!p) return;
    setAlignmentProposal(null);

    // Record pre-drag tree state and mark active drag
    isDraggingCardRef.current = true;
    dragStartTreeRef.current = tree;

    const movingMap = new Map<string, { origX: number; origY: number; isPinned: boolean }>();

    const isCtrlShift = (e.ctrlKey || e.metaKey) && e.shiftKey;

    // Check if dragged person is part of an active non-divorced CoupleCard pair
    const activeCouple = renderUnits.personToCoupleMap[personId];
    const pairedPartner = activeCouple
      ? (activeCouple.person1.id === personId ? activeCouple.person2 : activeCouple.person1)
      : undefined;
    const partnerId = pairedPartner?.id;
    const partner = partnerId ? tree.persons[partnerId] : undefined;

    // CASE 1: Multi-selection active and dragged card is part of the selection
    if (selectedPersonIds.size > 1 && selectedPersonIds.has(personId)) {
      selectedPersonIds.forEach((id) => {
        const item = tree.persons[id];
        if (item) {
          const birthYr = extractBirthYear(item);
          const isPinned = Boolean(item.isChronologicallyPinned && birthYr);
          movingMap.set(item.id, { origX: item.x, origY: item.y, isPinned });
        }
      });
    }
    // CASE 2: Ctrl+Shift held -> Move branch descendants together
    else if (isCtrlShift) {
      const branchIds = getBranchDescendantIds(personId, tree.persons);
      branchIds.add(personId);

      branchIds.forEach((id) => {
        const item = tree.persons[id];
        if (item) {
          const birthYr = extractBirthYear(item);
          const isPinned = Boolean(item.isChronologicallyPinned && birthYr);
          movingMap.set(item.id, { origX: item.x, origY: item.y, isPinned });
        }
      });

      setSelectedPersonId(personId);
      setSelectedPersonIds(new Set([personId]));
    }
    // CASE 3: Normal single card movement (or active undivorced couple pair)
    else {
      const birthYr = extractBirthYear(p);
      const isPinned = Boolean(p.isChronologicallyPinned && birthYr);
      movingMap.set(p.id, { origX: p.x, origY: p.y, isPinned });

      // ONLY move partner if actively paired in an UNDIVORCED CoupleCard!
      if (partner) {
        const sBirthYr = extractBirthYear(partner);
        const sPinned = Boolean(partner.isChronologicallyPinned && sBirthYr);
        movingMap.set(partner.id, { origX: partner.x, origY: partner.y, isPinned: sPinned });
      }

      setSelectedPersonId(personId);
      setSelectedPersonIds(new Set([personId]));
    }

    setDraggingCard({
      id: personId,
      spouseId: partner ? partnerId : undefined,
      startX: e.clientX,
      startY: e.clientY,
      origX: p.x,
      origY: p.y,
      spouseOrigX: partner ? partner.x : undefined,
      spouseOrigY: partner ? partner.y : undefined,
      movingCards: movingMap,
    });
  };

  // Card Long Press Start (Activates manual connection line drag)
  const handleCardLongPress = (e: React.MouseEvent, personId: string) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setDraggingCard(null);
    setAlignmentProposal(null);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const canvasX = Math.round((e.clientX - rect.left - viewport.x) / viewport.zoom);
    const canvasY = Math.round((e.clientY - rect.top - viewport.y) / viewport.zoom);
    setConnectingMode({
      sourceId: personId,
      currentX: canvasX,
      currentY: canvasY,
      targetId: null,
    });
  };

  // Canvas Double Click: Create new person at click coordinates (Owner creates regular card, guest/user proposes ghost card)
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-family-card="true"]')) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const canvasX = Math.round((e.clientX - rect.left - viewport.x) / viewport.zoom);
    const canvasY = Math.round((e.clientY - rect.top - viewport.y) / viewport.zoom);

    if (!isAdmin) return;

    // Tree Owner: create regular new card at exact double-clicked position
    const newId = `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newPerson: Person = {
      id: newId,
      firstName: 'Нова особа',
      lastName: '',
      gender: 'unknown',
      parents: [],
      spouses: [],
      children: [],
      x: canvasX,
      y: canvasY,
    };

    setTree((prev) => ({
      ...prev,
      persons: {
        ...prev.persons,
        [newId]: newPerson,
      },
      selectedPersonId: newId,
    }));
    setSelectedPersonId(newId);
    setIsSidebarOpen(true);
    setEditingPerson(newPerson);
  };

  // Helper to shift colliding cards to the right so they never overlap
  const shiftCollidingCards = (
    all: Record<string, Person>,
    x: number,
    y: number,
    widthNeeded = 130
  ) => {
    // Find cards near this Y (within 85px) and at or to the right of x - 15px
    const colliding = Object.values(all).filter(
      (p) => Math.abs(p.y - y) < 85 && p.x >= x - 15
    );
    if (colliding.length > 0) {
      colliding.forEach((p) => {
        all[p.id] = {
          ...all[p.id],
          x: all[p.id].x + widthNeeded,
        };
      });
    }
  };

  // Add Relative Handler with Chronological Timeline Alignment
  const handleAddRelativeConfirm = (data: {
    relationType?: RelativeType;
    eventType?: 'marriage' | 'cohabitation' | 'divorce';
    eventDate?: string;
    markPreviousSpouseDivorced?: boolean;
    previousSpouseIdToDivorce?: string;
    linkAllExistingChildren?: boolean;
    firstName: string;
    lastName: string;
    maidenName?: string;
    nickname?: string;
    gender: 'male' | 'female' | 'unknown';
    yearsDisplay?: string;
    birthDate?: string;
    birthDay?: string;
    birthMonth?: string;
    birthYear?: string;
    birthYearEnd?: string;
    isBirthDateApproximate?: boolean;
    birthDateType?: 'exact' | 'period' | 'about';
    deathDate?: string;
    deathDay?: string;
    deathMonth?: string;
    deathYear?: string;
    isDeceased?: boolean;
    houseNumber?: string;
    birthPlace?: string;
    residencePlace?: string;
    deathPlace?: string;
    burialPlace?: string;
    profession?: string;
    deathCause?: string;
    godparents?: string;
    cardBgColor?: string;
    isVerified?: boolean;
    avatarUrl?: string;
    flagEmoji?: string;
    notes?: string;
  }) => {
    const newId = `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const target = addingRelativeTarget?.target || null;
    const additionalConnOverrides: Record<string, ConnectionMeta> = {};

    // Check if new person has a birth year specified
    const mockPerson: Person = {
      id: newId,
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      yearsDisplay: data.yearsDisplay,
      birthDate: data.birthDate,
      birthYear: data.birthYear,
      parents: [],
      spouses: [],
      children: [],
      x: 0,
      y: 0,
    };
    const enteredBirthYear = extractBirthYear(mockPerson);

    let newX = 350;
    let newY = 700;

    const newParents: string[] = [];
    const newSpouses: string[] = [];
    const newChildren: string[] = [];
    let newPersonSiblings: string[] = [];
    const updatedPersons = { ...tree.persons };

    if (!target) {
      // Adding independent branch or first person
      if (enteredBirthYear) {
        newY = yearToY(enteredBirthYear, startYear, DEFAULT_PIXELS_PER_YEAR);
      } else {
        newY = yearToY(1980, startYear, DEFAULT_PIXELS_PER_YEAR);
      }

      // If tree already has cards, place independent branch to the right with spacing
      const existingPersons = Object.values(tree.persons);
      if (existingPersons.length > 0) {
        const maxX = Math.max(...existingPersons.map((p) => p.x));
        const avgY = existingPersons.reduce((sum, p) => sum + p.y, 0) / existingPersons.length;
        newX = maxX + 240;
        newY = Math.round(avgY);
      } else {
        newX = 400;
      }
    } else {
      // Adding relative to existing target card
      const targetBirthYear = extractBirthYear(target);

      switch (data.relationType) {
        case 'father':
        case 'mother':
        case 'parent': {
          // Parents are created HIGHER UP
          if (enteredBirthYear) {
            newY = yearToY(enteredBirthYear, startYear, DEFAULT_PIXELS_PER_YEAR);
          } else if (targetBirthYear) {
            newY = yearToY(targetBirthYear - 28, startYear, DEFAULT_PIXELS_PER_YEAR);
          } else {
            newY = target.y - GEN_Y_SPACING;
          }

          const currentParents = target.parents || [];
          if (currentParents.length === 0) {
            if (data.relationType === 'father') {
              newX = target.x - 62;
            } else if (data.relationType === 'mother') {
              newX = target.x + 62;
            } else {
              newX = target.x;
            }
          } else {
            // Second parent added: form a tight couple nest with the first parent!
            const firstParent = updatedPersons[currentParents[0]];
            if (firstParent) {
              newY = firstParent.y;
              if (data.relationType === 'mother' || data.gender === 'female') {
                newX = firstParent.x + CARD_WIDTH;
              } else {
                newX = firstParent.x - CARD_WIDTH;
              }
              if (!firstParent.spouses.includes(newId)) {
                firstParent.spouses = [...firstParent.spouses, newId];
              }
              newSpouses.push(firstParent.id);

              // Share any existing children of firstParent
              (firstParent.children || []).forEach((cId) => {
                if (!newChildren.includes(cId)) newChildren.push(cId);
                const c = updatedPersons[cId];
                if (c && !c.parents.includes(newId)) {
                  c.parents = [...c.parents, newId];
                }
              });
            }
          }

          shiftCollidingCards(updatedPersons, newX, newY, 130);

          if (!newChildren.includes(target.id)) newChildren.push(target.id);
          updatedPersons[target.id] = {
            ...target,
            parents: [...(target.parents || []), newId],
          };
          break;
        }

        case 'spouse': {
          newY = target.y;

          // Check if target already has existing spouses in tree
          const existingSpouses = (target.spouses || []).map((sId) => updatedPersons[sId]).filter(Boolean);

          // If user requested to mark previous spouse as divorced
          if (
            data.markPreviousSpouseDivorced &&
            data.previousSpouseIdToDivorce &&
            updatedPersons[data.previousSpouseIdToDivorce]
          ) {
            const prevSpouse = updatedPersons[data.previousSpouseIdToDivorce];
            const prevMKey = [target.id, prevSpouse.id].sort().join('::');

            additionalConnOverrides[`marriage:${prevMKey}`] = {
              ...(tree.connectionOverrides?.[`marriage:${prevMKey}`] || { verified: true }),
              eventType: 'divorce',
              label: 'Розлучення',
              color: '#e11d48',
            };

            // Position the divorced previous spouse on the opposite side (left) as an independent single card
            const movedX = target.x - CARD_WIDTH - 80;
            updatedPersons[prevSpouse.id] = {
              ...prevSpouse,
              x: movedX,
            };
            shiftCollidingCards(updatedPersons, movedX, prevSpouse.y, 110);
          }

          // Check for remaining active (non-divorced) spouses
          const activeSpouses = existingSpouses.filter((sp) => {
            const mKey = [target.id, sp.id].sort().join('::');
            return (
              tree.connectionOverrides?.[`marriage:${mKey}`]?.eventType !== 'divorce' &&
              sp.id !== data.previousSpouseIdToDivorce
            );
          });

          if (data.eventType === 'divorce') {
            // Adding a divorced/ex-spouse: position as independent single card with divorce separation gap
            newX = target.x - CARD_WIDTH - 80;
          } else if (activeSpouses.length > 0 && !data.markPreviousSpouseDivorced) {
            // Additional active spouse without divorcing previous: position safely to the right
            const maxX = Math.max(target.x, ...existingSpouses.map((s) => s.x));
            newX = maxX + CARD_WIDTH + 60;
          } else {
            // Active marriage (first active spouse or after previous spouse was divorced): position side-by-side to form a new CoupleCard
            newX = target.x + 114;
          }

          shiftCollidingCards(updatedPersons, newX, newY, 120);

          newSpouses.push(target.id);
          updatedPersons[target.id] = {
            ...target,
            spouses: [...(target.spouses || []), newId],
          };

          // Link all existing children if explicitly selected or if this is the first spouse
          const shouldLinkChildren =
            data.linkAllExistingChildren !== undefined
              ? data.linkAllExistingChildren
              : existingSpouses.length === 0;

          if (shouldLinkChildren && target.children && target.children.length > 0) {
            target.children.forEach((cId) => {
              const child = updatedPersons[cId];
              if (child && !child.parents.includes(newId)) {
                child.parents = [...child.parents, newId];
                newChildren.push(child.id);
              }
            });
          }
          break;
        }

        case 'child':
        case 'son':
        case 'daughter': {
          // Children are created strictly BELOW
          if (enteredBirthYear) {
            newY = yearToY(enteredBirthYear, startYear, DEFAULT_PIXELS_PER_YEAR);
          } else if (targetBirthYear) {
            newY = yearToY(targetBirthYear + 28, startYear, DEFAULT_PIXELS_PER_YEAR);
          } else {
            newY = target.y + GEN_Y_SPACING;
          }

          const spouseIds = target.spouses || [];
          const primarySpouse = spouseIds.length > 0 ? updatedPersons[spouseIds[0]] : null;

          // All existing children of this family unit
          const existingChildIds = Array.from(
            new Set([...(target.children || []), ...(primarySpouse?.children || [])])
          );

          if (existingChildIds.length === 0) {
            // First child: center right below the couple nest
            if (primarySpouse) {
              newX = Math.round((target.x + primarySpouse.x) / 2);
            } else {
              newX = target.x;
            }
          } else {
            // Subsequent children: place to the right of the rightmost existing child
            const maxChildX = Math.max(
              ...existingChildIds.map((cid) => updatedPersons[cid]?.x ?? target.x)
            );
            newX = maxChildX + 130;
          }

          shiftCollidingCards(updatedPersons, newX, newY, 130);

          newParents.push(target.id);
          // Always link all spouses of target as parents of the child
          spouseIds.forEach((spouseId) => {
            if (updatedPersons[spouseId] && !newParents.includes(spouseId)) {
              newParents.push(spouseId);
              updatedPersons[spouseId] = {
                ...updatedPersons[spouseId],
                children: [...(updatedPersons[spouseId].children || []), newId],
              };
            }
          });

          updatedPersons[target.id] = {
            ...target,
            children: [...(target.children || []), newId],
          };
          break;
        }

        case 'sibling':
        case 'brother':
        case 'sister': {
          // Sibling is created to the SIDE on the same horizontal level
          if (enteredBirthYear) {
            newY = yearToY(enteredBirthYear, startYear, DEFAULT_PIXELS_PER_YEAR);
          } else {
            newY = target.y;
          }

          // Must be placed to the right of the target AND target's spouse (avoid splitting couple nest)
          const familyUnitXs = [
            target.x,
            ...(target.spouses || []).map((sid) => updatedPersons[sid]?.x ?? target.x),
          ];
          const maxFamilyUnitX = Math.max(...familyUnitXs);

          // Find any existing siblings
          const existingSiblingIds = target.parents && target.parents.length > 0
            ? Array.from(
                new Set(
                  target.parents.flatMap((pid) => updatedPersons[pid]?.children || []).filter(
                    (cid) => cid !== target.id
                  )
                )
              )
            : target.siblings || [];

          const existingSiblingXs = existingSiblingIds
            .map((sid) => updatedPersons[sid]?.x)
            .filter((x): x is number => x !== undefined);

          newX = Math.max(maxFamilyUnitX, ...existingSiblingXs) + 130;

          shiftCollidingCards(updatedPersons, newX, newY, 130);

          // Connection logic: NEVER create a fake 'Один із батьків' card!
          if (target.parents && target.parents.length > 0) {
            target.parents.forEach((pId) => {
              newParents.push(pId);
              const p = updatedPersons[pId];
              if (p && !p.children.includes(newId)) {
                p.children = [...p.children, newId];
              }
            });
          } else {
            // Target has no parents: directly link them in siblings array
            updatedPersons[target.id] = {
              ...updatedPersons[target.id],
              siblings: Array.from(new Set([...(updatedPersons[target.id].siblings || []), newId])),
            };
            newPersonSiblings = Array.from(
              new Set([target.id, ...(updatedPersons[target.id].siblings || []).filter((id) => id !== newId)])
            );
            // Also link any existing siblings
            existingSiblingIds.forEach((sid) => {
              if (updatedPersons[sid]) {
                updatedPersons[sid] = {
                  ...updatedPersons[sid],
                  siblings: Array.from(new Set([...(updatedPersons[sid].siblings || []), newId])),
                };
              }
            });
          }
          break;
        }
      }
    }

    const unverifiedRelations: string[] = [];
    if (target && data.isVerified === false) {
      unverifiedRelations.push(target.id);
      if (updatedPersons[target.id]) {
        updatedPersons[target.id] = {
          ...updatedPersons[target.id],
          unverifiedRelations: [
            ...(updatedPersons[target.id].unverifiedRelations || []),
            newId,
          ],
        };
      }
    }

    const newPerson: Person = {
      id: newId,
      firstName: data.firstName,
      lastName: data.lastName,
      maidenName: data.maidenName,
      nickname: data.nickname,
      gender: data.gender,
      yearsDisplay: data.yearsDisplay,
      birthDate: data.birthDate,
      birthDay: data.birthDay,
      birthMonth: data.birthMonth,
      birthYear: data.birthYear,
      birthYearEnd: data.birthYearEnd,
      isBirthDateApproximate: data.isBirthDateApproximate,
      birthDateType: data.birthDateType,
      deathDate: data.deathDate,
      deathDay: data.deathDay,
      deathMonth: data.deathMonth,
      deathYear: data.deathYear,
      isDeceased: data.isDeceased,
      houseNumber: data.houseNumber,
      birthPlace: data.birthPlace,
      residencePlace: data.residencePlace,
      deathPlace: data.deathPlace,
      burialPlace: data.burialPlace,
      profession: data.profession,
      deathCause: data.deathCause,
      godparents: data.godparents,
      cardBgColor: data.cardBgColor,
      unverifiedRelations,
      avatarUrl: data.avatarUrl,
      flagEmoji: data.flagEmoji,
      notes: data.notes,
      parents: newParents,
      spouses: newSpouses,
      children: newChildren,
      siblings: newPersonSiblings.length > 0 ? newPersonSiblings : undefined,
      x: newX,
      y: newY,
    };

    const isFirstCard = Object.keys(tree.persons).length === 0;

    updatedPersons[newId] = newPerson;

    setTree((prev) => {
      const connOverrides = { ...(prev.connectionOverrides || {}), ...additionalConnOverrides };
      if (target && data.relationType === 'spouse') {
        const mKey = [target.id, newId].sort().join('::');
        connOverrides[`marriage:${mKey}`] = {
          verified: data.isVerified !== false,
          eventType: data.eventType || 'marriage',
          eventDate: data.eventDate,
          label:
            data.eventType === 'divorce'
              ? 'Розлучення'
              : data.eventType === 'cohabitation'
              ? 'Пара (без шлюбу)'
              : 'Шлюб',
          color: data.eventType === 'divorce' ? '#e11d48' : undefined,
        };
      }
      return {
        ...prev,
        persons: updatedPersons,
        connectionOverrides: connOverrides,
        selectedPersonId: newId,
      };
    });

    setSelectedPersonId(newId);
    setAddingRelativeTarget(null);

    // Immediately center on the first card when added
    if (isFirstCard) {
      setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const targetX = rect.width / 2 - (newX + CARD_WIDTH / 2) * 0.9;
          const targetY = rect.height / 2 - (newY + CARD_HEIGHT / 2) * 0.9;
          setViewport({
            x: targetX,
            y: targetY,
            zoom: 0.9,
          });
        }
      }, 50);
    }
  };

  

  // Save connection metadata (key event, date, label, color, notes)
  // Save connection metadata (verified status)
  const handleSaveConnectionMeta = (connectionId: string, meta: ConnectionMeta) => {
    setTree((prev) => {
      const personsCopy = { ...prev.persons };

      // Synchronize unverifiedRelations on connected person entities
      if (connectionId.startsWith('marriage:')) {
        const raw = connectionId.replace(/^marriage:/, '');
        const ids = raw.includes('::') ? raw.split('::') : raw.split(':');
        if (ids.length >= 2) {
          const [id1, id2] = ids;
          const p1 = personsCopy[id1];
          const p2 = personsCopy[id2];
          if (p1) {
            const list = p1.unverifiedRelations || [];
            personsCopy[id1] = {
              ...p1,
              unverifiedRelations: meta.verified
                ? list.filter((id) => id !== id2)
                : list.includes(id2) ? list : [...list, id2],
            };
          }
          if (p2) {
            const list = p2.unverifiedRelations || [];
            personsCopy[id2] = {
              ...p2,
              unverifiedRelations: meta.verified
                ? list.filter((id) => id !== id1)
                : list.includes(id1) ? list : [...list, id1],
            };
          }
        }
      } else if (connectionId.startsWith('descent:child:')) {
        const parts = connectionId.split(':');
        const childId = parts[parts.length - 1];
        const child = personsCopy[childId];
        if (child) {
          const pKey = parts[2] || '';
          const parentIds = pKey.includes('::') ? pKey.split('::') : [pKey];
          const list = child.unverifiedRelations || [];
          personsCopy[childId] = {
            ...child,
            unverifiedRelations: meta.verified
              ? list.filter((id) => !parentIds.includes(id))
              : Array.from(new Set([...list, ...parentIds])),
          };
        }
      } else if (connectionId.startsWith('sibling:')) {
        const raw = connectionId.replace(/^sibling:/, '');
        const ids = raw.includes('::') ? raw.split('::') : raw.split(':');
        if (ids.length >= 2) {
          const [id1, id2] = ids;
          const p1 = personsCopy[id1];
          const p2 = personsCopy[id2];
          if (p1) {
            const list = p1.unverifiedRelations || [];
            personsCopy[id1] = {
              ...p1,
              unverifiedRelations: meta.verified
                ? list.filter((id) => id !== id2)
                : list.includes(id2) ? list : [...list, id2],
            };
          }
          if (p2) {
            const list = p2.unverifiedRelations || [];
            personsCopy[id2] = {
              ...p2,
              unverifiedRelations: meta.verified
                ? list.filter((id) => id !== id1)
                : list.includes(id1) ? list : [...list, id1],
            };
          }
        }
      }

      return {
        ...prev,
        persons: personsCopy,
        connectionOverrides: {
          ...(prev.connectionOverrides || {}),
          [connectionId]: meta,
        },
      };
    });
  };

  // Delete/Clear connection metadata
  const handleDeleteConnectionMeta = (connectionId: string) => {
    setTree((prev) => {
      const copy = { ...(prev.connectionOverrides || {}) };
      delete copy[connectionId];
      return {
        ...prev,
        connectionOverrides: copy,
      };
    });
  };

  // Disconnect a couple (dissolve marriage / divorce / cohabitation)
  const handleDisconnectCouple = useCallback((id1: string, id2: string) => {
    if (!isAdmin) return;

    setTree((prev) => {
      const p1 = prev.persons[id1];
      const p2 = prev.persons[id2];
      if (!p1 || !p2) return prev;

      const mKey = [id1, id2].sort().join('::');
      const connectionOverrides = { ...(prev.connectionOverrides || {}) };

      connectionOverrides[`marriage:${mKey}`] = {
        ...(connectionOverrides[`marriage:${mKey}`] || { verified: true }),
        eventType: 'divorce',
        label: 'Розлучення',
        color: '#e11d48',
      };

      const updatedPersons: Record<string, Person> = {
        ...prev.persons,
      };

      // Visually separate them horizontally so they stand as two clear single cards connected by a divorce line
      const leftP = p1.x <= p2.x ? p1 : p2;
      const rightP = p1.x <= p2.x ? p2 : p1;
      const newRightX = leftP.x + CARD_WIDTH + 80;

      updatedPersons[leftP.id] = { ...leftP };
      updatedPersons[rightP.id] = {
        ...updatedPersons[rightP.id],
        x: newRightX,
      };

      shiftCollidingCards(updatedPersons, newRightX, rightP.y, 100);

      return {
        ...prev,
        persons: updatedPersons,
        connectionOverrides,
      };
    });
  }, [isAdmin]);

  // Reunite a divorced couple back into an active marriage
  const handleReuniteCouple = useCallback((id1: string, id2: string) => {
    if (!isAdmin) return;

    setTree((prev) => {
      const p1 = prev.persons[id1];
      const p2 = prev.persons[id2];
      if (!p1 || !p2) return prev;

      const mKey = [id1, id2].sort().join('::');
      const connectionOverrides = { ...(prev.connectionOverrides || {}) };

      connectionOverrides[`marriage:${mKey}`] = {
        ...(connectionOverrides[`marriage:${mKey}`] || { verified: true }),
        eventType: 'marriage',
        label: 'Шлюб',
        color: undefined,
      };

      const updatedPersons: Record<string, Person> = {
        ...prev.persons,
      };

      // Bring right spouse back snugly beside left spouse to form CoupleCard (114px offset)
      const leftP = p1.x <= p2.x ? p1 : p2;
      const rightP = p1.x <= p2.x ? p2 : p1;

      updatedPersons[leftP.id] = { ...leftP };
      updatedPersons[rightP.id] = {
        ...updatedPersons[rightP.id],
        x: leftP.x + 114,
        y: leftP.y,
      };

      return {
        ...prev,
        persons: updatedPersons,
        connectionOverrides,
      };
    });
  }, [isAdmin]);


  // Remove structural connection between two persons
  const handleRemoveConnection = (connectionId: string) => {
    setTree((prev) => {
      const persons = { ...prev.persons };
      const connectionOverrides = { ...(prev.connectionOverrides || {}) };
      delete connectionOverrides[connectionId];

      if (connectionId.startsWith('marriage:') || connectionId.startsWith('cohabitation:')) {
        const raw = connectionId.replace(/^(marriage|cohabitation):/, '');
        const ids = raw.includes('::') ? raw.split('::') : raw.split(':');
        if (ids.length >= 2) {
          const [id1, id2] = ids;
          if (persons[id1]) {
            persons[id1] = {
              ...persons[id1],
              spouses: (persons[id1].spouses || []).filter((id) => id !== id2),
            };
          }
          if (persons[id2]) {
            persons[id2] = {
              ...persons[id2],
              spouses: (persons[id2].spouses || []).filter((id) => id !== id1),
            };
          }
          if (persons[id1] && persons[id2]) {
            const leftP = persons[id1].x <= persons[id2].x ? persons[id1] : persons[id2];
            const rightP = persons[id1].x <= persons[id2].x ? persons[id2] : persons[id1];
            if (Math.abs(rightP.x - leftP.x) <= 140 && Math.abs(rightP.y - leftP.y) <= 40) {
              persons[rightP.id] = {
                ...persons[rightP.id],
                x: leftP.x + CARD_WIDTH + 52,
              };
            }
          }
        }
      } else if (connectionId.startsWith('descent:child:')) {
        const raw = connectionId.replace('descent:child:', '');
        const lastColonIndex = raw.lastIndexOf(':');
        if (lastColonIndex !== -1) {
          const pKey = raw.substring(0, lastColonIndex);
          const childId = raw.substring(lastColonIndex + 1);
          const parentIds = pKey.split('::');

          const child = persons[childId];
          if (child && child.parents) {
            persons[childId] = {
              ...child,
              parents: child.parents.filter((pid) => !parentIds.includes(pid)),
              unverifiedRelations: (child.unverifiedRelations || []).filter((pid) => !parentIds.includes(pid)),
            };
          }

          parentIds.forEach((pid) => {
            if (persons[pid]) {
              persons[pid] = {
                ...persons[pid],
                children: (persons[pid].children || []).filter((cid) => cid !== childId),
                unverifiedRelations: (persons[pid].unverifiedRelations || []).filter((cid) => cid !== childId),
              };
            }
          });
        }
      } else if (connectionId.startsWith('descent:')) {
        const parentIds = connectionId.replace('descent:', '').split('::');

        // Remove parents from all children in this group
        Object.keys(persons).forEach((childId) => {
          const child = persons[childId];
          if (!child || !child.parents) return;
          const hasThisParentGroup = parentIds.every((pid) => child.parents.includes(pid));
          if (hasThisParentGroup) {
            const updatedParents = child.parents.filter((pid) => !parentIds.includes(pid));
            persons[childId] = {
              ...child,
              parents: updatedParents,
            };
          }
        });

        // Update children list on parents
        parentIds.forEach((pid) => {
          if (persons[pid]) {
            const currentChildren = persons[pid].children || [];
            const updatedChildren = currentChildren.filter((cid) => {
              const child = persons[cid];
              return child && child.parents && child.parents.includes(pid);
            });
            persons[pid] = {
              ...persons[pid],
              children: updatedChildren,
            };
          }
        });
      } else if (connectionId.startsWith('sibling:')) {
        const ids = connectionId.replace('sibling:', '').split('::');
        ids.forEach((id) => {
          if (persons[id] && persons[id].siblings) {
            persons[id] = {
              ...persons[id],
              siblings: persons[id].siblings.filter((sibId) => !ids.includes(sibId)),
            };
          }
        });
      }

      return {
        ...prev,
        persons,
        connectionOverrides,
      };
    });
  };

  // Connect two persons manually with credibility and archival citation support
  const handleConnectPersons = (
    targetId: string,
    relationType: RelativeType,
    options?: ConnectOptions
  ) => {
    if (!connectingPerson) return;
    const sourceId = connectingPerson.id;

    setTree((prev) => {
      const persons = { ...prev.persons };
      const connectionOverrides = { ...(prev.connectionOverrides || {}) };
      const source = { ...persons[sourceId] };
      const target = { ...persons[targetId] };

      if (!source || !target) return prev;

      const isVerified = options ? options.verified : true;
      const confidenceLevel = options?.confidenceLevel || (isVerified ? 'verified' : 'hypothetical');
      const archiveSource = options?.archiveSource;
      const isMainBranch = options?.isMainBranch || false;

      const applyUnverified = (p1: Person, p2Id: string, unverified: boolean) => {
        const list = p1.unverifiedRelations || [];
        if (unverified) {
          if (!list.includes(p2Id)) p1.unverifiedRelations = [...list, p2Id];
        } else {
          p1.unverifiedRelations = list.filter((id) => id !== p2Id);
        }
      };

      switch (relationType) {
        case 'spouse': {
          if (!source.spouses.includes(targetId)) source.spouses = [...source.spouses, targetId];
          if (!target.spouses.includes(sourceId)) target.spouses = [...target.spouses, sourceId];

          applyUnverified(source, targetId, !isVerified);
          applyUnverified(target, sourceId, !isVerified);

          // If requested, link existing children of target to source
          if (options?.linkExistingSpouseChildren && target.children && target.children.length > 0) {
            target.children.forEach((cId) => {
              const child = persons[cId];
              if (child && !child.parents.includes(sourceId)) {
                persons[cId] = {
                  ...child,
                  parents: [...child.parents, sourceId],
                };
                if (!source.children.includes(cId)) {
                  source.children = [...source.children, cId];
                }
              }
            });
          }

          const mKey = [sourceId, targetId].sort().join('::');
          connectionOverrides[`marriage:${mKey}`] = {
            verified: isVerified,
            confidenceLevel,
            archiveSource,
            isMainBranch,
            eventType: options?.eventType || 'marriage',
            color: isMainBranch ? '#b45309' : isVerified ? (prev.verifiedColor || '#15803d') : '#78716c',
          };
          break;
        }

        case 'parent': {
          // Target is Parent of Source
          if (!source.parents.includes(targetId)) source.parents = [...source.parents, targetId];
          if (!target.children.includes(sourceId)) target.children = [...target.children, sourceId];

          applyUnverified(source, targetId, !isVerified);
          applyUnverified(target, sourceId, !isVerified);

          const pKey = source.parents.slice().sort().join('::');
          connectionOverrides[`descent:child:${pKey}:${sourceId}`] = {
            verified: isVerified,
            confidenceLevel,
            archiveSource,
            isMainBranch,
            color: isMainBranch ? '#b45309' : isVerified ? (prev.verifiedColor || '#15803d') : '#78716c',
          };
          break;
        }

        case 'child': {
          // Target is Child of Source
          if (!source.children.includes(targetId)) source.children = [...source.children, targetId];
          if (!target.parents.includes(sourceId)) target.parents = [...target.parents, sourceId];

          applyUnverified(source, targetId, !isVerified);
          applyUnverified(target, sourceId, !isVerified);

          const pKey = target.parents.slice().sort().join('::');
          connectionOverrides[`descent:child:${pKey}:${targetId}`] = {
            verified: isVerified,
            confidenceLevel,
            archiveSource,
            isMainBranch,
            color: isMainBranch ? '#b45309' : isVerified ? (prev.verifiedColor || '#15803d') : '#78716c',
          };
          break;
        }

        case 'sibling': {
          const sharedParents = Array.from(
            new Set([...(source.parents || []), ...(target.parents || [])])
          );
          if (sharedParents.length > 0) {
            source.parents = sharedParents;
            target.parents = sharedParents;
            sharedParents.forEach((pId) => {
              if (persons[pId]) {
                const p = { ...persons[pId] };
                p.children = Array.from(new Set([...(p.children || []), sourceId, targetId]));
                persons[pId] = p;
              }
            });
          } else {
            // Direct sibling relationship without parents
            source.siblings = Array.from(new Set([...(source.siblings || []), targetId]));
            target.siblings = Array.from(new Set([...(target.siblings || []), sourceId]));

            const gKey = [sourceId, targetId].sort().join('::');
            connectionOverrides[`sibling:${gKey}`] = {
              verified: isVerified,
              confidenceLevel,
              archiveSource,
              isMainBranch,
              label: 'Рідні брати / сестри',
              color: isMainBranch ? '#b45309' : '#0284c7',
            };
          }

          applyUnverified(source, targetId, !isVerified);
          applyUnverified(target, sourceId, !isVerified);
          break;
        }
      }

      persons[sourceId] = source;
      persons[targetId] = target;

      return {
        ...prev,
        persons,
        connectionOverrides,
      };
    });
  };

  // Toggle relation verification between two persons
  const handleToggleRelationVerification = (personId: string, relativeId: string) => {
    setTree((prev) => {
      const p1 = prev.persons[personId];
      const p2 = prev.persons[relativeId];
      if (!p1) return prev;

      const unverified1 = p1.unverifiedRelations || [];
      const isCurrentlyUnverified = unverified1.includes(relativeId);

      const newUnverified1 = isCurrentlyUnverified
        ? unverified1.filter((id) => id !== relativeId)
        : [...unverified1, relativeId];

      const updated = {
        ...prev.persons,
        [personId]: {
          ...p1,
          unverifiedRelations: newUnverified1,
        },
      };

      if (p2) {
        const unverified2 = p2.unverifiedRelations || [];
        const newUnverified2 = isCurrentlyUnverified
          ? unverified2.filter((id) => id !== personId)
          : [...unverified2, personId];
        updated[relativeId] = {
          ...p2,
          unverifiedRelations: newUnverified2,
        };
      }

      return {
        ...prev,
        persons: updated,
      };
    });
  };

  // Align a single person's card vertically opposite to their birth year on the timeline ruler
  const handleAlignChronologically = (personId: string) => {
    const person = tree.persons[personId];
    if (!person) return;

    const birthYear = extractBirthYear(person);
    if (!birthYear) {
      showToast({
        type: 'warning',
        title: 'Не вказано рік народження',
        message: `У особи "${[person.firstName, person.lastName].filter(Boolean).join(' ') || 'без імені'}" заповніть рік народження, щоб прикріпити її до шкали років.`,
      });
      return;
    }

    const targetY = yearToY(birthYear, startYear, DEFAULT_PIXELS_PER_YEAR);

    setTree((prev) => {
      const p = prev.persons[personId];
      if (!p) return prev;
      return {
        ...prev,
        persons: {
          ...prev.persons,
          [personId]: {
            ...p,
            y: targetY,
            isChronologicallyPinned: true,
          },
        },
      };
    });
  };

  // Toggle chronological pin status for a person
  const handleToggleChronologicalPin = (personId: string) => {
    setTree((prev) => {
      const p = prev.persons[personId];
      if (!p) return prev;

      const nextPinned = !p.isChronologicallyPinned;
      let targetY = p.y;
      if (nextPinned) {
        const birthYr = extractBirthYear(p);
        if (birthYr) {
          targetY = yearToY(birthYr, startYear, DEFAULT_PIXELS_PER_YEAR);
        }
      }

      return {
        ...prev,
        persons: {
          ...prev.persons,
          [personId]: {
            ...p,
            y: targetY,
            isChronologicallyPinned: nextPinned,
          },
        },
      };
    });
  };

  

  // Delete person
  const handleDeletePerson = (id: string) => {
    setTree((prev) => {
      const updated = { ...prev.persons };
      delete updated[id];

      Object.keys(updated).forEach((pId) => {
        const p = updated[pId];
        updated[pId] = {
          ...p,
          parents: p.parents.filter((pid) => pid !== id),
          spouses: p.spouses.filter((sid) => sid !== id),
          children: p.children.filter((cid) => cid !== id),
        };
      });

      return {
        ...prev,
        persons: updated,
        selectedPersonId: prev.selectedPersonId === id ? null : prev.selectedPersonId,
      };
    });

    if (selectedPersonId === id) {
      setSelectedPersonId(null);
      setIsSidebarOpen(false);
    }
  };

  // Save edited person
  const handleSavePerson = (updated: Person) => {
    const birthYr = extractBirthYear(updated);
    if (updated.isChronologicallyPinned && birthYr) {
      updated.y = yearToY(birthYr, startYear, DEFAULT_PIXELS_PER_YEAR);
    }
    setTree((prev) => {
      const oldPerson = prev.persons[updated.id];
      const persons = { ...prev.persons, [updated.id]: updated };

      if (oldPerson) {
        // If parents were removed in updated, remove child from those parents
        oldPerson.parents.forEach((pId) => {
          if (!updated.parents.includes(pId) && persons[pId]) {
            persons[pId] = {
              ...persons[pId],
              children: (persons[pId].children || []).filter((cid) => cid !== updated.id),
            };
          }
        });

        // If spouses were removed in updated, remove spouse from those spouses
        oldPerson.spouses.forEach((sId) => {
          if (!updated.spouses.includes(sId) && persons[sId]) {
            persons[sId] = {
              ...persons[sId],
              spouses: (persons[sId].spouses || []).filter((sid) => sid !== updated.id),
            };
          }
        });

        // If children were removed in updated, remove parent from those children
        oldPerson.children.forEach((cId) => {
          if (!updated.children.includes(cId) && persons[cId]) {
            persons[cId] = {
              ...persons[cId],
              parents: (persons[cId].parents || []).filter((pid) => pid !== updated.id),
            };
          }
        });

        // If direct siblings were removed in updated, remove reciprocal link
        (oldPerson.siblings || []).forEach((sId) => {
          if (!updated.siblings?.includes(sId) && persons[sId]) {
            persons[sId] = {
              ...persons[sId],
              siblings: (persons[sId].siblings || []).filter((sid) => sid !== updated.id),
            };
          }
        });
      }

      return {
        ...prev,
        persons,
      };
    });
  };


  // Center viewport on the user's card or first record in the tree
  const handleCenterOnFirstPerson = useCallback(() => {
    const targetPersonId =
      (userPersonId && tree.persons[userPersonId] ? userPersonId : null) ||
      (selectedPersonId && tree.persons[selectedPersonId] ? selectedPersonId : null) ||
      Object.keys(tree.persons)[0];

    if (targetPersonId) {
      centerOnPerson(targetPersonId);
    } else {
      fitToContent();
    }
  }, [userPersonId, selectedPersonId, tree.persons, centerOnPerson, fitToContent]);

  

  // Load the fictional example tree
  const handleLoadDemo = () => {
    if (confirm("Завантажити приклад родового дерева?")) {
      hasCenteredTreeIdRef.current = null;
      setTree(sampleTreeData);
      setSelectedPersonId(sampleTreeData.selectedPersonId ?? null);
      setTimeout(fitToContent, 100);
    }
  };

  // Load JSON file from computer
  const handleLoadJson = async (file: File) => {
    try {
      hasCenteredTreeIdRef.current = null;
      const loaded = await parseTreeJsonFile(file);
      setTree(loaded);
      setSelectedPersonId(loaded.selectedPersonId || Object.keys(loaded.persons)[0] || null);
      
      // Explicitly trigger a save immediately to ensure server is updated
      const saved = await saveTreeToLocalStorage(loaded);
      if (saved) {
        setLastSavedTime(new Date());
        showToast({
          type: 'success',
          title: 'Файл імпортовано',
          message: `Успішно завантажено родовід (${Object.keys(loaded.persons || {}).length} осіб).`,
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Увага',
          message: "Дані збережено локально, але сталася помилка зв'язку з сервером.",
        });
      }
      
      setTimeout(fitToContent, 100);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Помилка відкриття файлу',
        message: (err as Error).message,
      });
    }
  };

  // Clipboard buffer count state
  const [clipboardCount, setClipboardCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('rodovid_clipboard_buffer');
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.persons) ? parsed.persons.length : 0;
      }
    } catch {}
    return 0;
  });

  // Copy selected cards to clipboard buffer
  const handleCopySelectedPersons = useCallback(() => {
    if (selectedPersonIds.size === 0) {
      showToast({
        type: 'warning',
        title: 'Нічого не виділено',
        message: 'Натисніть Ctrl+Клік або використайте рамку виділення, щоб вибрати особи.',
      });
      return;
    }

    const selectedList = Array.from(selectedPersonIds)
      .map((id) => tree.persons[id])
      .filter(Boolean);

    if (selectedList.length === 0) return;

    // Filter relevant connection overrides between selected persons
    const relevantOverrides: Record<string, ConnectionMeta> = {};
    if (tree.connectionOverrides) {
      Object.entries(tree.connectionOverrides).forEach(([key, conn]) => {
        const parts = key.split('_');
        if (parts.length === 2 && selectedPersonIds.has(parts[0]) && selectedPersonIds.has(parts[1])) {
          relevantOverrides[key] = conn;
        }
      });
    }

    const buffer = {
      persons: selectedList,
      connectionOverrides: relevantOverrides,
      copiedFromTitle: tree.title || 'Родове полотно',
      copiedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('rodovid_clipboard_buffer', JSON.stringify(buffer));
      setClipboardCount(selectedList.length);
      showToast({
        type: 'success',
        title: 'Картки скопійовано у буфер',
        message: `Скопійовано осіб: ${selectedList.length}. Перейдіть в інше полотно та натисніть «Вставити».`,
      });
    } catch (err) {
      console.error('Failed to copy cards to clipboard:', err);
      showToast({
        type: 'error',
        title: 'Помилка копіювання',
        message: 'Не вдалося зберегти картки в буфер.',
      });
    }
  }, [selectedPersonIds, tree, showToast]);

  // Paste copied cards from clipboard buffer into current active canvas
  const handlePasteCopiedBuffer = useCallback(() => {
    const raw = localStorage.getItem('rodovid_clipboard_buffer');
    if (!raw) {
      showToast({
        type: 'warning',
        title: 'Буфер порожній',
        message: 'Спочатку виділіть та скопіюйте картки з іншого полотна.',
      });
      return;
    }

    try {
      const buffer = JSON.parse(raw);
      const copiedPersons: Person[] = buffer.persons || [];
      if (copiedPersons.length === 0) return;

      const oldIdSet = new Set(copiedPersons.map((p) => p.id));
      const idMap: Record<string, string> = {};
      copiedPersons.forEach((p, idx) => {
        idMap[p.id] = `p_copy_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
      });

      // Find bounding box minX/minY of copied cards
      let minX = Infinity, minY = Infinity;
      copiedPersons.forEach((p) => {
        if (typeof p.x === 'number' && p.x < minX) minX = p.x;
        if (typeof p.y === 'number' && p.y < minY) minY = p.y;
      });
      if (minX === Infinity) minX = 0;
      if (minY === Infinity) minY = 0;

      // Viewport center on canvas
      const viewportCenterX = Math.round((-viewport.x + window.innerWidth / 2) / viewport.zoom);
      const viewportCenterY = Math.round((-viewport.y + window.innerHeight / 2) / viewport.zoom);

      const offsetX = viewportCenterX - minX - CARD_WIDTH / 2;
      const offsetY = viewportCenterY - minY - CARD_HEIGHT / 2;

      const newPersonsMap: Record<string, Person> = {};
      const newSelectedIds = new Set<string>();

      copiedPersons.forEach((p) => {
        const newId = idMap[p.id];
        newSelectedIds.add(newId);

        const remapArray = (arr?: string[]) =>
          (arr || [])
            .map((id) => (oldIdSet.has(id) ? idMap[id] : undefined))
            .filter(Boolean) as string[];

        newPersonsMap[newId] = {
          ...p,
          id: newId,
          x: Math.round(p.x + offsetX),
          y: Math.round(p.y + offsetY),
          parents: remapArray(p.parents),
          children: remapArray(p.children),
          spouses: remapArray(p.spouses),
        };
      });

      // Remap connection overrides
      const newConnectionOverrides: Record<string, ConnectionMeta> = { ...(tree.connectionOverrides || {}) };
      if (buffer.connectionOverrides) {
        Object.entries(buffer.connectionOverrides as Record<string, ConnectionMeta>).forEach(([key, conn]) => {
          const parts = key.split('_');
          if (parts.length === 2 && idMap[parts[0]] && idMap[parts[1]]) {
            const newKey = `${idMap[parts[0]]}_${idMap[parts[1]]}`;
            newConnectionOverrides[newKey] = {
              ...conn,
            };
          }
        });
      }

      setTree((prev) => ({
        ...prev,
        persons: {
          ...prev.persons,
          ...newPersonsMap,
        },
        connectionOverrides: newConnectionOverrides,
        updatedAt: new Date().toISOString(),
      }));

      setSelectedPersonIds(newSelectedIds);
      if (copiedPersons.length > 0) {
        const firstNewId = idMap[copiedPersons[0].id];
        setSelectedPersonId(firstNewId);
      }

      showToast({
        type: 'success',
        title: 'Картки успішно вставлено',
        message: `Вставлено ${copiedPersons.length} осіб із джерела "${buffer.copiedFromTitle || 'Інше полотно'}"!`,
      });
    } catch (err) {
      console.error('Failed to paste copied cards:', err);
      showToast({
        type: 'error',
        title: 'Помилка вставки',
        message: 'Не вдалося прочитати скопійовані картки.',
      });
    }
  }, [viewport, tree.connectionOverrides, showToast]);

  // Cancel clipboard copying / clear buffer
  const handleCancelCopyClipboard = useCallback(() => {
    try {
      localStorage.removeItem('rodovid_clipboard_buffer');
    } catch {}
    setClipboardCount(0);
    showToast({
      type: 'info',
      title: 'Копіювання скасовано',
      message: 'Буфер скопійованих карток очищено.',
    });
  }, [showToast]);

  // Keyboard shortcut listener for Ctrl+C / Ctrl+V / Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (selectedPersonIds.size > 0) {
          e.preventDefault();
          handleCopySelectedPersons();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (clipboardCount > 0) {
          e.preventDefault();
          handlePasteCopiedBuffer();
        }
      } else if (e.key === 'Escape') {
        setSelectedPersonIds(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPersonIds, clipboardCount, handleCopySelectedPersons, handlePasteCopiedBuffer]);

  // Handler to create a brand new canvas/tree for another branch
  const handleCreateNewTree = async (title: string) => {
    // Persist current active tree first
    await saveTreeToLocalStorage(tree);

    const newId = `tree_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTreeData: FamilyTreeData = {
      id: newId,
      title: title.trim() || 'Нове родове полотно',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      persons: {},
      clanCoatOfArms: {},
      connectionOverrides: {},
    };

    hasCenteredTreeIdRef.current = null;
    setTree(newTreeData);
    setSelectedPersonId(null);
    setSelectedPersonIds(new Set());
    setUserPersonId(null);

    // Save new tree
    await saveTreeToLocalStorage(newTreeData);

    if (currentUser) {
      try {
        await saveTreeToFirestore(
          newId,
          newTreeData,
          currentUser.uid,
          currentUser.displayName || currentUser.email?.split('@')[0] || 'Користувач',
          false
        );
      } catch (err) {
        console.error('Failed to save new tree to Firestore:', err);
      }
    }

    showToast({
      type: 'success',
      title: 'Створено нове полотно',
      message: `Полотно "${newTreeData.title}" створено! Натисніть "+ Додати особу" для заповнення.`,
    });
  };

  // Handler to select / switch to another canvas
  const handleSelectTree = async (treeId: string) => {
    // Save current active tree first
    await saveTreeToLocalStorage(tree);

    // Try cloud or local storage
    if (currentUser) {
      try {
        const cloudTree = await getTreeById(treeId);
        if (cloudTree) {
          hasCenteredTreeIdRef.current = null;
          setTree(cloudTree);
          setSelectedPersonId(cloudTree.selectedPersonId || Object.keys(cloudTree.persons)[0] || null);
          setSelectedPersonIds(new Set());
          saveTreeToLocalStorage(cloudTree);
          showToast({
            type: 'info',
            title: 'Полотно відкрито',
            message: `Відкрито полотно "${cloudTree.title || 'Родинне дерево'}" (${Object.keys(cloudTree.persons || {}).length} осіб).`,
          });
          return;
        }
      } catch (err) {
        console.error('Error fetching tree:', err);
      }
    }

    const targetTree = await loadTreeById(treeId);
    if (targetTree) {
      hasCenteredTreeIdRef.current = null;
      setTree(targetTree);
      setSelectedPersonId(targetTree.selectedPersonId || Object.keys(targetTree.persons)[0] || null);
      setSelectedPersonIds(new Set());
      showToast({
        type: 'info',
        title: 'Полотно відкрито',
        message: `Відкрито полотно "${targetTree.title || 'Родинне дерево'}" (${Object.keys(targetTree.persons || {}).length} осіб).`,
      });
      return;
    }

    showToast({
      type: 'warning',
      title: 'Не вдалося відкрити полотно',
      message: 'Запитане полотно не знайдено.',
    });
  };

  // Handler to clone/duplicate any tree
  const handleCloneTree = async (treeId: string) => {
    await saveTreeToLocalStorage(tree);

    const sourceTree = await loadTreeById(treeId);
    if (!sourceTree) return;

    const newId = `tree_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const clonedTreeData: FamilyTreeData = {
      ...sourceTree,
      id: newId,
      title: `${sourceTree.title || 'Родове полотно'} (копія)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveTreeToLocalStorage(clonedTreeData);
    setTree(clonedTreeData);
    setSelectedPersonId(null);
    setSelectedPersonIds(new Set());

    showToast({
      type: 'success',
      title: 'Полотно здубльовано',
      message: `Створено копію "${clonedTreeData.title}" (${Object.keys(clonedTreeData.persons || {}).length} осіб).`,
    });
  };

  // Handler to rename a secondary canvas (Admin only; Main tree is strictly protected)
  const handleRenameTree = async (treeId: string, newTitle: string): Promise<boolean> => {
    const isMain =
      treeId === 'my-family-tree' ||
      treeId === 'main-tree' ||
      treeId === 'default-tree' ||
      treeId === MAIN_TREE_ID;
    if (isMain) {
      showToast({
        type: 'warning',
        title: 'Дія заблокована',
        message: 'Головна гілка ніколи не видаляється і не змінюється назва.',
      });
      return false;
    }

    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return false;

    const ok = await renameTreeOnServerOrStorage(treeId, cleanTitle);
    if (ok) {
      if (tree.id === treeId) {
        setTree((prev) => ({ ...prev, title: cleanTitle, updatedAt: new Date().toISOString() }));
      }
      showToast({
        type: 'success',
        title: 'Назву змінено',
        message: `Полотно перейменовано на «${cleanTitle}».`,
      });
      return true;
    } else {
      showToast({
        type: 'error',
        title: 'Помилка',
        message: 'Не вдалося перейменувати полотно.',
      });
      return false;
    }
  };

  // Handler to delete a secondary canvas (Admin only; Main tree is strictly protected)
  const handleDeleteTree = async (treeId: string, title?: string): Promise<boolean> => {
    const isMain =
      treeId === 'my-family-tree' ||
      treeId === 'main-tree' ||
      treeId === 'default-tree' ||
      treeId === MAIN_TREE_ID;
    if (isMain) {
      showToast({
        type: 'warning',
        title: 'Дія заблокована',
        message: 'Головна гілка ніколи не видаляється і не змінюється назва.',
      });
      return false;
    }

    const ok = await deleteTreeFromServerOrStorage(treeId);
    if (currentUser) {
      try {
        await deleteTreeFromFirestore(treeId);
      } catch (err) {
        console.warn('Failed to delete tree from firestore:', err);
      }
    }

    if (ok) {
      showToast({
        type: 'info',
        title: 'Полотно видалено',
        message: `Полотно «${title || 'Родове полотно'}» успішно видалено.`,
      });
      // If user was viewing the deleted canvas, return to main tree immediately
      if (tree.id === treeId) {
        await handleSelectTree(MAIN_TREE_ID);
      }
      return true;
    } else {
      showToast({
        type: 'error',
        title: 'Помилка',
        message: 'Не вдалося видалити полотно.',
      });
      return false;
    }
  };

  // Export handlers
  const handleExportPng = async () => {
    try {
      await downloadTreePngFile(tree);
      showToast({
        type: 'success',
        title: 'Зображення збережено',
        message: 'Файл PNG високої чіткості завантажено.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Помилка створення PNG',
        message: (err as Error).message,
      });
    }
  };

  const handleExportSvg = () => {
    try {
      downloadTreeSvgFile(tree);
      showToast({
        type: 'success',
        title: 'Векторний файл збережено',
        message: 'Файл SVG для широкоформатного друку завантажено.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Помилка експорту SVG',
        message: (err as Error).message,
      });
    }
  };

  const isMainTree = !tree.id || tree.id === 'my-family-tree' || tree.id === 'main-tree' || tree.id === 'default-tree';

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#f8faf8] select-none animate-in fade-in duration-700 ease-out">
      {/* 1. Top Navbar */}
      <TopNavbar
        isAdmin={isAdmin}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onToggleAdminRole={handleToggleAdminRole}
        onOpenMyTrees={() => setIsMyTreesModalOpen(true)}
        currentTreeTitle={tree.title || (isMainTree ? 'Головне дерево' : 'Родове полотно')}
        currentTreeId={tree.id || 'my-family-tree'}
        isMainTree={isMainTree}
        onReturnToMainTree={() => handleSelectTree('my-family-tree')}
        onSelectTree={handleSelectTree}
        onCreateNewTree={handleCreateNewTree}
        onRenameTree={handleRenameTree}
        onDeleteTree={handleDeleteTree}
        onExportImage={() => setIsExportModalOpen(true)}
        personCount={personCount}
        generationCount={generationCount}
        onSyncServer={handleSyncServer}
        onForceRefreshFromCloud={handleForceRefreshFromCloud}
        syncStatus={syncStatus}
        isServerConnected={isServerConnected}
        lastSavedTime={lastSavedTime}
        onOpenAnalytics={() => setIsAnalyticsModalOpen(true)}
        onOpenReactionsModal={() => setIsReactionsModalOpen(true)}
        totalReactionsCount={totalReactionsCount}
        isCalendarOpen={isCalendarOpen}
        onToggleCalendar={() => {
          setIsCalendarOpen((prev) => !prev);
          if (!isCalendarOpen) {
            setIsSidebarOpen(false);
          }
        }}
        notifications={notifications}
        onSelectNotificationPerson={handleSelectNotificationPerson}
        onClearNotifications={handleClearNotifications}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        userPersonName={userPersonName}
        onOpenUserIdentity={() => setIsUserIdentityModalOpen(true)}
      />

      {/* 2. Interactive Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing bg-[#f8faf8] touch-none"
      >
        {/* Left Sticky Chronological Timeline Ruler */}
        {showTimeline && (
          <TimelineRuler
            ticks={timelineTicks}
            viewportY={viewport.y}
            zoom={viewport.zoom}
          />
        )}

        {/* Transformable Canvas Layer */}
        <div
          style={{
            transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
            transition: isPanning || draggingCard ? 'none' : 'transform 0.05s ease-out',
            willChange: isPanning || draggingCard ? 'transform' : 'auto',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '12000px',
            height: '12000px',
          }}
        >
          {/* Horizontal Year Guidelines across canvas */}
          {showTimeline && (
            <CanvasTimelineGuidelines
              ticks={timelineTicks}
              selectedPerson={selectedPerson}
              allPersons={tree.persons}
            />
          )}

          {/* Connection Lines (Orthogonal SVG under cards, culled with visibleBounds) */}
          <TreeConnections
            connections={connections}
            onLineClick={(connId, coords) => {
              setEditingConnectionId(connId);
              setConnectionClickCoords(coords);
            }}
            activeLineageIds={isLineageFocus && activeFocusPersonId ? lineageInfo.allLineageIds : undefined}
            hoveredPersonId={hoveredPersonId}
            visibleBounds={visibleBounds}
          />

          {/* Married Couples (Virtualised via Spatial Hash Grid O(K)) */}
          {visibleRenderUnits.couples.map((couple) => {
            const p1 = couple.person1;
            const p2 = couple.person2;

            const clan1 = getClanName(p1);
            const clan2 = getClanName(p2);
            const clanInfo1 = clanMap.get(clan1);
            const clanInfo2 = clanMap.get(clan2);

            const isHouseDimmed1 = highlightedHouseNumber !== null && p1.houseNumber !== highlightedHouseNumber;
            const isHouseDimmed2 = highlightedHouseNumber !== null && p2.houseNumber !== highlightedHouseNumber;

            const isClanDimmed1 = selectedClanFilter !== null && clan1 !== selectedClanFilter;
            const isClanDimmed2 = selectedClanFilter !== null && clan2 !== selectedClanFilter;

            const isLineageDimmed1 = Boolean(isLineageFocus && activeFocusPersonId && !lineageInfo.allLineageIds.has(p1.id));
            const isLineageDimmed2 = Boolean(isLineageFocus && activeFocusPersonId && !lineageInfo.allLineageIds.has(p2.id));

            const isDimmed1 = Boolean(isHouseDimmed1 || isClanDimmed1 || isLineageDimmed1);
            const isDimmed2 = Boolean(isHouseDimmed2 || isClanDimmed2 || isLineageDimmed2);

            const isLineageActive1 = Boolean(isLineageFocus && activeFocusPersonId && lineageInfo.allLineageIds.has(p1.id));
            const isLineageActive2 = Boolean(isLineageFocus && activeFocusPersonId && lineageInfo.allLineageIds.has(p2.id));

            const mKey = [p1.id, p2.id].sort().join('::');
            const marriageMeta = tree.connectionOverrides?.[`marriage:${mKey}`];

            return (
              <CoupleCard
                key={couple.id}
                person1={p1}
                person2={p2}
                isSelected1={selectedPersonId === p1.id}
                isSelected2={selectedPersonId === p2.id}
                isGroupSelected1={selectedPersonIds.has(p1.id)}
                isGroupSelected2={selectedPersonIds.has(p2.id)}
                onSwapSpouses={isAdmin ? handleSwapSpouses : undefined}
                onDisconnectCouple={isAdmin ? handleDisconnectCouple : undefined}
                isConnectingSource1={connectingMode?.sourceId === p1.id}
                isConnectingSource2={connectingMode?.sourceId === p2.id}
                isConnectingTarget1={connectingMode?.targetId === p1.id}
                isConnectingTarget2={connectingMode?.targetId === p2.id}
                isDimmed1={isDimmed1}
                isDimmed2={isDimmed2}
                isLineageActive1={isLineageActive1}
                isLineageActive2={isLineageActive2}
                clanInfo1={clanInfo1}
                clanInfo2={clanInfo2}
                clanMap={clanRecord}
                zoomLevel={viewport.zoom}

                onSelect={handleSelectPerson}
                onHighlightHouse={(houseNumber) => {
                  setHighlightedHouseNumber(highlightedHouseNumber === houseNumber ? null : houseNumber);
                }}
                onEdit={isAdmin ? (p) => setEditingPerson(p) : () => {}}
                onToggleChronologicalPin={isAdmin ? handleToggleChronologicalPin : undefined}
                onToggleFullyVerified={isAdmin ? handleToggleFullyVerified : undefined}
                onDragStart={isAdmin && !isLayoutLocked ? handleCardDragStart : undefined}
                onLongPress={isAdmin ? handleCardLongPress : undefined}
                onToggleReaction={handleToggleReaction}
                guestUserId={guestUserId}
                onHoverPerson={setHoveredPersonId}
                isCurrentUser1={userPersonId === p1.id}
                isCurrentUser2={userPersonId === p2.id}
                userPersonId={userPersonId}
                onOpenClanCoatOfArmsModal={(clan) => setCoatOfArmsModalClan(clan)}
                onOpenMetricModal={handleOpenMetricModal}
                onSelectTree={handleSelectTree}
              />
            );
          })}

          {/* Single Person Cards (Virtualised via Spatial Hash Grid O(K)) */}
          {visibleRenderUnits.singles.map((person) => {

            const clan = getClanName(person);
            const clanInfo = clanMap.get(clan);

            // House filter dimming
            const isHouseDimmed = highlightedHouseNumber !== null && person.houseNumber !== highlightedHouseNumber;

            // Clan filter dimming
            const isClanDimmed = selectedClanFilter !== null && clan !== selectedClanFilter;

            // Lineage focus dimming
            const isLineageDimmed = isLineageFocus && activeFocusPersonId && !lineageInfo.allLineageIds.has(person.id);

            const isDimmed = Boolean(isHouseDimmed || isClanDimmed || isLineageDimmed);
            const isLineageActive = Boolean(isLineageFocus && activeFocusPersonId && lineageInfo.allLineageIds.has(person.id));

            return (
              <FamilyCard
                key={person.id}
                person={person}
                isSelected={selectedPersonId === person.id}
                isGroupSelected={selectedPersonIds.has(person.id)}
                isConnectingSource={connectingMode?.sourceId === person.id}
                isConnectingTarget={connectingMode?.targetId === person.id}
                isDimmed={isDimmed}
                isLineageActive={isLineageActive}
                clanInfo={clanInfo}
                zoomLevel={viewport.zoom}
                onSelect={handleSelectPerson}
                onHighlightHouse={(houseNumber) => {
                  setHighlightedHouseNumber(highlightedHouseNumber === houseNumber ? null : houseNumber);
                }}
                onEdit={isAdmin ? (p) => setEditingPerson(p) : () => {}}
                onToggleChronologicalPin={isAdmin ? handleToggleChronologicalPin : undefined}
                onToggleFullyVerified={isAdmin ? handleToggleFullyVerified : undefined}
                onDragStart={isAdmin && !isLayoutLocked ? handleCardDragStart : undefined}
                onLongPress={isAdmin ? handleCardLongPress : undefined}
                onToggleReaction={handleToggleReaction}
                guestUserId={guestUserId}
                onHoverPerson={setHoveredPersonId}
                isCurrentUser={userPersonId === person.id}
                userPersonId={userPersonId}
                onOpenClanCoatOfArmsModal={(clan) => setCoatOfArmsModalClan(clan)}
                onOpenMetricModal={handleOpenMetricModal}
                onSelectTree={handleSelectTree}
              />
            );
          })}

          {/* Interactive Manual Connection Rubberband Overlay */}
          {connectingMode && (() => {
            const sourcePerson = tree.persons[connectingMode.sourceId];
            if (!sourcePerson) return null;
            const targetPerson = connectingMode.targetId ? tree.persons[connectingMode.targetId] : null;

            const startX = sourcePerson.x + CARD_WIDTH / 2;
            const startY = sourcePerson.y + CARD_HEIGHT / 2;
            const endX = targetPerson ? targetPerson.x + CARD_WIDTH / 2 : connectingMode.currentX;
            const endY = targetPerson ? targetPerson.y + CARD_HEIGHT / 2 : connectingMode.currentY;

            const midX = (startX + endX) / 2;
            const pathD = `M ${startX} ${startY} Q ${midX} ${startY - 30} ${endX} ${endY}`;

            return (
              <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ overflow: 'visible', zIndex: 45 }}
              >
                <defs>
                  <linearGradient id="connectGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Outer Glow */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="6"
                  strokeOpacity="0.4"
                  filter="url(#glow)"
                />

                {/* Dashed Connection Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#connectGradient)"
                  strokeWidth="3.5"
                  strokeDasharray="8,6"
                />

                {/* Source Anchor Pin */}
                <circle cx={startX} cy={startY} r="7" fill="#059669" stroke="#ffffff" strokeWidth="2.5" />

                {/* End Cursor / Target Anchor */}
                {targetPerson ? (
                  <g transform={`translate(${endX}, ${endY})`}>
                    <circle cx="0" cy="0" r="12" fill="#059669" stroke="#ffffff" strokeWidth="3" opacity="0.9" />
                    <circle cx="0" cy="0" r="6" fill="#ffffff" />
                    <g transform={`translate(0, ${-CARD_HEIGHT / 2 - 16})`}>
                      <rect
                        x="-70"
                        y="-12"
                        width="140"
                        height="24"
                        rx="12"
                        fill="#047857"
                        className="shadow-md"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill="#ffffff"
                        className="font-sans"
                      >
                        🔗 З'єднати з {[targetPerson.firstName, targetPerson.lastName].filter(Boolean).join(' ') || 'особою'}
                      </text>
                    </g>
                  </g>
                ) : (
                  <g transform={`translate(${endX}, ${endY})`}>
                    <circle cx="0" cy="0" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                  </g>
                )}
              </svg>
            );
          })()}

          {/* Alignment Proposals Overlay (Guide lines & Ghost landing box) */}
          {draggingCard && alignmentProposal && (
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ overflow: 'visible', zIndex: 35 }}
            >
              {/* Vertical Alignment Line */}
              {alignmentProposal.guideX !== undefined && (
                <g>
                  <line
                    x1={alignmentProposal.guideX}
                    y1={0}
                    x2={alignmentProposal.guideX}
                    y2={12000}
                    stroke={isProposalIgnored ? '#a8a29e' : '#059669'}
                    strokeWidth={isProposalIgnored ? '1' : '1.75'}
                    strokeDasharray="6,4"
                    opacity={isProposalIgnored ? '0.3' : '1'}
                  />
                  <line
                    x1={alignmentProposal.guideX + CARD_WIDTH}
                    y1={0}
                    x2={alignmentProposal.guideX + CARD_WIDTH}
                    y2={12000}
                    stroke={isProposalIgnored ? '#a8a29e' : '#059669'}
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity={isProposalIgnored ? '0.15' : '0.4'}
                  />
                </g>
              )}

              {/* Horizontal Alignment Line */}
              {alignmentProposal.guideY !== undefined && (
                <g>
                  <line
                    x1={0}
                    y1={alignmentProposal.guideY}
                    x2={12000}
                    y2={alignmentProposal.guideY}
                    stroke={isProposalIgnored ? '#a8a29e' : '#059669'}
                    strokeWidth={isProposalIgnored ? '1' : '1.75'}
                    strokeDasharray="6,4"
                    opacity={isProposalIgnored ? '0.3' : '1'}
                  />
                  <line
                    x1={0}
                    y1={alignmentProposal.guideY + CARD_HEIGHT}
                    x2={12000}
                    y2={alignmentProposal.guideY + CARD_HEIGHT}
                    stroke={isProposalIgnored ? '#a8a29e' : '#059669'}
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity={isProposalIgnored ? '0.15' : '0.4'}
                  />
                </g>
              )}

              {/* Ghost Target Box (Landing Proposal) */}
              {(() => {
                const draggedPerson = tree.persons[draggingCard.id];
                if (!draggedPerson) return null;

                const targetX =
                  !isProposalIgnored && alignmentProposal.proposedX !== undefined
                    ? alignmentProposal.proposedX
                    : draggedPerson.x;
                const targetY =
                  !isProposalIgnored && alignmentProposal.proposedY !== undefined
                    ? alignmentProposal.proposedY
                    : draggedPerson.y;

                const remainingSec = Math.max(1, Math.ceil((5000 - proposalElapsedMs) / 1000));

                return (
                  <g transform={`translate(${targetX}, ${targetY})`}>
                    <rect
                      x="0"
                      y="0"
                      width={CARD_WIDTH}
                      height={CARD_HEIGHT}
                      rx="12"
                      fill={isProposalIgnored ? '#f5f5f4' : '#ecfdf5'}
                      fillOpacity={isProposalIgnored ? '0.2' : '0.4'}
                      stroke={isProposalIgnored ? '#a8a29e' : '#059669'}
                      strokeWidth={isProposalIgnored ? '1.5' : '2'}
                      strokeDasharray="5,3"
                    />
                    <g transform={`translate(${CARD_WIDTH / 2}, ${CARD_HEIGHT + 14})`}>
                      <rect
                        x={isProposalIgnored ? '-75' : '-65'}
                        y="-10"
                        width={isProposalIgnored ? '150' : '130'}
                        height="20"
                        rx="10"
                        fill={isProposalIgnored ? '#78716c' : '#059669'}
                        className="shadow-sm"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="600"
                        fill="#ffffff"
                        className="font-sans"
                      >
                        {isProposalIgnored
                          ? '📍 Точна позиція (ваша)'
                          : `🎯 Вирівняти (${remainingSec}с)`}
                      </text>
                    </g>
                  </g>
                );
              })()}
            </svg>
          )}

          {/* Rubberband Selection Box (Marquee rectangle when holding Ctrl) */}
          {selectionBox && (() => {
            const minX = Math.min(selectionBox.startX, selectionBox.currentX);
            const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
            const minY = Math.min(selectionBox.startY, selectionBox.currentY);
            const maxY = Math.max(selectionBox.startY, selectionBox.currentY);
            const width = Math.max(2, maxX - minX);
            const height = Math.max(2, maxY - minY);
            return (
              <div
                style={{
                  position: 'absolute',
                  left: `${minX}px`,
                  top: `${minY}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  border: '1.5px dashed #059669',
                  backgroundColor: 'rgba(5, 150, 105, 0.12)',
                  pointerEvents: 'none',
                  zIndex: 48,
                  borderRadius: '6px',
                }}
              />
            );
          })()}
        </div>

        {/* Empty Canvas State when there are no cards */}
        {personCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 z-30">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200/90 shadow-2xl p-8 max-w-md w-full text-center pointer-events-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm">
                <FolderTree size={32} strokeWidth={1.75} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-900 font-serif-heritage">
                  Порожнє родове дерево
                </h2>
                <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                  Створіть свій родовід, додавайте родичів та діліться доступом з сім'єю.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  onClick={() => {
                    if (!isAdmin) {
                      setIsAuthModalOpen(true);
                    } else {
                      setAddingRelativeTarget({ target: null, initialType: 'child' });
                    }
                  }}
                  className="w-full py-3.5 px-5 rounded-2xl bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white text-sm font-semibold flex items-center justify-center gap-2.5 shadow-md shadow-stone-900/10 transition-all cursor-pointer"
                >
                  <span>Почати нове дерево (додати особу)</span>
                </button>

                {isAdmin && (
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button
                      onClick={() => setAddingRelativeTarget({ target: null, initialType: 'child' })}
                      className="text-xs font-medium text-stone-600 hover:text-emerald-800 transition-colors"
                    >
                      + Додати особу вручну
                    </button>
                    <span className="text-stone-300">•</span>
                    <button
                      onClick={handleLoadDemo}
                      className="text-xs font-medium text-stone-600 hover:text-emerald-800 transition-colors"
                    >
                      Приклад дерева
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Multi-Selection Floating Info Pill */}
        {isAdmin && selectedPersonIds.size > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="bg-stone-900/95 text-stone-100 text-xs font-medium px-4 py-2 rounded-full shadow-xl border border-stone-700 flex items-center gap-3 backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/40" />
              <span>
                Виділено: <strong className="text-white font-bold">{selectedPersonIds.size}</strong> карток (переміщуються разом)
              </span>
              <button
                onClick={() => setSelectedPersonIds(new Set())}
                className="ml-1 text-[11px] text-amber-300 hover:text-amber-200 underline font-bold cursor-pointer"
                title="Натисніть Esc або сюди для скасування виділення"
              >
                Зняти виділення (Esc)
              </button>
            </div>
          </div>
        )}



        {/* Connection Mode Top Hint Toast */}
        {connectingMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="bg-emerald-900/95 text-emerald-50 text-xs font-medium px-4 py-2.5 rounded-full shadow-lg border border-emerald-500/40 flex items-center gap-2.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Режим ручного зв'язку: проведіть лінію до бажаної картки та відпустіть</span>
            </div>
          </div>
        )}

        {/* Floating Nearest Calendar Event Widget */}
        {showCalendarWidget && nearestCalendarEvent && (
          <div className="absolute top-4 right-4 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
            <div
              onClick={() => {
                centerOnPerson(nearestCalendarEvent.person.id);
              }}
              className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/90 shadow-lg p-2.5 sm:p-3 flex items-center gap-3 cursor-pointer hover:border-emerald-400 hover:shadow-xl transition-all group max-w-[280px] sm:max-w-[320px]"
              title="Натисніть для переходу до особи на дереві"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                  nearestCalendarEvent.daysUntil === 0
                    ? 'bg-amber-500 text-white animate-bounce'
                    : nearestCalendarEvent.type === 'birth'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-stone-800 text-stone-100'
                }`}
              >
                {nearestCalendarEvent.type === 'birth' ? (
                  <Cake size={18} />
                ) : (
                  <Flame size={18} />
                )}
              </div>

              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1 truncate">
                    <span>
                      {nearestCalendarEvent.type === 'birth' ? 'Дн. народження' : 'День пам’яті'}
                    </span>
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                      nearestCalendarEvent.daysUntil === 0
                        ? 'bg-amber-500 text-white'
                        : nearestCalendarEvent.daysUntil === 1
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {nearestCalendarEvent.daysUntil === 0
                      ? 'Сьогодні'
                      : nearestCalendarEvent.daysUntil === 1
                      ? 'Завтра'
                      : `через ${nearestCalendarEvent.daysUntil} дн.`}
                  </span>
                </div>

                <p className="text-xs font-bold text-stone-900 group-hover:text-emerald-900 truncate mt-0.5">
                  {nearestCalendarEvent.person.firstName} {nearestCalendarEvent.person.lastName}
                </p>

                <p className="text-[10.5px] text-stone-500 font-medium truncate mt-0.5">
                  {nearestCalendarEvent.dateStr}
                  {nearestCalendarEvent.ageOrYearsAgo !== undefined && (
                    <span className="text-stone-400 font-mono text-[9.5px] ml-1">
                      ({nearestCalendarEvent.type === 'birth' ? `${nearestCalendarEvent.ageOrYearsAgo} р.` : `${nearestCalendarEvent.ageOrYearsAgo} р. тому`})
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCalendarWidget(false);
                  localStorage.setItem('family_tree_show_calendar_widget', 'false');
                }}
                className="text-stone-300 hover:text-stone-600 p-1 rounded-md transition-colors shrink-0"
                title="Сховати віджет з екрану"
              >
                <CloseIcon size={13} />
              </button>
            </div>
          </div>
        )}

        {/* 3. Bottom Controls Toolbar */}
        <CanvasControls
          zoom={viewport.zoom}
          onZoomIn={() => handleZoom(0.1)}
          onZoomOut={() => handleZoom(-0.1)}
          onResetZoom={() => setViewport((prev) => ({ ...prev, zoom: 1 }))}
          onFitToContent={fitToContent}
          onCenterOnFirstPerson={handleCenterOnFirstPerson}
          showTimeline={showTimeline}
          onToggleTimeline={() => setShowTimeline(!showTimeline)}
          showMiniMap={showMiniMap}
          onToggleMiniMap={() => setShowMiniMap((prev) => !prev)}
          persons={tree.persons}
          onSelectAndCenter={centerOnPerson}
          onOpenMyTrees={() => setIsMyTreesModalOpen(true)}
          onUndo={handleUndo}
          canUndo={historyStack.length > 0}
          isLineageFocus={isLineageFocus}
          onToggleLineageFocus={() => {
            setIsLineageFocus((prev) => {
              const next = !prev;
              if (next) {
                const targetId = selectedPersonId || focusPersonId || Object.keys(tree.persons)[0] || null;
                setFocusPersonId(targetId);
                if (targetId && !selectedPersonId) {
                  setSelectedPersonId(targetId);
                }
              }
              return next;
            });
          }}
          selectedPersonName={
            activeFocusPersonId && tree.persons[activeFocusPersonId]
              ? `${tree.persons[activeFocusPersonId].firstName} ${tree.persons[activeFocusPersonId].lastName}`
              : undefined
          }
          selectedClanFilter={selectedClanFilter}
          onSelectClanFilter={setSelectedClanFilter}
          clanList={clanList}
          selectedCount={selectedPersonIds.size}
          onClearSelection={() => setSelectedPersonIds(new Set())}
          hasUserPerson={!!userPersonId}
          isLayoutLocked={isLayoutLocked}
          onToggleLockLayout={handleToggleLockLayout}
        />
      </div>

      {/* 4. Inspector Sidebar */}
      <DetailsSidebar
        person={selectedPerson}
        allPersons={tree.persons}
        isOpen={isSidebarOpen && !!selectedPerson}
        isAdmin={isAdmin}
        userPersonId={userPersonId}
        onSetUserPersonId={(id) => handleSaveUserIdentity(id)}
        onClose={() => setIsSidebarOpen(false)}
        onEdit={(p) => setEditingPerson(p)}
        onDelete={handleDeletePerson}
        onAddRelative={(target, relationType) => {
          setAddingRelativeTarget({ target, initialType: relationType });
        }}
        onSelectPerson={centerOnPerson}
        onToggleRelationVerification={handleToggleRelationVerification}
        onToggleFullyVerified={isAdmin ? handleToggleFullyVerified : undefined}
        onAlignChronologically={handleAlignChronologically}
        onToggleChronologicalPin={handleToggleChronologicalPin}
        onOpenConnectModal={(p) => setConnectingPerson(p)}
        onOpenMetricModal={handleOpenMetricModal}
        onDisconnectSpouse={isAdmin ? handleDisconnectCouple : undefined}
        onEditMarriageConnection={(connId) => {
          setEditingConnectionId(connId);
        }}
        connectionOverrides={tree.connectionOverrides}
        copiedCardColor={copiedCardColor}
        onCopyColor={(hex) => setCopiedCardColor(hex)}
        onPasteColor={(personId) => {
          if (copiedCardColor) {
            setTree((prev) => ({
              ...prev,
              persons: {
                ...prev.persons,
                [personId]: {
                  ...prev.persons[personId],
                  cardBgColor: copiedCardColor,
                },
              },
            }));
          }
        }}
        onSetCardColor={(personId, color) => {
          setTree((prev) => {
            const p = prev.persons[personId];
            if (!p) return prev;
            return {
              ...prev,
              persons: {
                ...prev.persons,
                [personId]: {
                  ...p,
                  cardBgColor: color,
                },
              },
            };
          });
        }}
        onUpdatePerson={handleSavePerson}
        clanMap={clanRecord}
        onOpenClanCoatOfArmsModal={(clan) => setCoatOfArmsModalClan(clan)}
        onDeleteReaction={handleDeleteReaction}
        onOpenReactionsModal={() => setIsReactionsModalOpen(true)}
      />

      {/* 4.5. Dates & Anniversaries Calendar Sidebar (Birthdays and Deaths) */}
      <DatesCalendarSidebar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        allPersons={tree.persons}
        onSelectPerson={(personId) => {
          centerOnPerson(personId);
          setIsCalendarOpen(false);
        }}
        showWidget={showCalendarWidget}
        onToggleWidget={() => {
          setShowCalendarWidget((prev) => {
            const next = !prev;
            localStorage.setItem('family_tree_show_calendar_widget', String(next));
            return next;
          });
        }}
      />

      {/* 5. Modals */}
      {addingRelativeTarget && (
        <AddRelativeModal
          targetPerson={addingRelativeTarget.target}
          initialType={addingRelativeTarget.initialType}
          isOpen={!!addingRelativeTarget}
          onClose={() => setAddingRelativeTarget(null)}
          onAdd={handleAddRelativeConfirm}
          allPersons={tree.persons}
          connectionOverrides={tree.connectionOverrides}
        />
      )}

      {editingPerson && (
        <EditPersonModal
          person={editingPerson}
          allPersons={tree.persons}
          isOpen={!!editingPerson}
          onDelete={handleDeletePerson}
          onClose={() => {
            if (editingPerson) {
              setTree((prev) => {
                const existing = prev.persons[editingPerson.id];
                if (existing && (!existing.firstName.trim() || existing.firstName === 'Нова особа') && !existing.lastName.trim()) {
                  const { [editingPerson.id]: _, ...rest } = prev.persons;
                  return {
                    ...prev,
                    persons: rest,
                    selectedPersonId: prev.selectedPersonId === editingPerson.id ? null : prev.selectedPersonId,
                  };
                }
                return prev;
              });
              if (selectedPersonId === editingPerson.id) {
                setSelectedPersonId(null);
                setIsSidebarOpen(false);
              }
            }
            setEditingPerson(null);
          }}
          onSave={handleSavePerson}
        />
      )}

      {editingConnectionId && (
        <EditConnectionModal
          connectionId={editingConnectionId}
          initialMeta={tree.connectionOverrides?.[editingConnectionId]}
          isCurrentlyVerified={
            connections.find((c) => c.id === editingConnectionId)?.isVerified ??
            (tree.connectionOverrides?.[editingConnectionId]?.verified ?? true)
          }
          connectionLabel={(() => {
            const conn = connections.find((c) => c.id === editingConnectionId);
            if (!conn) return undefined;
            if (conn.type === 'marriage') {
              const p1 = tree.persons[conn.fromId || ''];
              const p2 = tree.persons[conn.toId || ''];
              if (p1 && p2) return `${p1.firstName} ${p1.lastName} та ${p2.firstName} ${p2.lastName}`;
            }
            if (conn.type === 'child-branch') {
              const childId = conn.id.split(':').pop() || '';
              const child = tree.persons[childId];
              if (child) return `Дитина: ${child.firstName} ${child.lastName}`;
            }
            return undefined;
          })()}
          isOpen={!!editingConnectionId}
          onClose={() => {
            setEditingConnectionId(null);
            setConnectionClickCoords(null);
          }}
          onSave={handleSaveConnectionMeta}
        />
      )}

      {connectingPerson && (
        <ConnectPersonsModal
          sourcePerson={connectingPerson}
          allPersons={tree.persons}
          isOpen={!!connectingPerson}
          initialTargetId={preselectedTargetId || undefined}
          onClose={() => {
            setConnectingPerson(null);
            setPreselectedTargetId(null);
          }}
          onConnect={(targetId, relType, options) => {
            handleConnectPersons(targetId, relType, options);
            setPreselectedTargetId(null);
          }}
        />
      )}

      {isExportModalOpen && (
        <ExportModal
          tree={tree}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExportPng={handleExportPng}
          onExportSvg={handleExportSvg}
        />
      )}



      {/* Analytics & Statistics Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        persons={tree.persons}
        generations={generationsMap}
        clanList={clanList}
        onSelectPerson={centerOnPerson}
        onFilterClan={(clan) => setSelectedClanFilter(clan)}
      />

      {/* Clan Coat of Arms Modal (Upload or Generate Clan Crest) */}
      {coatOfArmsModalClan && (
        <ClanCoatOfArmsModal
          isOpen={!!coatOfArmsModalClan}
          onClose={() => setCoatOfArmsModalClan(null)}
          clan={coatOfArmsModalClan}
          isAdmin={isAdmin}
          onSaveCoatOfArms={handleSaveClanCoatOfArms}
        />
      )}

      {/* Metric Document Modal */}
      {metricModalTarget && (
        <MetricModal
          person={metricModalTarget.person}
          isOpen={!!metricModalTarget}
          initialTab={metricModalTarget.tab || 'birth'}
          onClose={() => setMetricModalTarget(null)}
          onSave={handleSaveMetricPerson}
        />
      )}

      {/* 6. Admin Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isAdmin={isAdmin}
        onLoginAsAdmin={handleLoginAsAdmin}
        onSwitchToGuest={handleSwitchToGuest}
      />

      {/* 8. User Identity Modal (Who are you in this tree) */}
      <UserIdentityModal
        isOpen={isUserIdentityModalOpen}
        onClose={() => {
          localStorage.setItem('family_tree_user_prompted', 'true');
          setIsUserIdentityModalOpen(false);
        }}
        allPersons={tree.persons}
        currentUserPersonId={userPersonId}
        currentCustomName={customUserName}
        onSaveIdentity={handleSaveUserIdentity}
      />

      {/* 9. Reactions & Feedback Manager Modal for Tree Owner */}
      <ReactionsModal
        isOpen={isReactionsModalOpen}
        onClose={() => setIsReactionsModalOpen(false)}
        tree={tree}
        isAdmin={isAdmin}
        onDeleteReaction={handleDeleteReaction}
        onClearAllReactions={handleClearAllReactions}
        onSelectPerson={centerOnPerson}
      />



      {/* 11. My Canvases & Branches Modal */}
      <MyTreesModal
        isOpen={isMyTreesModalOpen}
        onClose={() => setIsMyTreesModalOpen(false)}
        currentTreeId={tree.id || 'default-tree'}
        currentTree={tree}
        onSelectTree={handleSelectTree}
        onCreateNewTree={handleCreateNewTree}
        onCloneTree={handleCloneTree}
        isAdmin={isAdmin}
        onRenameTree={handleRenameTree}
      />

      {/* 15. Floating Batch Selection & Clipboard Toolbar */}
      {isAdmin && (selectedPersonIds.size > 0 || clipboardCount > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-stone-900/95 text-white border border-stone-700/80 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs animate-in slide-in-from-bottom duration-200 select-none max-w-[95vw] overflow-x-auto no-scrollbar">
          {selectedPersonIds.size > 0 ? (
            <>
              <div className="flex items-center gap-1.5 font-bold text-amber-400 shrink-0">
                <Users size={15} />
                <span>Виділено: {selectedPersonIds.size} осіб</span>
              </div>

              <div className="h-4 w-px bg-stone-700 shrink-0" />

              <button
                onClick={handleCopySelectedPersons}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 shadow-2xs"
                title="Скопіювати виділені особи у буфер (Ctrl+C)"
              >
                <Copy size={13} />
                <span>Скопіювати</span>
              </button>

              <button
                onClick={() => {
                  const allIds = new Set(Object.keys(tree.persons));
                  setSelectedPersonIds(allIds);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                <span>Виділити все</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => {
                    if (!window.confirm(`Видалити виділені ${selectedPersonIds.size} осіб?`)) return;
                    setTree((prev) => {
                      const nextPersons = { ...prev.persons };
                      selectedPersonIds.forEach((id) => delete nextPersons[id]);
                      return { ...prev, persons: nextPersons };
                    });
                    setSelectedPersonIds(new Set());
                    showToast({
                      type: 'info',
                      title: 'Картки видалено',
                      message: `Видалено ${selectedPersonIds.size} осіб.`,
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-medium flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  title="Видалити всі виділені картки з цього дерева"
                >
                  <Trash2 size={13} />
                  <span>Видалити</span>
                </button>
              )}

              <button
                onClick={() => setSelectedPersonIds(new Set())}
                className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer shrink-0"
                title="Скасувати виділення (Esc)"
              >
                <CloseIcon size={15} />
              </button>
            </>
          ) : null}

          {clipboardCount > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {selectedPersonIds.size > 0 && <div className="h-4 w-px bg-stone-700 shrink-0 mr-1" />}
              <button
                onClick={handlePasteCopiedBuffer}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 shadow-2xs"
                title="Вставити скопійовані картки на це полотно (Ctrl+V)"
              >
                <Clipboard size={14} />
                <span>Вставити скопійовані ({clipboardCount})</span>
              </button>
              <button
                type="button"
                onClick={handleCancelCopyClipboard}
                className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Скасувати копіювання (очистити буфер)"
                aria-label="Скасувати копіювання"
              >
                <CloseIcon size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 11. Keyboard Shortcuts & User Help Modal */}
      <ShortcutsHelpModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* 12. Interactive Radar Mini-Map Navigation */}
      {showMiniMap && (
        <MiniMap
          persons={tree.persons}
          viewport={viewport}
          containerSize={containerSize}
          onNavigate={(newX, newY) => {
            setViewport((prev) => ({ ...prev, x: newX, y: newY }));
          }}
          onClose={() => setShowMiniMap(false)}
        />
      )}

      {/* 13. Toast Notifications Container (Non-blocking in-app alerts) */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

