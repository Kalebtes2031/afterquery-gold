// src/pages/manager/utilities/ServiceTypes.tsx
import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { Plus, Edit, Trash2, Tags } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ServiceTypeForm from "@/components/forms/ServiceTypeForm";

interface ServiceType {
  id: string;
  name: string;
  isActive: boolean;
  isExtraService: boolean;
}

type Mode = "list" | "add" | "view" | "edit";

const ServiceTypes = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [services, setServices] = useState<ServiceType[]>([]);
  const [currentService, setCurrentService] = useState<ServiceType | null>(null);
  const [loading, setLoading] = useState(true);

  const mode: Mode = id
    ? location.pathname.includes("/edit") ? "edit" : "view"
    : location.pathname.includes("/add") ? "add"
    : "list";

  useEffect(() => {
    const q = query(collection(db, "serviceTypes"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceType));
      setServices(data);
      setLoading(false);

      if (id && (mode === "view" || mode === "edit")) {
        const found = data.find(s => s.id === id);
        setCurrentService(found || null);
      }
    });
    return unsub;
  }, [id, mode]);

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Delete this service type?")) return;
    try {
      await deleteDoc(doc(db, "serviceTypes", serviceId));
      toast.success("Service type deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  // FORM MODE — SHOW FORM
  if (mode !== "list") {
    return (
      <ServiceTypeForm
        mode={mode}       
      />
    );
  }

  // LIST MODE
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Service Types
          </h1>
          <p className="text-muted-foreground mt-2">Define main services and extra add-ons</p>
        </div>
        <Button onClick={() => navigate("/lms/manager/utilities/service-types/add")} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-2" /> Add Service Type
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading services...
                  </TableCell>
                </TableRow>
              ) : services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                    <div className="space-y-4">
                      <Tags className="w-12 h-12 mx-auto text-muted-foreground/50" />
                      <p className="text-lg">No service types yet</p>
                      <Button onClick={() => navigate("/lms/manager/utilities/service-types/add")}>
                        Add Your First Service
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <Badge variant={service.isExtraService ? "secondary" : "default"}>
                        {service.isExtraService ? "Extra Service" : "Main Service"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        service.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {service.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`${service.id}`)}>
                        View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`${service.id}/edit`)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(service.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ServiceTypes;


