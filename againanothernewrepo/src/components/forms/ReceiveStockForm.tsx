// src/components/forms/ReceiveStockForm.tsx — FINAL WITH currentQty & UNIQUE REF
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, serverTimestamp, collection, getDocs, addDoc, query, where, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type Mode = "add" | "edit" | "view";

interface PO {
  id: string;
  refNumber: string;
  branchId: string;
  branchName: string;
  supplierName: string;
  items: POItem[];
  totalAmount: number;
  status: string;
}

interface POItem {
  itemId: string;
  itemName: string;
  quantity: number;
  receivedQty?: number;
  unitPrice: number;
  discount: number;
  amount: number;
}

interface GRNItem extends POItem {
  previouslyReceived: number;
  additionalReceived: number;
  totalReceived: number;
}

const ReceiveStockForm = ({ mode = "add" }: { mode?: Mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [poId, setPoId] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [supplierInvoice, setSupplierInvoice] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const [purchaseOrders, setPurchaseOrders] = useState<PO[]>([]);
  const [currentPO, setCurrentPO] = useState<PO | null>(null);
  const [receivedItems, setReceivedItems] = useState<GRNItem[]>([]);

  const { role, branchId, user } = useAuth();
  const isView = mode === "view";

  // Load approved POs
  useEffect(() => {
    let q = query(collection(db, "purchaseOrders"), where("status", "==", "approved"));
    if (role === "employee" && branchId) {
      q = query(q, where("branchId", "==", branchId));
    }

    const load = async () => {
      const snap = await getDocs(q);
      setPurchaseOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as PO)));
    };
    load();
  }, [role, branchId]);

  // Prevent fully delivered POs
  const [deliveredPOIds, setDeliveredPOIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const q = query(collection(db, "goodsReceivedNotes"), where("status", "==", "delivered"));
    const unsubscribe = onSnapshot(q, snap => {
      const ids = new Set<string>();
      snap.docs.forEach(d => {
        if (d.data().poId) ids.add(d.data().poId);
      });
      setDeliveredPOIds(ids);
    });
    return () => unsubscribe();
  }, []);

  const availablePOs = purchaseOrders.filter(po => !deliveredPOIds.has(po.id));

  // Load existing GRN
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && id) {
      const load = async () => {
        const snap = await getDoc(doc(db, "goodsReceivedNotes", id));
        if (snap.exists()) {
          const data = snap.data() as any;
          setPoId(data.poId);
          setDeliveryNumber(data.deliveryNumber || "");
          setSupplierInvoice(data.supplierInvoice || "");
          setAdditionalInfo(data.additionalInfo || "");
          setReceivedItems((data.items || []).map((item: any) => ({
            ...item,
            previouslyReceived: item.receivedQty || 0,
            additionalReceived: 0,
            totalReceived: item.receivedQty || 0,
          })));
        }
      };
      load();
    }
  }, [id, mode]);

  // Load PO
  useEffect(() => {
    if (poId) {
      const load = async () => {
        const snap = await getDoc(doc(db, "purchaseOrders", poId));
        if (snap.exists()) {
          const data = snap.data() as PO;
          setCurrentPO(data);
          if (mode === "add") {
            setReceivedItems(data.items.map(item => ({
              ...item,
              previouslyReceived: item.receivedQty || 0,
              additionalReceived: 0,
              totalReceived: item.receivedQty || 0,
            })));
          }
        }
      };
      load();
    }
  }, [poId, mode]);

  const updateAdditionalQty = (index: number, qty: number) => {
    const newItems = [...receivedItems];
    const max = newItems[index].quantity - newItems[index].previouslyReceived;
    newItems[index].additionalReceived = Math.max(0, Math.min(qty, max));
    newItems[index].totalReceived = newItems[index].previouslyReceived + newItems[index].additionalReceived;
    setReceivedItems(newItems);
  };

  const subtotal = receivedItems.reduce((sum, item) => {
    const price = item.unitPrice * (1 - item.discount / 100);
    return sum + (item.totalReceived * price);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poId || receivedItems.every(i => i.additionalReceived === 0)) {
      toast.error("Please fill required fields");
      return;
    }

    setLoading(true);
    try {
      const isDelivered = receivedItems.every(i => i.totalReceived >= i.quantity);
      const status = isDelivered ? "delivered" : "partial";

      const payload: any = {
        poId,
        poRef: currentPO?.refNumber || "",
        branchId: currentPO?.branchId || "",
        branchName: currentPO?.branchName || "",
        supplierName: currentPO?.supplierName || "",
        deliveryNumber,
        supplierInvoice,
        additionalInfo: additionalInfo || null,
        items: receivedItems.map(item => ({
          ...item,
          receivedQty: item.totalReceived,
          amount: item.totalReceived * item.unitPrice * (1 - item.discount / 100),
        })),
        totalAmount: subtotal,
        status,
        personnel: user?.displayName || user?.email?.split("@")[0] || "User",
        createdAt: serverTimestamp(),
      };

      let grnNumber = "";

      if (mode === "add") {
        grnNumber = `GRN-${Date.now()}`;
        payload.grnNumber = grnNumber;
        await addDoc(collection(db, "goodsReceivedNotes"), payload);
      } else if (mode === "edit" && id) {
        const existing = await getDoc(doc(db, "goodsReceivedNotes", id));
        if (existing.exists()) grnNumber = existing.data()?.grnNumber || "";
        await setDoc(doc(db, "goodsReceivedNotes", id), payload, { merge: true });
      }

      // === LOG INVENTORY MOVEMENTS WITH currentQty & UNIQUE REF ===
      const movementPromises = [];

      for (const item of receivedItems) {
        if (item.additionalReceived <= 0) continue;

        let unitsToAdd = item.additionalReceived;

        // Convert using packaging
        const packagingSnap = await getDocs(collection(db, "items", item.itemId, "packaging"));
        if (!packagingSnap.empty) {
          const packData = packagingSnap.docs[0].data();
          unitsToAdd = item.additionalReceived * (packData.quantity || 1);
        }

        // Calculate current total before this receipt
        const currentMovQ = query(
          collection(db, "inventoryMovements"),
          where("itemId", "==", item.itemId),
          where("branchId", "==", currentPO?.branchId)
        );
        const currentSnap = await getDocs(currentMovQ);
        const currentTotal = currentSnap.docs.reduce((sum, d) => sum + (d.data().quantity || 0), 0);

        const newBalance = currentTotal + unitsToAdd;

        const movementRef = `MOV-${Date.now()}${Math.floor(Math.random() * 1000)}`;

        movementPromises.push(
          addDoc(collection(db, "inventoryMovements"), {
            itemId: item.itemId,
            itemName: item.itemName,
            branchId: currentPO?.branchId,
            branchName: currentPO?.branchName,
            quantity: unitsToAdd,
            currentQty: newBalance, // ← STORED BALANCE
            transactionType: "adjustment",
            reference: movementRef,
            grnNumber: grnNumber, // also keep GRN for reference
            reason: "Goods received from supplier",
            personnel: payload.personnel,
            createdAt: serverTimestamp(),
          })
        );
      }

      await Promise.all(movementPromises);

      toast.success("Stock received and inventory updated correctly!");

      const base = role === "manager"
        ? "/lms/manager/utilities/receive-stock"
        : "/lms/employee/utilities/receive-stock";
      navigate(base);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Save failed: " + (error.message || "Permission denied"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {isView ? "View Receipt" : mode === "add" ? "Receive Stock" : "Continue Receiving"}
        </h1>
      </div>

      <div className="bg-card border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Purchase Order Number</Label>
              {isView ? (
                <Input value={currentPO?.refNumber || ""} disabled />
              ) : (
                <Select value={poId} onValueChange={setPoId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select PO number" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePOs.map(po => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.refNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Organization Branch</Label>
              <Input value={currentPO?.branchName || ""} disabled />
            </div>

            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input value={currentPO?.supplierName || ""} disabled />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Delivery Number</Label>
              <Input value={deliveryNumber} onChange={e => setDeliveryNumber(e.target.value)} disabled={isView} />
            </div>
            <div className="space-y-2">
              <Label>Supplier Invoice Number</Label>
              <Input value={supplierInvoice} onChange={e => setSupplierInvoice(e.target.value)} disabled={isView} />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Item Details</Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Ordered Qty (Boxes)</TableHead>
                    <TableHead>Previously Received</TableHead>
                    <TableHead>Additional Received</TableHead>
                    <TableHead>Total Received</TableHead>
                    <TableHead>Unit Price (KSh/Box)</TableHead>
                    <TableHead>Discount (%)</TableHead>
                    <TableHead>Amount (KSh)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        Select a Purchase Order to load items
                      </TableCell>
                    </TableRow>
                  ) : (
                    receivedItems.map((item, index) => {
                      const discountedPrice = item.unitPrice * (1 - item.discount / 100);
                      const amount = item.totalReceived * discountedPrice;

                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.previouslyReceived}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={item.quantity - item.previouslyReceived}
                              value={item.additionalReceived}
                              onChange={e => updateAdditionalQty(index, parseInt(e.target.value) || 0)}
                              disabled={isView}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>{item.totalReceived}</TableCell>
                          <TableCell>KSh {item.unitPrice.toLocaleString()}</TableCell>
                          <TableCell>{item.discount}%</TableCell>
                          <TableCell className="font-semibold">
                            KSh {amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end mt-6">
              <div className="bg-muted/50 rounded-lg p-6 space-y-2 min-w-80">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total (KSh)</span>
                  <span>KSh {subtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Info</Label>
            <Textarea
              rows={4}
              value={additionalInfo}
              onChange={e => setAdditionalInfo(e.target.value)}
              placeholder="Any notes about delivery condition, damages, etc."
              disabled={isView}
            />
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button variant="outline" onClick={() => navigate(-1)}>
              {isView ? "Back" : "Cancel"}
            </Button>
            {!isView && (
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-primary to-accent">
                {loading ? "Saving..." : "Save Receipt"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceiveStockForm;