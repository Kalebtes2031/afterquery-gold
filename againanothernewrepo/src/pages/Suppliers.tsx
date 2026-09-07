// src/pages/SuppliersList.tsx
import { useState, useEffect } from "react";
import { collection, query, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  categoryName: string;
  contact: string;
  email: string;
  address?: string;
  paymentTerms?: string;
}

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "suppliers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
      setSuppliers(data);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this supplier?")) return;
    try {
      await deleteDoc(doc(db, "suppliers", id));
      toast.success("Supplier deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.contact.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Suppliers
          </h1>
          <p className="text-muted-foreground mt-2">Manage your suppliers ({suppliers.length} total)</p>
        </div>
        <Button onClick={() => navigate("/lms/manager/utilities/suppliers/add")} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name, email or contact..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  No suppliers found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(supplier => (
                <TableRow key={supplier.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.categoryName}</TableCell>
                  <TableCell>{supplier.contact}</TableCell>
                  <TableCell>{supplier.email}</TableCell>
                  <TableCell className="text-right space-x-3">
                    <button onClick={() => navigate(`/lms/manager/utilities/suppliers/${supplier.id}`)} className="text-primary hover:underline text-sm">View</button>
                    <button onClick={() => navigate(`/lms/manager/utilities/suppliers/${supplier.id}/edit`)} className="text-accent hover:underline text-sm">Edit</button>
                    <button onClick={() => handleDelete(supplier.id)} className="text-destructive hover:underline text-sm">Delete</button>
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

export default Suppliers;