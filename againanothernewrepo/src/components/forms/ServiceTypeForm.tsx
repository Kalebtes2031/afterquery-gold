// src/components/forms/ServiceTypeForm.tsx — FIXED: Proper Data Loading for Edit/View
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

interface ServiceType {
  id?: string;
  name: string;
  isExtraService: boolean;
  isActive: boolean;
}

interface ServiceTypeFormProps {
  mode: "add" | "view" | "edit";
}

const ServiceTypeForm = ({ mode }: ServiceTypeFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>(); // Get ID from URL for edit/view

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit || isView);
  const [formData, setFormData] = useState({
    name: "",
    isExtraService: false,
    isActive: true,
  });

  // Fetch service data for edit/view modes
  useEffect(() => {
    if (!isEdit && !isView) {
      setFetching(false);
      return;
    }

    if (!id) {
      toast.error("Service ID is missing");
      navigate("/lms/manager/utilities/service-types");
      return;
    }

    const fetchService = async () => {
      try {
        const serviceDoc = await getDoc(doc(db, "serviceTypes", id));
        if (serviceDoc.exists()) {
          const data = serviceDoc.data();
          setFormData({
            name: data.name || "",
            isExtraService: data.isExtraService ?? false,
            isActive: data.isActive ?? true,
          });
        } else {
          toast.error("Service type not found");
          navigate("/lms/manager/utilities/service-types");
        }
      } catch (err: any) {
        toast.error("Failed to load service: " + err.message);
      } finally {
        setFetching(false);
      }
    };

    fetchService();
  }, [id, isEdit, isView, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isView) return;

    if (!formData.name.trim()) {
      toast.error("Service name is required");
      return;
    }

    setLoading(true);
    try {
      if (isEdit && id) {
        await setDoc(
          doc(db, "serviceTypes", id),
          {
            ...formData,
            name: formData.name.trim(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        toast.success("Service type updated successfully");
      } else {
        await addDoc(collection(db, "serviceTypes"), {
          ...formData,
          name: formData.name.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success("Service type created successfully");
      }

      navigate("/lms/manager/utilities/service-types");
    } catch (err: any) {
      toast.error("Failed to save service type: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-muted-foreground">Loading service type data...</div>
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
          {isAdd && "Add New Service Type"}
          {isView && `View Service Type: ${formData.name || "—"}`}
          {isEdit && `Edit Service Type: ${formData.name || "—"}`}
        </h1>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Premium Wash & Iron, Dry Cleaning"
                disabled={isView}
                required
              />
            </div>

            <div className="space-y-2 flex items-end">
              <div className="w-full">
                <Label>Type</Label>
                {isView ? (
                  <Input
                    value={formData.isExtraService ? "Extra Service (Add-on)" : "Main Service"}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formData.isExtraService}
                      onCheckedChange={(v) => setFormData({ ...formData, isExtraService: v })}
                    />
                    <span
                      className={`font-medium ${
                        formData.isExtraService ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {formData.isExtraService ? "Extra Service (Add-on)" : "Main Service"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      className={`font-medium ${
                        formData.isActive ? "text-green-600" : "text-muted-foreground"
                      }`}
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
                {loading ? "Saving..." : isEdit ? "Update Service Type" : "Create Service Type"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceTypeForm;