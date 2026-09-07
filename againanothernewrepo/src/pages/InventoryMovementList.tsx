// src/pages/InventoryMovementList.tsx — FINAL USING STORED currentQty
import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Movement {
  id: string;
  itemId: string;
  itemName: string;
  branchId: string;
  branchName: string;
  quantity: number;
  transactionType: "adjustment" | "Use";
  reference: string;
  reason: string;
  personnel: string;
  createdAt: any;
  currentQty: number; // ← STORED ON DOCUMENT
}

const InventoryMovementList = () => {
  const { role, branchId } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(role === "employee" ? branchId || "" : "");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (role === "manager") {
      const load = async () => {
        const snap = await getDocs(collection(db, "branches"));
        setBranches(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
      };
      load();
    }
  }, [role]);

  useEffect(() => {
    if (!selectedBranch) return;

    const q = query(
      collection(db, "inventoryMovements"),
      where("branchId", "==", selectedBranch),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        currentQty: doc.data().currentQty || 0, // fallback
      } as Movement));
      setMovements(data);
    }, (error) => {
      toast.error("Failed to load movements");
    });

    return () => unsubscribe();
  }, [selectedBranch]);

  const filtered = movements.filter(m =>
    m.itemName.toLowerCase().includes(search.toLowerCase()) ||
    m.reason.toLowerCase().includes(search.toLowerCase()) ||
    m.transactionType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Inventory Movement
          </h1>
          <p className="text-muted-foreground mt-2">
            Full audit trail ({movements.length} transactions)
          </p>
        </div>
        <div className="flex gap-4">
          {role === "manager" && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => navigate("use")} className="bg-gradient-to-r from-primary to-accent">
            <Plus className="w-4 h-4 mr-2" />
            Use Stock
          </Button>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by item, reason, or type..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="bg-card border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Moved Qty</TableHead>
              <TableHead>Current Qty</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                  No movements recorded
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(mov => (
                <TableRow key={mov.id}>
                  <TableCell className="font-medium">{mov.reference}</TableCell>
                  <TableCell>{format(mov.createdAt.toDate(), "MMM d, yyyy HH:mm")}</TableCell>
                  <TableCell>{mov.itemName}</TableCell>
                  <TableCell>{mov.branchName}</TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      mov.transactionType === "adjustment" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {mov.transactionType}
                    </span>
                  </TableCell>
                  <TableCell className={mov.quantity > 0 ? "text-green-600" : "text-red-600"}>
                    {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                  </TableCell>
                  <TableCell className={`font-bold ${mov.currentQty < 10 ? "text-red-600" : "text-foreground"}`}>
                    {mov.currentQty}
                  </TableCell>
                  <TableCell>{mov.reason}</TableCell>
                  <TableCell>{mov.personnel}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default InventoryMovementList;