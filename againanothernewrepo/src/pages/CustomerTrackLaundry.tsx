// src/pages/CustomerTrackLaundry.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Package,
  Truck,
  WashingMachine,
  PackageOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { toast } from "sonner";
import JSZip from "jszip";

interface LaundryOrder {
  id: string;
  laundryId: string;
  status: string;
  bookedAt: any;
  mainServiceName: string;
  branchName: string;
  totalItems?: number;
  images?: string[];
  branchId: string;
  mainServiceId: string;
  customerId?: string;
}

const CustomerTrackLaundry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [allOrders, setAllOrders] = useState<LaundryOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<LaundryOrder | null>(null);
  const [orderStages, setOrderStages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageFullscreen, setShowImageFullscreen] = useState(false);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("month");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "laundryOrders"),
      where("customerId", "==", user.uid),
      orderBy("bookedAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as LaundryOrder));
      setAllOrders(data);
      setOrders(data);
      if (data.length > 0 && !selectedOrder) setSelectedOrder(data[0]);
    });

    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (dateFilter === "all") {
      setOrders(allOrders);
      return;
    }

    const now = new Date();
    const filtered = allOrders.filter((order) => {
      const orderDate = order.bookedAt.toDate();

      if (dateFilter === "today") return orderDate.toDateString() === now.toDateString();
      if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= weekAgo;
      }
      if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= monthAgo;
      }
      return true;
    });

    setOrders(filtered);
  }, [dateFilter, allOrders]);

  useEffect(() => {
    if (!selectedOrder) {
      setOrderStages(["pending", "collected", "in washing", "ready", "delivered"]);
      return;
    }

    const fetchStages = async () => {
      const q = query(
        collection(db, "pricingConfig"),
        where("branchId", "==", selectedOrder.branchId),
        where("mainServiceId", "==", selectedOrder.mainServiceId),
        where("isActive", "==", true)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const config = snap.docs[0].data();
        setOrderStages(config.stages || ["pending", "collected", "in washing", "ready", "delivered"]);
      } else {
        setOrderStages(["pending", "collected", "in washing", "ready", "delivered"]);
      }
    };
    fetchStages();
  }, [selectedOrder]);

  if (orders.length === 0) {
    return (
      <div className="p-8 text-center space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Track Your Laundry</h1>
        <p className="text-muted-foreground text-lg">
          {dateFilter === "all" ? "No laundry orders found." : "No orders found in this time period."}
        </p>
        <div className="flex flex-col items-center gap-4">
          {dateFilter !== "all" && (
            <Button variant="outline" onClick={() => setDateFilter("all")}>
              Show All Orders
            </Button>
          )}
          <Button onClick={() => navigate("/lms/customer/book-laundry")}>
            Book New Laundry
          </Button>
        </div>
      </div>
    );
  }

  const order = selectedOrder!;
  const currentStageIndex = orderStages.indexOf(order.status);
  const progressPercentage = orderStages.length > 0 ? ((currentStageIndex + 1) / orderStages.length) * 100 : 0;

  const getStageLabel = (stage: string) => {
    const map: Record<string, string> = {
      pending: "Booked",
      collected: "Collected",
      "in washing": "In Washing",
      ready: "Ready",
      delivered: "Delivered",
    };
    return map[stage] || stage.charAt(0).toUpperCase() + stage.slice(1);
  };

  const getStageIcon = (stage: string) => {
    const icons: Record<string, JSX.Element> = {
      pending: <Package className="w-5 h-5" />,
      collected: <PackageOpen className="w-5 h-5" />,
      "in washing": <WashingMachine className="w-5 h-5" />,
      ready: <Truck className="w-5 h-5" />,
      delivered: <CheckCircle className="w-5 h-5" />,
    };
    return icons[stage] || <Package className="w-5 h-5" />;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      pending: "text-amber-600",
      collected: "text-accent",
      "in washing": "text-accent",
      ready: "text-emerald-600",
      delivered: "text-slate-600",
    };
    return colors[stage] || "text-muted-foreground";
  };

  const handleDownloadImage = async () => {
    if (!order.images?.length) return;
    const imageUrl = order.images[currentImageIndex];
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${order.laundryId}-photo-${currentImageIndex + 1}.jpg`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch {
      toast.error("Failed to download image");
    }
  };

  const handleDownloadAllImages = async () => {
    if (!order.images?.length) return;
    setIsDownloading(true);
    toast.info(`Preparing ${order.images.length} image${order.images.length > 1 ? "s" : ""}...`);

    try {
      const zip = new JSZip();
      const folder = zip.folder(order.laundryId);

      for (let i = 0; i < order.images.length; i++) {
        try {
          const response = await fetch(order.images[i]);
          const blob = await response.blob();
          folder?.file(`photo-${i + 1}.jpg`, blob);
        } catch {}
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${order.laundryId}-photos.zip`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("Download complete!");
    } catch {
      toast.error("Failed to create ZIP");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Track Your Laundry</h1>
          <p className="text-muted-foreground mt-1">
            {user?.displayName || user?.email?.split("@")[0]} • {orders.length} order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">Filter by time:</span>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-primary/10 bg-gradient-to-br from-primary/3 to-background shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">{order.laundryId}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Booked: {format(order.bookedAt.toDate(), "MMM d, yyyy 'at' h:mm a")}
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="font-medium">Service:</span> {order.mainServiceName}
                </p>
                <p>
                  <span className="font-medium">Branch:</span> {order.branchName}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-base px-5 py-1.5 self-start sm:self-center">
              {getStageLabel(order.status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pt-2">
          <div className="space-y-3">
            <Progress value={progressPercentage} className="h-2.5" />
            <p className="text-center text-sm text-muted-foreground">
              Stage {currentStageIndex + 1} of {orderStages.length}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {orderStages.map((stage, idx) => (
              <div
                key={stage}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${
                  idx <= currentStageIndex
                    ? "border-primary/20 bg-primary/4"
                    : "border-border bg-muted/40 opacity-70"
                }`}
              >
                <div className={idx <= currentStageIndex ? getStageColor(stage) : "text-muted-foreground/70"}>
                  {getStageIcon(stage)}
                </div>
                <span
                  className={`text-xs md:text-sm font-medium ${
                    idx <= currentStageIndex ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {getStageLabel(stage)}
                </span>
                {idx === currentStageIndex && (
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse mt-1" />
                )}
              </div>
            ))}
          </div>

          {order.images?.length ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Your Laundry Photos</h3>
                <span className="text-sm text-muted-foreground">
                  {order.images.length} photo{order.images.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="relative rounded-xl overflow-hidden border shadow group">
                <Button
                  className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/70 hover:bg-white shadow-xl px-6 py-3 rounded-full text-dark md:hidden"
                  onClick={() => setShowImageFullscreen(true)}
                >
                  <Eye className="w-5 h-5 mr-2" />
                  View Full
                </Button>

                {order.images.length > 1 && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white opacity-80 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex((prev) => (prev === 0 ? order.images!.length - 1 : prev - 1));
                      }}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white opacity-80 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex((prev) => (prev === order.images!.length - 1 ? 0 : prev + 1));
                      }}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}

                <img
                  src={order.images[currentImageIndex]}
                  className="w-full aspect-[4/3] md:aspect-[16/9] object-cover"
                  alt={`Laundry photo ${currentImageIndex + 1}`}
                />

                <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {order.images.length}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-end">
                <Button variant="outline" size="sm" onClick={handleDownloadImage}>
                  Download Current
                </Button>
                {order.images.length > 1 && (
                  <Button
                    size="sm"
                    onClick={handleDownloadAllImages}
                    disabled={isDownloading}
                    className="bg-accent hover:bg-accent/90"
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating ZIP...
                      </>
                    ) : (
                      <>Download All ({order.images.length})</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">All Your Orders</h2>

        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/70">
                  <TableHead className="px-6 py-4">Actions</TableHead>
                  <TableHead className="px-6 py-4">Laundry ID</TableHead>
                  <TableHead className="px-6 py-4">Booked</TableHead>
                  <TableHead className="px-6 py-4">Status</TableHead>
                  <TableHead className="px-6 py-4 text-center">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(o);
                          }}
                          className={`transition-colors text-sm font-medium ${
                            selectedOrder?.id === o.id 
                              ? "text-accent font-semibold" 
                              : "text-accent hover:underline hover:text-accent/80"
                          }`}
                        >
                          {selectedOrder?.id === o.id ? "Showing" : "Click to Show"}
                        </button>

                        {o.images?.length ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/lms/customer/track-laundry/${o.id}`);
                            }}
                            className="text-slate-600 hover:underline hover:text-slate-700 transition-colors text-sm font-medium"
                          >
                            View items
                          </button>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="px-6 py-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {o.laundryId}
                    </TableCell>

                    <TableCell className="px-6 py-4 text-sm whitespace-nowrap">
                      {format(o.bookedAt.toDate(), "MMM d, h:mm a")}
                    </TableCell>

                    <TableCell className="px-6 py-4">
                      <Badge 
                        variant="secondary" 
                        className="whitespace-nowrap px-3 py-1 text-xs"
                      >
                        {getStageLabel(o.status)}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-6 py-4 text-center font-medium text-sm">
                      {o.totalItems ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {showImageFullscreen && order.images?.length && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageFullscreen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 right-6 text-white hover:bg-white/10 rounded-full"
            onClick={() => setShowImageFullscreen(false)}
          >
            <EyeOff className="h-8 w-8" />
            Close
          </Button>

          <img
            src={order.images[currentImageIndex]}
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
            alt="Full size laundry photo"
          />
        </div>
      )}
    </div>
  );
};

export default CustomerTrackLaundry;