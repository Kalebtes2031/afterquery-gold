// src/pages/public/DeliveryLogin.tsx — FINAL & PERFECT
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import SignIn from "./SignIn";

const DeliveryLogin = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Logged in → go to slot page with order ID
      navigate(`/delivery-slot/${id}`);
    }
  }, [user, loading, id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="text-2xl font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome Back!
          </h1>
          <p className="text-xl text-muted-foreground mt-4">
            Sign in to choose your delivery time
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Order ID: <span className="font-mono font-bold">{id}</span>
          </p>
        </div>
        <SignIn />
      </div>
    </div>
  );
};

export default DeliveryLogin;