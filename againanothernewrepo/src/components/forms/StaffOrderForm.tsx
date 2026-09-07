// src/components/forms/StaffOrderForm.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  collection,
  where,
  query,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { sendSMS } from "@/utils/sendSMS";
import { sendWhatsApp } from "@/utils/sendWhatsApp";

type Mode = "view" | "serve";

function formatPhone(phone: string): string {
  if (!phone) return phone;
  phone = phone.replace(/[\s\-\(\)]/g, "").trim();
  if (phone.startsWith("+2547") && phone.length === 13) return phone;
  if (phone.startsWith("2547") && phone.length === 12) return "+" + phone;
  if (phone.startsWith("0") && phone.length === 10) return "+254" + phone.slice(1);
  if (/^[1-9]\d{8}$/.test(phone)) return "+254" + phone;
  if (phone.startsWith("+254") && phone.length >= 10 && phone.length <= 13) return phone;
  return phone;
}

const StaffOrderForm = ({ mode }: { mode: Mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [stages, setStages] = useState<string[]>([]);
  const [hasNotificationConfig, setHasNotificationConfig] = useState(false);

  const [riderId, setRiderId] = useState<string>("");
  const [riderName, setRiderName] = useState<string>("");
  const [riderPhone, setRiderPhone] = useState<string>("");
  const [eta, setEta] = useState<string>("");
  const [riders, setRiders] = useState<Array<{ id: string; name: string; phone: string }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const orderSnap = await getDoc(doc(db, "laundryOrders", id));
      if (!orderSnap.exists()) {
        toast.error("Order not found");
        navigate(-1);
        return;
      }

      const orderData = orderSnap.data();
      setOrder(orderData);
      setStatus(orderData.status || "pending");

      if (orderData.riderId) {
        setRiderId(orderData.riderId);
        setRiderName(orderData.riderName || "");
        setRiderPhone(orderData.riderPhone || "");
      }

      let configStages = ["pending", "collected", "in washing", "ready", "delivered"];

      const mainServiceId = orderData.mainServiceId || (orderData.items?.[0]?.mainServiceId);

      if (mainServiceId) {
        const configQuery = query(
          collection(db, "pricingConfig"),
          where("branchId", "==", orderData.branchId),
          where("mainServiceId", "==", mainServiceId),
          where("isActive", "==", true)
        );

        const configSnap = await getDocs(configQuery);
        if (!configSnap.empty) {
          configStages = configSnap.docs[0].data().stages || configStages;
        }
      }

      setStages(configStages);
    };

    fetchData();
  }, [id, navigate]);

  // Load riders
  useEffect(() => {
    const fetchRiders = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "employee"),
          where("isRider", "==", true)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.data().username || "—",
          phone: doc.data().phone || "",
        }));
        setRiders(list);
      } catch (err) {
        console.error("Failed to load riders:", err);
        toast.error("Could not load riders list");
      }
    };

    fetchRiders();
  }, []);

  useEffect(() => {
    if (!status || status === order?.status) {
      setHasNotificationConfig(false);
      return;
    }

    const checkConfig = async () => {
      const configSnap = await getDocs(
        query(
          collection(db, "smsConfig"),
          where("status", "==", status),
          where("isActive", "==", true)
        )
      );
      setHasNotificationConfig(!configSnap.empty);
    };

    checkConfig();
  }, [status, order?.status]);

  const handleRiderSelect = (selectedId: string) => {
    setRiderId(selectedId);
    const rider = riders.find((r) => r.id === selectedId);
    if (rider) {
      setRiderName(rider.name);
      setRiderPhone(rider.phone);
      if (rider.phone && rider.phone.trim() !== "") {
        toast.success(`Rider phone loaded: ${rider.phone}`);
      } else if (rider.phone === "") {
        toast.info("This rider has no phone number saved in profile");
      }
    } else {
      setRiderName("");
      setRiderPhone("");
    }
  };

  const handleSave = async () => {
    if (status === order.status) return;

    try {
      let notificationSent = true;
      let usedChannel: string | null = null;

      if (hasNotificationConfig) {
        toast.loading("Sending notification...", { id: "notif" });

        const configSnap = await getDocs(
          query(
            collection(db, "smsConfig"),
            where("status", "==", status),
            where("isActive", "==", true)
          )
        );

        if (!configSnap.empty) {
          const config = configSnap.docs[0].data();
          usedChannel = config.channel || "sms";

          const templateDoc = await getDoc(doc(db, "smsTemplates", config.templateId));

          if (templateDoc.exists()) {
            const templateData = templateDoc.data();
            const firstName = order.customerName?.split(" ")[0] || "Customer";
            const laundryId = order.laundryId || "—";

            if (config.channel === "whatsapp") {
              let variables: string[] = [firstName, laundryId];
              if (status === "ready") {
                variables.push(`https://yourapp.com/delivery-slot/${id}`);
              }
              notificationSent = await sendWhatsApp({
                to: order.phone,
                templateName: templateData.key,
                variables,
                orderId: id!,
              });
            } else {
              let msg = templateData.message
                .replace("{name}", firstName)
                .replace("{id}", laundryId);
              if (status === "ready") {
                msg = msg.replace("{link}", `https://yourapp.com/delivery-slot/${id}`);
              }
              const formattedPhone = formatPhone(order.phone);
              notificationSent = await sendSMS({
                to: formattedPhone,
                message: msg,
                orderId: id!,
              });
            }
          } else {
            notificationSent = false;
          }
        }
      }

      if (notificationSent) {
        const updatePayload: any = {
          status,
          updatedAt: serverTimestamp(),
        };

        if (status === "collected" && eta) {
          updatePayload.eta = new Date(eta);
        }

        if (status === "ready" && riderId) {
          updatePayload.riderId = riderId;
          updatePayload.riderName = riderName.trim();
          updatePayload.riderPhone = riderPhone.trim();
          updatePayload.riderAssignedAt = serverTimestamp();
        }

        await updateDoc(doc(db, "laundryOrders", id!), updatePayload);

        toast.dismiss("notif");
        toast.success(
          hasNotificationConfig
            ? `Status updated & ${usedChannel?.toUpperCase() || "notification"} sent!`
            : "Status updated!"
        );
        navigate(-1);
      } else {
        toast.dismiss("notif");
        toast.error("Notification failed — status NOT updated");
      }
    } catch (err: any) {
      toast.dismiss("notif");
      toast.error("Failed: " + err.message);
    }
  };

  if (!order) return <div className="py-20 text-center">Loading...</div>;

  const isServe = mode === "serve";

  const getTotalPrice = () => {
    const basePrice = order.basePricePerKg || order.pricePerKg || 0;
    const extrasTotal = (order.extraServices || []).reduce((sum: number, e: any) => sum + (e.price || 0), 0);
    const total = basePrice + extrasTotal;
    const isPerKg = order.isPerKg !== undefined ? order.isPerKg : true;
    return {
      total,
      isPerKg,
      display: isPerKg ? `KSh ${total} per kg` : `KSh ${total}`,
    };
  };

  const priceInfo = getTotalPrice();

  const getServiceDisplay = () => {
    let name = order.mainServiceName || "";
    if (order.packageName) name += ` [${order.packageName}]`;
    if (order.sizeName) name += ` [${order.sizeName}]`;
    return name.trim() || "Unknown service";
  };

  const getExtrasDisplay = () => {
    const extras = order.extraServices || [];
    return extras.length > 0 ? extras.map((e: any) => e.name).join(", ") : "None";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {isServe ? "Serve Order" : "Order Details"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Laundry ID: <span className="font-mono font-bold">{order.laundryId}</span>
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 lg:p-8">
        <div className="space-y-10">
          {/* Customer & Contact Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Customer & Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>Customer Name</Label>
                <Input value={order.customerName || "—"} disabled />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={order.phone || "—"} disabled />
              </div>
              <div>
                <Label>Gender</Label>
                <Input value={order.gender || "—"} disabled />
              </div>
            </div>
          </div>

          {/* Pickup & Location */}
          <div className="space-y-4 pt-6 border-t">
            <h2 className="text-xl font-semibold">Pickup & Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>Area of Residence</Label>
                <Input value={order.areaOfResidence || "—"} disabled />
              </div>
              <div>
                <Label>Apartment / Room No.</Label>
                <Input value={order.apartment || "—"} disabled />
              </div>
              <div>
                <Label>Pickup Time</Label>
                <Input
                  value={order.pickupTime ? format(new Date(order.pickupTime), "MMM d, yyyy h:mm a") : "—"}
                  disabled
                />
              </div>
            </div>
            <div>
              <Label>Special Instructions</Label>
              <Textarea
                value={order.specialInstructions || "None provided"}
                disabled
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Service & Pricing */}
          <div className="space-y-4 pt-6 border-t">
            <h2 className="text-xl font-semibold">Service & Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Label>Service Selected</Label>
                <Input
                  value={getServiceDisplay()}
                  disabled
                  className="font-bold text-lg text-primary"
                />
                <div className="mt-2">
                  <Label className="text-sm text-muted-foreground">Extra Services</Label>
                  <p className="text-sm">{getExtrasDisplay()}</p>
                </div>
              </div>
              <div>
                <Label>Total Price {priceInfo.isPerKg ? "per kg" : ""}</Label>
                <Input value={priceInfo.display} disabled className="font-bold text-xl" />
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-4 pt-6 border-t">
            <h2 className="text-xl font-semibold">Order Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>Quantity / Items</Label>
                <Input value={order.quantity || order.totalItems || "—"} disabled />
              </div>
              <div>
                <Label>Billing Type</Label>
                <Input value={order.isPerKg ? "Per Kg (Weight)" : "Per Item / Fixed"} disabled />
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-2">
                  <Badge className="text-lg px-6 py-3">
                    {status === "pending" ? "Booked" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>

            {order.trackedItems?.length > 0 && (
              <div className="mt-4">
                <Label className="text-base">Tracked Laundry Items</Label>
                <div className="mt-2 space-y-2">
                  {order.trackedItems.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm border-b pb-1">
                      <span>{item.type || "Unknown"}: {item.description}</span>
                      <span className="font-medium">× {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Images */}
          {order.images?.length > 0 && (
            <div className="space-y-4 pt-6 border-t">
              <h2 className="text-xl font-semibold">Order Images</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {order.images.map((img: string, idx: number) => (
                  <div key={idx} className="border rounded overflow-hidden">
                    <img
                      src={img}
                      alt={`Order image ${idx + 1}`}
                      className="w-full h-32 object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(img, "_blank")}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status + Rider + ETA Section */}
          {isServe && order.status !== "delivered" && (
            <div className="pt-6 border-t space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <Label>Update Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="text-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s} value={s} className="text-base">
                          {s === "pending" ? "Booked" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {status === "collected" && status !== order.status && (
                  <div>
                    <Label>Set Estimated Time of Arrival (ETA)</Label>
                    <Input
                      type="datetime-local"
                      value={eta}
                      onChange={(e) => setEta(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Customer will see this estimated delivery time
                    </p>
                  </div>
                )}
              </div>

              {status === "ready" && status !== order.status && (
                <div className="border rounded-lg p-5 bg-slate-50/50 space-y-5">
                  <h3 className="font-semibold text-lg">Assign Delivery Rider</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                    <div>
                      <Label>Rider Name</Label>
                      <Select value={riderId} onValueChange={handleRiderSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rider..." />
                        </SelectTrigger>
                        <SelectContent>
                          {riders.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                          {riders.length === 0 && (
                            <SelectItem value="" disabled>
                              No riders available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Phone Number</Label>
                      <div className="relative">
                        <Input
                          value={riderPhone || ""}
                          readOnly
                          placeholder="Will auto-fill from rider profile"
                          className={`bg-white ${riderPhone ? "border-green-400 focus-visible:ring-green-400" : "border-slate-200"}`}
                        />
                        {riderPhone && riderPhone.trim() !== "" && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-green-600">
                            Loaded
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Removed redundant Selected badge */}
                  </div>

                  {riderName && riderPhone === "" && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                      This rider has no phone number saved in their profile.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={status === order.status || !status}
                  className="bg-gradient-to-r from-primary to-accent"
                >
                  {hasNotificationConfig ? "Save & Notify" : "Save Status"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffOrderForm;