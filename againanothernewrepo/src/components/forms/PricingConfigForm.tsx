import { useState, useEffect } from "react";
import {
  doc, setDoc, addDoc, collection, serverTimestamp,
  getDocs, query, where, getDoc
} from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus, Trash2 } from "lucide-react";  // removed GripVertical
import { toast } from "@/components/ui/sonner";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Branch { id: string; name: string; }
interface ServiceType { id: string; name: string; isExtraService: boolean; }
interface Package { id: string; name: string; isActive: boolean; }
interface Size { id: string; name: string; isActive: boolean; }

interface ExtraServicePricing {
  serviceId: string;
  name: string;
  price: number;
}

interface TrackedItemTemplate {
  type: string;   // only need type, no local id needed anymore
}

interface PricingConfigFormProps {
  mode: "add" | "view" | "edit";
  pricingId?: string;
  onSuccess: () => void;
}

const DEFAULT_STAGES = ["pending", "collected", "in washing", "ready", "delivered"];

const SortableStage = ({ 
  stage, 
  id, 
  isView, 
  onRemove 
}: { 
  stage: string; 
  id: string; 
  isView: boolean;
  onRemove: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-muted/50 rounded-lg p-3 cursor-grab active:cursor-grabbing select-none"
      {...(isView ? {} : attributes)}
      {...(isView ? {} : listeners)}
    >
      <div className="flex items-center gap-3">
        {!isView && <GripVertical className="w-5 h-5 text-muted-foreground" />}
        <Badge variant="secondary" className="flex-1 text-sm">
          {stage}
        </Badge>
      </div>
      {!isView && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

const PricingConfigForm = ({ mode, pricingId, onSuccess }: PricingConfigFormProps) => {
  const navigate = useNavigate();
  const isView = mode === "view";
  const [loading, setLoading] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [mainServices, setMainServices] = useState<ServiceType[]>([]);
  const [extraServices, setExtraServices] = useState<ServiceType[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);

  const [formData, setFormData] = useState({
    branchId: "",
    mainServiceId: "",
    hasPackage: false,
    packageId: "",
    hasSize: false,
    sizeId: "",
    basePricePerKg: 0,
    extraServicesPricing: [] as ExtraServicePricing[],
    stages: DEFAULT_STAGES,
    isActive: true,
  });

  const [trackedTemplates, setTrackedTemplates] = useState<TrackedItemTemplate[]>([]);
  const [newTemplateInput, setNewTemplateInput] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const loadData = async () => {
      const [bSnap, mSnap, eSnap, pSnap, sSnap] = await Promise.all([
        getDocs(collection(db, "branches")),
        getDocs(query(collection(db, "serviceTypes"), where("isExtraService", "==", false))),
        getDocs(query(collection(db, "serviceTypes"), where("isExtraService", "==", true))),
        getDocs(query(collection(db, "packages"), where("isActive", "==", true))),
        getDocs(query(collection(db, "sizes"), where("isActive", "==", true))),
      ]);

      setBranches(bSnap.docs.map(d => ({ id: d.id, ...d.data() } as Branch)));
      setMainServices(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceType)));
      setExtraServices(eSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceType)));
      setPackages(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Package)));
      setSizes(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Size)));

      if (pricingId && (mode === "view" || mode === "edit")) {
        const snap = await getDoc(doc(db, "pricingConfig", pricingId));
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            branchId: data.branchId || "",
            mainServiceId: data.mainServiceId || "",
            hasPackage: data.hasPackage ?? false,
            packageId: data.packageId || "",
            hasSize: data.hasSize ?? false,
            sizeId: data.sizeId || "",
            basePricePerKg: data.basePricePerKg || 0,
            extraServicesPricing: data.extraServices || [],
            stages: data.stages || DEFAULT_STAGES,
            isActive: data.isActive ?? true,
          });

          // Load tracked item templates
          setTrackedTemplates(
            (data.trackedItemTemplates || []).map((t: any) => ({
              type: t.type || "",
            }))
          );
        }
      }
    };
    loadData();
  }, [pricingId, mode]);

  const selectedExtraNames = formData.extraServicesPricing.map(e => e.name);

  const addExtraService = (serviceId: string) => {
    const service = extraServices.find(s => s.id === serviceId);
    if (!service || selectedExtraNames.includes(service.name)) return;

    setFormData(prev => ({
      ...prev,
      extraServicesPricing: [...prev.extraServicesPricing, { serviceId, name: service.name, price: 0 }],
      stages: [...prev.stages, service.name],
    }));
  };

  const removeExtra = (index: number) => {
    const name = formData.extraServicesPricing[index].name;
    setFormData(prev => ({
      ...prev,
      extraServicesPricing: prev.extraServicesPricing.filter((_, i) => i !== index),
      stages: prev.stages.filter(s => s !== name),
    }));
  };

  const removeStage = (stageName: string) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages.filter(s => s !== stageName),
    }));
  };

  const handleDragEndStages = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFormData(prev => {
      const oldIndex = prev.stages.indexOf(active.id as string);
      const newIndex = prev.stages.indexOf(over.id as string);
      return { ...prev, stages: arrayMove(prev.stages, oldIndex, newIndex) };
    });
  };

  const handleAddTemplate = () => {
    const trimmed = newTemplateInput.trim();
    if (!trimmed) {
      toast.error("Please enter an item name");
      return;
    }

    setTrackedTemplates(prev => [...prev, { type: trimmed }]);
    setNewTemplateInput(""); // clear input
    toast.success("Item added");
  };

  const handleRemoveTemplate = (index: number) => {
    setTrackedTemplates(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isView) return;

    if (!formData.branchId || !formData.mainServiceId || formData.basePricePerKg <= 0) {
      toast.error("Branch, main service, and base price are required");
      return;
    }

    if (formData.hasPackage && !formData.packageId) {
      toast.error("Please select a package");
      return;
    }

    if (formData.hasSize && !formData.sizeId) {
      toast.error("Please select a size");
      return;
    }

    setLoading(true);
    try {
      const branch = branches.find(b => b.id === formData.branchId);
      const service = mainServices.find(s => s.id === formData.mainServiceId);
      const selectedPackage = packages.find(p => p.id === formData.packageId);
      const selectedSize = sizes.find(s => s.id === formData.sizeId);

      const payload = {
        branchId: formData.branchId,
        branchName: branch?.name || "",
        mainServiceId: formData.mainServiceId,
        mainServiceName: service?.name || "",
        hasPackage: formData.hasPackage,
        packageId: formData.hasPackage ? formData.packageId : "",
        packageName: formData.hasPackage ? selectedPackage?.name || "" : "",
        hasSize: formData.hasSize,
        sizeId: formData.hasSize ? formData.sizeId : "",
        sizeName: formData.hasSize ? selectedSize?.name || "" : "",
        basePricePerKg: formData.basePricePerKg,
        extraServices: formData.extraServicesPricing,
        stages: formData.stages,
        trackedItemTemplates: trackedTemplates
          .map(t => ({ type: t.type.trim() }))
          .filter(t => t.type), // skip empty
        isActive: formData.isActive,
        updatedAt: serverTimestamp(),
      };

      if (mode === "edit" && pricingId) {
        await setDoc(doc(db, "pricingConfig", pricingId), payload, { merge: true });
        toast.success("Pricing updated successfully");
      } else {
        await addDoc(collection(db, "pricingConfig"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success("Pricing created successfully");
      }

      onSuccess();
    } catch (error: any) {
      toast.error("Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getBasePriceLabel = () => {
    if (formData.hasPackage) {
      const pkgName = packages.find(p => p.id === formData.packageId)?.name || "selected package";
      return `Base Price per Kg (KSh) — for ${pkgName}`;
    }
    if (formData.hasSize) {
      const sizeName = sizes.find(s => s.id === formData.sizeId)?.name || "selected size";
      return `Base Price per Kg (KSh) — for ${sizeName}`;
    }
    return "Base Price per Kg (KSh) — for this service";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {mode === "add" && "Add Pricing Configuration"}
          {mode === "view" && "View Pricing Configuration"}
          {mode === "edit" && "Edit Pricing Configuration"}
        </h1>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Branch + Main Service */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={formData.branchId} onValueChange={v => setFormData({ ...formData, branchId: v })} disabled={isView}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Main Service</Label>
              <Select value={formData.mainServiceId} onValueChange={v => setFormData({ ...formData, mainServiceId: v, stages: DEFAULT_STAGES })} disabled={isView}>
                <SelectTrigger><SelectValue placeholder="Select main service" /></SelectTrigger>
                <SelectContent>
                  {mainServices.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Package & Size toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Has Package?</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.hasPackage}
                  onCheckedChange={(v) => {
                    if (v && formData.hasSize) {
                      setFormData({ ...formData, hasPackage: v, hasSize: false, sizeId: "" });
                    } else {
                      setFormData({ ...formData, hasPackage: v, packageId: v ? formData.packageId : "" });
                    }
                  }}
                  disabled={isView}
                />
                <span className={formData.hasPackage ? "text-primary font-medium" : "text-muted-foreground"}>
                  {formData.hasPackage ? "Yes" : "No"}
                </span>
              </div>
              {formData.hasPackage && (
                <Select value={formData.packageId} onValueChange={v => setFormData({ ...formData, packageId: v })} disabled={isView}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Choose package" /></SelectTrigger>
                  <SelectContent>
                    {packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Has Size?</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.hasSize}
                  onCheckedChange={(v) => {
                    if (v && formData.hasPackage) {
                      setFormData({ ...formData, hasSize: v, hasPackage: false, packageId: "" });
                    } else {
                      setFormData({ ...formData, hasSize: v, sizeId: v ? formData.sizeId : "" });
                    }
                  }}
                  disabled={isView}
                />
                <span className={formData.hasSize ? "text-primary font-medium" : "text-muted-foreground"}>
                  {formData.hasSize ? "Yes" : "No"}
                </span>
              </div>
              {formData.hasSize && (
                <Select value={formData.sizeId} onValueChange={v => setFormData({ ...formData, sizeId: v })} disabled={isView}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Choose size" /></SelectTrigger>
                  <SelectContent>
                    {sizes.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Base Price */}
          <div className="space-y-2">
            <Label>{getBasePriceLabel()}</Label>
            <Input
              type="number"
              value={formData.basePricePerKg || ""}
              onChange={e => setFormData({ ...formData, basePricePerKg: Number(e.target.value) || 0 })}
              placeholder="0"
              disabled={isView}
              required
              step="1"
              min="0"
            />
          </div>

          {/* Extra Services */}
          {!isView && (
            <div className="space-y-4">
              <Label>Add Extra Service (adds to stages & pricing)</Label>
              <Select onValueChange={addExtraService}>
                <SelectTrigger><SelectValue placeholder="Select extra service" /></SelectTrigger>
                <SelectContent>
                  {extraServices
                    .filter(s => !selectedExtraNames.includes(s.name))
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.extraServicesPricing.length > 0 && (
            <div className="space-y-4">
              <Label>Extra Services Pricing</Label>
              {formData.extraServicesPricing.map((extra, i) => (
                <div key={i} className="flex items-center gap-4 bg-muted/50 rounded-lg p-4">
                  <div className="flex-1 font-medium">{extra.name}</div>
                  <Input
                    type="number"
                    value={extra.price || ""}
                    onChange={e => {
                      const newExtras = [...formData.extraServicesPricing];
                      newExtras[i].price = Number(e.target.value) || 0;
                      setFormData({ ...formData, extraServicesPricing: newExtras });
                    }}
                    placeholder="Price (KSh)"
                    disabled={isView}
                    step="1"
                    min="0"
                  />
                  {!isView && (
                    <Button size="sm" variant="ghost" onClick={() => removeExtra(i)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tracked Items - Simplified (no drag) */}
          <div className="space-y-4">
            <Label>Items to Track (for this pricing config)</Label>

            {!isView && (
              <div className="flex items-center gap-3">
                <Input
                  value={newTemplateInput}
                  onChange={e => setNewTemplateInput(e.target.value)}
                  placeholder="e.g. Shirts, Duvet 4×6, Carpet Large, Other..."
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTemplate();
                    }
                  }}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleAddTemplate}
                  disabled={!newTemplateInput.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            )}

            {trackedTemplates.length > 0 ? (
              <div className="space-y-2">
                {trackedTemplates.map((t, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                  >
                    <span className="font-medium">{t.type}</span>
                    {!isView && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveTemplate(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                No items defined yet — add items that staff should count/track for this service
              </div>
            )}
          </div>

          {/* Stages - still draggable */}
          <div className="space-y-4">
            <Label>Tracking Stages (Drag to reorder • Delete any)</Label>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndStages}>
              <SortableContext items={formData.stages} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {formData.stages.map((stage) => (
                    <SortableStage
                      key={stage}
                      id={stage}
                      stage={stage}
                      isView={isView}
                      onRemove={() => removeStage(stage)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {formData.stages.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No stages — add a main service first
              </p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <Switch checked={formData.isActive} onCheckedChange={v => setFormData({ ...formData, isActive: v })} disabled={isView} />
            <span className={formData.isActive ? "text-green-600 font-medium" : "text-muted-foreground"}>
              {formData.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            {isView && <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>}
            {!isView && (
              <>
                <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" disabled={loading} className="bg-gradient-to-r from-primary to-accent">
                  {loading ? "Saving..." : mode === "edit" ? "Update Pricing" : "Create Pricing"}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PricingConfigForm;