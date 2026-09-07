// src/pages/employee/StaffTrackLaundry.tsx — UPDATED: Actions left, Latest orders first
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, Timestamp, orderBy } from "firebase/firestore";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface LaundryOrder {
  id: string;
  laundryId: string;
  customerName: string;
  mainServiceName?: string;
  extraServices?: { name: string }[];
  status: string;
  phone?: string;
  totalItems?: number;
  trackedItems?: any[];
  branchId?: string;
  branchName?: string;
  bookedAt?: any;
}

const StaffTrackLaundry = () => {
  const { role, branchId, branchName } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Draft filters (UI)
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateRange, setDateRange] = useState("thisWeek");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Applied filters
  const [appliedBranch, setAppliedBranch] = useState(role === "employee" ? branchId || "all" : "all");
  const [appliedFrom, setAppliedFrom] = useState<Date | null>(null);
  const [appliedTo, setAppliedTo] = useState<Date | null>(null);

  const showCustomDates = dateRange === "custom";

  // Load branches (manager only)
  useEffect(() => {
    if (role !== "manager") return;

    const unsub = onSnapshot(collection(db, "branches"), (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [role]);

  // Default THIS WEEK on mount
  useEffect(() => {
    const today = new Date();
    setAppliedFrom(startOfWeek(today, { weekStartsOn: 1 }));
    setAppliedTo(endOfWeek(today, { weekStartsOn: 1 }));
  }, []);

  // Fetch orders (all except pending) — LATEST FIRST
  useEffect(() => {
    setLoading(true);
    const constraints: any[] = [
      where("status", "!=", "pending"),
    ];

    // Branch filter
    if (role === "employee" && branchId) {
      constraints.push(where("branchId", "==", branchId));
    } else if (role === "manager" && appliedBranch !== "all") {
      constraints.push(where("branchId", "==", appliedBranch));
    }

    // Date filter
    if (appliedFrom) {
      constraints.push(where("bookedAt", ">=", Timestamp.fromDate(appliedFrom)));
    }
    if (appliedTo) {
      constraints.push(where("bookedAt", "<=", Timestamp.fromDate(appliedTo)));
    }

    const q = query(
      collection(db, "laundryOrders"), 
      ...constraints,
      orderBy("bookedAt", "desc") // ← LATEST ORDERS FIRST
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as LaundryOrder));
        setOrders(data);
        setLoading(false);
      },
      (err) => {
        console.error("Track orders error:", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [role, branchId, appliedBranch, appliedFrom, appliedTo]);

  // Apply filters
  const applyFilters = () => {
    setAppliedBranch(branchFilter);

    let from: Date | null = null;
    let to: Date | null = null;

    const today = new Date();

    switch (dateRange) {
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
        if (customFrom) from = new Date(customFrom);
        if (customTo) to = endOfDay(new Date(customTo));
        break;
      default:
        break;
    }

    setAppliedFrom(from);
    setAppliedTo(to);
  };

  // Real-time client-side search
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

  const resetFilters = () => {
    setBranchFilter("all");
    setDateRange("thisWeek");
    setCustomFrom("");
    setCustomTo("");
    setSearchTerm("");
    applyFilters();
  };

  const getServiceDisplay = (order: LaundryOrder) => {
    const main = order.mainServiceName || "Unknown Service";
    const extras = (order.extraServices || []).map((e) => e.name);
    return extras.length > 0 ? `${main} (+${extras.join(", ")})` : main;
  };

  const getStatusDisplay = (status: string) => {
    return status === "in washing"
      ? "In Washing"
      : status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground">Loading laundry orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Track Laundry Orders
          </h1>
          <p className="text-muted-foreground">
            Track laundry • Record items • Update status
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={resetFilters}>
          <X className="w-4 h-4 mr-2" />
          Reset Filters
        </Button>
      </div>

      {/* Apply Filters Section */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Branch */}
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

          {/* Date Range */}
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

          {/* Custom From */}
          {showCustomDates && (
            <div>
              <label className="text-sm font-medium block mb-1">From</label>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
          )}

          {/* Custom To */}
          {showCustomDates && (
            <div>
              <label className="text-sm font-medium block mb-1">To</label>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          )}

          {/* Apply */}
          <Button
            onClick={applyFilters}
            className="mt-6 md:mt-0"
          >
            <Filter className="w-4 h-4 mr-2" />
            Apply
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search laundry ID, customer, phone, service..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Actions</TableHead>
                <TableHead>Laundry ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Items</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-16 text-muted-foreground"
                  >
                    No laundry orders found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const hasTracking = !!order.trackedItems?.length;
                  return (
                    <TableRow key={order.id} className="hover:bg-muted/30">
                      {/* Actions Column - Left */}
                      <TableCell className="space-x-4">
                        {order.status === "delivered" ? (
                          // Delivered orders: Only show View
                          <span
                            className="text-primary cursor-pointer hover:underline font-medium"
                            onClick={() =>
                              navigate(
                                `/lms/${role}/stftrack-laundry/${order.id}/view`
                              )
                            }
                          >
                            View
                          </span>
                        ) : hasTracking ? (
                          // Has tracking but not delivered: Show Edit + View
                          <>
                            <span
                              className="text-accent cursor-pointer hover:underline font-medium"
                              onClick={() =>
                                navigate(
                                  `/lms/${role}/stftrack-laundry/${order.id}/track`
                                )
                              }
                            >
                              Edit
                            </span>
                            <span
                              className="text-primary cursor-pointer hover:underline font-medium"
                              onClick={() =>
                                navigate(
                                  `/lms/${role}/stftrack-laundry/${order.id}/view`
                                )
                              }
                            >
                              View
                            </span>
                          </>
                        ) : (
                          // No tracking yet: Show Track
                          <span
                            className="text-primary cursor-pointer hover:underline font-medium"
                            onClick={() =>
                              navigate(
                                `/lms/${role}/stftrack-laundry/${order.id}/track`
                              )
                            }
                          >
                            Track
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono font-bold text-primary">
                        {order.laundryId}
                      </TableCell>

                      <TableCell className="font-medium">
                        {order.customerName}
                      </TableCell>

                      <TableCell>{getServiceDisplay(order)}</TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            order.status === "ready" ? "default" : "secondary"
                          }
                        >
                          {getStatusDisplay(order.status)}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-medium">
                        {order.totalItems || "-"}
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

export default StaffTrackLaundry;