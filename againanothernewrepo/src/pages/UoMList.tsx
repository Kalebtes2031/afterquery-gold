// src/pages/UoMList.tsx
import { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface UoM {
  id: string;
  name: string;
}

const UoMList = () => {
  const [uoms, setUoMs] = useState<UoM[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const q = collection(db, "uom");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
      setUoMs(data);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this unit of measure?")) return;
    try {
      await deleteDoc(doc(db, "uom", id));
      toast.success("Unit deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const filtered = uoms.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Units of Measure
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage units used in inventory ({uoms.length} total)
          </p>
        </div>
        <Button onClick={() => navigate("/lms/manager/utilities/uom/add")} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-2" />
          Add Unit
        </Button>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search units..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-16 text-muted-foreground">
                  No units found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(uom => (
                <TableRow key={uom.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{uom.name}</TableCell>
                  <TableCell className="text-right space-x-3">
                    <button onClick={() => navigate(`/lms/manager/utilities/uom/${uom.id}`)} className="text-primary hover:underline text-sm">View</button>
                    <button onClick={() => navigate(`/lms/manager/utilities/uom/${uom.id}/edit`)} className="text-accent hover:underline text-sm">Edit</button>
                    <button onClick={() => handleDelete(uom.id)} className="text-destructive hover:underline text-sm">Delete</button>
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

export default UoMList;