// src/components/forms/POForm.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash } from "lucide-react";
import { useAuth } from "@/context/AuthContext";


type Mode = "add" | "edit" | "view" | "cancel";

interface Branch {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  costPrice: number;
}

interface POItem {
  itemId: string;
  itemName?: string; // For display
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
}

interface POData {
  branchId: string;
  supplierId: string;
  deliveredTo: string;
  requiredOn: string;
  additionalInfo: string;
  cancelReason?: string;
}

const POForm = ({ mode = "add" }: { mode?: Mode }) => {
  const { id } = useParams<{ id: string }>();
  
  const { role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<POData>({
    branchId: "",
    supplierId: "",
    deliveredTo: "",
    requiredOn: "",
    additionalInfo: "",
    cancelReason: "",
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [poItems, setPOItems] = useState<POItem[]>([]);

  const isView = mode === "view";
  const isCancel = mode === "cancel";

  const getStaffBasePath = (role?: string) =>
  role === "manager" ? "/lms/manager" : "/lms/employee";


  // Load branches, suppliers, items
  useEffect(() => {
    const load = async () => {
      const [bSnap, sSnap, iSnap] = await Promise.all([
        getDocs(collection(db, "branches")),
        getDocs(collection(db, "suppliers")),
        getDocs(collection(db, "items")),
      ]);
      setBranches(bSnap.docs.map((d) => ({ id: d.id, name: d.data().name as string })));
      setSuppliers(sSnap.docs.map((d) => ({ id: d.id, name: d.data().name as string })));
      setItems(iSnap.docs.map((d) => ({ id: d.id, name: d.data().name as string, costPrice: Number(d.data().costPrice) || 0 })));
    };
    load();
  }, []);

  // Load existing PO
  useEffect(() => {
    if ((mode === "edit" || mode === "view" || mode === "cancel") && id) {
      const fetch = async () => {
        const snap = await getDoc(doc(db, "purchaseOrders", id));
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            branchId: data.branchId || "",
            supplierId: data.supplierId || "",
            deliveredTo: data.deliveredTo || "",
            requiredOn: data.requiredOn?.toDate ? data.requiredOn.toDate().toISOString().slice(0, 10) : "",
            additionalInfo: data.additionalInfo || "",
            cancelReason: data.cancelReason || "",
          });
          // Restore item names for display
          const loadedItems = data.items || [];
          const enrichedItems = loadedItems.map((item: any) => {
            const foundItem = items.find(i => i.id === item.itemId);
            return {
              ...item,
              itemName: foundItem?.name || "Unknown Item",
            };
          });
          setPOItems(enrichedItems);
        }
      };
      fetch();
    }
  }, [id, mode, items]);

  const addPOItem = () => {
    setPOItems([...poItems, { itemId: "", quantity: 1, unitPrice: 0, discount: 0, amount: 0 }]);
  };

  const updatePOItem = (index: number, field: keyof POItem, value: string | number) => {
    const newItems = [...poItems];

    if (field === "itemId") {
      const selectedItem = items.find(i => i.id === value);
      if (selectedItem) {
        newItems[index].itemId = value as string;
        newItems[index].unitPrice = selectedItem.costPrice;
        newItems[index].itemName = selectedItem.name;
      } else {
        newItems[index].itemId = "";
        newItems[index].unitPrice = 0;
        newItems[index].itemName = undefined;
      }
    } else if (field === "quantity" || field === "discount") {
      newItems[index][field] = Number(value) || 0;
    }

    // Recalculate amount
    const qty = newItems[index].quantity;
    const price = newItems[index].unitPrice;
    const disc = newItems[index].discount / 100;
    newItems[index].amount = qty * price * (1 - disc);

    setPOItems(newItems);
  };

  const removePOItem = (index: number) => {
    setPOItems(poItems.filter((_, i) => i !== index));
  };

  const subtotal = poItems.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.some(item => !item.itemId)) {
      toast.error("Please select an item for all rows");
      return;
    }

    setLoading(true);

    try {
      const branch = branches.find((b) => b.id === formData.branchId);
      const supplier = suppliers.find((s) => s.id === formData.supplierId);

      const payload: any = {
        refNumber: `PO-${Date.now()}`,
        branchId: formData.branchId,
        branchName: branch?.name || "",
        supplierId: formData.supplierId,
        supplierName: supplier?.name || "",
        deliveredTo: formData.deliveredTo,
        requiredOn: formData.requiredOn ? new Date(formData.requiredOn) : null,
        additionalInfo: formData.additionalInfo,
        items: poItems.map(item => ({
  itemId: item.itemId,
  itemName: item.itemName || "",
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  discount: item.discount,
  amount: item.amount,
})),
        totalAmount: subtotal,
        status: isCancel ? "cancelled" : "pending",
        personnel: "Current User",
        createdAt: serverTimestamp(),
      };

      if (isCancel && formData.cancelReason) {
        payload.cancelReason = formData.cancelReason;
      }

      if (mode === "add") {
        await addDoc(collection(db, "purchaseOrders"), payload);
        toast.success("Purchase Order created");
      } else if ((mode === "edit" || mode === "cancel") && id) {
        await setDoc(doc(db, "purchaseOrders", id), payload, { merge: true });
        toast.success(isCancel ? "PO cancelled" : "PO updated");
      }

      navigate(`${getStaffBasePath(role)}/utilities/purchase-orders`, { replace: true });
    } catch (error: any) {
      console.error("PO save error:", error);
      toast.error("Failed to save PO");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`${getStaffBasePath(role)}/all-invoices`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {isView ? "View PO" : mode === "add" ? "Add Purchase Order" : mode === "edit" ? "Edit PO" : "Cancel PO"}
        </h1>
      </div>

      <div className="bg-card border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Organization Branch *</Label>
              {isView ? (
                <Input value={branches.find((b) => b.id === formData.branchId)?.name || "N/A"} disabled />
              ) : (
                <Select value={formData.branchId} onValueChange={(v) => setFormData({ ...formData, branchId: v })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Supplier *</Label>
              {isView ? (
                <Input value={suppliers.find((s) => s.id === formData.supplierId)?.name || "N/A"} disabled />
              ) : (
                <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Deliver To</Label>
              <Input value={formData.deliveredTo} onChange={(e) => setFormData({ ...formData, deliveredTo: e.target.value })} disabled={isView} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Required On *</Label>
              <Input type="date" value={formData.requiredOn} onChange={(e) => setFormData({ ...formData, requiredOn: e.target.value })} disabled={isView} required />
            </div>
          </div>

          {/* Item Details Table */}
          <div className="space-y-2 overflow-x-auto">
            <Label>Item Details</Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price (KSh)</TableHead>
                    <TableHead>Discount (%)</TableHead>
                    <TableHead>Amount (KSh)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No items added
                      </TableCell>
                    </TableRow>
                  ) : (
                    poItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {isView ? (
                            item.itemName || "N/A"
                          ) : (
                            <Select value={item.itemId} onValueChange={(v) => updatePOItem(index, "itemId", v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map((it) => (
                                  <SelectItem key={it.id} value={it.id}>
                                    {it.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updatePOItem(index, "quantity", e.target.value)}
                            disabled={isView}
                          />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={item.unitPrice.toFixed(2)} disabled />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => updatePOItem(index, "discount", e.target.value)}
                            disabled={isView}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          KSh {item.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {!isView && (
                            <Button variant="ghost" size="icon" onClick={() => removePOItem(index)}>
                              <Trash className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {!isView && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        <Button variant="outline" onClick={addPOItem}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end mt-4">
              <div className="text-right">
                <p className="text-lg font-bold">Subtotal: KSh {subtotal.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Info</Label>
            <Textarea value={formData.additionalInfo} onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })} disabled={isView} />
          </div>

          {isCancel && (
            <div className="space-y-2">
              <Label>Cancel Reason *</Label>
              <Textarea
                value={formData.cancelReason}
                onChange={(e) => setFormData({ ...formData, cancelReason: e.target.value })}
                required
                placeholder="Please provide a reason for cancellation"
              />
            </div>
          )}

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button variant="outline" onClick={() => navigate(-1)}>
              {isView ? "Back" : "Cancel"}
            </Button>
            {!isView && (
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-primary to-accent">
                {loading ? "Saving..." : isCancel ? "Confirm Cancel" : "Save PO"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default POForm;