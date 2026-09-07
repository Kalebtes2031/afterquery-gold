// src/pages/manager/DeliveryNotifications.tsx — FINAL & NO ERROR
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";

// Define the shape of your order
interface LaundryOrder {
  id: string;
  laundryId?: string;
  customerName?: string;
  phone?: string;
  preferredDeliveryTime?: string;
  preferredDeliveryRequestedAt?: any;
  deliveryConfirmedAt?: any | null;
  deliveryConfirmedByEmail?: string | null;
}

const DeliveryNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<LaundryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "laundryOrders"),
      where("preferredDeliveryTime", ">=", ""),
      where("deliveryConfirmedAt", "==", null)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: LaundryOrder[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data() as Partial<LaundryOrder>,
      }));

      setNotifications(data);
      setLoading(false);
    }, (error) => {
      console.error("Query error:", error);
      toast.error("Failed to load notifications");
      setLoading(false);
    });

    return unsub;
  }, []);

  const handleConfirm = async (orderId: string) => {
    if (!user?.email) {
      toast.error("Unable to confirm — user not found");
      return;
    }

    try {
      await updateDoc(doc(db, "laundryOrders", orderId), {
        deliveryConfirmedAt: serverTimestamp(),
        deliveryConfirmedByEmail: user.email,
      });
      toast.success("Delivery time confirmed!");
    } catch (err) {
      toast.error("Failed to confirm delivery");
    }
  };

  if (loading) return <div className="py-20 text-center">Loading notifications...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Delivery Confirmations ({notifications.length})
        </h1>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">ID</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">Customer</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">Phone</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">Delivery Time</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">Requested</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {notifications.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-muted-foreground">
                  No pending delivery confirmations
                </td>
              </tr>
            ) : (
              notifications.map((order) => (
                <tr key={order.id} className="hover:bg-muted/50 transition">
                  <td className="px-6 py-4 font-mono font-bold text-primary">
                    {order.laundryId || "N/A"}
                  </td>
                  <td className="px-6 py-4 font-medium">{order.customerName || "Unknown"}</td>
                  <td className="px-6 py-4">{order.phone || "N/A"}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-green-700">
                      {order.preferredDeliveryTime || "Not set"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {order.preferredDeliveryRequestedAt ? 
                      format(order.preferredDeliveryRequestedAt.toDate(), "MMM d, h:mm a") 
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(order.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Confirm
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeliveryNotifications;