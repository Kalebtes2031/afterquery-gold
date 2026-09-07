// src/components/forms/CategoryForm.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

type Mode = "add" | "edit" | "view";

const CategoryForm = ({ mode = "add" }: { mode?: Mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const isView = mode === "view";

  useEffect(() => {
    if ((mode === "edit" || mode === "view") && id) {
      const fetch = async () => {
        const snap = await getDoc(doc(db, "categories", id));
        if (snap.exists()) {
          setName(snap.data().name || "");
        }
      };
      fetch();
    }
  }, [id, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isView) return;

    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setLoading(true);
    try {
      if (mode === "add") {
        await setDoc(doc(db, "categories", Date.now().toString()), {
          name: name.trim(),
          createdAt: serverTimestamp(),
        });
        toast.success("Category added");
      } else if (mode === "edit" && id) {
        await setDoc(doc(db, "categories", id), { name: name.trim() }, { merge: true });
        toast.success("Category updated");
      }
      navigate("/lms/manager/utilities/categories");
    } catch {
      toast.error("Operation failed");
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
          {isView ? "View Category" : mode === "add" ? "Add Category" : "Edit Category"}
        </h1>
      </div>

      <div className="bg-card border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div className="space-y-2">
            <Label>Category Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isView}
              required
              placeholder="e.g., Detergents"
            />
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button variant="outline" onClick={() => navigate(-1)}>
              {isView ? "Back" : "Cancel"}
            </Button>
            {!isView && (
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-primary to-accent">
                {loading ? "Saving..." : "Save Category"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;