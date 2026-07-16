import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, User, db, doc, getDoc, setDoc, OperationType, handleFirestoreError } from '../firebase';
import { UserData } from '../types';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const path = `users/${user.uid}`;
        try {
          const userDoc = await getDoc(userDocRef);
          const isAdminEmail = user.email === 'adron8204@gmail.com' || user.email === 'subrata5661@gmail.com' || user.email === 'subrata21217@gmail.com';
          const expectedRole = isAdminEmail ? 'admin' : 'user';

          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            if (data.role !== expectedRole && isAdminEmail) {
              // Upgrade to admin
              const updatedData = { ...data, role: 'admin' as const };
              try {
                await setDoc(userDocRef, updatedData);
                setUserData(updatedData);
              } catch (writeError) {
                handleFirestoreError(writeError, OperationType.WRITE, path);
              }
            } else {
              setUserData(data);
            }
          } else {
            // Default role if not set
            const newUserData: UserData = {
              uid: user.uid,
              email: user.email || '',
              role: expectedRole
            };
            try {
              await setDoc(userDocRef, newUserData);
              setUserData(newUserData);
            } catch (writeError) {
              handleFirestoreError(writeError, OperationType.WRITE, path);
            }
          }
        } catch (error) {
          console.error("Error fetching/setting user data:", error);
          // If it was already handled by handleFirestoreError, it will be a JSON string
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = userData?.role === 'admin' || user?.email === 'adron8204@gmail.com' || user?.email === 'subrata5661@gmail.com' || user?.email === 'subrata21217@gmail.com' || user?.uid === 'gGlccPx3GdQGzMxjpp5GYA6NZFD2' || user?.uid === 'dGtT5HDcW1gF3ihOiXfxRuo24Zv1';

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
