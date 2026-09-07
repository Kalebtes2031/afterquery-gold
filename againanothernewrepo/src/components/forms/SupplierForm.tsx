// src/components/forms/SupplierForm.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

type Mode = "add" | "edit" | "view";

interface Category {
  id: string;
  name: string;
}

const SupplierForm = ({ mode = "add" }: { mode?: Mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    contact: "",
    email: "",
    address: "",
    paymentTerms: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const isView = mode === "view";

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const snap = await getDocs(collection(db, "categories"));
      const cats = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setCategories(cats);
    };
    loadCategories();
  }, []);

  // Load existing supplier
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && id) {
      const fetch = async () => {
        const snap = await getDoc(doc(db, "suppliers", id));
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            name: data.name || "",
            categoryId: data.categoryId || "",
            contact: data.contact || "",
            email: data.email || "",
            address: data.address || "",
            paymentTerms: data.paymentTerms || "",
          });
        }
      };
      fetch();
    }
  }, [id, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const selectedCategory = categories.find(c => c.id === formData.categoryId);
      const categoryName = selectedCategory?.name || "";

      const payload = {
        name: formData.name,
        categoryId: formData.categoryId,
        categoryName,
        contact: formData.contact,
        email: formData.email,
        address: formData.address,
        paymentTerms: formData.paymentTerms,
      };

      if (mode === "add") {
        await setDoc(doc(db, "suppliers", Date.now().toString()), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success("Supplier added");
      } else if (mode === "edit" && id) {
        await setDoc(doc(db, "suppliers", id), payload, { merge: true });
        toast.success("Supplier updated");
      }
      navigate("/lms/manager/utilities/suppliers");
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
          {isView ? "View Supplier" : mode === "add" ? "Add Supplier" : "Edit Supplier"}
        </h1>
      </div>

      <div className="bg-card border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Supplier Name *</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={isView} required />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              {isView ? (
                <Input value={categories.find(c => c.id === formData.categoryId)?.name || "N/A"} disabled />
              ) : (
                <Select value={formData.categoryId} onValueChange={v => setFormData({...formData, categoryId: v})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Contact Number *</Label>
              <Input value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} disabled={isView} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={isView} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} disabled={isView} />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Input value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: e.target.value})} disabled={isView} />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            {!isView && (
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-primary to-accent">
                {loading ? "Saving..." : "Save Supplier"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierForm;