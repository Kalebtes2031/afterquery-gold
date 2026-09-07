// src/components/forms/ItemForm.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash } from "lucide-react";

type Mode = "add" | "edit" | "view";

interface Variant {
  id?: string;
  size: string; // e.g., "300ml"
  costPrice: number;
}

interface Packaging {
  id?: string;
  type: string; // e.g., "box"
  quantity: number; // e.g., 24
  variantId: string; // link to variant
}

const ItemForm = ({ mode = "add" }: { mode?: Mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [uoms, setUoMs] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [uomId, setUoMId] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [packaging, setPackaging] = useState<Packaging[]>([]);

  const isView = mode === "view";

  // Load categories & uoms
  useEffect(() => {
    const load = async () => {
      const [catSnap, uomSnap] = await Promise.all([
        getDocs(collection(db, "categories")),
        getDocs(collection(db, "uom")),
      ]);
      setCategories(catSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
      setUoMs(uomSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
    };
    load();
  }, []);

  // Load existing item + variants + packaging
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && id) {
      const fetch = async () => {
        const itemSnap = await getDoc(doc(db, "items", id));
        if (itemSnap.exists()) {
          const data = itemSnap.data();
          setName(data.name || "");
          setCostPrice(data.costPrice?.toString() || "");
          setCategoryId(data.categoryId || "");
          setUoMId(data.uomId || "");
        }

        const variantsSnap = await getDocs(collection(db, "items", id, "variants"));
        setVariants(variantsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Variant)));

        const packagingSnap = await getDocs(collection(db, "items", id, "packaging"));
        setPackaging(packagingSnap.docs.map(d => ({ id: d.id, ...d.data() } as Packaging)));
      };
      fetch();
    }
  }, [id, mode]);

  const addVariant = () => setVariants([...variants, { size: "", costPrice: 0 }]);

  const removeVariant = (index: number) => setVariants(variants.filter((_, i) => i !== index));

  const updateVariant = (index: number, field: keyof Variant, value: string | number) => {
    const newVariants = [...variants];
    newVariants[index][field] = value as never;
    setVariants(newVariants);
  };

  const addPackaging = () => setPackaging([...packaging, { type: "", quantity: 0, variantId: "" }]);

  const removePackaging = (index: number) => setPackaging(packaging.filter((_, i) => i !== index));

  const updatePackaging = (index: number, field: keyof Packaging, value: string | number) => {
    const newPackaging = [...packaging];
    newPackaging[index][field] = value as never;
    setPackaging(newPackaging);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cat = categories.find(c => c.id === categoryId);
      const uom = uoms.find(u => u.id === uomId);

      const payload = {
        name,
        categoryId,
        categoryName: cat?.name || "",
        uomId,
        uomName: uom?.name || "",
        costPrice: parseFloat(costPrice) || 0,
      };

      let itemId = id;

      if (mode === "add") {
        const itemRef = await addDoc(collection(db, "items"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        itemId = itemRef.id;
      } else if (mode === "edit" && id) {
        await setDoc(doc(db, "items", id), payload, { merge: true });
      }

      // Save variants
      for (const variant of variants) {
        if (variant.id) {
          await setDoc(doc(db, "items", itemId!, "variants", variant.id), variant, { merge: true });
        } else {
          await addDoc(collection(db, "items", itemId!, "variants"), variant);
        }
      }

      // Save packaging
      for (const pack of packaging) {
        if (pack.id) {
          await setDoc(doc(db, "items", itemId!, "packaging", pack.id), pack, { merge: true });
        } else {
          await addDoc(collection(db, "items", itemId!, "packaging"), pack);
        }
      }

      toast.success("Item saved successfully");
      navigate("/lms/manager/utilities/items");
    } catch {
      toast.error("Failed to save item");
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
          {isView ? "View Item" : mode === "add" ? "Add Item" : "Edit Item"}
        </h1>
      </div>

      <div className="bg-card border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} disabled={isView} required />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              {isView ? (
                <Input value={categories.find(c => c.id === categoryId)?.name || "N/A"} disabled />
              ) : (
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Unit of Measure *</Label>
              {isView ? (
                <Input value={uoms.find(u => u.id === uomId)?.name || "N/A"} disabled />
              ) : (
                <Select value={uomId} onValueChange={setUoMId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {uoms.map(uom => (
                      <SelectItem key={uom.id} value={uom.id}>{uom.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Base Cost Price (KSh) *</Label>
              <Input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} disabled={isView} required />
            </div>
          </div>

          {/* Tabs for Variants & Packaging */}
          <Tabs defaultValue="variants" className="mt-8">
            <TabsList>
              <TabsTrigger value="variants">Variants</TabsTrigger>
              <TabsTrigger value="packaging">Packaging</TabsTrigger>
            </TabsList>

            <TabsContent value="variants" className="space-y-4">
              {variants.map((variant, index) => (
                <div key={index} className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Size *</Label>
                    <Input value={variant.size} onChange={e => updateVariant(index, "size", e.target.value)} disabled={isView} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Price (KSh) *</Label>
                    <Input type="number" value={variant.costPrice} onChange={e => updateVariant(index, "costPrice", parseFloat(e.target.value))} disabled={isView} required />
                  </div>
                  {!isView && (
                    <Button type="button" variant="destructive" onClick={() => removeVariant(index)} className="self-end">
                      <Trash className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {!isView && (
                <Button type="button" variant="outline" onClick={addVariant} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" /> Add Variant
                </Button>
              )}
            </TabsContent>

            <TabsContent value="packaging" className="space-y-4">
              {packaging.map((pack, index) => (
                <div key={index} className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Input value={pack.type} onChange={e => updatePackaging(index, "type", e.target.value)} disabled={isView} required placeholder="e.g., box" />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input type="number" value={pack.quantity} onChange={e => updatePackaging(index, "quantity", parseInt(e.target.value))} disabled={isView} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Variant *</Label>
                    {isView ? (
                      <Input value={variants.find(v => v.id === pack.variantId)?.size || "N/A"} disabled />
                    ) : (
                      <Select value={pack.variantId} onValueChange={v => updatePackaging(index, "variantId", v)} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select variant" />
                        </SelectTrigger>
                        <SelectContent>
                          {variants.map((v, i) => (
                            <SelectItem key={i} value={v.id || i.toString()}>{v.size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {!isView && (
                    <Button type="button" variant="destructive" onClick={() => removePackaging(index)} className="self-end">
                      <Trash className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {!isView && (
                <Button type="button" variant="outline" onClick={addPackaging} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" /> Add Packaging
                </Button>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button variant="outline" onClick={() => navigate(-1)}>
              {isView ? "Back" : "Cancel"}
            </Button>
            {!isView && (
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-primary to-accent">
                {loading ? "Saving..." : "Save Item"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemForm;