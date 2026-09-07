// src/pages/public/DeliverySlotPage.tsx — FINAL & FLAWLESS
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

const DeliverySlotPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) {
        toast.error("Invalid link");
        navigate("/");
        return;
      }

      const snap = await getDoc(doc(db, "laundryOrders", id));
      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() });
      } else {
        toast.error("Order not found");
        navigate("/");
      }
      setLoading(false);
    };

    fetchOrder();
  }, [id, navigate]);

  const handleSubmit = async () => {
    if (!preferredDate || !preferredTime) {
      toast.error("Please select both date and time");
      return;
    }

    if (!user) {
  toast.info("Please sign in to confirm your delivery time");
  navigate("/signin", { state: { returnTo: `/delivery-slot/${id}` } });
  return;
}

    const deliveryTime = `${format(new Date(preferredDate), "PPP")} at ${preferredTime}`;

    setSaving(true);
    try {
      await updateDoc(doc(db, "laundryOrders", id!), {
        preferredDeliveryTime: deliveryTime,
        preferredDeliveryNotes: notes || null,
        preferredDeliveryRequestedAt: serverTimestamp(),
        deliveryConfirmedAt: null,
      });

      toast.success("Thank you! We'll deliver on " + deliveryTime);
      setTimeout(() => navigate("/lms/customer/dashboard"), 3000);
    } catch (err) {
      toast.error("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center text-2xl">Loading...</div>;
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-10">
        {/* Your beautiful UI — keep exactly as you have */}
        {/* ... */}
        
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
            Your Laundry is Ready!
          </h1>
          <p className="text-2xl text-foreground">
            Laundry ID: <span className="font-mono font-bold text-primary">{order.laundryId}</span>
          </p>
          <p className="text-xl mt-4 text-muted-foreground">
            Hi <span className="font-bold">{order.customerName.split(" ")[0]}</span>, your clothes are sparkling clean!
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 mb-10 text-center">
          <p className="text-xl font-semibold">
            When would you like us to deliver it back to you?
          </p>
          <p className="text-muted-foreground mt-2">
            Choose any date and time that works for you
          </p>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-lg font-medium">Preferred Date</Label>
              <Input
                type="date"
                min={format(new Date(), "yyyy-MM-dd")}
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="text-lg h-14"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-lg font-medium">Preferred Time</Label>
              <Input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="text-lg h-14"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-lg font-medium">
              Additional Notes (Optional)
            </Label>
            <Textarea
              placeholder="e.g. Please call before coming, leave at reception, use back entrance..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="text-lg"
            />
          </div>

          {preferredDate && preferredTime && (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
              <p className="text-lg font-medium text-green-800">
                We will deliver on:
              </p>
              <p className="text-3xl font-bold text-green-700 mt-3">
                {format(new Date(preferredDate), "EEEE, MMMM d")} at {preferredTime}
              </p>
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <Button size="lg" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Confirm Delivery Time"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeliverySlotPage;