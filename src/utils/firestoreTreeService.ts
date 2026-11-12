/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { FamilyTreeData } from '../types/tree';

export interface TreeMetaItem {
  id: string;
  ownerId: string;
  ownerName?: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  personCount?: number;
  createdAt: string;
  updatedAt: string;
  isMain?: boolean;
}

export interface TreeDocumentRecord extends TreeMetaItem {
  treeDataJson: string;
}

/**
 * Fetch all trees owned by a user (fails gracefully if permissions restricted)
 */
export async function getUserTrees(userId: string): Promise<TreeMetaItem[]> {
  try {
    const q = query(collection(db, 'trees'), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    const trees: TreeMetaItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      trees.push({
        id: docSnap.id,
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        title: data.title || 'Моє родове дерево',
        description: data.description,
        isPublic: data.isPublic ?? false,
        personCount: data.personCount ?? (data.treeDataJson ? Object.keys(JSON.parse(data.treeDataJson)?.persons || {}).length : 0),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    return trees.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error: any) {
    console.warn('getUserTrees Firestore warning:', error?.message || error);
    return [];
  }
}

/**
 * Fetch a specific tree by ID with full data (fails gracefully if permissions restricted)
 */
export async function getTreeById(treeId: string): Promise<FamilyTreeData | null> {
  try {
    const docRef = doc(db, 'trees', treeId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (data.treeDataJson) {
      const parsed = JSON.parse(data.treeDataJson) as FamilyTreeData;
      parsed.id = treeId;
      parsed.title = data.title || parsed.title;
      return parsed;
    }
    return null;
  } catch (error: any) {
    console.warn(`getTreeById (${treeId}) Firestore warning:`, error?.message || error);
    return null;
  }
}

/**
 * Save or create a family tree in Firestore (fails gracefully if permissions restricted)
 */
export async function saveTreeToFirestore(
  treeId: string,
  treeData: FamilyTreeData,
  ownerId: string,
  ownerName?: string,
  isPublic = true
): Promise<void> {
  try {
    const docRef = doc(db, 'trees', treeId);
    const now = new Date().toISOString();
    
    let createdAt = now;
    try {
      const existing = await getDoc(docRef);
      if (existing.exists() && existing.data().createdAt) {
        createdAt = existing.data().createdAt;
      }
    } catch {
      // Ignore if doesn't exist
    }

    const personCount = Object.keys(treeData.persons || {}).length;
    const safeTitle = (treeData.title?.trim() || 'Моє родове дерево').slice(0, 150) || 'Моє родове дерево';
    const record: TreeDocumentRecord = {
      id: treeId,
      ownerId,
      ownerName: ownerName || 'Користувач',
      title: safeTitle,
      description: treeData.description || '',
      isPublic,
      personCount,
      treeDataJson: JSON.stringify(treeData),
      createdAt,
      updatedAt: now,
    };

    await setDoc(docRef, record);
  } catch (error: any) {
    console.warn(`saveTreeToFirestore (${treeId}) warning (fallback active):`, error?.message || error);
  }
}

/**
 * Delete a family tree from Firestore (fails gracefully if permissions restricted)
 */
export async function deleteTreeFromFirestore(treeId: string): Promise<void> {
  try {
    const docRef = doc(db, 'trees', treeId);
    await deleteDoc(docRef);
  } catch (error: any) {
    console.warn(`deleteTreeFromFirestore (${treeId}) warning:`, error?.message || error);
  }
}

/**
 * Toggle public access for a tree document (fails gracefully if permissions restricted)
 */
export async function toggleTreePublicAccess(treeId: string, isPublic: boolean): Promise<void> {
  try {
    const docRef = doc(db, 'trees', treeId);
    await updateDoc(docRef, { isPublic, updatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.warn(`toggleTreePublicAccess (${treeId}) warning:`, error?.message || error);
  }
}
