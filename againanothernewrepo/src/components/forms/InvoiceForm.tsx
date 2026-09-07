// src/components/forms/InvoiceForm.tsx — UPDATED with Math.ceil rounding for per-kg totals & final bill
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronsUpDown, Loader2, Eye, X, Download } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

import { fetchInvoiceData, downloadInvoiceFromElement } from "@/lib/invoice/downloadInvoiceUtils";
import { InvoiceTemplate } from "../Invoice/InvoiceTemplate";

type Mode = "new" | "view" | "edit" | "cancel" | "balance";

interface LaundryOrderData {
  id: string;
  laundryId: string;
  customerId: string;
  customerName: string;
  mainServiceName: string;
  mainServiceId?: string;
  packageName?: string;
  sizeName?: string;
  sizeId?: string;
  quantity?: number;
  basePricePerKg: number;
  pricePerKg?: number;
  isPerKg: boolean;
  extraServices?: { name: string; price: number }[];
  linkedTo?: string[];
  isLinked?: boolean;
  status: string;
  isAlreadyBilled?: boolean;
  totalKgs?: number;
  billedAmount?: number;
  billedKgsOrQty?: number;
  branchId?: string;
}

interface PricingConfig {
  id: string;
  branchId: string;
  mainServiceId: string;
  mainServiceName: string;
  sizeId?: string;
  sizeName?: string;
  basePricePerKg: number;
  hasSize: boolean;
  isActive: boolean;
}

