import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInAnonymously,
  signOut, 
  updateProfile 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

export interface UserProfile {
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logOut: () => Promise<void>;
  updateDisplayName: (newName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInAsGuest: async () => {},
  logOut: async () => {},
  updateDisplayName: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Sync or fetch profile in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setUserProfile(data);
            if (data.displayName) {
              const parts = data.displayName.trim().split(/\s+/);
              const firstName = parts[0] || data.displayName;
              const lastName = parts.slice(1).join(' ') || '';
              localStorage.setItem('family_tree_user_name', JSON.stringify({ firstName, lastName }));
              localStorage.setItem('family_tree_display_name', data.displayName);
              window.dispatchEvent(
                new CustomEvent('family_tree_user_name_updated', {
                  detail: { firstName, lastName, fullName: data.displayName },
                })
              );
            }
          } else {
            const localCustom = localStorage.getItem('family_tree_display_name');
            const initialName =
              localCustom || user.displayName || user.email?.split('@')[0] || 'Користувач';
            const newProfile: UserProfile = {
              userId: user.uid,
              email: user.email || '',
              displayName: initialName,
              photoURL: user.photoURL || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.warn('Could not sync user profile to Firestore:', err);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    console.warn('Google Sign-in has been disabled. Admin password or Guest mode is active.');
  };

  const signInAsGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Error signing in as guest:', error);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  const updateDisplayName = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: trimmed });
      } catch (e) {
        console.warn('Failed to update auth displayName:', e);
      }

      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(
          userDocRef,
          {
            displayName: trimmed,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Failed to update Firestore profile displayName:', e);
      }
    }

    setUserProfile((prev) =>
      prev
        ? { ...prev, displayName: trimmed }
        : {
            userId: auth.currentUser?.uid || 'guest',
            email: auth.currentUser?.email || '',
            displayName: trimmed,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
    );

    const parts = trimmed.split(/\s+/);
    const firstName = parts[0] || trimmed;
    const lastName = parts.slice(1).join(' ') || '';
    localStorage.setItem('family_tree_user_name', JSON.stringify({ firstName, lastName }));
    localStorage.setItem('family_tree_display_name', trimmed);
    window.dispatchEvent(new CustomEvent('family_tree_user_name_updated', { detail: { firstName, lastName, fullName: trimmed } }));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signInWithGoogle,
        signInAsGuest,
        logOut,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
