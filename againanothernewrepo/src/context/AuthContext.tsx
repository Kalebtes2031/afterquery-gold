// src/context/AuthContext.tsx — FIXED: Retry + Transient Null Ignore + Working Logout
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  role: string | null;
  branchId: string | null;
  branchName: string | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>; // Explicit logout method
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  branchId: null,
  branchName: null,
  loading: true,
  error: null,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NEW: Flag to force-clear on explicit logout
  const isLoggingOutRef = useRef<boolean>(false);

  // Track if we had a real user (ignore transient null)
  const hadUserRef = useRef<boolean>(false);

  // Retry for Firestore race
  const retryCountRef = useRef<number>(0);
  const maxRetries = 5;
  const retryDelayMs = 500;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // If we're in logout mode → always accept null
      if (isLoggingOutRef.current && !currentUser) {
        // console.log("🔓 Explicit logout detected - clearing state");
        setUser(null);
        setRole(null);
        setBranchId(null);
        setBranchName(null);
        hadUserRef.current = false;
        isLoggingOutRef.current = false; // Reset flag
        setLoading(false);
        return;
      }

      // Normal transient null ignore
      if (!currentUser && hadUserRef.current) {
        // console.log("Ignoring transient null during auth stabilization");
        return;
      }

      setLoading(true);
      setError(null);
      retryCountRef.current = 0;

      if (!currentUser) {
        console.log("🔓 User signed out");
        setUser(null);
        setRole(null);
        setBranchId(null);
        setBranchName(null);
        hadUserRef.current = false;
        setLoading(false);
        return;
      }

      hadUserRef.current = true;

      const fetchWithRetry = async (): Promise<void> => {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));

          if (userDoc.exists()) {
            const data = userDoc.data();
            const userRole = data.role || "customer";

            setUser(currentUser);
            setRole(userRole);

            if (userRole === "employee") {
              const bId = data.branchId;
              const bName = data.branchName;

              if (bId) {
                setBranchId(bId);
                setBranchName(bName || "Unknown Branch");
              } else {
                setError("Employee account has no branch assigned.");
              }
            } else if (userRole === "manager") {
              setBranchId(null);
              setBranchName(null);
            }

            setLoading(false);
            return;
          }

          if (retryCountRef.current < maxRetries) {
            retryCountRef.current += 1;
            console.log(`Firestore doc not ready, retrying (${retryCountRef.current}/${maxRetries})...`);
            setTimeout(fetchWithRetry, retryDelayMs);
            return;
          }

          setError("User profile not found after waiting.");
          setLoading(false);
        } catch (err: any) {
          console.error("❌ Error fetching user data:", err);
          setError(err.message || "Failed to load user data");
          setLoading(false);
        }
      };

      fetchWithRetry();
    });

    return () => unsubscribe();
  }, []);

  // Explicit logout method
  const logout = async () => {
    try {
      isLoggingOutRef.current = true; // Tell listener this null is real
      await signOut(auth);
      // State will be cleared by listener
    } catch (err: any) {
      console.error("Logout error:", err);
      toast.error("Logout failed");
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/30 rounded-full" />
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-primary rounded-full animate-spin" />
            <div className="absolute inset-2 w-16 h-16 border-4 border-transparent border-t-accent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Laundry Room
            </h2>
            <p className="text-muted-foreground animate-pulse">Preparing your experience...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, role, branchId, branchName, loading, error, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};