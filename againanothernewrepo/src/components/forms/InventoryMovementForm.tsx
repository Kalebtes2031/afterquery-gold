// src/components/forms/InventoryMovementForm.tsx — FINAL WITH currentQty & UNIQUE REF
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const InventoryMovementForm = () => {
  const navigate = useNavigate();
  const { user, branchId, branchName } = useAuth();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [currentStockInPackets, setCurrentStockInPackets] = useState(0);
  const [packetSize, setPacketSize] = useState<string>("Packet");
  const [quantityUsed, setQuantityUsed] = useState("");
  const [notes, setNotes] = useState("");

  // Load all items
  useEffect(() => {
    const loadItems = async () => {
      try {
        const snap = await getDocs(collection(db, "items"));
        const itemList = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setItems(itemList);
      } catch (error) {
        toast.error("Failed to load items");
      }
    };
    loadItems();
  }, []);

  // Calculate current stock in smallest unit when item selected
  useEffect(() => {
    if (!selectedItemId || !branchId) {
      setCurrentStockInPackets(0);
      setPacketSize("Unit");
      return;
    }

    const calculateStock = async () => {
      try {
        const q = query(
          collection(db, "inventoryMovements"),
          where("itemId", "==", selectedItemId),
          where("branchId", "==", branchId)
        );
        const snap = await getDocs(q);
        let totalUnits = snap.docs.reduce((sum, doc) => {
          const data = doc.data();
          return sum + (data.quantity || 0);
        }, 0);

        // Get unit name from item/variant
        const selectedItem = items.find(i => i.id === selectedItemId);
        const packagingSnap = await getDocs(collection(db, "items", selectedItemId, "packaging"));
        let unitName = selectedItem?.uomName || "Unit";

        if (!packagingSnap.empty) {
          const packData = packagingSnap.docs[0].data();
          const variantSnap = await getDoc(doc(db, "items", selectedItemId, "variants", packData.variantId));
          if (variantSnap.exists()) {
            unitName = variantSnap.data().size || "Packet";
          }
        }

        setCurrentStockInPackets(totalUnits);
        setPacketSize(unitName);
      } catch (error) {
        setCurrentStockInPackets(0);
        setPacketSize("Unit");
      }
    };

    calculateStock();
  }, [selectedItemId, branchId, items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const qty = parseInt(quantityUsed);
    if (!selectedItemId) {
      toast.error("Please select an item");
      return;
    }
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (qty > currentStockInPackets) {
      toast.error(`Only ${currentStockInPackets} ${packetSize}(s) available`);
      return;
    }

    setLoading(true);
    try {
      const selectedItem = items.find(i => i.id === selectedItemId);

      // Calculate current total before this use
      const currentMovQ = query(
        collection(db, "inventoryMovements"),
        where("itemId", "==", selectedItemId),
        where("branchId", "==", branchId)
      );
      const currentSnap = await getDocs(currentMovQ);
      const currentTotal = currentSnap.docs.reduce((sum, d) => sum + (d.data().quantity || 0), 0);

      const newBalance = currentTotal - qty;

      const movementRef = `MOV-${Date.now()}${Math.floor(Math.random() * 1000)}`;

      await addDoc(collection(db, "inventoryMovements"), {
        itemId: selectedItemId,
        itemName: selectedItem.name,
        branchId,
        branchName: branchName || "Unknown",
        quantity: -qty,
        currentQty: newBalance, // ← STORED BALANCE
        transactionType: "Use",
        reference: movementRef,
        reason: notes.trim() || "Used in operations",
        personnel: user?.displayName || user?.email?.split("@")[0] || "Employee",
        createdAt: serverTimestamp(),
      });

      toast.success(`Successfully used ${qty} ${packetSize}(s)`);
      navigate(-1);
    } catch (error) {
      console.error("Error logging usage:", error);
      toast.error("Failed to record usage");
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
          Use Stock
        </h1>
      </div>

      <div className="bg-card border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Item *</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {items.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">Loading items...</div>
                  ) : (
                    items.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.uomName || "Unit"})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Current Stock</Label>
              <Input 
                value={`${currentStockInPackets} ${packetSize}${currentStockInPackets !== 1 ? 's' : ''}`} 
                disabled 
                className="font-medium text-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Quantity Used ({packetSize}) *</Label>
              <Input
                type="number"
                min="1"
                max={currentStockInPackets}
                value={quantityUsed}
                onChange={e => setQuantityUsed(e.target.value)}
                placeholder={`Enter number of ${packetSize}s used`}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Branch</Label>
              <Input value={branchName || "Loading..."} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g., Used for laundry batch #123, given to customer, damaged, etc."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button variant="outline" type="button" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-primary to-accent">
              {loading ? "Saving..." : "Record Usage"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryMovementForm;