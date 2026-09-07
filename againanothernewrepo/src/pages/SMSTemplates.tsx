// src/pages/manager/SMSTemplates.tsx
import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, CheckCircle } from "lucide-react";
import SMSTemplateForm from "@/components/SMSTemplateForm";


interface Template {
  id: string;
  name: string;
  key: string;
  message: string;
  createdAt: any;
}

const SMSTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    const q = query(collection(db, "smsTemplates"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Template)));
    });
    return unsub;
  }, []);

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            SMS Templates
          </h1>
          <p className="text-muted-foreground mt-2">Manage all customer notification messages</p>
        </div>

        {!showForm && (
  <div className="flex justify-end mb-6">
    <Button
      onClick={() => setShowForm(true)}
      className="bg-gradient-to-r from-primary to-accent shadow-xl"
      size="lg"
    >
      <Plus className="w-5 h-5 mr-2" />
      Add New Template
    </Button>
  </div>
)}
      </div>

      {/* Form — Only shows when adding/editing */}
      {showForm && (
        <div className="bg-card border-2 border-primary/20 rounded-2xl p-8 shadow-xl">
          <SMSTemplateForm
            template={editingTemplate}
            onClose={() => setShowForm(false)}
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {/* Success Message */}
      {/* {!showForm && templates.length > 0 && (
        <div className="flex items-center gap-3 text-green-600 bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle className="w-6 h-6" />
          <p className="font-medium">Templates are up to date</p>
        </div>
      )} */}

      {/* Table — Only shows when NOT in form mode */}
      {!showForm && (
        <div className="bg-card border rounded-2xl overflow-hidden shadow-xl">
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                      <div className="space-y-3">
                        <div className="text-6xl">No templates yet</div>
                        <p>Click "Add Template" to create your first one</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/50 transition-all">
                      <TableCell className="font-semibold text-lg">{t.name}</TableCell>
                      <TableCell>
                        <code className="bg-muted px-3 py-1 rounded text-sm font-mono">{t.key}</code>
                      </TableCell>
                      <TableCell className="max-w-2xl">
                        <p className="text-sm text-muted-foreground line-clamp-2">{t.message}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(t)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMSTemplates;