// src/pages/manager/sms-config/SMSConfigForm.tsx
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";

type Mode = "add" | "edit" | "view";

const defaultStatuses = ["pending", "collected", "in washing", "ready", "delivered"];

const SMSConfigForm = ({ mode }: { mode: Mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isView = mode === "view";

  const [templates, setTemplates] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    status: "",
    templateId: "",
    isActive: true,
    channel: "sms" as "sms" | "whatsapp",
  });

  useEffect(() => {
    const load = async () => {
      const tempSnap = await getDocs(collection(db, "smsTemplates"));
      setTemplates(tempSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if ((mode === "edit" || mode === "view") && id) {
        const snap = await getDoc(doc(db, "smsConfig", id));
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            status: data.status || "",
            templateId: data.templateId || "",
            isActive: data.isActive ?? true,
            channel: data.channel || "sms",
          });
        }
      }
    };
    load();
  }, [id, mode]);

  const handleSubmit = async () => {
    if (!formData.status || !formData.templateId || !formData.channel) {
      toast.error("Please fill all fields");
      return;
    }

    const template = templates.find(t => t.id === formData.templateId);

    try {
      const payload = {
        status: formData.status,
        templateId: formData.templateId,
        templateName: template?.name || template?.key || "Unknown",
        channel: formData.channel,
        isActive: formData.isActive,
        updatedAt: serverTimestamp(),
      };

      if (mode === "edit" && id) {
        await setDoc(doc(db, "smsConfig", id), payload, { merge: true });
        toast.success("Config updated successfully");
      } else {
        await setDoc(doc(collection(db, "smsConfig")), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success("Config created successfully");
      }
      navigate("/lms/manager/utilities/sms-config");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save config");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {mode === "add" ? "Add Notification Config" : mode === "edit" ? "Edit Notification Config" : "View Notification Config"}
        </h1>
      </div>

      <div className="bg-card border rounded-xl p-8">
        <div className="space-y-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={v => setFormData({ ...formData, status: v })}
                disabled={isView}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {defaultStatuses.map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template */}
            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                value={formData.templateId}
                onValueChange={v => setFormData({ ...formData, templateId: v })}
                disabled={isView}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name || t.key} ({t.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Channel */}
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={formData.channel}
                onValueChange={v => setFormData({ ...formData, channel: v as "sms" | "whatsapp" })}
                disabled={isView}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS (Infobip)</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active */}
            <div className="space-y-2">
              <Label>Active</Label>
              <div className="flex items-center h-10 gap-3">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={v => setFormData({ ...formData, isActive: v })}
                  disabled={isView}
                />
                <span className="text-sm text-muted-foreground">
                  Enable notifications for this status
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button variant="outline" onClick={() => navigate(-1)}>
              {isView ? "Back" : "Cancel"}
            </Button>
            {!isView && (
              <Button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-primary to-accent"
              >
                {mode === "edit" ? "Update Config" : "Create Config"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMSConfigForm;