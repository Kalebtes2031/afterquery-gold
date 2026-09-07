// src/pages/ForgotPassword.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { auth, db } from "@/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { toast } from "@/components/ui/sonner";

const ForgotPassword = () => {
  const [step, setStep] = useState<"input" | "google" | "reset" | "success">("input");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [oobCode, setOobCode] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Handle reset link from email (oobCode in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oobCode");
    if (code) {
      setOobCode(code);
      setStep("reset");
      verifyCode(code).catch(() => {
        toast.error("Invalid or expired reset link. Request a new one.");
        setStep("input");
      });
    }
  }, []);

  const verifyCode = async (code: string) => {
    try {
      await verifyPasswordResetCode(auth, code);
    } catch (err: any) {
      throw err;
    }
  };

  const handleSendReset = async () => {
    if (!email.trim()) return toast.error("Please enter your email");

    const emailLower = email.trim().toLowerCase();
    setLoading(true);

    try {
      // 1. Check if user exists and get authProvider
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", emailLower));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error("No account found with this email.");
        return;
      }

      // Assuming one document per email (unique)
      const userDoc = querySnapshot.docs[0];
      const authProvider = userDoc.data()?.authProvider;

      if (authProvider === "google") {
        setStep("google");
        return;
      }

      // 2. Normal email/password account → send magic link
      await sendPasswordResetEmail(auth, emailLower);
      toast.success("Reset link sent! Check your inbox (and spam folder).");
      setStep("success");
    } catch (err: any) {
      if (err.code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please try again later.");
      } else {
        toast.error("Failed to send reset link. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmNewPassword) return toast.error("Passwords do not match");

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      toast.success("Password has been reset successfully!");
      setStep("success");
    } catch (err: any) {
      toast.error("Reset failed: " + (err.message || "Please try again"));
    } finally {
      setLoading(false);
    }
  };

  // ── UI COMPONENTS ───────────────────────────────────────────────────────

  const InputForm = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Reset Password</h2>
      <p className="text-center text-muted-foreground">
        We'll send a reset link to your email
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleSendReset}
          disabled={loading || !email.trim()}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </div>

      <div className="text-sm text-center text-muted-foreground mt-4">
        <p>Phone reset coming soon</p>
      </div>
    </div>
  );

  const GoogleGuidance = () => (
    <div className="space-y-8 text-center">
      <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto" />
      <h2 className="text-2xl font-bold">Google Account Detected</h2>

      <div className="space-y-4">
        <p className="text-muted-foreground">
          This account was created using Google Sign-In.
        </p>
        <p className="text-base">
          Passwords are managed directly by Google.
        </p>
      </div>

      <Button asChild size="lg" className="w-full">
        <a
          href="https://myaccount.google.com/signinoptions/password"
          target="_blank"
          rel="noopener noreferrer"
        >
          Reset Password on Google →
        </a>
      </Button>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setEmail("");
          setStep("input");
        }}
      >
        Try a different email
      </Button>
    </div>
  );

  const ResetForm = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Set New Password</h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>New Password</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="space-y-2">
          <Label>Confirm New Password</Label>
          <Input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Button
          className="w-full"
          onClick={handleResetPassword}
          disabled={
            loading ||
            newPassword.length < 6 ||
            newPassword !== confirmNewPassword
          }
        >
          {loading ? "Resetting..." : "Reset Password"}
        </Button>
      </div>
    </div>
  );

  const Success = () => (
    <div className="text-center space-y-6 py-8">
      <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
      <h2 className="text-2xl font-bold">Success!</h2>
      <p className="text-muted-foreground">
        Your password has been updated successfully.
      </p>
      <Button asChild className="w-full">
        <Link to="/signin">Go to Sign In</Link>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border shadow-2xl rounded-2xl p-8">
          <div className="flex items-center justify-center gap-2 mb-10">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Laundry Room Inc
            </h1>
          </div>

          {step === "input" && <InputForm />}
          {step === "google" && <GoogleGuidance />}
          {step === "reset" && <ResetForm />}
          {step === "success" && <Success />}

          {step === "input" && (
            <div className="mt-8 text-center">
              <Button variant="ghost" onClick={() => navigate("/signin")}>
                ← Back to Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;