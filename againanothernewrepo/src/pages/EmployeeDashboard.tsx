// src/pages/EmployeeDashboard.tsx — UPDATED: Branch + This Week Only
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Truck, Clock, CheckCircle, Eye } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useNavigate } from "react-router-dom";

type DashboardStatus = "pending" | "collected" | "in washing" | "ready";

interface DashboardOrder {
  id: string;
  status?: DashboardStatus;
  laundryId?: string;
  customerName?: string;
  mainServiceName?: string;
  bookedAt?: any;
  branchId?: string;
  [key: string]: any;
}

const EmployeeDashboard = () => {
  const { user, branchId, role } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalActive: 0,
    pending: 0,
    inWashing: 0,
    ready: 0,
  });

  useEffect(() => {
    if (!branchId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    // Define this week's range
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const q = query(
      collection(db, "laundryOrders"),
      where("branchId", "==", branchId),
      where("status", "in", ["pending", "collected", "in washing", "ready"]),
      where("bookedAt", ">=", Timestamp.fromDate(weekStart)),
      where("bookedAt", "<=", Timestamp.fromDate(weekEnd)),
      orderBy("bookedAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: DashboardOrder[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as DashboardOrder));

      const pending = data.filter((o) => o.status === "pending").length;
      const inWashing = data.filter((o) => o.status === "collected" || o.status === "in washing").length;
      const ready = data.filter((o) => o.status === "ready").length;

      setOrders(data);
      setStats({
        totalActive: data.length,
        pending,
        inWashing,
        ready,
      });
      setLoading(false);
    }, (err) => {
      console.error("Dashboard orders error:", err);
      setLoading(false);
    });

    return unsub;
  }, [branchId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-orange-600">Pending</Badge>;
      case "collected":
        return <Badge variant="secondary">Collected</Badge>;
      case "in washing":
        return <Badge className="bg-blue-100 text-blue-800">In Washing</Badge>;
      case "ready":
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "—";
    try {
      return format(timestamp.toDate(), "MMM d, h:mm a");
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Employee Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user?.displayName?.split(" ")[0] || "Team"} • This Week's Overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total This Week</p>
                <p className="text-4xl font-bold text-primary mt-3">{stats.totalActive}</p>
              </div>
              <Package className="w-12 h-12 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-500/30 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Pickup</p>
                <p className="text-4xl font-bold text-orange-600 mt-3">{stats.pending}</p>
              </div>
              <Clock className="w-12 h-12 text-orange-600/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/30 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Washing</p>
                <p className="text-4xl font-bold text-blue-600 mt-3">{stats.inWashing}</p>
              </div>
              <Truck className="w-12 h-12 text-blue-600/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500/30 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready for Delivery</p>
                <p className="text-4xl font-bold text-green-600 mt-3">{stats.ready}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Orders Table – This Week Only */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-2xl font-semibold">This Week's Active Orders</h2>
          <p className="text-sm text-muted-foreground">
            {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d")} –{" "}
            {format(endOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d, yyyy")}
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Laundry ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Booked</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No active orders this week — great job!
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-bold text-primary">
                      {order.laundryId || "—"}
                    </TableCell>
                    <TableCell className="font-medium">{order.customerName || "—"}</TableCell>
                    <TableCell>{order.mainServiceName || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTime(order.bookedAt)}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/lms/${role}/view-order/${order.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Optional Quick Actions (you can remove or expand) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Button
          variant="outline"
          className="h-24 flex flex-col items-center justify-center text-lg"
          onClick={() => navigate(`/lms/${role}/book-laundry-staff`)}
        >
          <Package className="w-8 h-8 mb-2" />
          Book New Order
        </Button>

        <Button
          variant="outline"
          className="h-24 flex flex-col items-center justify-center text-lg"
          onClick={() => navigate(`/lms/${role}/stftrack-laundry`)}
        >
          <Truck className="w-8 h-8 mb-2" />
          Track Laundry
        </Button>

        <Button
          variant="outline"
          className="h-24 flex flex-col items-center justify-center text-lg"
          onClick={() => navigate(`/lms/${role}/customer-orders`)}
        >
          <Clock className="w-8 h-8 mb-2" />
          View All Orders
        </Button>
      </div>
    </div>
  );
};

export default EmployeeDashboard;