// src/pages/manager/utilities/Branches.tsx
import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import BranchForm from "@/components/forms/BranchForm";

interface Branch {
  id: string;
  name: string;
  location: string;
  phone: string;
  isActive: boolean;
}

interface BranchesProps {
  mode: "list" | "add" | "view" | "edit";
}

const Branches = ({ mode: propMode }: BranchesProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine mode from route
  const mode = propMode || (id 
    ? (location.pathname.includes("/edit") ? "edit" : "view")
    : location.pathname.includes("/add") ? "add" 
    : "list");

  useEffect(() => {
    const q = query(collection(db, "branches"));
    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
      setBranches(data);

      if (id && (mode === "view" || mode === "edit")) {
        const found = data.find(b => b.id === id);
        if (found) {
          setCurrentBranch(found);
        } else {
          // fallback fetch if not in list yet
          const docSnap = await getDoc(doc(db, "branches", id));
          if (docSnap.exists()) {
            setCurrentBranch({ id: docSnap.id, ...docSnap.data() } as Branch);
          }
        }
      }
      setLoading(false);
    });
    return unsub;
  }, [id, mode]);

  const handleDelete = async (branchId: string) => {
    if (!confirm("Delete this branch?")) return;
    try {
      await deleteDoc(doc(db, "branches", branchId));
      toast.success("Branch deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  // FORM MODE — SHOW FORM
  if (mode !== "list") {
    return (
      <BranchForm
        mode={mode}
        
        {...({ onSuccess: () => navigate("/lms/manager/utilities/branches") } as any)}
      />
    );
  }

  // LIST MODE
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Branches
          </h1>
          <p className="text-muted-foreground mt-2">Manage your laundry locations</p>
        </div>
        <Button onClick={() => navigate("/lms/manager/utilities/branches/add")} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-2" /> Add Branch
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : branches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                    <div className="space-y-4">
                      <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50" />
                      <p className="text-lg">No branches yet</p>
                      <Button onClick={() => navigate("/lms/manager/utilities/branches/add")}>
                        Add Your First Branch
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>{branch.location}</TableCell>
                    <TableCell>{branch.phone}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        branch.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {branch.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/lms/manager/utilities/branches/${branch.id}`)}>
                        View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/lms/manager/utilities/branches/${branch.id}/edit`)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(branch.id)}>
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

export default Branches;




