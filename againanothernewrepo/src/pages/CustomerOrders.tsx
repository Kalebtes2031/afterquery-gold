import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  Timestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";
import { db } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 10;

const CustomerOrders = () => {
  const { user, role, branchId, branchName } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const [branchFilter, setBranchFilter] = useState(() => {
    return role === "employee"
      ? branchId || "all"
      : searchParams.get("branch") || "all";
  });
  const [dateRange, setDateRange] = useState(searchParams.get("dateRange") || "thisWeek");
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") || "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") || "");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  const [appliedBranch, setAppliedBranch] = useState(branchFilter);
  const [appliedFrom, setAppliedFrom] = useState<Date | null>(null);
  const [appliedTo, setAppliedTo] = useState<Date | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const showCustomDates = dateRange === "custom";

  useEffect(() => {
    if (role !== "manager") return;

    const unsub = onSnapshot(collection(db, "branches"), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [role]);

  useEffect(() => {
    const branch = role === "employee" ? branchId || "all" : (searchParams.get("branch") || "all");
    const dr = searchParams.get("dateRange") || "thisWeek";
    const fromStr = searchParams.get("from") || "";
    const toStr = searchParams.get("to") || "";
    const search = searchParams.get("search") || "";

    setBranchFilter(branch);
    setDateRange(dr);
    setCustomFrom(fromStr);
    setCustomTo(toStr);
    setSearchTerm(search);

    let from: Date | null = null;
    let to: Date | null = null;
    const today = new Date();

    switch (dr) {
      case "today":
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case "yesterday":
        from = startOfDay(subDays(today, 1));
        to = endOfDay(subDays(today, 1));
        break;
      case "thisWeek":
        from = startOfWeek(today, { weekStartsOn: 1 });
        to = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case "lastWeek":
        from = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        to = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        break;
      case "thisMonth":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case "lastMonth":
        from = startOfMonth(subMonths(today, 1));
        to = endOfMonth(subMonths(today, 1));
        break;
      case "all":
        break;
      case "custom":
        if (fromStr) from = new Date(fromStr);
        if (toStr) to = endOfDay(new Date(toStr));
        break;
      default:
        break;
    }

    setAppliedBranch(branch);
    setAppliedFrom(from);
    setAppliedTo(to);
  }, [searchParams, role, branchId]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const constraints: any[] = [];

    if (role === "customer") {
      constraints.push(where("customerId", "==", user.uid));
    } else if (role === "employee") {
      if (!branchId) {
        setOrders([]);
        setLoading(false);
        return;
      }
      constraints.push(where("branchId", "==", branchId));
    } else if (role === "manager" && appliedBranch !== "all") {
      constraints.push(where("branchId", "==", appliedBranch));
    }

    if (appliedFrom) {
      constraints.push(where("bookedAt", ">=", Timestamp.fromDate(appliedFrom)));
    }
    if (appliedTo) {
      constraints.push(where("bookedAt", "<=", Timestamp.fromDate(appliedTo)));
    }

    const q = query(
      collection(db, "laundryOrders"),
      ...constraints,
      orderBy("bookedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(data);
        setLoading(false);
      },
      (err) => {
        console.error("Orders fetch error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, role, branchId, appliedBranch, appliedFrom, appliedTo]);

  const applyFilters = () => {
    setApplying(true);

    const newParams = new URLSearchParams();

    newParams.set("branch", branchFilter);
    newParams.set("dateRange", dateRange);
    newParams.set("search", searchTerm);

    if (dateRange === "custom") {
      if (customFrom) newParams.set("from", customFrom);
      if (customTo) newParams.set("to", customTo);
    }

    setSearchParams(newParams, { replace: true });

    setTimeout(() => {
      setApplying(false);
      toast({
        title: "Filters applied",
        duration: 2200,
      });
    }, 400);
  };

  const resetFilters = () => {
    setBranchFilter(role === "employee" ? branchId || "all" : "all");
    setDateRange("thisWeek");
    setCustomFrom("");
    setCustomTo("");
    setSearchTerm("");

    const newParams = new URLSearchParams();
    if (role === "employee" && branchId) {
      newParams.set("branch", branchId);
    }
    setSearchParams(newParams, { replace: true });

    toast({
      title: "Filters reset"
    });
  };

  const filteredOrders = orders.filter((order) =>
    searchTerm === ""
      ? true
      : [
          order.laundryId?.toLowerCase(),
          order.customerName?.toLowerCase(),
          order.phone?.toLowerCase(),
          order.mainServiceName?.toLowerCase(),
        ].some((text) => text?.includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, appliedBranch, appliedFrom, appliedTo]);

  const getCurrentStatus = (status: string) => {
    const map: Record<string, string> = {
      pending: "Pending",
      collected: "Collected",
      "in washing": "In Washing",
      ready: "Ready",
      delivered: "Delivered",
    };
    return map[status] || status;
  };

  const handleDeleteClick = (order: any) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "laundryOrders", orderToDelete.id));
      toast({
        title: "Order Deleted",
        description: `Order ${orderToDelete.laundryId} has been removed.`,
      });
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {role === "customer"
            ? "My Laundry Orders"
            : role === "employee"
            ? `${branchName || "Branch"} Orders`
            : "All Orders"}
        </h1>

        <Button variant="outline" size="sm" onClick={resetFilters}>
          <X className="w-4 h-4 mr-2" />
          Reset Filters
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {role === "manager" ? (
            <div>
              <label className="text-sm font-medium block mb-1">Branch</label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium block mb-1">Branch</label>
              <Input
                value={branchName || "Loading..."}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium block mb-1">Date Range</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="lastWeek">Last Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showCustomDates && (
            <>
              <div>
                <label className="text-sm font-medium block mb-1">From</label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">To</label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </>
          )}

          <Button
            onClick={applyFilters}
            disabled={applying}
            className="mt-6 md:mt-0"
          >
            {applying ? (
              "Applying..."
            ) : (
              <>
                <Filter className="w-4 h-4 mr-2" />
                Apply
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search order ID, name, phone, service..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {deleteDialogOpen && orderToDelete && (
        <Alert className="bg-destructive/10 border-destructive/30 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <span className="font-medium">
              Are you sure you want to delete order{" "}
              <span className="font-mono text-destructive/90">
                {orderToDelete.laundryId}
              </span>
              ?
            </span>
            <div className="flex gap-3">
              <Button
                size="sm"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setOrderToDelete(null);
                }}
                disabled={deleting}
              >
                No
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
  <div className="overflow-x-auto">
    <table className="w-full min-w-[1400px]">  {/* increased min-width to give more breathing room */}
      <thead className="bg-muted/50 border-b">
        <tr>
          <th className="px-6 py-4 text-left text-xs font-medium uppercase whitespace-nowrap">Actions</th>
          <th className="px-6 py-4 text-left text-xs font-medium uppercase whitespace-nowrap">Customer Name</th>
          <th className="px-6 py-4 text-left text-xs font-medium uppercase whitespace-nowrap">Phone</th>
          <th className="px-6 py-4 text-left text-xs font-medium uppercase whitespace-nowrap">Area</th>
          <th className="px-6 py-4 text-left text-xs font-medium uppercase whitespace-nowrap">Apt/Room</th>
          <th className="px-6 py-4 text-left text-xs font-medium uppercase whitespace-nowrap">Service</th>
          <th className="px-6 py-4 text-left text-xs font-medium uppercase whitespace-nowrap">Branch</th>
          <th className="px-6 py-4 text-left text-xs font-medium uppercase whitespace-nowrap">Pickup</th>
          <th className="px-6 py-4 text-left text-xs font-medium uppercase whitespace-nowrap">Status</th>
          <th className="px-6 py-4 text-left text-xs font-medium uppercase whitespace-nowrap">Booked</th>
          <th className="px-6 py-4 text-left text-xs font-medium uppercase whitespace-nowrap">Order ID</th>
        </tr>
      </thead>

      <tbody className="divide-y">
        {paginatedOrders.length === 0 ? (
          <tr>
            <td 
              colSpan={role === "customer" ? 10 : 11} 
              className="text-center py-16 text-muted-foreground"
            >
              No orders found
            </td>
          </tr>
        ) : (
          paginatedOrders.map((order) => (
            <tr key={order.id} className="hover:bg-muted/30">
              <td className="px-6 py-4 whitespace-nowrap space-x-4">
                {role !== "customer" && order.status !== "delivered" && (
                  <span
                    className="text-accent cursor-pointer hover:underline"
                    onClick={() => navigate(`/lms/${role}/serve-order/${order.id}`)}
                  >
                    Serve
                  </span>
                )}
                <span
                  className="text-primary cursor-pointer hover:underline"
                  onClick={() => navigate(`/lms/${role}/view-order/${order.id}`)}
                >
                  View
                </span>
                {role === "manager" && (
                  <span
                    className="text-destructive cursor-pointer hover:underline"
                    onClick={() => handleDeleteClick(order)}
                  >
                    Delete
                  </span>
                )}
              </td>

              <td className="px-6 py-4 font-medium whitespace-nowrap">
                {order.customerName || "—"}
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
                {order.phone || "—"}
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
                {order.areaOfResidence || "—"}
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
                {order.apartment || "—"}
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
                {order.mainServiceName}
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
                {order.branchName}
              </td>

              <td className="px-6 py-4 text-sm whitespace-nowrap">
                {format(new Date(order.pickupTime), "MMM d, h:mm a")}
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant="outline">{getCurrentStatus(order.status)}</Badge>
              </td>

              <td className="px-6 py-4 text-sm whitespace-nowrap">
                {format(order.bookedAt.toDate(), "MMM d, yyyy")}
              </td>

              <td className="px-6 py-4 font-mono text-primary whitespace-nowrap">
                {order.laundryId}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>

  {/* Pagination stays exactly the same */}
  {totalPages > 1 && (
    <div className="flex items-center justify-between px-6 py-4 border-t">
      <div className="text-sm text-muted-foreground">
        Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
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
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
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

export default CustomerOrders;