// src/components/forms/LaundryTrackingForm.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Loader2, X, CheckCircle, RefreshCw } from "lucide-react";
import sessionManager from "@/utils/sessionManager";
import imageCompression from "browser-image-compression";

interface TrackedItem {
  type: string;
  quantity: number;
  description?: string;
}

const LaundryTrackingForm = ({ mode }: { mode: "edit" | "view" }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isView = mode === "view";

  const [order, setOrder] = useState<any>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<number, {
    status: "pending" | "compressing" | "uploading" | "success" | "failed";
    progress?: number;
    url?: string;
    error?: string;
    file?: File;
  }>>({});

  useEffect(() => {
    if (!id) return;

    const fetchOrderAndTemplates = async () => {
      const orderSnap = await getDoc(doc(db, "laundryOrders", id));
      if (!orderSnap.exists()) {
        toast.error("Order not found");
        return;
      }

      const orderData = orderSnap.data();
      setOrder(orderData);
      setImages(orderData.images || []);

      let templates: TrackedItem[] = [];

      let q = query(
        collection(db, "pricingConfig"),
        where("branchId", "==", orderData.branchId),
        where("mainServiceId", "==", orderData.mainServiceId),
        where("isActive", "==", true)
      );

      if (orderData.packageId) q = query(q, where("packageId", "==", orderData.packageId));
      if (orderData.sizeId) q = query(q, where("sizeId", "==", orderData.sizeId));

      const configSnap = await getDocs(q);

      if (!configSnap.empty) {
        const config = configSnap.docs[0].data();
        templates = (config.trackedItemTemplates || []).map((t: any) => ({
          type: t.type || "Unknown",
          quantity: 0,
          description: "",
        }));
      } else {
        console.warn("No active pricing config found → using saved items only");
      }

      if (orderData.trackedItems?.length) {
        const saved = orderData.trackedItems as TrackedItem[];
        if (templates.length > 0) {
          setTrackedItems(templates.map(tmpl => {
            const found = saved.find(s => s.type === tmpl.type);
            return found ? { ...tmpl, quantity: found.quantity, description: found.description || "" } : tmpl;
          }));
        } else {
          setTrackedItems(saved.map(item => ({
            type: item.type,
            quantity: item.quantity,
            description: item.description || "",
          })));
        }
      } else {
        setTrackedItems(templates.length > 0 ? templates : [{ type: "Other", quantity: 0, description: "" }]);
      }

      setTotalItems(orderData.totalItems || 0);
    };

    fetchOrderAndTemplates();
  }, [id]);

  const handleQuantityChange = (index: number, qty: number) => {
    if (isView) return;
    const diff = qty - trackedItems[index].quantity;
    setTrackedItems(prev => prev.map((i, idx) => idx === index ? { ...i, quantity: qty } : i));
    setTotalItems(prev => prev + diff);
  };

  const compressImage = async (file: File, targetSizeMB: number = 0.25): Promise<File> => {
    const options = {
      maxSizeMB: targetSizeMB,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.75,
    };

    try {
      console.log(`Original size of ${file.name}: ${(file.size / 1024).toFixed(2)} KB`);
      const compressedFile = await imageCompression(file, options);
      console.log(`Compressed size of ${file.name}: ${(compressedFile.size / 1024).toFixed(2)} KB`);
      return compressedFile;
    } catch (err) {
      console.error("Compression failed:", err);
      return file; // fallback
    }
  };

  const uploadSinglePhoto = async (file: File, index: number, retryCount = 0): Promise<string | null> => {
    setUploadStatus(prev => ({
      ...prev,
      [index]: { ...prev[index], status: "compressing" },
    }));

    try {
      const compressed = await compressImage(file, retryCount > 0 ? 0.12 : 0.25); // 250 KB first, 120 KB on retry

      setUploadStatus(prev => ({
        ...prev,
        [index]: { ...prev[index], status: "uploading" },
      }));

      const formData = new FormData();
      formData.append("photos", compressed);

      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) throw new Error("API URL not set");

      const headers = sessionManager.getHeaders();
      delete headers["Content-Type"];

      const res = await fetch(`${apiUrl}/upload-laundry-photos`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 413 && retryCount === 0) {
          toast.info(`Photo ${index + 1} too large — retrying smaller version...`);
          return uploadSinglePhoto(file, index, 1); // retry once
        }
        throw new Error(errData.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.urls?.length) {
        setUploadStatus(prev => ({
          ...prev,
          [index]: { status: "success", url: data.urls[0] },
        }));
        return data.urls[0];
      }
      throw new Error("No URL returned");
    } catch (err: any) {
      console.error(`Upload failed for photo ${index + 1}:`, err);
      setUploadStatus(prev => ({
        ...prev,
        [index]: { status: "failed", error: err.message },
      }));
      toast.error(`Photo ${index + 1} failed: ${err.message}`);
      return null;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    toast.info("Compressing photos...");

    const newStatuses: Record<number, any> = {};
    Array.from(files).forEach((_, i) => {
      newStatuses[i] = { status: "pending", file: files[i] };
    });
    setUploadStatus(newStatuses);

    const newUrls: string[] = [...images];

    for (let i = 0; i < files.length; i++) {
      const url = await uploadSinglePhoto(files[i], i);
      if (url) {
        newUrls.push(url);
        setImages([...newUrls]);
      }
    }

    setUploading(false);
    e.target.value = "";

    const successful = Object.values(uploadStatus).filter(s => s.status === "success").length;
    if (successful > 0) {
      toast.success(`${successful} photo(s) uploaded successfully!`);
    }
  };

  const retryPhoto = (index: number) => {
    const file = uploadStatus[index]?.file;
    if (file) {
      uploadSinglePhoto(file, index);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (isView) return;

    const valid = trackedItems.filter(i => i.quantity > 0);
    if (valid.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    try {
      toast.info("Saving changes...");
      const updatePayload: any = {
        trackedItems: valid,
        totalItems: valid.reduce((s, i) => s + i.quantity, 0),
        images: images.length > 0 ? images : null,
        trackedAt: new Date(),
      };

      if (order.status === "collected") {
        updatePayload.status = "in washing";
        toast.info("Marking as In Washing...");
      }

      await updateDoc(doc(db, "laundryOrders", id!), updatePayload);
      toast.success("Changes saved successfully!");
      navigate(-1);
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Failed to save — please try again");
    }
  };

  if (!order) return <div className="py-20 text-center">Loading...</div>;

  const isInitialTracking = order.status === "collected";
  const buttonText = isInitialTracking ? "Mark as In Washing & Save" : "Save Updates";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Track Laundry Items
          </h1>
          <p className="text-muted-foreground">
            Service: <strong>{order.mainServiceName}</strong> • Total: {totalItems} items
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 lg:p-8">
        <div className="space-y-8">

          {/* Items */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Items Received</h3>

            {isView ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-24 text-right">Qty</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trackedItems
                      .filter(item => item.quantity > 0)
                      .map(item => (
                        <TableRow key={item.type}>
                          <TableCell className="font-medium">{item.type}</TableCell>
                          <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.description || "—"}
                          </TableCell>
                        </TableRow>
                      ))}

                    {trackedItems.filter(i => i.quantity > 0).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                          No items recorded for this order
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trackedItems.map((item, idx) => (
                  <div key={item.type} className="bg-muted/50 rounded-lg p-5 space-y-3">
                    <div className="font-semibold text-primary">{item.type}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={e => handleQuantityChange(idx, parseInt(e.target.value) || 0)}
                          disabled={isView}
                          min="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Input
                          value={item.description || ""}
                          onChange={e => setTrackedItems(prev => prev.map((i, i2) => i2 === idx ? { ...i, description: e.target.value } : i))}
                          placeholder="Color, condition..."
                          disabled={isView}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <Label>Photos of Laundry (Take 3+ photos recommended)</Label>
              <span className="text-sm text-muted-foreground">
                {images.length} photo(s) • {uploading && "Processing..."}
              </span>
            </div>

            <Input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleImageUpload}
              disabled={uploading || isView}
            />

            {(images.length > 0 || Object.keys(uploadStatus).length > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* 1. Always show existing Cloudinary photos (from Firestore) */}
                {images.map((url, i) => (
                  <div key={`cloud-${i}`} className="relative group">
                    <img src={url} alt="Uploaded photo" className="w-full h-40 object-cover rounded-lg border" />
                    {!isView && (
                      <button
                        onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-7 h-7 text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {/* 2. Only show previews for photos that are NOT yet successfully uploaded */}
                {Object.entries(uploadStatus).map(([key, status]) => {
                  const idx = parseInt(key);

                  // Prevent duplicate: skip if this photo has succeeded and its URL is already in images
                  if (status.status === "success" && status.url && images.includes(status.url)) {
                    return null;
                  }

                  return (
                    <div
                      key={`preview-${idx}`}
                      className="relative bg-gray-50 rounded-lg h-40 border border-dashed border-gray-300 flex flex-col items-center justify-center p-2 text-center"
                    >
                      {status.status === "compressing" && (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                          <p className="text-xs text-gray-600">Compressing...</p>
                        </>
                      )}

                      {status.status === "uploading" && (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                          <p className="text-xs text-gray-600">Uploading...</p>
                        </>
                      )}

                      {status.status === "success" && status.url && (
                        <div className="relative w-full h-full group">
                          <img src={status.url} alt="Success" className="w-full h-full object-cover rounded-lg" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                            <CheckCircle className="h-10 w-10 text-green-400" />
                          </div>
                        </div>
                      )}

                      {status.status === "failed" && (
                        <>
                          <X className="h-8 w-8 text-red-500 mb-2" />
                          <p className="text-xs text-red-600 mb-2">Failed</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-3 py-1 h-8"
                            onClick={() => retryPhoto(idx)}
                          >
                            Retry
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            {!isView && (
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-primary to-accent"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  buttonText
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaundryTrackingForm;