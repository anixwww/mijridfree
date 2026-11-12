import { FamilyTreeData, Person } from '../types/tree';
import { authHeaders, getAuthToken, handleUnauthorized } from './auth';
import { getTreeById, saveTreeToFirestore } from './firestoreTreeService';
import { parseGedcomText, parseCsvText } from './gedcomParser';

const LOCAL_STORAGE_KEY = 'rodovid_family_tree_v2';

export const MAIN_TREE_ID = 'my-family-tree';

export interface LocalTreeIndexItem {
  id: string;
  title: string;
  personCount: number;
  updatedAt: string;
  isMain?: boolean;
}

/**
 * Saves tree data to browser's localStorage, server API, and Firestore cloud database
 */
export async function saveTreeToLocalStorage(tree: FamilyTreeData): Promise<boolean> {
  const treeId = tree.id || MAIN_TREE_ID;
  const isMainTree = treeId === MAIN_TREE_ID || treeId === 'default-tree' || treeId === 'main-tree';

  const enriched: FamilyTreeData = {
    ...tree,
    id: isMainTree ? MAIN_TREE_ID : treeId,
    title: tree.title || (isMainTree ? 'Головне родове дерево' : 'Родове полотно'),
    version: tree.version || 'v0.1',
    updatedAt: new Date().toISOString(),
  };

  const serialized = JSON.stringify(enriched);

  // 1. Save specific tree by ID in localStorage
  try {
    localStorage.setItem(`rodovid_tree_${enriched.id}`, serialized);
    if (isMainTree) {
      localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    }
  } catch (err) {
    console.warn('LocalStorage save failed for tree ID:', enriched.id, err);
  }

  // 2. Update local trees index in localStorage
  try {
    const rawIndex = localStorage.getItem('rodovid_local_trees_index');
    let list: LocalTreeIndexItem[] = rawIndex ? JSON.parse(rawIndex) : [];
    
    const existingIndex = list.findIndex((item) => item.id === enriched.id);
    const itemMeta: LocalTreeIndexItem = {
      id: enriched.id,
      title: enriched.title,
      personCount: Object.keys(enriched.persons || {}).length,
      updatedAt: enriched.updatedAt,
      isMain: isMainTree,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = itemMeta;
    } else {
      list.unshift(itemMeta);
    }
    localStorage.setItem('rodovid_local_trees_index', JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to update rodovid_local_trees_index:', err);
  }

  // 3. Save to Firestore Cloud Database (ensures persistence across devices, tabs, and container restarts)
  try {
    await saveTreeToFirestore(
      enriched.id,
      enriched,
      'admin',
      'Адміністратор',
      true
    );
  } catch (err) {
    console.warn('Failed to persist tree to Firestore cloud:', err);
  }

  // 4. Sync to local Express server API
  try {
    const endpoint = isMainTree ? '/api/tree' : `/api/tree/${encodeURIComponent(enriched.id)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: serialized,
    });
    if (!res.ok) {
      console.warn('Server responded with error status for tree save:', res.status);
    }
    return true;
  } catch (err) {
    console.warn('Failed to sync tree to server backend (Firestore backup active):', err);
    return true; // Return true because Firestore cloud save succeeded
  }
}

/**
 * Checks whether the server backend is online and reachable
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json && json.success);
  } catch {
    return false;
  }
}

/**
 * Loads tree data from Firestore cloud database first, falling back to server API and localStorage
 */
export async function loadTreeFromServerOrStorage(): Promise<FamilyTreeData | null> {
  // 1. Attempt loading from Firestore cloud database first (guarantees cross-device sync & container restart resilience)
  try {
    const cloudTree = await getTreeById(MAIN_TREE_ID);
    if (cloudTree && cloudTree.persons && Object.keys(cloudTree.persons).length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudTree));
      } catch {}
      return cloudTree;
    }
  } catch (err) {
    console.warn('Firestore cloud tree fetch failed, falling back to server API:', err);
  }

  // 2. Attempt loading from local server persistent database storage
  try {
    const res = await fetch('/api/tree');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data && json.data.persons && Object.keys(json.data.persons).length > 0) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.data));
          // Back up to Firestore cloud
          await saveTreeToFirestore(MAIN_TREE_ID, json.data, 'admin', 'Адміністратор', true);
        } catch {}
        return json.data as FamilyTreeData;
      }
    }
  } catch (err) {
    console.warn('Server tree fetch failed, falling back to localStorage:', err);
  }

  // 3. Fallback to localStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.persons) {
      return data as FamilyTreeData;
    }
  } catch (err) {
    console.warn('Failed to parse localStorage data:', err);
  }
  return null;
}

/**
 * Loads a tree by its ID from Firestore cloud, server, or local storage
 */
export async function loadTreeById(treeId: string): Promise<FamilyTreeData | null> {
  const isMain = treeId === MAIN_TREE_ID || treeId === 'default-tree' || treeId === 'main-tree';

  // 1. Try Firestore cloud first
  try {
    const cloudTree = await getTreeById(treeId);
    if (cloudTree && cloudTree.persons) {
      try {
        localStorage.setItem(`rodovid_tree_${treeId}`, JSON.stringify(cloudTree));
      } catch {}
      return cloudTree;
    }
  } catch {}

  // If Main Tree, try server or LOCAL_STORAGE_KEY
  if (isMain) {
    const mainTree = await loadTreeFromServerOrStorage();
    if (mainTree) return mainTree;
  } else {
    // Try server sub-canvas endpoint
    try {
      const res = await fetch(`/api/tree/${encodeURIComponent(treeId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          try {
            localStorage.setItem(`rodovid_tree_${treeId}`, JSON.stringify(json.data));
            await saveTreeToFirestore(treeId, json.data, 'admin', 'Адміністратор', true);
          } catch {}
          return json.data as FamilyTreeData;
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch tree ${treeId} from server:`, err);
    }
  }

  // Check specific local storage key rodovid_tree_<id>
  try {
    const raw = localStorage.getItem(`rodovid_tree_${treeId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.persons) {
        return parsed as FamilyTreeData;
      }
    }
  } catch (err) {
    console.warn(`Failed to parse rodovid_tree_${treeId}:`, err);
  }

  return null;
}

/**
 * Synchronizes targetCanvasTitle on person cards with the latest actual canvas titles
 */
export function syncCrossCanvasLinkTitles(
  treeData: FamilyTreeData,
  availableTrees: Array<{ id: string; title: string }>
): FamilyTreeData {
  if (!treeData || !treeData.persons || Object.keys(treeData.persons).length === 0) {
    return treeData;
  }

  const titleMap = new Map<string, string>();
  availableTrees.forEach((t) => {
    if (t.id && t.title) {
      titleMap.set(t.id, t.title);
      if (t.id === MAIN_TREE_ID || t.id === 'main-tree' || t.id === 'default-tree') {
        titleMap.set(MAIN_TREE_ID, t.title);
        titleMap.set('main-tree', t.title);
        titleMap.set('default-tree', t.title);
      }
    }
  });

  let changed = false;
  const updatedPersons: Record<string, Person> = { ...treeData.persons };

  Object.keys(updatedPersons).forEach((personId) => {
    const p = updatedPersons[personId];
    if (p && p.targetCanvasId) {
      const latestTitle = titleMap.get(p.targetCanvasId);
      if (latestTitle && p.targetCanvasTitle !== latestTitle) {
        updatedPersons[personId] = {
          ...p,
          targetCanvasTitle: latestTitle,
        };
        changed = true;
      }
    }
  });

  if (!changed) return treeData;
  return {
    ...treeData,
    persons: updatedPersons,
  };
}

/**
 * Fetches all tree / canvas metadata from server API & Firestore
 */
export async function fetchServerTrees(): Promise<LocalTreeIndexItem[]> {
  try {
    const res = await fetch('/api/trees');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.trees)) {
        return json.trees as LocalTreeIndexItem[];
      }
    }
  } catch (err) {
    console.warn('Failed to fetch trees list from server:', err);
  }
  return [];
}

/**
 * Deletes a tree by ID from server, Firestore, and local storage
 */
export async function deleteTreeFromServerOrStorage(treeId: string): Promise<boolean> {
  const isMain = treeId === MAIN_TREE_ID || treeId === 'default-tree' || treeId === 'main-tree';
  if (isMain) return false;

  // 1. Delete from local storage
  try {
    localStorage.removeItem(`rodovid_tree_${treeId}`);
    const rawIndex = localStorage.getItem('rodovid_local_trees_index');
    if (rawIndex) {
      const list: LocalTreeIndexItem[] = JSON.parse(rawIndex);
      const filtered = list.filter((t) => t.id !== treeId);
      localStorage.setItem('rodovid_local_trees_index', JSON.stringify(filtered));
    }
  } catch (err) {
    console.warn('Failed to remove tree from local storage:', err);
  }

  // 2. Delete from Firestore cloud
  try {
    const { deleteTreeFromFirestore } = await import('./firestoreTreeService');
    await deleteTreeFromFirestore(treeId);
  } catch (err) {
    console.warn('Failed to delete tree from Firestore:', err);
  }

  // 3. Delete from server
  try {
    const res = await fetch(`/api/tree/${encodeURIComponent(treeId)}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete tree from server:', err);
    return false;
  }
}

/**
 * Renames a secondary tree by ID on server, Firestore, and in local storage
 */
export async function renameTreeOnServerOrStorage(treeId: string, newTitle: string): Promise<boolean> {
  const isMain = treeId === MAIN_TREE_ID || treeId === 'default-tree' || treeId === 'main-tree';
  if (isMain || !newTitle.trim()) return false;
  const cleanTitle = newTitle.trim();

  // 1. Update local storage for this tree if cached
  try {
    const rawTree = localStorage.getItem(`rodovid_tree_${treeId}`);
    if (rawTree) {
      const parsed = JSON.parse(rawTree);
      parsed.title = cleanTitle;
      parsed.updatedAt = new Date().toISOString();
      localStorage.setItem(`rodovid_tree_${treeId}`, JSON.stringify(parsed));
      // Save back to Firestore
      await saveTreeToFirestore(treeId, parsed, 'admin', 'Адміністратор', true);
    }

    const rawIndex = localStorage.getItem('rodovid_local_trees_index');
    if (rawIndex) {
      const list: LocalTreeIndexItem[] = JSON.parse(rawIndex);
      const updated = list.map((t) => (t.id === treeId ? { ...t, title: cleanTitle, updatedAt: new Date().toISOString() } : t));
      localStorage.setItem('rodovid_local_trees_index', JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Failed to update renamed tree in local storage:', err);
  }

  // 2. Call server endpoint
  try {
    const res = await fetch(`/api/tree/${encodeURIComponent(treeId)}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ title: cleanTitle }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to rename tree on server:', err);
    return false;
  }
}

/**
 * Synchronous loader for initial render fallback
 */
export function loadTreeFromLocalStorage(): FamilyTreeData | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.persons) {
      return data as FamilyTreeData;
    }
  } catch (err) {
    console.warn('Failed to parse localStorage data:', err);
  }
  return null;
}

/**
 * Downloads the family tree as a JSON file directly onto the user's computer
 */
export function downloadTreeJson(tree: FamilyTreeData, filename?: string): void {
  const cleanTitle = (tree.title || 'родовід')
    .toLowerCase()
    .replace(/[^a-zа-яіїєґ0-9]/gi, '_')
    .replace(/_+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const finalFileName = filename || `${cleanTitle}_${dateStr}.json`;

  const blob = new Blob([JSON.stringify(tree, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Reads and parses a tree file (.json, .ged, .gedcom, .csv) uploaded from the user's computer
 */
export function parseTreeJsonFile(file: File): Promise<FamilyTreeData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawText = (event.target?.result as string) || '';
        const cleanText = rawText.replace(/^\uFEFF/, '').trim();
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (ext === 'ged' || ext === 'gedcom' || cleanText.startsWith('0 HEAD') || cleanText.includes('0 @I')) {
          const data = parseGedcomText(cleanText, file.name);
          resolve(data);
          return;
        }
        if (ext === 'csv') {
          const data = parseCsvText(cleanText, file.name);
          resolve(data);
          return;
        }
        // Default: try JSON format
        try {
          const data = JSON.parse(cleanText) as FamilyTreeData;
          if (data && typeof data === 'object' && data.persons) {
            Object.keys(data.persons).forEach((id) => {
              const p = data.persons[id];
              if (!p) return;
              if (typeof p.firstName === 'string') p.firstName = p.firstName.trim();
              if (typeof p.lastName === 'string') p.lastName = p.lastName.trim();
              if (typeof p.nickname === 'string') p.nickname = p.nickname.trim();
              if (typeof p.maidenName === 'string') p.maidenName = p.maidenName.trim();
              if (typeof p.patronymic === 'string') p.patronymic = p.patronymic.trim();
              if (typeof p.birthDate === 'string') p.birthDate = p.birthDate.trim();
              if (typeof p.birthYear === 'string') p.birthYear = p.birthYear.trim();
              if (typeof p.birthDay === 'string') p.birthDay = p.birthDay.trim();
              if (typeof p.birthMonth === 'string') p.birthMonth = p.birthMonth.trim();
              if (typeof p.deathDate === 'string') p.deathDate = p.deathDate.trim();
              if (typeof p.deathYear === 'string') p.deathYear = p.deathYear.trim();
              if (typeof p.deathDay === 'string') p.deathDay = p.deathDay.trim();
              if (typeof p.deathMonth === 'string') p.deathMonth = p.deathMonth.trim();
              if (typeof p.yearsDisplay === 'string') p.yearsDisplay = p.yearsDisplay.trim();
              if (typeof p.birthPlace === 'string') p.birthPlace = p.birthPlace.trim();
              if (typeof p.deathPlace === 'string') p.deathPlace = p.deathPlace.trim();
              if (typeof p.residencePlace === 'string') p.residencePlace = p.residencePlace.trim();
              if (typeof p.clanName === 'string') p.clanName = p.clanName.trim();
              if (typeof p.x !== 'number' || isNaN(p.x)) p.x = 0;
              if (typeof p.y !== 'number' || isNaN(p.y)) p.y = 0;
              if (!Array.isArray(p.parents)) p.parents = [];
              if (!Array.isArray(p.spouses)) p.spouses = [];
              if (!Array.isArray(p.children)) p.children = [];
            });
            resolve(data);
            return;
          }
        } catch {
          if (cleanText.includes('0 ') || cleanText.includes('INDI')) {
            const data = parseGedcomText(cleanText, file.name);
            resolve(data);
            return;
          }
        }
        throw new Error('Не вдалося розпізнати формат файлу.');
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Не вдалося прочитати файл з диска'));
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Помилка читання зображення'));
    reader.readAsDataURL(file);
  });
}

export async function compressImageFile(
  file: File,
  maxDimension = 2560,
  quality = 0.95,
  isDocument = false
): Promise<string> {
  if (!file.type.startsWith('image/') || file.type.includes('svg')) {
    return readFileAsDataUrl(file);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const resultStr = e.target?.result as string;
      if (!resultStr) {
        resolve('');
        return;
      }
      if ((isDocument || file.size <= 5 * 1024 * 1024) && file.size <= 12 * 1024 * 1024) {
        resolve(resultStr);
        return;
      }
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension) {
          resolve(resultStr);
          return;
        }
        const effectiveMax = isDocument ? Math.max(maxDimension, 2560) : maxDimension;
        if (width > height) {
          if (width > effectiveMax) {
            height = Math.round((height * effectiveMax) / width);
            width = effectiveMax;
          }
        } else {
          if (height > effectiveMax) {
            width = Math.round((width * effectiveMax) / height);
            height = effectiveMax;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(resultStr);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = '';
        try {
          dataUrl = canvas.toDataURL('image/jpeg', isDocument ? 0.96 : quality);
        } catch {
          dataUrl = canvas.toDataURL('image/png');
        }
        resolve(dataUrl || resultStr);
      };
      img.onerror = () => resolve(resultStr);
      img.src = resultStr;
    };
    reader.onerror = () => {
      readFileAsDataUrl(file).then(resolve).catch(() => resolve(''));
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadFileToServer(
  file: File,
  options?: { isDocument?: boolean; maxDimension?: number; quality?: number }
): Promise<string> {
  const fileNameLower = file.name.toLowerCase();
  const isDoc =
    options?.isDocument ??
    (fileNameLower.includes('doc') ||
      fileNameLower.includes('metric') ||
      fileNameLower.includes('birth') ||
      fileNameLower.includes('death') ||
      fileNameLower.includes('cert') ||
      fileNameLower.includes('метрика') ||
      fileNameLower.includes('документ') ||
      fileNameLower.includes('свідоцтво'));
  const maxDim = options?.maxDimension ?? (isDoc ? 2560 : 2048);
  const qual = options?.quality ?? (isDoc ? 0.96 : 0.92);
  const dataUrl = await compressImageFile(file, maxDim, qual, isDoc);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ image: dataUrl, filename: file.name }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.url) {
        return json.url;
      }
    }
  } catch (err) {
    console.warn('Server upload failed, falling back to local base64 dataUrl:', err);
  }
  return dataUrl;
}
