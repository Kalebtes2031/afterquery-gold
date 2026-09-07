// src/pages/OrderDetail.tsx
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Package, Phone, MapPin, Clock, MessageSquare, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";

interface LaundryOrder {
  id: string;
  laundryId: string;
  customerName: string;
  phone: string;
  serviceType: string;
  pickupTime: string;
  location: string;
  apartment?: string;
  specialInstructions?: string;
  status: "pending" | "collected" | "in washing" | "ready" | "delivered";
  bookedAt: any;
}

const statusOptions = ["pending", "collected", "in washing", "ready", "delivered"] as const;

const OrderDetail = ({ mode }: { mode: "view" | "serve" }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LaundryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("pending");

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "laundryOrders", id));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as LaundryOrder;
          setOrder(data);
          setStatus(data.status);
        }
      } catch (err) {
        toast.error("Failed to load order");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleSave = async () => {
    if (!order || status === order.status) return;
    try {
      await updateDoc(doc(db, "laundryOrders", id!), { status, updatedAt:new Date() });
      toast.success("Status updated!");
      navigate(-1);
    } catch {
      toast.error("Update failed");
    }
  };

  if (loading) return <div className="py-20 text-center">Loading...</div>;
  if (!order) return <div className="py-20 text-center text-muted-foreground">Order not found</div>;

  const isServeMode = mode === "serve";
  const isDelivered = status === "delivered";

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {isServeMode ? "Serve Order" : "Order Details"}
          </h1>
          <p className="text-muted-foreground">Laundry ID: {order.laundryId}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-10">
        {/* Status Badge */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              status === "pending" ? "bg-yellow-100 text-yellow-800" :
              status === "collected" ? "bg-blue-100 text-blue-800" :
              status === "in washing" ? "bg-indigo-100 text-indigo-800" :
              status === "ready" ? "bg-green-100 text-green-800" :
              "bg-gray-100 text-gray-800"
            }`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          {isDelivered && <span className="text-green-600 font-bold text-lg">Delivered</span>}
        </div>

        {/* SERVE MODE */}
        {isServeMode ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
              <div><strong>Customer:</strong> {order.customerName}</div>
              <div><strong>Phone:</strong> {order.phone}</div>
              <div><strong>Service:</strong> {order.serviceType}</div>
              <div><strong>Pickup:</strong> {format(new Date(order.pickupTime), "MMM d, yyyy 'at' h:mm a")}</div>
              <div className="md:col-span-2"><strong>Location:</strong> {order.location} {order.apartment && `(${order.apartment})`}</div>
            </div>

            {!isDelivered && (
              <div className="pt-6 border-t">
                <p className="font-semibold mb-3">Update Status</p>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              {!isDelivered && (
                <Button onClick={handleSave} disabled={status === order.status}>
                  Save Status
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* VIEW MODE — Beautiful & Balanced */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-7">
              <div className="flex gap-4"><Package className="w-6 h-6 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Service</p><p className="font-semibold text-lg">{order.serviceType}</p></div></div>
              <div className="flex gap-4"><Clock className="w-6 h-6 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Pickup Time</p><p className="font-semibold text-lg">{format(new Date(order.pickupTime), "EEEE, MMMM d, yyyy 'at' h:mm a")}</p></div></div>
              <div className="flex gap-4"><MapPin className="w-6 h-6 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Location</p><p className="font-semibold text-lg">{order.location}</p>{order.apartment && <p className="text-muted-foreground">{order.apartment}</p>}</div></div>
            </div>
            <div className="space-y-7">
              <div className="flex gap-4"><User className="w-6 h-6 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Customer</p><p className="font-semibold text-lg">{order.customerName}</p></div></div>
              <div className="flex gap-4"><Phone className="w-6 h-6 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Phone</p><p className="font-semibold text-lg">{order.phone}</p></div></div>
              {order.specialInstructions && order.specialInstructions.trim() && (
                <div className="flex gap-4"><MessageSquare className="w-6 h-6 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Instructions</p><p className="italic text-lg">{order.specialInstructions}</p></div></div>
              )}
            </div>
          </div>
        )}

        {/* Back Button in View Mode */}
        {!isServeMode && (
          <div className="mt-10 pt-8 border-t">
            <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
              Back to Orders
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;