// src/pages/SignUp.tsx — UPDATED: Google now uses backend /auth/google-signup
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Phone } from "lucide-react";
import {
  signInWithPopup,
  signInWithCustomToken,
} from "firebase/auth";
import { auth, googleProvider } from "@/firebase";
import { toast } from "sonner";
import sessionManager from "@/utils/sessionManager";

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rawPhone, setRawPhone] = useState("");
  const [phoneFeedback, setPhoneFeedback] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Google flow: collect phone FIRST
  const [showGooglePhone, setShowGooglePhone] = useState(false);
  const [rawTempPhone, setRawTempPhone] = useState("");
  const [tempPhoneFeedback, setTempPhoneFeedback] = useState("");

  const navigate = useNavigate();

  // Normalize phone to 254XXXXXXXXX
  const normalizePhone = (input: string): string | null => {
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = digits.substring(1);
    if (digits.startsWith('254')) digits = digits.substring(3);
    if (digits.length !== 9) return null;
    return `254${digits}`;
  };

  const updatePhoneFeedback = (input: string) => {
    if (!input.trim()) {
      setPhoneFeedback("Phone number is required");
      return;
    }
    const normalized = normalizePhone(input);
    setPhoneFeedback(normalized ? "" : "Enter a valid Kenyan number (e.g. 0712345678)");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawPhone(val);
    updatePhoneFeedback(val);
  };

  const handleTempPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawTempPhone(val);
    const normalized = normalizePhone(val);
    setTempPhoneFeedback(normalized ? "" : "Enter a valid Kenyan number (e.g. 0712345678)");
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return toast.error("Please enter your name");
    if (!rawPhone.trim()) return toast.error("Please enter phone number");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    const normalizedPhone = normalizePhone(rawPhone);
    if (!normalizedPhone) return toast.error("Invalid phone format. Use 0712345678");

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const apiKey = import.meta.env.VITE_API_KEY;

      if (!apiUrl || !apiKey) {
        console.error("Missing API config", { apiUrl, apiKey });
        toast.error("Service unavailable — please try again later");
        return;
      }

      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: normalizedPhone
      };

      console.log("Sending payload:", payload);

      const res = await fetch(`${apiUrl}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorText = "Signup failed";
        try {
          const errorData = await res.json();
          errorText = errorData.error || errorText;
        } catch {
          errorText = await res.text();
        }
        throw new Error(errorText);
      }

      const data = await res.json();
      await signInWithCustomToken(auth, data.token);

      // Store session (same pattern as before)
      sessionManager.setSession({
        token: data.token,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        user: {
          uid: "", // backend can return this if needed
          email: payload.email,
          name: payload.name,
          role: "customer",
          phone: payload.phone,
        },
      });

      toast.success("Account created successfully!");
      navigate(`/lms/customer/dashboard`, { replace: true });
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Signup failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    setShowGooglePhone(true);
  };

  const handleGoogleContinue = async () => {
  if (!rawTempPhone.trim()) return toast.error("Please enter phone number");

  const normalizedPhone = normalizePhone(rawTempPhone);
  if (!normalizedPhone) return toast.error("Invalid phone format. Use 0712345678");

  setShowGooglePhone(false);
  setLoading(true);

  try {
    console.log('🔐 Initiating Google sign-in popup...');
    
    // ✅ THIS CREATES THE USER IN FIREBASE AUTH AND RETURNS REAL UID
    const result = await signInWithPopup(auth, googleProvider);
    const googleUser = result.user;

    console.log('✅ User signed in with Google. UID:', googleUser.uid);
    console.log('📋 User details:', {
      uid: googleUser.uid,
      email: googleUser.email,
      displayName: googleUser.displayName,
    });

    const apiUrl = import.meta.env.VITE_API_URL;
    const apiKey = import.meta.env.VITE_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error("Missing API configuration");
    }

    // ✅ USE THE REAL UID FROM FIREBASE
    const payload = {
      uid: googleUser.uid,  // ✅ REAL UID, not test-uid-1234567890
      email: googleUser.email?.toLowerCase() || "",
      name: googleUser.displayName || "Customer",
      phone: normalizedPhone,
    };

    console.log('📤 Sending to backend:', payload);

    const res = await fetch(`${apiUrl}/auth/google-signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('❌ Backend error:', errData);
      throw new Error(errData.error || "Google signup failed");
    }

    const data = await res.json();
    console.log('✅ Backend response:', data);

    // Sign in with custom token from backend
    await signInWithCustomToken(auth, data.token);

    // Store session immediately
    sessionManager.setSession({
      token: data.token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      user: {
        uid: googleUser.uid,
        email: googleUser.email?.toLowerCase() || "",
        name: googleUser.displayName || "Customer",
        role: "customer",
        phone: normalizedPhone,
      },
    });

    toast.success("Account created successfully!");
    navigate(`/lms/customer/dashboard`, { replace: true });
  } catch (error: any) {
    console.error("Google signup error:", error);
    toast.error(error.message || "Google signup failed — please try again");
  } finally {
    setLoading(false);
  }
};

  const handleCancelGoogleSignup = () => {
    setShowGooglePhone(false);
    setRawTempPhone("");
    setTempPhoneFeedback("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Go Home</span>
      </Link>

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-card/80 backdrop-blur-md border border-border rounded-2xl p-8 md:p-10 shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Laundry Room Inc
            </h1>
          </div>

          <h2 className="text-3xl font-bold text-center mb-2">Join Us Today</h2>
          <p className="text-muted-foreground text-center mb-8">
            Create your account and start booking laundry
          </p>

          <form onSubmit={handleEmailSignup} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-11 h-11"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. 0712345678"
                    value={rawPhone}
                    onChange={handlePhoneChange}
                    className={`pl-11 h-11 ${phoneFeedback ? "border-destructive" : ""}`}
                    required
                  />
                  {phoneFeedback && (
                    <p className="text-destructive text-sm mt-1">{phoneFeedback}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-11 pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-11 h-11 pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-8">
            <Separator className="my-6" />
            <Button 
              variant="outline" 
              className="w-full h-11 flex items-center gap-3" 
              onClick={handleGoogleSignup} 
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Sign Up with Google
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/signin" className="text-primary hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Phone Modal */}
      {showGooglePhone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card p-8 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Enter your phone number</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We'll need your Kenyan phone number to complete Google signup.
            </p>
            <div className="space-y-2">
              <Label htmlFor="tempPhone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                <Input
                  id="tempPhone"
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={rawTempPhone}
                  onChange={handleTempPhoneChange}
                  className={`pl-11 h-11 ${tempPhoneFeedback ? "border-destructive" : ""}`}
                  required
                />
                {tempPhoneFeedback && (
                  <p className="text-destructive text-sm mt-1">{tempPhoneFeedback}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={handleCancelGoogleSignup}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 bg-gradient-to-r from-primary to-accent"
                onClick={handleGoogleContinue}
                disabled={loading || !rawTempPhone.trim()}
              >
                {loading ? "Signing Up..." : "Continue"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignUp;