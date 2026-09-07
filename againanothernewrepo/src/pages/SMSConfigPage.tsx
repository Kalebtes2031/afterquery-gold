// src/pages/manager/sms-config/SMSConfigList.tsx
import { useState, useEffect } from "react";
import { collection, deleteDoc, doc, getDocs, query } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SMSConfig {
  id: string;
  status: string;
  templateName: string;
  isActive: boolean;
}

const SMSConfigPage = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<SMSConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "smsConfig"));
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as SMSConfig));
        setConfigs(data);
      } catch (err) {
        toast.error("Failed to load SMS configs");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this SMS configuration?")) return;
    try {
      await deleteDoc(doc(db, "smsConfig", id));
      toast.success("Deleted successfully");
      setConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            SMS Configurations
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage automated SMS triggers for order statuses
          </p>
        </div>
        <Button
          onClick={() => navigate("/lms/manager/utilities/sms-config/add")}
          className="bg-gradient-to-r from-primary to-accent"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Configuration
        </Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  Loading...
                </TableCell>
              </TableRow>
            ) : configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  No SMS configurations yet. Click "Add Configuration" to create one.
                </TableCell>
              </TableRow>
            ) : (
              configs.map(config => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">
                    {config.status.charAt(0).toUpperCase() + config.status.slice(1).replace("in washing", "In Washing")}
                  </TableCell>
                  <TableCell>{config.templateName}</TableCell>
                  <TableCell>
                    <Badge variant={config.isActive ? "default" : "secondary"}>
                      {config.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/lms/manager/utilities/sms-config/${config.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/lms/manager/utilities/sms-config/${config.id}/edit`)}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SMSConfigPage;