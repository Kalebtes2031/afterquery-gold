// src/pages/manager/utilities/Packages.tsx
import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import PackageForm from "@/components/forms/PackageForm";


interface Package {
  id: string;
  name: string;
  isActive: boolean;
}

type Mode = "list" | "add" | "view" | "edit";

const Packages = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [packages, setPackages] = useState<Package[]>([]);
  const [currentPackage, setCurrentPackage] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);

  const mode: Mode = id
    ? location.pathname.includes("/edit") ? "edit" : "view"
    : location.pathname.includes("/add") ? "add"
    : "list";

  useEffect(() => {
    const q = query(collection(db, "packages"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Package));
      setPackages(data);
      setLoading(false);

      if (id && (mode === "view" || mode === "edit")) {
        const found = data.find(p => p.id === id);
        setCurrentPackage(found || null);
      }
    });
    return unsub;
  }, [id, mode]);

  const handleDelete = async (packageId: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;
    try {
      await deleteDoc(doc(db, "packages", packageId));
      toast.success("Package deleted successfully");
    } catch {
      toast.error("Failed to delete package");
    }
  };

  if (mode !== "list") {
    return (
      <PackageForm
        mode={mode}
        pkg={currentPackage}
        onSuccess={() => navigate("/lms/manager/utilities/packages")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Packages
          </h1>
          <p className="text-muted-foreground mt-2">Manage service packages like Lite, Standard, Premium</p>
        </div>
        <Button onClick={() => navigate("/lms/manager/utilities/packages/add")} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-2" /> Add Package
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Loading packages...
                  </TableCell>
                </TableRow>
              ) : packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-16 text-muted-foreground">
                    <div className="space-y-4">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/50" />
                      <p className="text-lg">No packages yet</p>
                      <Button onClick={() => navigate("/lms/manager/utilities/packages/add")}>
                        Add Your First Package
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        pkg.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {pkg.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`${pkg.id}`)}>
                        View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`${pkg.id}/edit`)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(pkg.id)}>
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

export default Packages;