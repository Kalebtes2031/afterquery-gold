// src/pages/customer/CustomerInvoices.tsx
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

interface Invoice {
  id: string;
  invoiceNumber?: string;
  billedItems?: Array<{
    mainServiceName: string;
    packageName: string;
    amount: number;
    kgsOrQty: number;
  }>;
  totalKgs?: number;
  totalQuantity?: number;
  totalBill: number;
  paidAmount: number;
  balance: number;
  status: "pending" | "cleared" | "balance" | "cancelled";
}

const CustomerInvoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) return;

    const q = query(
      collection(db, "invoices"),
      where("customerId", "==", currentUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Invoice));
      setInvoices(data);
    });

    return unsub;
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "cleared":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Cleared</Badge>;
      case "balance":
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200">Balance</Badge>;
      case "cancelled":
        return <Badge className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200">Pending</Badge>;
    }
  };

  const formatServices = (items: any[] = []) => {
    if (items.length === 0) return "Service";
    return items.map((item) => item.mainServiceName).join(" + ");
  };

  const getPricePerKg = (items: any[] = []) => {
    const washItems = items.filter((i) =>
      i.packageName && ["Lite", "Standard", "Premium"].includes(i.packageName)
    );
    if (washItems.length > 0 && washItems[0].kgsOrQty > 0) {
      return `KSh ${(washItems[0].amount / washItems[0].kgsOrQty).toFixed(0)}`;
    }
    return "N/A";
  };

  const getQuantityPrice = (items: any[] = []) => {
    const fixedItems = items.filter(
      (i) => !i.packageName || !["Lite", "Standard", "Premium"].includes(i.packageName)
    );
    if (fixedItems.length > 0 && fixedItems[0].kgsOrQty > 0) {
      return `KSh ${(fixedItems[0].amount / fixedItems[0].kgsOrQty).toFixed(0)}`;
    }
    return "N/A";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          My Invoices
        </h1>
        <p className="text-muted-foreground">View and download your laundry invoices</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/70">
                <TableHead className="px-6 py-4">Actions</TableHead>
                <TableHead className="px-6 py-4">Invoice ID</TableHead>
                <TableHead className="px-6 py-4">Service Name(s)</TableHead>
                <TableHead className="px-6 py-4">Price per Kg</TableHead>
                <TableHead className="px-6 py-4">Total Kgs</TableHead>
                <TableHead className="px-6 py-4">Quantity Price</TableHead>
                <TableHead className="px-6 py-4">Total Quantity</TableHead>
                <TableHead className="px-6 py-4">Total Bill</TableHead>
                <TableHead className="px-6 py-4">Paid Amount</TableHead>
                <TableHead className="px-6 py-4">Balance</TableHead>
                <TableHead className="px-6 py-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    No invoices yet. Once billed, they will appear here.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => {
                  const items = inv.billedItems || [];
                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/lms/customer/invoice/${inv.id}`)}
                          className="text-accent hover:underline hover:text-accent/80 transition-colors text-sm font-medium"
                        >
                          View Invoice
                        </button>
                      </TableCell>

                      <TableCell className="px-6 py-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber || inv.id}
                      </TableCell>

                      <TableCell className="px-6 py-4 text-sm">
                        {formatServices(items)}
                      </TableCell>

                      <TableCell className="px-6 py-4 text-sm">
                        {getPricePerKg(items)}
                      </TableCell>

                      <TableCell className="px-6 py-4 text-sm">
                        {inv.totalKgs || 0}
                      </TableCell>

                      <TableCell className="px-6 py-4 text-sm">
                        {getQuantityPrice(items)}
                      </TableCell>

                      <TableCell className="px-6 py-4 text-sm">
                        {inv.totalQuantity || 0}
                      </TableCell>

                      <TableCell className="px-6 py-4 font-bold text-accent">
                        KSh {inv.totalBill.toLocaleString()}
                      </TableCell>

                      <TableCell className="px-6 py-4 text-emerald-600 font-semibold">
                        KSh {inv.paidAmount.toLocaleString()}
                      </TableCell>

                      <TableCell className="px-6 py-4 font-semibold text-orange-600">
                        {inv.balance > 0 ? `KSh ${inv.balance.toLocaleString()}` : "—"}
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        {getStatusBadge(inv.status)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default CustomerInvoices;