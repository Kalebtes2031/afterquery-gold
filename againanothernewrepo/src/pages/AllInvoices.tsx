// src/pages/manager/AllInvoices.tsx - FINAL with working download + top-right search + apply filters
import { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Search, Filter, X } from "lucide-react";
import { toast } from "sonner";

import { fetchInvoiceData, downloadInvoiceFromElement } from "@/lib/invoice/downloadInvoiceUtils";
import { InvoiceTemplate } from "@/components/Invoice/InvoiceTemplate";
import { addDays, startOfWeek, endOfWeek } from "date-fns";

interface PaymentLog {
  amount: number;
  createdAt: any;
  createdBy: string;
  createdByUsername: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  laundryId: string;
  customerName: string;
  mainServiceName: string;
  pricePerKg: number;
  totalKgs: number;
  totalBill: number;
  paidAmount: number;
  balance: number;
  status: "pending" | "balance" | "cleared" | "cancelled";
  createdAt: any;
  branchId?: string;
  paymentLogs?: PaymentLog[];
}

const ITEMS_PER_PAGE = 10;

const AllInvoices = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Filters
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("thisWeek");
  const [searchTerm, setSearchTerm] = useState("");

  // Applied filters (for Apply button)
  const [appliedBranch, setAppliedBranch] = useState("all");
  const [appliedStatus, setAppliedStatus] = useState("all");
  const [appliedDateRange, setAppliedDateRange] = useState("thisWeek");

  const basePath = role === "manager" ? "/lms/manager" : "/lms/employee";

  useEffect(() => {
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt,
          } as Invoice)
      );
      setInvoices(data);
    });

    return unsub;
  }, []);

  const applyFilters = () => {
    setAppliedBranch(branchFilter);
    setAppliedStatus(statusFilter);
    setAppliedDateRange(dateRange);
    setCurrentPage(1);
    toast.success('Filters Applied')
  };

  const resetFilters = () => {
    setBranchFilter("all");
    setStatusFilter("all");
    setDateRange("thisWeek");
    setAppliedBranch("all");
    setAppliedStatus("all");
    setAppliedDateRange("thisWeek");
    setCurrentPage(1);
    toast.success( "Filters reset");
  };

  // Filtered & sorted invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    if (appliedBranch !== "all") {
      result = result.filter((inv) => inv.branchId === appliedBranch);
    }

    if (appliedStatus !== "all") {
      result = result.filter((inv) => inv.status === appliedStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((inv) =>
        [
          inv.invoiceNumber?.toLowerCase(),
          inv.customerName?.toLowerCase(),
          inv.laundryId?.toLowerCase(),
          inv.mainServiceName?.toLowerCase(),
        ].some((text) => text?.includes(term))
      );
    }

    if (appliedDateRange !== "all") {
      const now = new Date();
      let start: Date | undefined;
      let end: Date = now;

      if (appliedDateRange === "thisWeek") {
        start = startOfWeek(now, { weekStartsOn: 1 });
      } else if (appliedDateRange === "lastWeek") {
        start = startOfWeek(addDays(now, -7), { weekStartsOn: 1 });
        end = endOfWeek(addDays(now, -7), { weekStartsOn: 1 });
      } else if (appliedDateRange === "thisMonth") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (start) {
        result = result.filter((inv) => {
          const invDate = inv.createdAt?.toDate?.() || new Date();
          return invDate >= start && invDate <= end;
        });
      }
    }

    return result.sort((a, b) => {
      const aUnpaid = a.status === "pending" || a.status === "balance";
      const bUnpaid = b.status === "pending" || b.status === "balance";

      if (aUnpaid && !bUnpaid) return -1;
      if (!aUnpaid && bUnpaid) return 1;
      return b.createdAt?.toMillis() - a.createdAt?.toMillis();
    });
  }, [invoices, appliedBranch, appliedStatus, searchTerm, appliedDateRange]);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (status: Invoice["status"]) => {
    switch (status) {
      case "cleared":
        return <Badge className="bg-green-100 text-green-800">Cleared</Badge>;
      case "balance":
        return <Badge className="bg-orange-100 text-orange-800">Balance</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    }
  };

  const getLastPersonnel = (logs?: PaymentLog[]) => {
    if (!logs || logs.length === 0) return "—";
    return logs[logs.length - 1].createdByUsername;
  };

  // Download invoice function
  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    setDownloading(invoiceId);
    
    try {
      const { invoice, customerPhone } = await fetchInvoiceData(invoiceId);

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      document.body.appendChild(container);

      const React = await import("react");
      const ReactDOM = await import("react-dom/client");

      const root = ReactDOM.createRoot(container);
      
      await new Promise<void>((resolve) => {
        root.render(
          React.createElement(InvoiceTemplate, {
            invoice,
            customerPhone,
          })
        );
        setTimeout(resolve, 500);
      });

      const invoiceElement = container.querySelector("div");
      if (!invoiceElement) {
        throw new Error("Failed to render invoice");
      }

      await downloadInvoiceFromElement(
        invoiceElement as HTMLElement,
        invoice.invoiceNumber,
        invoice.id
      );

      root.unmount();
      document.body.removeChild(container);

      toast(
         `Invoice ${invoiceNumber} downloaded successfully.`,
      );
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error( "Failed to download invoice. Please try again.",
        );
    } finally {
      setDownloading(null);
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "invoices", invoiceId));
      toast.success( `Invoice ${invoiceNumber} has been deleted.`,
      );
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Could not delete the invoice. Please try again.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            All Invoices
          </h1>
          <p className="text-muted-foreground">
            Manage customer billing, payments & balances
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => navigate(`${basePath}/invoice/new`)}
          className="bg-gradient-to-r from-primary to-accent"
        >
          Add Bill
        </Button>
      </div>

      {/* Search bar - top right, live */}
      <div className="flex justify-end">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice #, customer, service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Branch Filter */}
          <div>
            <label className="text-sm font-medium block mb-1">Branch</label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium block mb-1">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="balance">Balance</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="text-sm font-medium block mb-1">Date Range</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="This week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="lastWeek">Last Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Apply & Reset */}
          <div className="flex gap-3 items-end">
            <Button variant="outline" onClick={resetFilters} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={applyFilters} className="flex-1">
              <Filter className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actions</TableHead>
                <TableHead>Invoice No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Price/Kg</TableHead>
                <TableHead>Kgs</TableHead>
                <TableHead>Total Bill</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Personnel</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-14 text-muted-foreground"
                  >
                    No invoices yet.
                    {role === "manager" && " Click Add Bill to create one."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-muted/50">
                    {/* Actions - first column */}
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        

                        {/* Download */}
                        <button
                          onClick={() => handleDownloadInvoice(inv.id, inv.invoiceNumber)}
                          disabled={downloading === inv.id}
                          className="text-primary font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloading === inv.id ? "Downloading..." : "Download"}
                        </button>

                        {/* Delete - text button */}
                        <button
                          onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                          className="text-destructive font-medium hover:underline"
                        >
                          Delete
                        </button>

                        {/* Keep your other conditional buttons */}
                        {inv.status !== "cancelled" && (
                          <>
                            {inv.balance > 0 && (
                              <button
                                onClick={() =>
                                  navigate(`${basePath}/invoice/${inv.id}/balance`)
                                }
                                className="text-green-600 font-medium hover:underline"
                              >
                                Clear Balance
                              </button>
                            )}

                            {inv.paidAmount === 0 && (
                              <>
                                <button
                                  onClick={() =>
                                    navigate(`${basePath}/invoice/${inv.id}/edit`)
                                  }
                                  className="text-blue-600 font-medium hover:underline"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() =>
                                    navigate(`${basePath}/invoice/${inv.id}/cancel`)
                                  }
                                  className="text-red-600 font-medium hover:underline"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {/* Invoice No as clickable view link */}
                        <button
                          onClick={() => navigate(`${basePath}/invoice/${inv.id}/view`)}
                          className="text-primary font-medium  hover:text-primary/80 hover:underline transition-colors cursor-pointer"
                        >
                          {inv.invoiceNumber}
                        </button>
                    </TableCell>

                    <TableCell className="font-medium">
                      {inv.customerName}
                    </TableCell>

                    <TableCell>KSh {inv.pricePerKg}</TableCell>
                    <TableCell>{inv.totalKgs || "—"}</TableCell>
                    <TableCell className="font-semibold">
                      KSh {inv.totalBill}
                    </TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      {inv.paidAmount > 0 ? `KSh ${inv.paidAmount}` : "—"}
                    </TableCell>
                    <TableCell className="text-orange-600 font-semibold">
                      {inv.balance > 0 ? `KSh ${inv.balance}` : "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="capitalize">
                      {getLastPersonnel(inv.paymentLogs)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} of{" "}
              {filteredInvoices.length} invoices
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = currentPage - 2 + i;
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  return pageNum;
                }).filter(Boolean).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(Number(page))}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllInvoices;