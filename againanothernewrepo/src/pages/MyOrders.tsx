// src/pages/customer/MyOrders.tsx
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { toast } from "sonner";

const PAGE_SIZES = [15, 20, 25, 50, 100];

const MyOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "laundryOrders"),
      where("customerId", "==", user.uid),
      orderBy("bookedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setOrders(data);
        setFilteredOrders(data);
        setLoading(false);
      },
      (err) => {
        toast.error("Failed to load orders");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredOrders(orders);
      setCurrentPage(1);
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const results = orders.filter((order) => {
      return (
        order.laundryId?.toLowerCase().includes(q) ||
        formatServices(order).toLowerCase().includes(q) ||
        order.branchName?.toLowerCase().includes(q)
      );
    });

    setFilteredOrders(results);
    setCurrentPage(1);
  }, [searchQuery, orders]);

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, "laundryOrders", deleteConfirmId));
      toast.success("Order deleted");
      setDeleteConfirmId(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const getStatusDisplay = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: "Booked",
      collected: "Collected",
      "in washing": "In Washing",
      ready: "Ready",
      delivered: "Delivered",
    };
    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatServices = (order: any) => {
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      const serviceNames = order.items
        .map((item: any) => item.mainServiceName)
        .filter(Boolean);
      const uniqueNames = Array.from(new Set(serviceNames));
      return uniqueNames.join(", ");
    }

    if (order.mainServiceName) {
      return order.mainServiceName.trim();
    }

    return "No services";
  };

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);

  if (loading) {
    return <div className="text-center py-16 text-lg">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Your Laundry Orders
          </h1>
          <p className="text-muted-foreground mt-2">
            Track and manage your bookings
          </p>
        </div>
        <Button
          onClick={() => navigate("/lms/customer/book-laundry")}
          className="bg-accent hover:bg-accent/90"
        >
          + Book
        </Button>
      </div>

      {deleteConfirmId && filteredOrders.find((o) => o.id === deleteConfirmId) && (
        <Alert className="bg-destructive/10 border-destructive/30 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <span className="font-medium">
              Are you sure you want to delete order{" "}
              <span className="font-mono text-destructive/90">
                {filteredOrders.find((o) => o.id === deleteConfirmId)?.laundryId}
              </span>?
            </span>
            <div className="flex gap-3">
              <Button
                size="sm"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteConfirmId(null)}
              >
                No
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                Yes, Delete
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-b">
          <Input
            placeholder="Search by ID, service or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Rows per page:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[100px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-muted/70">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Order ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Services
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Branch
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Pickup
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="space-y-4">
                      <p className="text-lg">
                        {searchQuery
                          ? "No matching orders found"
                          : "No orders yet"}
                      </p>
                      <Button onClick={() => navigate("/lms/customer/book-laundry")}>
                        Book Your First Laundry
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => navigate(`/lms/customer/order/${order.id}`)}
                          className="text-accent hover:underline hover:text-accent/80 transition-colors text-sm font-medium"
                        >
                          View
                        </button>
                        {order.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                navigate(`/lms/customer/order/${order.id}/continue`)
                              }
                              className="text-emerald-600 hover:underline hover:text-emerald-700 transition-colors text-sm font-medium"
                            >
                              Add
                            </button>
                            <button
                              onClick={() =>
                                navigate(`/lms/customer/order/${order.id}/edit`)
                              }
                              className="text-slate-600 hover:underline hover:text-slate-700 transition-colors text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(order.id)}
                              className="text-destructive hover:underline hover:text-destructive/80 transition-colors text-sm font-medium"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {order.laundryId}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {formatServices(order)}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {order.branchName || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {order.pickupTime
                        ? format(new Date(order.pickupTime), "MMM d, h:mm a")
                        : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          order.status === "pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : order.status === "ready"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-accent/10 text-accent border-accent/20"
                        }`}
                      >
                        {getStatusDisplay(order.status)}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-t gap-4">
            <div className="text-sm text-muted-foreground order-2 sm:order-1">
              Showing {startIndex + 1} - {Math.min(startIndex + pageSize, filteredOrders.length)} of {filteredOrders.length}
            </div>

            <div className="flex items-center gap-4 order-1 sm:order-2 flex-wrap justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>

              <span className="text-sm font-medium whitespace-nowrap">
                Page {currentPage} of {Math.ceil(filteredOrders.length / pageSize)}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === Math.ceil(filteredOrders.length / pageSize)}
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(prev + 1, Math.ceil(filteredOrders.length / pageSize))
                  )
                }
              >
                Next
              </Button>
            </div>

            <div className="flex items-center gap-3 order-3">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Rows per page:
              </span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;