// src/pages/manager/utilities/Sizes.tsx
import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, deleteDoc, getDoc } from "firebase/firestore"; // ← added getDoc
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { Plus, Edit, Trash2, Ruler } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import SizeForm from "@/components/forms/SizeForm";

interface Size {
  id: string;
  name: string;
  isActive: boolean;
}

type Mode = "list" | "add" | "view" | "edit";

const Sizes = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [sizes, setSizes] = useState<Size[]>([]);
  const [currentSize, setCurrentSize] = useState<Size | null>(null);
  const [loading, setLoading] = useState(true);

  const mode: Mode = id
    ? location.pathname.includes("/edit") ? "edit" : "view"
    : location.pathname.includes("/add") ? "add"
    : "list";

  useEffect(() => {
    const q = query(collection(db, "sizes"));
    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Size));
      setSizes(data);
      setLoading(false);

      if (id && (mode === "view" || mode === "edit")) {
        const found = data.find(s => s.id === id);
        if (found) {
          setCurrentSize(found);
        } else {
          // ← THIS IS THE IMPORTANT FIX — fallback single doc fetch
          try {
            const docSnap = await getDoc(doc(db, "sizes", id));
            if (docSnap.exists()) {
              setCurrentSize({ id: docSnap.id, ...docSnap.data() } as Size);
            } else {
              toast.error("Size not found");
              navigate("/lms/manager/utilities/sizes");
            }
          } catch (err) {
            console.error("Error fetching size:", err);
          }
        }
      }
    });

    return unsub;
  }, [id, mode, navigate]); // ← added navigate to deps

  const handleDelete = async (sizeId: string) => {
    if (!confirm("Are you sure you want to delete this size?")) return;
    try {
      await deleteDoc(doc(db, "sizes", sizeId));
      toast.success("Size deleted successfully");
    } catch {
      toast.error("Failed to delete size");
    }
  };

  if (mode !== "list") {
    return (
      <SizeForm
        mode={mode}
        
        
      />
    );
  }

  // List view remains unchanged...
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Sizes
          </h1>
          <p className="text-muted-foreground mt-2">Manage item sizes (e.g., Small, Medium, Large for duvets, carpets, curtains)</p>
        </div>
        <Button onClick={() => navigate("/lms/manager/utilities/sizes/add")} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-2" /> Add Size
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Loading sizes...
                  </TableCell>
                </TableRow>
              ) : sizes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-16 text-muted-foreground">
                    <div className="space-y-4">
                      <Ruler className="w-12 h-12 mx-auto text-muted-foreground/50" />
                      <p className="text-lg">No sizes defined yet</p>
                      <Button onClick={() => navigate("/lms/manager/utilities/sizes/add")}>
                        Add Your First Size
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sizes.map((size) => (
                  <TableRow key={size.id}>
                    <TableCell className="font-medium">{size.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        size.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {size.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`${size.id}`)}>
                        View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`${size.id}/edit`)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(size.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Sizes;