const InvoiceForm = ({ mode = "new" }: { mode?: Mode }) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const isNew = mode === "new";
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCancel = mode === "cancel";
  const isBalance = mode === "balance";

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedGroupKey, setSelectedGroupKey] = useState("");
  const [orders, setOrders] = useState<LaundryOrderData[]>([]);
  const [invoice, setInvoice] = useState<any>(null);
  const [staffUsername, setStaffUsername] = useState("Loading...");
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  const [pricingConfigs, setPricingConfigs] = useState<PricingConfig[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);

  const [totalKgs, setTotalKgs] = useState(0);
  const [totalBill, setTotalBill] = useState(0);
  const [paidAmount, setPaidAmount] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const [currentBillingOrder, setCurrentBillingOrder] = useState<LaundryOrderData | null>(null);
  const [billingKgsOrQty, setBillingKgsOrQty] = useState(0);
  const [currentItemTotal, setCurrentItemTotal] = useState(0);
  const [finalTotalKgs, setFinalTotalKgs] = useState(0);
  const [finalTotalQty, setFinalTotalQty] = useState(0);
  const [finalTotalBill, setFinalTotalBill] = useState(0);
  const [initialPaid, setInitialPaid] = useState(0);

  const [showPreview, setShowPreview] = useState(false);
  const [previewCustomerPhone, setPreviewCustomerPhone] = useState("Not provided");
  const [downloading, setDownloading] = useState<string | null>(null);

  const basePath = role === "manager" ? "/lms/manager" : "/lms/employee";

  // Load pricing configs & sizes
  useEffect(() => {
    const loadData = async () => {
      const [pSnap, sizeSnap] = await Promise.all([
        getDocs(collection(db, "pricingConfig")),
        getDocs(collection(db, "sizes")),
      ]);
      setPricingConfigs(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as PricingConfig)));
      setSizes(sizeSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    loadData();
  }, []);

  // Load staff username
  useEffect(() => {
    if (!user?.uid) {
      setStaffUsername("Unknown");
      setIsLoadingStaff(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setStaffUsername(data.username || data.displayName || user.email?.split("@")[0] || "Unknown");
        } else {
          setStaffUsername(user.email?.split("@")[0] || "Unknown");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setStaffUsername(user.email?.split("@")[0] || "Unknown");
      } finally {
        setIsLoadingStaff(false);
      }
    };

    fetchUser();
  }, [user?.uid]);

  // Load customers (dropdown)
  useEffect(() => {
    if (!isNew) return;

    const fetch = async () => {
      const snap = await getDocs(
        query(
          collection(db, "laundryOrders"),
          where("status", "not-in", ["pending", "delivered"])
        )
      );

      const groups = new Map<string, {
        customerId: string;
        customerName: string;
        services: Set<string>;
        groupKey: string;
        isLinked: boolean;
      }>();

      snap.docs.forEach(docSnap => {
        const data = docSnap.data();

        if (data.isAlreadyBilled === true) return;

        const linkedKey =
          data.linkedTo && data.linkedTo.length > 0
            ? [...data.linkedTo, docSnap.id].sort().join(",")
            : `single-${docSnap.id}`;

        if (!groups.has(linkedKey)) {
          groups.set(linkedKey, {
            customerId: data.customerId,
            customerName: data.customerName,
            services: new Set(),
            groupKey: linkedKey,
            isLinked: data.linkedTo?.length > 0 || false,
          });
        }

        groups.get(linkedKey)!.services.add(data.mainServiceName);
      });

      const dropdownList = Array.from(groups.values()).map(group => {
        const serviceList = Array.from(group.services).sort();
        const suffix = group.isLinked
          ? `[Linked: ${serviceList.join(" + ")}]`
          : serviceList[0] || "Unknown Service";

        return {
          customerId: group.customerId,
          displayLabel: `${group.customerName} - ${suffix}`,
          groupKey: group.groupKey,
          isLinked: group.isLinked,
        };
      });

      setCustomers(dropdownList);
    };

    fetch();
  }, [isNew]);

  // Load orders based on selected groupKey
  useEffect(() => {
    if (!isNew || !selectedGroupKey) {
      setOrders([]);
      setIsLoadingOrder(false);
      return;
    }

    const fetch = async () => {
      setIsLoadingOrder(true);

      const selectedEntry = customers.find(c => c.groupKey === selectedGroupKey);
      if (!selectedEntry) {
        setIsLoadingOrder(false);
        return;
      }

      const snap = await getDocs(
        query(
          collection(db, "laundryOrders"),
          where("customerId", "==", selectedEntry.customerId),
          where("status", "not-in", ["pending", "delivered"])
        )
      );

      const eligibleOrders = snap.docs
        .filter(d => !d.data().isAlreadyBilled)
        .map(d => ({ id: d.id, ...(d.data() as any) }));

      let targetOrders: LaundryOrderData[] = [];

      if (selectedEntry.isLinked) {
        const groupKey = selectedEntry.groupKey;

        targetOrders = eligibleOrders.filter(o => {
          if (!o.linkedTo || o.linkedTo.length === 0) return false;

          const key = [...o.linkedTo, o.id].sort().join(",");
          return key === groupKey;
        });
      } else {
        const singleId = selectedEntry.groupKey.replace("single-", "");
        targetOrders = eligibleOrders.filter(o => o.id === singleId);
      }

      setOrders(targetOrders);
      setIsLoadingOrder(false);
    };

    fetch();
  }, [selectedGroupKey, isNew, customers]);

  // Load invoice for view/edit/balance/cancel + customer phone
  useEffect(() => {
    if (isNew || !id) return;

    const fetch = async () => {
      const snap = await getDoc(doc(db, "invoices", id));
      if (snap.exists()) {
        const data = snap.data();
        setInvoice(data);
        setFinalTotalKgs(data.totalKgs || 0);
        setFinalTotalQty(data.totalQuantity || 0);
        setFinalTotalBill(data.totalBill || 0);
        setInitialPaid(data.paidAmount || 0);

        if (data.customerId) {
          const userSnap = await getDoc(doc(db, "users", data.customerId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setPreviewCustomerPhone(userData.phone || userData.phoneNumber || "Not provided");
          }
        }

        if (data.laundryIds) {
          const orderPromises = data.laundryIds.map((orderId: string) =>
            getDoc(doc(db, "laundryOrders", orderId))
          );
          const orderSnaps = await Promise.all(orderPromises);
          const orderList = orderSnaps
            .filter(s => s.exists())
            .map(s => {
              const oData = s.data();
              const billedItem = data.billedItems?.find((bi: any) => bi.laundryId === oData.laundryId);
              return {
                id: s.id,
                billedAmount: billedItem?.amount || 0,
                billedKgsOrQty: billedItem?.kgsOrQty || 0,
                ...(oData as any),
              };
            });
          setOrders(orderList);
        }
      }
    };

    fetch();
  }, [id, isNew]);

  // Current item total calculation — with rounding UP for per-kg services
  useEffect(() => {
    if (!currentBillingOrder) {
      setCurrentItemTotal(0);
      return;
    }

    const extrasTotal = (currentBillingOrder.extraServices || []).reduce((s: number, e: any) => s + e.price, 0);
    const pricePerUnit = (currentBillingOrder.pricePerKg || currentBillingOrder.basePricePerKg) + extrasTotal;

    let rawTotal = currentBillingOrder.isPerKg
      ? pricePerUnit * billingKgsOrQty
      : pricePerUnit * billingKgsOrQty;

    // ROUND UP to nearest whole shilling for per-kg services
    const finalTotal = currentBillingOrder.isPerKg ? Math.ceil(rawTotal) : rawTotal;

    setCurrentItemTotal(finalTotal);
  }, [currentBillingOrder, billingKgsOrQty]);

  // Final summary — also round up final total bill to nearest whole number
  useEffect(() => {
    const billed = orders.filter(o => o.billedAmount && o.billedAmount > 0);
    let totalBill = billed.reduce((s, o) => s + (o.billedAmount || 0), 0);

    // ROUND UP final invoice total (clean whole shillings)
    totalBill = Math.ceil(totalBill);

    const totalKgs = billed
      .filter(o => o.isPerKg)
      .reduce((s, o) => s + (o.billedKgsOrQty || 0), 0);
    const totalQty = billed
      .filter(o => !o.isPerKg)
      .reduce((s, o) => s + (o.billedKgsOrQty || 0), 0);

    setFinalTotalBill(totalBill);
    setFinalTotalKgs(totalKgs);
    setFinalTotalQty(totalQty);
  }, [orders]);

  // Logs helpers
  const getLogTime = (log: any): number => {
    const ts = log.timestamp || log.createdAt;
    if (!ts) return 0;
    if (ts.toDate) return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    if (ts.seconds) return ts.seconds * 1000;
    return 0;
  };

  const formatLogDate = (log: any): string => {
    const ts = log.timestamp || log.createdAt;
    if (!ts) return "—";
    let date;
    if (ts.toDate) date = ts.toDate();
    else if (ts instanceof Date) date = ts;
    else if (ts.seconds) date = new Date(ts.seconds * 1000);
    return date ? date.toLocaleString() : "—";
  };

  const handleBillClick = (order: LaundryOrderData) => {
    setCurrentBillingOrder(order);
    // Pull correct default value based on type
    const defaultValue = order.isPerKg ? (order.totalKgs || 0) : (order.quantity || 1);
    setBillingKgsOrQty(order.billedKgsOrQty || defaultValue);
  };

  const handleSaveItemBill = () => {
    if (!currentBillingOrder || currentItemTotal <= 0) {
      toast.error("Invalid amount");
      return;
    }

    setOrders(prev =>
      prev.map(o =>
        o.id === currentBillingOrder.id
          ? {
              ...o,
              billedAmount: currentItemTotal,
              billedKgsOrQty: billingKgsOrQty,
            }
          : o
      )
    );

    setCurrentBillingOrder(null);
    setBillingKgsOrQty(0);
    setCurrentItemTotal(0);
    toast.success(`Billed ${currentBillingOrder.laundryId} for KSh ${currentItemTotal}`);
  };

  const handleSave = async () => {
    if (isLoadingStaff) {
      toast.error("Loading user info...");
      return;
    }

    if (isNew && finalTotalBill <= 0) {
      toast.error("No items billed");
      return;
    }

    setLoading(true);
    try {
      const invoiceId = isNew ? orders[0].laundryId : id!;
      const batch = writeBatch(db);
      const ref = doc(db, "invoices", invoiceId);

      const paid = Number(initialPaid) || 0;
      const balance = finalTotalBill - paid;

      const now = Timestamp.now();

      const billedItems = orders
        .filter(o => o.billedAmount && o.billedAmount > 0)
        .map(o => ({
          laundryId: o.laundryId,
          mainServiceName: o.mainServiceName,
          packageName: o.packageName || "N/A",
          kgsOrQty: o.billedKgsOrQty || 0,
          amount: o.billedAmount || 0,
        }));

      if (isNew) {
        const year = new Date().getFullYear();
        const countSnap = await getDocs(query(collection(db, "invoices"), where("createdAt", ">=", new Date(year, 0, 1))));
        const invoiceCount = countSnap.size + 1;
        const invoiceNumber = `INV-${year}-${String(invoiceCount).padStart(4, '0')}`;

        batch.set(ref, {
          invoiceNumber,
          laundryIds: orders.map(o => o.id),
          customerId: orders[0]?.customerId || "",
          customerName: orders[0].customerName,
          billedItems,
          totalKgs: finalTotalKgs,
          totalQuantity: finalTotalQty,
          totalBill: finalTotalBill,
          paidAmount: paid,
          balance,
          status: balance <= 0 ? "cleared" : "balance",
          createdBy: user?.uid || "",
          createdByUsername: staffUsername,
          createdAt: now,
          paymentLogs: paid > 0 ? [{
            amount: paid,
            createdAt: now,
            createdBy: user?.uid,
            createdByUsername: staffUsername,
          }] : [],
          activityLogs: [{
            action: "created",
            by: staffUsername,
            byUid: user?.uid,
            timestamp: now,
            details: `Invoice created with total KSh ${finalTotalBill}`,
          }],
        });

        orders.forEach(o => {
          batch.update(doc(db, "laundryOrders", o.id), { isAlreadyBilled: true });
        });
      }

      if (isEdit) {
        batch.update(ref, {
          totalKgs: finalTotalKgs,
          totalQuantity: finalTotalQty,
          totalBill: finalTotalBill,
          billedItems,
          updatedAt: now,
          activityLogs: arrayUnion({
            action: "edited",
            by: staffUsername,
            byUid: user?.uid,
            timestamp: now,
            details: "Updated invoice",
          }),
        });
      }

      if (isBalance) {
        const pay = Number(paidAmount);
        if (pay <= 0 || pay > invoice.balance) {
          toast.error("Invalid payment amount");
          setLoading(false);
          return;
        }
        const newPaid = invoice.paidAmount + pay;
        const newBalance = invoice.totalBill - newPaid;

        batch.update(ref, {
          paidAmount: newPaid,
          balance: newBalance,
          status: newBalance <= 0 ? "cleared" : "balance",
          paymentLogs: arrayUnion({
            amount: pay,
            createdAt: now,
            createdBy: user?.uid,
            createdByUsername: staffUsername,
          }),
          activityLogs: arrayUnion({
            action: "payment",
            by: staffUsername,
            byUid: user?.uid,
            amount: pay,
            timestamp: now,
            details: `Paid KSh ${pay}, new balance KSh ${newBalance}`,
          }),
        });
      }

      if (isCancel) {
        batch.update(ref, {
          status: "cancelled",
          cancelReason,
          activityLogs: arrayUnion({
            action: "cancelled",
            by: staffUsername,
            byUid: user?.uid,
            reason: cancelReason,
            timestamp: now,
          }),
        });
      }

      await batch.commit();
      toast.success("Invoice saved successfully");
      navigate(`${basePath}/all-invoices`);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
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
        invoice.invoiceNumber || invoiceNumber,
        invoice.id || invoiceId
      );

      root.unmount();
      document.body.removeChild(container);

      toast.success(
        `Invoice ${invoiceNumber} downloaded successfully.`,
      );
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("Failed to download invoice. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const isLinked = orders.length > 1;

  const handlePreviewInvoice = () => {
    if (!invoice) {
      toast.error("No invoice data available");
      return;
    }
    setShowPreview(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isNew && "Create New Invoice"}
          {isView && "Invoice Details"}
          {isEdit && "Edit Invoice"}
          {isCancel && "Cancel Invoice"}
          {isBalance && "Clear Balance"}
        </h1>
      </div>

      <div className="bg-card border rounded-xl p-8 space-y-8">
        {/* SEARCHABLE CUSTOMER SELECT */}
        {isNew && (
          <div className="flex justify-center lg:justify-start">
            <div className="w-full lg:max-w-md">
              <Label>Select Customer with Eligible Orders</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full lg:w-[500px] justify-between mt-2"
                  >
                    {selectedGroupKey
                      ? customers.find(c => c.groupKey === selectedGroupKey)?.displayLabel || "Select..."
                      : "Search customer..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full lg:w-[500px] p-0">
                  <Command>
                    <CommandInput placeholder="Search customer..." />
                    <CommandEmpty>No eligible customer found</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {customers.map((c) => (
                        <CommandItem
                          key={c.groupKey}
                          value={c.displayLabel}
                          onSelect={() => {
                            setSelectedGroupKey(c.groupKey);
                            setOpenCombobox(false);
                            setIsLoadingOrder(true);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedGroupKey === c.groupKey ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {c.displayLabel}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {isLoadingOrder && (
                <div className="flex items-center justify-center mt-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading order details...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(orders.length > 0 || invoice) && (
          <>
            {/* Top Dropdowns for Linked Orders */}
            {isLinked && (
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <Label>Customer Name</Label>
                  <Input disabled value={orders[0].customerName} />
                </div>
                <div>
                  <Label>Laundry IDs</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ID" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map(o => (
                        <SelectItem key={o.id} value={o.laundryId}>
                          {o.laundryId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Services</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map(o => (
                        <SelectItem key={o.id} value={o.mainServiceName}>
                          {o.mainServiceName} ({o.packageName || "N/A"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Orders Table */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Orders to Bill</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Package / Size</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Kgs / Qty</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => {
                    const extras = (o.extraServices || []).reduce((s: number, e: any) => s + e.price, 0);
                    const price = (o.pricePerKg || o.basePricePerKg) + extras;
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono">{o.laundryId}</TableCell>
                        <TableCell>{o.mainServiceName}</TableCell>
                        <TableCell>{o.packageName || o.sizeName || "N/A"}</TableCell>
                        <TableCell>KSh {price}</TableCell>
                        <TableCell>{o.isPerKg ? (o.totalKgs || "—") : (o.quantity || "—")}</TableCell>
                        <TableCell className="font-medium">
                          {o.billedAmount ? `KSh ${o.billedAmount}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleBillClick(o)}>
                            Bill
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Current Billing Section - DYNAMIC KGS/QUANTITY */}
            {currentBillingOrder && (
              <div className="border rounded-lg p-6 bg-muted/30">
                <h3 className="text-lg font-semibold mb-4">
                  {currentBillingOrder.billedAmount ? "Editing" : "Billing"}: {currentBillingOrder.laundryId}
                </h3>

                <div className="grid md:grid-cols-3 gap-6">
                  <div><Label>Laundry ID</Label><Input disabled value={currentBillingOrder.laundryId} /></div>
                  <div><Label>Service</Label><Input disabled value={currentBillingOrder.mainServiceName} /></div>
                  <div><Label>Price</Label><Input disabled value={`KSh ${(currentBillingOrder.pricePerKg || currentBillingOrder.basePricePerKg) + (currentBillingOrder.extraServices?.reduce((s: number, e: any) => s + e.price, 0) || 0)}`} /></div>
                </div>

                {/* Editable Size Dropdown - only for services with sizes */}
                {pricingConfigs.some(p => p.mainServiceName === currentBillingOrder.mainServiceName && p.hasSize) && (
                  <div className="mt-6">
                    <Label>Size (editable)</Label>
                    <Select
                      value={currentBillingOrder.sizeName || ""}
                      onValueChange={(newSizeName) => {
                        const newConfig = pricingConfigs.find(p =>
                          p.mainServiceName === currentBillingOrder.mainServiceName &&
                          p.sizeName === newSizeName &&
                          p.branchId === currentBillingOrder.branchId &&
                          p.isActive
                        );

                        if (newConfig) {
                          setCurrentBillingOrder(prev => ({
                            ...prev!,
                            sizeName: newSizeName,
                            basePricePerKg: newConfig.basePricePerKg,
                            sizeId: newConfig.sizeId,
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {pricingConfigs
                          .filter(p =>
                            p.mainServiceName === currentBillingOrder.mainServiceName &&
                            p.hasSize &&
                            p.branchId === currentBillingOrder.branchId &&
                            p.isActive
                          )
                          .map(p => (
                            <SelectItem key={p.sizeId} value={p.sizeName || ""}>
                              {p.sizeName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid md:grid-cols-3 gap-6 mt-6">
                  <div>
                    <Label>
                      {currentBillingOrder.isPerKg && !currentBillingOrder.packageName
                        ? "Total Kgs"
                        : "Quantity"}
                    </Label>
                    <Input
                      type="number"
                      value={billingKgsOrQty}
                      onChange={(e) => setBillingKgsOrQty(Number(e.target.value) || 0)}
                      placeholder={
                        currentBillingOrder.isPerKg && !currentBillingOrder.packageName
                          ? "Enter kgs"
                          : "Enter quantity"
                      }
                    />
                  </div>
                  <div>
                    <Label>Updated Total for this item</Label>
                    <Input disabled value={`KSh ${currentItemTotal}`} />
                  </div>
                  <div className="flex items-end gap-3">
                    <Button onClick={handleSaveItemBill}>
                      {currentBillingOrder.billedAmount ? "Update" : "Save Bill"}
                    </Button>
                    <Button variant="outline" onClick={() => setCurrentBillingOrder(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Final Invoice Summary */}
            {finalTotalBill > 0 && (
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold mb-6">Invoice Summary</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <Label>Total Bill</Label>
                    <Input disabled value={`KSh ${finalTotalBill}`} className="font-bold" />
                  </div>
                  <div>
                    <Label>Already Paid</Label>
                    <Input disabled value={`KSh ${initialPaid}`} className="text-green-600 font-semibold" />
                  </div>
                  <div>
                    <Label>Current Balance</Label>
                    <Input disabled value={`KSh ${finalTotalBill - initialPaid}`} className="text-orange-600 font-bold" />
                  </div>
                </div>

                {isBalance && (
                  <div className="grid md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
                    <div>
                      <Label>Amount to Pay Now</Label>
                      <Input
                        type="number"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="Enter amount"
                        min="1"
                        max={finalTotalBill - initialPaid}
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full">
                        <Label>Remaining Balance After Payment</Label>
                        <Input
                          disabled
                          value={`KSh ${finalTotalBill - initialPaid - (Number(paidAmount) || 0)}`}
                          className={Number(paidAmount || 0) >= (finalTotalBill - initialPaid) ? "text-green-600 font-bold" : "text-orange-600"}
                        />
                      </div>
                    </div>
                    <div></div>
                  </div>
                )}

                {!isBalance && !isView && (
                  <div className="grid md:grid-cols-3 gap-6 mt-6">
                    <div>
                      <Label>Initial Amount Paid</Label>
                      <Input
                        type="number"
                        value={initialPaid}
                        onChange={(e) => setInitialPaid(Number(e.target.value) || 0)}
                        disabled={isView}
                      />
                    </div>
                    <div>
                      <Label>Balance</Label>
                      <Input
                        disabled
                        value={`KSh ${finalTotalBill - initialPaid}`}
                        className={initialPaid >= finalTotalBill ? "text-green-600 font-bold" : "text-orange-600"}
                      />
                    </div>
                    <div>
                      <Label>Created By</Label>
                      <Input disabled value={staffUsername} />
                    </div>
                  </div>
                )}

                {isView && (
                  <div className="grid md:grid-cols-3 gap-6 mt-6">
                    <div>
                      <Label>Paid Amount</Label>
                      <Input disabled value={`KSh ${initialPaid}`} className="text-green-600 font-semibold" />
                    </div>
                    <div>
                      <Label>Balance</Label>
                      <Input disabled value={`KSh ${finalTotalBill - initialPaid}`} className={initialPaid >= finalTotalBill ? "text-green-600 font-bold" : "text-orange-600"} />
                    </div>
                    <div>
                      <Label>Created By</Label>
                      <Input disabled value={staffUsername} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview Button */}
            {isView && invoice && (
              <div className="flex justify-end mt-6">
                <Button
                  onClick={handlePreviewInvoice}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Eye className="h-5 w-5" />
                  Preview Invoice
                </Button>
              </div>
            )}

            {/* Logs */}
            {(invoice?.activityLogs?.length > 0 || invoice?.paymentLogs?.length > 0) && (
              <Accordion type="single" collapsible defaultValue="logs">
                <AccordionItem value="logs">
                  <AccordionTrigger>Activity & Payment Logs ({(invoice?.activityLogs?.length || 0) + (invoice?.paymentLogs?.length || 0)})</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {[...(invoice?.activityLogs || []), ...(invoice?.paymentLogs || [])]
                        .sort((a, b) => getLogTime(b) - getLogTime(a))
                        .map((log: any, i: number) => (
                          <div key={i} className="text-sm border-b pb-3 last:border-0">
                            <div className="flex justify-between">
                              <div>
                                <p className="font-medium">
                                  {log.action === "payment" || log.amount ? `Payment: KSh ${log.amount || 0}` :
                                   log.action === "created" ? "Invoice Created" :
                                   log.action === "edited" ? "Invoice Edited" :
                                   log.action === "cancelled" ? "Invoice Cancelled" : "Action"}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  by {log.by || log.createdByUsername || "Unknown"}
                                  {log.reason && ` — Reason: ${log.reason}`}
                                </p>
                                {log.details && <p className="text-xs text-muted-foreground mt-1">{log.details}</p>}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatLogDate(log)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {isCancel && (
              <div>
                <Label>Reason for Cancellation</Label>
                <Textarea placeholder="Enter reason..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="mt-2" />
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button variant="outline" onClick={() => navigate(`${basePath}/all-invoices`)}>Back</Button>
          {!isView && (
            <Button
              onClick={handleSave}
              disabled={loading || (isNew && finalTotalBill <= 0)}
            >
              {loading ? "Saving..." : isNew ? "Create Invoice" : isBalance ? "Record Payment" : isCancel ? "Cancel Invoice" : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && invoice && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center overflow-auto p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto relative shadow-2xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white"
              onClick={() => setShowPreview(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            <div className="p-6">
              <InvoiceTemplate
                invoice={invoice}
                customerPhone={previewCustomerPhone}
              />
            </div>

            <div className="sticky bottom-0 bg-white border-t p-6 flex justify-center">
              <Button
                size="lg"
                onClick={() => handleDownloadInvoice(invoice.id, invoice.invoiceNumber || invoice.id)}
                disabled={downloading === invoice.id}
                className="gap-2 px-10"
              >
                {downloading === invoice.id ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download Invoice
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;