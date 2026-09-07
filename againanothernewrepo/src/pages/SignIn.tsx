// src/pages/SignIn.tsx — Fixed to match signup pattern
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Mail, Lock, ArrowLeft, Eye, EyeOff, Phone } from "lucide-react";
import { signInWithEmailAndPassword, signInWithPopup, AuthError } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import sessionManager from "@/utils/sessionManager";


const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && role) {
      navigate(`/lms/${role}/dashboard`, { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill in all fields");

    setLoading(true);
    try {
      // 1. Sign in with Firebase (verifies password)
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = userCredential.user;

      // 2. Get Firebase ID token
      const firebaseToken = await firebaseUser.getIdToken();

      // 3. Call YOUR signin endpoint (same pattern as signup)
      const apiUrl = import.meta.env.VITE_API_URL;
      const apiKey = import.meta.env.VITE_API_KEY;

      if (!apiUrl || !apiKey) {
        throw new Error("API configuration missing");
      }

      const res = await fetch(`${apiUrl}/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(),
          firebaseToken 
        }),
      });

      if (!res.ok) {
        let errorText = "Sign in failed";
        try {
          const errorData = await res.json();
          errorText = errorData.error || errorText;
        } catch {
          errorText = await res.text();
        }
        throw new Error(errorText);
      }

      const data = await res.json();

      // 4. Store session data (same as signup)
      sessionManager.setSession({
        token: data.token,
        expiresAt: data.expiresAt,
        user: data.user,
      });

      toast.success("Signed in successfully!");
    } catch (error: any) {
      console.error("Sign in error:", error);
      
      const err = error as AuthError;
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        toast.error("Invalid email or password");
      } else if (err.code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please try again later.");
      } else {
        toast.error(error.message || "Sign in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Get Firebase ID token
      const firebaseToken = await firebaseUser.getIdToken();

      // Call signin endpoint
      const apiUrl = import.meta.env.VITE_API_URL;
      const apiKey = import.meta.env.VITE_API_KEY;

      const res = await fetch(`${apiUrl}/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({ 
          email: firebaseUser.email?.toLowerCase(),
          firebaseToken 
        }),
      });

      if (!res.ok) {
        let errorText = "Google sign in failed";
        try {
          const errorData = await res.json();
          errorText = errorData.error || errorText;
        } catch {
          errorText = await res.text();
        }
        throw new Error(errorText);
      }

      const data = await res.json();

      // Store session
      sessionManager.setSession({
        token: data.token,
        expiresAt: data.expiresAt,
        user: data.user,
      });

      toast.success("Welcome back!");
    } catch (error: any) {
      const err = error as AuthError;
      if (err.code !== "auth/popup-closed-by-user") {
        toast.error(error.message || "Google sign in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-xl">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Go Home</span>
      </Link>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card/80 backdrop-blur-md border border-border rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Laundry Room Inc
            </h1>
          </div>

          <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>
          <p className="text-muted-foreground text-center mb-8">
            Sign in to manage your laundry
          </p>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-accent"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              OR
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mb-6 border-2"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </Button>

          <Button
            variant="outline"
            className="w-full border-2 opacity-60 cursor-not-allowed"
            disabled={true}
            title="Phone sign-in will be available after billing setup"
          >
            <Phone className="w-5 h-5 mr-2" />
            Sign in with Phone (Coming soon)
          </Button>
        </div>
      </div>

      <div id="recaptcha-container" className="hidden" />
    </div>
  );
};

export default SignIn;