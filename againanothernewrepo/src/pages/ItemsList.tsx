// src/pages/ItemsList.tsx
import { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Item {
  id: string;
  name: string;
  categoryName: string;
  uomName: string;
  costPrice: number;
}

const ItemsList = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const q = collection(db, "items");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Item));
      setItems(data);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteDoc(doc(db, "items", id));
      toast.success("Item deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.categoryName.toLowerCase().includes(search.toLowerCase()) ||
    item.uomName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Item Registry
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage inventory items ({items.length} total)
          </p>
        </div>
        <Button onClick={() => navigate("/lms/manager/utilities/items/add")} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  No items found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(item => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.categoryName}</TableCell>
                  <TableCell>{item.uomName}</TableCell>
                  <TableCell>KSh {item.costPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-right space-x-3">
                    <button onClick={() => navigate(`/lms/manager/utilities/items/${item.id}`)} className="text-primary hover:underline text-sm">View</button>
                    <button onClick={() => navigate(`/lms/manager/utilities/items/${item.id}/edit`)} className="text-accent hover:underline text-sm">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="text-destructive hover:underline text-sm">Delete</button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ItemsList;