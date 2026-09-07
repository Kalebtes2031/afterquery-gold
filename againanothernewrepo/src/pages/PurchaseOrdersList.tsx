// src/pages/PurchaseOrdersList.tsx
import { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc, where, query, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

interface PurchaseOrder {
  id: string;
  refNumber: string;
  branchName: string;
  supplierName: string;
  requiredOn: any;
  totalAmount: number;
  deliveredTo: string;
  status: string;
  personnel: string;
  createdAt: any;
}

const PurchaseOrdersList = () => {
  const { role, branchId } = useAuth();
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let q: any = collection(db, "purchaseOrders"); // ← any fixes the type issue

    if (role === "employee" && branchId) {
      q = query(q, where("branchId", "==", branchId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
      setPOs(data);
    }, (error) => {
      console.error("Error fetching POs:", error);
      toast.error("Failed to load purchase orders");
    });

    return () => unsubscribe();
  }, [role, branchId]);

  const handleCancel = async (id: string) => {
    navigate(`/lms/${role}/utilities/purchase-orders/${id}/cancel`);
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, "purchaseOrders", id), { status: "approved" });
      toast.success("PO approved");
    } catch {
      toast.error("Approve failed");
    }
  };

  const filtered = pos.filter(po =>
    po.refNumber.toLowerCase().includes(search.toLowerCase()) ||
    po.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Purchase Orders
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage POs ({pos.length} total)
          </p>
        </div>
        <Button onClick={() => navigate(`/lms/${role}/utilities/purchase-orders/add`)} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-2" />
          Add PO
        </Button>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search POs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref Number</TableHead>
              <TableHead>Branch Name</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Required On</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Delivered To</TableHead>
              <TableHead>PO Status</TableHead>
              <TableHead>Personnel</TableHead>
              <TableHead>Date Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                  No purchase orders found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(po => (
                <TableRow key={po.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{po.refNumber}</TableCell>
                  <TableCell>{po.branchName}</TableCell>
                  <TableCell>{po.supplierName}</TableCell>
                  <TableCell>{format(po.requiredOn.toDate(), "MMM d, yyyy")}</TableCell>
                  <TableCell>KSh {po.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>{po.deliveredTo}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      po.status === "approved" ? "bg-green-100 text-green-800" :
                      po.status === "cancelled" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>{po.personnel}</TableCell>
                  <TableCell>{format(po.createdAt.toDate(), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right space-x-3">
                    <button onClick={() => navigate(`/lms/${role}/utilities/purchase-orders/${po.id}`)} className="text-primary hover:underline text-sm">View</button>
                    {(po.status === "pending" || po.status === "draft") && (
                      <button onClick={() => navigate(`/lms/${role}/utilities/purchase-orders/${po.id}/edit`)} className="text-accent hover:underline text-sm">Edit</button>
                    )}
                    {po.status !== "cancelled" && po.status !== "approved" && (
                      <button onClick={() => handleCancel(po.id)} className="text-destructive hover:underline text-sm">Cancel</button>
                    )}
                    {role === "manager" && po.status === "pending" && (
                      <button onClick={() => handleApprove(po.id)} className="text-green-600 hover:underline text-sm font-medium">Approve</button>
                    )}
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

export default PurchaseOrdersList;