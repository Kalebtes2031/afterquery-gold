// src/pages/StockList.tsx — FINAL USING STORED currentQty
import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, getDocs, getDoc, doc, orderBy } from "firebase/firestore";
import { db } from "@/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StockItem {
  itemId: string;
  itemName: string;
  branchId: string;
  branchName: string;
  category: string;
  baseUom: string;
  currentQty: number;
  packetUnit: string;
  packetsPerBox: number;
  displayStock: string;
}

const StockList = () => {
  const { role, branchId } = useAuth();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(role === "employee" ? branchId || "" : "");
  const [search, setSearch] = useState("");

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

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const movements = snapshot.docs.map(doc => doc.data());

      // Group by itemId and take latest currentQty
      const latestByItem: { [itemId: string]: any } = {};
      movements.forEach(mov => {
        if (!latestByItem[mov.itemId] || mov.createdAt.toDate() > latestByItem[mov.itemId].createdAt.toDate()) {
          latestByItem[mov.itemId] = mov;
        }
      });

      const stockItems: StockItem[] = [];

      for (const itemId of Object.keys(latestByItem)) {
        const mov = latestByItem[itemId];
        const itemSnap = await getDoc(doc(db, "items", itemId));
        if (!itemSnap.exists()) continue;

        const itemData = itemSnap.data();

        let packetsPerBox = 0;
        let packetUnit = itemData.uomName || "Unit";

        const packagingSnap = await getDocs(collection(db, "items", itemId, "packaging"));
        if (!packagingSnap.empty) {
          const pack = packagingSnap.docs[0].data();
          packetsPerBox = pack.quantity || 0;

          const variantSnap = await getDoc(doc(db, "items", itemId, "variants", pack.variantId));
          if (variantSnap.exists()) {
            packetUnit = variantSnap.data().size || "Packet";
          }
        }

        const currentQty = mov.currentQty || 0;
        const boxes = Math.floor(currentQty / packetsPerBox);
        const remaining = currentQty % packetsPerBox;

        let display = `${currentQty} ${packetUnit}${currentQty !== 1 ? 's' : ''}`;
        if (packetsPerBox > 0) {
          display += ` (${boxes} Box${boxes !== 1 ? 'es' : ''}`;
          if (remaining > 0) display += ` + ${remaining} ${packetUnit}${remaining !== 1 ? 's' : ''}`;
          display += ")";
        }

        stockItems.push({
          itemId,
          itemName: itemData.name,
          branchId: selectedBranch,
          branchName: mov.branchName || "Unknown",
          category: itemData.categoryName || "Unknown",
          baseUom: itemData.uomName || "Unit",
          currentQty,
          packetUnit,
          packetsPerBox,
          displayStock: display,
        });
      }

      setStock(stockItems);
    }, (error) => {
      toast.error("Failed to load stock");
    });

    return () => unsubscribe();
  }, [selectedBranch]);

  const filtered = stock.filter(s =>
    s.itemName.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Stock List
          </h1>
          <p className="text-muted-foreground mt-2">
            Current stock levels ({stock.length} items)
          </p>
        </div>
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
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="bg-card border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Base UoM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  No stock items found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(item => (
                <TableRow key={`${item.itemId}-${item.branchId}`}>
                  <TableCell className="font-medium">{item.itemName}</TableCell>
                  <TableCell>{item.branchName}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className={`font-bold ${item.currentQty < 10 ? "text-red-600" : ""}`}>
                    {item.displayStock}
                  </TableCell>
                  <TableCell>{item.baseUom}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default StockList;