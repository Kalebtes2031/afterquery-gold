// src/components/forms/BranchForm.tsx — FIXED: Self-fetching for edit/view, no race condition
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

interface Branch {
  id?: string;
  name: string;
  location: string;
  phone: string;
  isActive: boolean;
}

interface BranchFormProps {
  mode: "add" | "view" | "edit";
}

const BranchForm = ({ mode }: BranchFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>(); // Get ID from URL

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit || isView);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    phone: "",
    isActive: true,
  });

  // Fetch branch data for edit/view
  useEffect(() => {
    if (!isEdit && !isView) {
      setFetching(false);
      return;
    }

    if (!id) {
      toast.error("Branch ID is missing");
      navigate("/lms/manager/utilities/branches");
      return;
    }

    const fetchBranch = async () => {
      try {
        const branchDoc = await getDoc(doc(db, "branches", id));
        if (branchDoc.exists()) {
          const data = branchDoc.data();
          setFormData({
            name: data.name || "",
            location: data.location || "",
            phone: data.phone || "",
            isActive: data.isActive ?? true,
          });
        } else {
          toast.error("Branch not found");
          navigate("/lms/manager/utilities/branches");
        }
      } catch (err: any) {
        toast.error("Failed to load branch: " + err.message);
      } finally {
        setFetching(false);
      }
    };

    fetchBranch();
  }, [id, isEdit, isView, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isView) return;

    if (!formData.name.trim() || !formData.location.trim() || !formData.phone.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      if (isEdit && id) {
        await setDoc(
          doc(db, "branches", id),
          {
            ...formData,
            name: formData.name.trim(),
            location: formData.location.trim(),
            phone: formData.phone.trim(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        toast.success("Branch updated successfully");
      } else {
        await addDoc(collection(db, "branches"), {
          ...formData,
          name: formData.name.trim(),
          location: formData.location.trim(),
          phone: formData.phone.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("Branch created successfully");
      }

      navigate("/lms/manager/utilities/branches");
    } catch (err: any) {
      toast.error("Failed to save branch: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-muted-foreground">Loading branch data...</div>
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
          {isAdd && "Add New Branch"}
          {isView && `View Branch: ${formData.name || "—"}`}
          {isEdit && `Edit Branch: ${formData.name || "—"}`}
        </h1>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Branch Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Chuka Branch"
                disabled={isView}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Location *</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Chuka Town, Meru County"
                disabled={isView}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +254712345678"
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
                {loading ? "Saving..." : isEdit ? "Update Branch" : "Create Branch"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchForm;