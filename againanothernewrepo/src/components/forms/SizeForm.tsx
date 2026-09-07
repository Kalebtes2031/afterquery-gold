// src/components/forms/SizeForm.tsx — FIXED: Proper Data Loading for Edit/View
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

interface Size {
  id?: string;
  name: string;
  isActive: boolean;
}

interface SizeFormProps {
  mode: "add" | "view" | "edit";
}

const SizeForm = ({ mode }: SizeFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>(); // Get ID from URL for edit/view

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit || isView);
  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
  });

  // Load size data for edit/view modes
  useEffect(() => {
    if (!isEdit && !isView) {
      setFetching(false);
      return;
    }

    if (!id) {
      toast.error("Size ID is missing");
      navigate("/lms/manager/utilities/sizes");
      return;
    }

    const fetchSize = async () => {
      try {
        const sizeDoc = await getDoc(doc(db, "sizes", id));
        if (sizeDoc.exists()) {
          const data = sizeDoc.data();
          setFormData({
            name: data.name || "",
            isActive: data.isActive ?? true,
          });
        } else {
          toast.error("Size not found");
          navigate("/lms/manager/utilities/sizes");
        }
      } catch (err: any) {
        toast.error("Failed to load size: " + err.message);
      } finally {
        setFetching(false);
      }
    };

    fetchSize();
  }, [id, isEdit, isView, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isView) return;

    if (!formData.name.trim()) {
      toast.error("Size name is required");
      return;
    }

    setLoading(true);
    try {
      if (isEdit && id) {
        await setDoc(
          doc(db, "sizes", id),
          {
            name: formData.name.trim(),
            isActive: formData.isActive,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        toast.success("Size updated successfully");
      } else {
        await addDoc(collection(db, "sizes"), {
          name: formData.name.trim(),
          isActive: formData.isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("Size created successfully");
      }

      navigate("/lms/manager/utilities/sizes");
    } catch (err: any) {
      toast.error("Failed to save size: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-muted-foreground">Loading size data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {isAdd && "Add New Size"}
          {isView && `View Size: ${formData.name || "—"}`}
          {isEdit && `Edit Size: ${formData.name || "—"}`}
        </h1>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Size Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Small, Medium, Large, King Size"
                disabled={isView}
                required
              />
            </div>

            <div className="space-y-2 flex items-end">
              <div className="w-full">
                <Label>Status</Label>
                {isView ? (
                  <Input
                    value={formData.isActive ? "Active" : "Inactive"}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                    />
                    <span
                      className={`font-medium ${formData.isActive ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      {formData.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              {isView ? "Back" : "Cancel"}
            </Button>

            {!isView && (
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-primary to-accent"
              >
                {loading ? "Saving..." : isEdit ? "Update Size" : "Create Size"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default SizeForm;