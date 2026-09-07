// src/components/forms/SMSTemplateForm.tsx
import { useState, useEffect } from "react";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Info } from "lucide-react";

interface Template {
  id?: string;
  name: string;
  key: string;
  message: string;
}

interface Props {
  template: Template | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SMSTemplateForm = ({ template, onClose, onSuccess }: Props) => {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setKey(template.key);
      setMessage(template.message);
    } else {
      setName("");
      setKey("");
      setMessage("");
    }
  }, [template]);

  const handleSave = async () => {
    if (!name.trim() || !key.trim() || !message.trim()) {
      toast.error("All fields are required");
      return;
    }

    const cleanKey = key.toLowerCase().replace(/[^a-z0-9_]/g, ""); // allow numbers too for safety
    if (cleanKey !== key) {
      toast.error("Key must contain only lowercase letters, numbers and underscores");
      return;
    }

    try {
      const data = {
        name: name.trim(),
        key: cleanKey,
        message: message.trim(),
        updatedAt: serverTimestamp(),
      };

      if (template?.id) {
        await updateDoc(doc(db, "smsTemplates", template.id), data);
        toast.success("Template updated!");
      } else {
        const newId = `template_${Date.now()}`;
        await setDoc(doc(db, "smsTemplates", newId), {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast.success("Template created!");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save template");
    }
  };

  return (
    <div className="bg-card border-2 border-primary/20 rounded-2xl p-8 shadow-2xl space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {template ? "Edit" : "Create"} Notification Template
          </h2>
          <p className="text-muted-foreground mt-1">
            {template ? "Update message" : "Add new notification"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <Label className="text-lg">Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Order Ready for Pickup"
              className="text-lg"
            />
          </div>
          <div>
            <Label className="text-lg">Key (code identifier)</Label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="e.g. order_ready"
              className="font-mono text-lg"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Only lowercase letters, numbers & underscores. Used as WhatsApp template name.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-lg">Message (SMS version)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              placeholder="Hi {name}, your order {id} is ready! {link}"
              className="text-base font-medium"
            />
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-primary" />
              <p className="font-bold text-primary">Variables you can use:</p>
            </div>
            <div className="space-y-2 text-sm">
              <div><code className="bg-primary/10 px-2 py-1 rounded">{`{name}`}</code> → Customer's first name</div>
              <div><code className="bg-primary/10 px-2 py-1 rounded">{`{id}`}</code> → Laundry ID</div>
              <div><code className="bg-primary/10 px-2 py-1 rounded">{`{link}`}</code> → Delivery slot link (used in ready status)</div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 italic">
              For WhatsApp: create matching template in Meta dashboard using {`{{1}}, {{2}}, {{3}}`} placeholders.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-8 border-t">
        <Button variant="outline" size="lg" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="lg"
          onClick={handleSave}
          className="bg-gradient-to-r from-primary to-accent shadow-xl px-10"
        >
          {template ? "Update Template" : "Create Template"}
        </Button>
      </div>
    </div>
  );
};

export default SMSTemplateForm;