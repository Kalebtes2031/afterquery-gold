// src/pages/ReceiveStockList.tsx — FINAL & FULLY WORKING
import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

interface GRN {
  id: string;
  grnNumber: string;
  branchName: string;
  supplierName: string;
  totalAmount: number;
  additionalInfo?: string;
  status: "partial" | "delivered";
  personnel: string;
  createdAt: any;
  branchId: string;
}

const ReceiveStockList = () => {
  const { role, branchId } = useAuth();
  const [grns, setGrns] = useState<GRN[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Build base query
    let q: any = collection(db, "goodsReceivedNotes");

    // Apply branch filter for employees
    if (role === "employee" && branchId) {
      q = query(q, where("branchId", "==", branchId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GRN));

      // Sort by newest first
      setGrns(data.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()));
    }, (error) => {
      console.error("Error loading GRNs:", error);
      toast.error("Failed to load received stock");
    });

    return () => unsubscribe();
  }, [role, branchId]);

  const filtered = grns.filter(grn =>
    grn.grnNumber.toLowerCase().includes(search.toLowerCase()) ||
    grn.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    grn.branchName.toLowerCase().includes(search.toLowerCase())
  );

  const basePath = role === "manager" 
    ? "/lms/manager/utilities/receive-stock" 
    : "/lms/employee/utilities/receive-stock";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Receive Stock (GRN)
          </h1>
          <p className="text-muted-foreground mt-2">
            Record received goods ({grns.length} total)
          </p>
        </div>
        <Button 
          onClick={() => navigate(`${basePath}/add`)} 
          className="bg-gradient-to-r from-primary to-accent"
        >
          <Plus className="w-4 h-4 mr-2" />
          Receive Stock
        </Button>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search GRNs..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="pl-10" 
        />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GRN No.</TableHead>
              <TableHead>Branch Name</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Additional Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Personnel</TableHead>
              <TableHead>Date Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                  No received stock found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(grn => (
                <TableRow key={grn.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{grn.grnNumber}</TableCell>
                  <TableCell>{grn.branchName}</TableCell>
                  <TableCell>{grn.supplierName}</TableCell>
                  <TableCell>KSh {grn.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>{grn.additionalInfo || "—"}</TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      grn.status === "delivered" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {grn.status === "delivered" ? "Delivered" : "Partial"}
                    </span>
                  </TableCell>
                  <TableCell>{grn.personnel}</TableCell>
                  <TableCell>{format(grn.createdAt.toDate(), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right space-x-3">
                    <button 
                      onClick={() => navigate(`${basePath}/${grn.id}`)} 
                      className="text-primary hover:underline text-sm"
                    >
                      View
                    </button>
                    {grn.status !== "delivered" && (
                      <button 
                        onClick={() => navigate(`${basePath}/${grn.id}/edit`)} 
                        className="text-accent hover:underline text-sm"
                      >
                        Continue Receiving
                      </button>
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

export default ReceiveStockList;