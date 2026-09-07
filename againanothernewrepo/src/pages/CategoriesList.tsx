// src/pages/CategoriesList.tsx
import { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

const CategoriesList = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const q = collection(db, "categories");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
      setCategories(data);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await deleteDoc(doc(db, "categories", id));
      toast.success("Category deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Categories
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage inventory categories ({categories.length} total)
          </p>
        </div>
        <Button onClick={() => navigate("/lms/manager/utilities/categories/add")} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-16 text-muted-foreground">
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(category => (
                <TableRow key={category.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-right space-x-3">
                    <button onClick={() => navigate(`/lms/manager/utilities/categories/${category.id}`)} className="text-primary hover:underline text-sm">View</button>
                    <button onClick={() => navigate(`/lms/manager/utilities/categories/${category.id}/edit`)} className="text-accent hover:underline text-sm">Edit</button>
                    <button onClick={() => handleDelete(category.id)} className="text-destructive hover:underline text-sm">Delete</button>
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

export default CategoriesList;