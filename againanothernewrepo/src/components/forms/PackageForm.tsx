// src/components/forms/PackageForm.tsx
import { useState } from "react";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Package {
  id?: string;
  name: string;
  isActive: boolean;
}

interface PackageFormProps {
  mode: "add" | "view" | "edit";
  pkg?: Package | null;
  onSuccess?: () => void;
}

const PackageForm = ({ mode, pkg }: PackageFormProps) => {
  const navigate = useNavigate();
  const isView = mode === "view";
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: pkg?.name || "",
    isActive: pkg?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isView) return;
    if (!formData.name.trim()) {
      toast.error("Package name is required");
      return;
    }

    setLoading(true);
    try {
      if (mode === "edit" && pkg?.id) {
        await setDoc(doc(db, "packages", pkg.id), {
          name: formData.name.trim(),
          isActive: formData.isActive,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        toast.success("Package updated successfully");
      } else {
        await addDoc(collection(db, "packages"), {
          name: formData.name.trim(),
          isActive: formData.isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("Package created successfully");
      }
      navigate("/lms/manager/utilities/packages");
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
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
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {mode === "add" && "Add New Package"}
            {mode === "view" && `Package: ${pkg?.name || "Loading..."}`}
            {mode === "edit" && `Edit Package: ${pkg?.name}`}
          </h1>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Package Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Lite, Standard, Premium"
                disabled={isView}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                  disabled={isView}
                />
                <span className={formData.isActive ? "text-green-600 font-medium" : "text-muted-foreground"}>
                  {formData.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            {isView && (
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Back
              </Button>
            )}
            {!isView && (
              <>
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-gradient-to-r from-primary to-accent">
                  {loading ? "Saving..." : mode === "edit" ? "Update Package" : "Create Package"}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PackageForm;