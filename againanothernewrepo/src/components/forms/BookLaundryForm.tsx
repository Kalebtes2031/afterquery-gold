// src/components/forms/BookLaundryForm.tsx
// CHANGES:
// 1. Branch auto-saved to user profile (mirrors areaOfResidence pattern)
// 2. Package services shown as selectable cards with included extras as read-only tags
// 3. Fixed pricing per package — no deselecting extras to change price
// 4. Pickup time replaced with react-day-picker calendar + time slot buttons (7am–7pm)

import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, X, CheckCircle, AlertTriangle, Check, CalendarDays, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  writeBatch,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import RatingPopup from "../rating/RatingPopup";

const generateLaundryId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `LND-${year}-${random}`;
};

// Pickup time slots — 7am to 7pm
// Each slot has a label, a window for display, and an hour (24h) used to build the datetime string
const TIME_SLOTS = [
  { id: "morning",   label: "Morning",   window: "7:00 AM – 11:00 AM", hour: 9  },
  { id: "afternoon", label: "Afternoon", window: "11:00 AM – 3:00 PM", hour: 13 },
  { id: "evening",   label: "Evening",   window: "3:00 PM – 7:00 PM",  hour: 17 },
];

// Build the datetime string (same format as before: "YYYY-MM-DDTHH:MM") from a date + slot hour
const buildPickupTime = (date: Date, hour: number): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(hour).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:00`;
};

// Parse a stored pickupTime string back to { date, slotId } for view/edit pre-fill
const parsePickupTime = (pickupTime: string): { date: Date | null; slotId: string } => {
  if (!pickupTime) return { date: null, slotId: "" };
  const parsed = new Date(pickupTime);
  if (isNaN(parsed.getTime())) return { date: null, slotId: "" };
  const hour = parsed.getHours();
  // Match to closest slot
  const slot = TIME_SLOTS.find((s) => s.hour === hour) ||
    TIME_SLOTS.reduce((prev, cur) =>
      Math.abs(cur.hour - hour) < Math.abs(prev.hour - hour) ? cur : prev
    );
  return { date: parsed, slotId: slot.id };
};

interface BookingItem {
  id: string;
  laundryId: string;
  mainServiceName: string;
  packageName?: string;
  sizeName?: string;
  quantity: number;
  basePriceText: string;
  totalPriceText: string;
  extras: string[];
  status: string;
}

interface BookLaundryFormProps {
  mode: "add" | "view" | "edit" | "continue";
}

const BookLaundryForm = ({ mode }: BookLaundryFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id?: string }>();

  const isAdd = mode === "add";
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isContinue = mode === "continue";

  const [loading, setLoading] = useState(false);

  // Reference data
  const [branches, setBranches] = useState<any[]>([]);
  const [pricingConfigs, setPricingConfigs] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);

  // Branch auto-save state (mirrors areaOfResidence pattern)
  const [savedBranchId, setSavedBranchId] = useState("");
  const [savedBranchName, setSavedBranchName] = useState("");
  const [showBranchDropdown, setShowBranchDropdown] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState("");

  // Current item
  const [mainServiceId, setMainServiceId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [selectedPackageConfig, setSelectedPackageConfig] = useState<any>(null);

  // Pickup time — date + slot
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
  const [pickupSlot, setPickupSlot] = useState<string>("");

  const [laundryItemsDisabled, setLaundryItemsDisabled] = useState(false);
  const [keepDetailsForSession, setKeepDetailsForSession] = useState(false);

  // Shared customer data (pickupTime stored as a derived string, not directly edited)
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    areaOfResidence: "",
    apartment: "",
    pickupTime: "", // derived from pickupDate + pickupSlot
    specialInstructions: "",
  });

  // Gender state
  const [savedGender, setSavedGender] = useState("");
  const [showGenderDropdown, setShowGenderDropdown] = useState(true);
  const [selectedGender, setSelectedGender] = useState("");
  const [customGender, setCustomGender] = useState("");

  // Booking state
  const [bookingItems, setBookingItems] = useState<BookingItem[]>([]);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [lastSavedLaundryId, setLastSavedLaundryId] = useState<string | null>(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(paramId || null);
  const [linkedOrderIds, setLinkedOrderIds] = useState<string[]>([]);
  const [showRating, setShowRating] = useState(false);

  // Whenever pickupDate or pickupSlot changes, sync formData.pickupTime
  useEffect(() => {
    if (pickupDate && pickupSlot) {
      const slot = TIME_SLOTS.find((s) => s.id === pickupSlot);
      if (slot) {
        setFormData((prev) => ({
          ...prev,
          pickupTime: buildPickupTime(pickupDate, slot.hour),
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, pickupTime: "" }));
    }
  }, [pickupDate, pickupSlot]);

  // Load reference data
  useEffect(() => {
    const loadData = async () => {
      const [bSnap, pSnap, pkgSnap, sizeSnap] = await Promise.all([
        getDocs(collection(db, "branches")),
        getDocs(collection(db, "pricingConfig")),
        getDocs(collection(db, "packages")),
        getDocs(collection(db, "sizes")),
      ]);
      setBranches(bSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPricingConfigs(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPackages(pkgSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSizes(sizeSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    loadData();
  }, []);

  // Load customer profile — branch + gender + areaOfResidence
  useEffect(() => {
    if (!user?.uid) return;
    const loadProfile = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setFormData((prev) => ({
          ...prev,
          customerName: data.name || user.displayName || "",
          phone: data.phone || "",
          areaOfResidence: data.areaOfResidence || "",
        }));

        // Branch auto-save
        const bId = data.savedBranchId || "";
        const bName = data.savedBranchName || "";
        if (bId) {
          setSavedBranchId(bId);
          setSavedBranchName(bName);
          setShowBranchDropdown(false);
          setSelectedBranch(bId);
        } else {
          setShowBranchDropdown(true);
        }

        // Gender
        const gender = data.gender || "";
        if (gender) {
          setSavedGender(gender);
          setShowGenderDropdown(false);
          setSelectedGender(gender.startsWith("Type Gender:") ? "Type Gender" : gender);
          setCustomGender(gender.startsWith("Type Gender:") ? gender.slice(13) : "");
        } else {
          setShowGenderDropdown(true);
        }
      }
    };
    loadProfile();
  }, [user]);

  // Clear stale size/package when main service changes
  useEffect(() => {
    if (!mainServiceId || !selectedBranch) return;

    const supportsPackage = pricingConfigs.some(
      (p) => p.branchId === selectedBranch && p.mainServiceId === mainServiceId && p.isActive && p.hasPackage,
    );
    const supportsSize = pricingConfigs.some(
      (p) => p.branchId === selectedBranch && p.mainServiceId === mainServiceId && p.isActive && p.hasSize,
    );

    if (!supportsPackage) { setPackageId(""); setSelectedPackageConfig(null); }
    if (!supportsSize) setSizeId("");
  }, [mainServiceId, selectedBranch, pricingConfigs]);

  // Clear stale sizeId
  useEffect(() => {
    if (sizeId && mainServiceId && selectedBranch) {
      const isValidSize = pricingConfigs.some(
        (config) =>
          config.branchId === selectedBranch &&
          config.mainServiceId === mainServiceId &&
          config.isActive &&
          config.hasSize &&
          config.sizeId === sizeId,
      );
      if (!isValidSize) setSizeId("");
    }
  }, [mainServiceId, selectedBranch, sizeId, pricingConfigs]);

  // Load current order + linked group
  useEffect(() => {
    if (!currentOrderId || isAdd) return;

    const loadOrderAndLinked = async () => {
      const orderSnap = await getDoc(doc(db, "laundryOrders", currentOrderId));
      if (!orderSnap.exists()) {
        navigate("/lms/customer/my-orders");
        return;
      }

      const orderData = orderSnap.data();

      if ((isEdit || isContinue) && orderData.status !== "pending") {
        toast.error("This order is no longer editable (status changed)");
        navigate("/lms/customer/my-orders");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        customerName: orderData.customerName || prev.customerName || "",
        phone: orderData.phone || prev.phone || "",
        areaOfResidence: orderData.areaOfResidence || "",
        apartment: orderData.apartment || "",
        pickupTime: orderData.pickupTime?.slice(0, 16) || "",
        specialInstructions: orderData.specialInstructions || "",
      }));

      // Pre-fill date + slot pickers from stored pickupTime
      const { date, slotId } = parsePickupTime(orderData.pickupTime?.slice(0, 16) || "");
      if (date) setPickupDate(date);
      if (slotId) setPickupSlot(slotId);

      setSelectedBranch(orderData.branchId || "");

      if (isContinue) {
        setMainServiceId("");
        setPackageId("");
        setSizeId("");
        setQuantity("");
        setSelectedPackageConfig(null);
        // For continue mode, clear pickup selection so user re-picks or keeps
        if (!keepDetailsForSession) {
          setPickupDate(undefined);
          setPickupSlot("");
        }
      } else {
        setMainServiceId(orderData.mainServiceId || "");
        setPackageId(orderData.packageId || "");
        setSizeId(orderData.sizeId || "");
        setQuantity(orderData.quantity || "");
      }

      if (isContinue && !keepDetailsForSession) {
        setShowQuestion(true);
        setLaundryItemsDisabled(true);
      }

      const allIds = [currentOrderId, ...(orderData.linkedTo || [])];
      if (allIds.length > 0) {
        const linkedSnap = await getDocs(
          query(collection(db, "laundryOrders"), where("__name__", "in", allIds)),
        );

        const linkedList = linkedSnap.docs.map((d) => {
          const dData = d.data();
          return {
            id: d.id,
            laundryId: dData.laundryId,
            mainServiceName: dData.mainServiceName,
            packageName: dData.packageName || "",
            sizeName: dData.sizeName || "",
            quantity: dData.quantity || 1,
            basePriceText: dData.isPerKg ? `KSh ${dData.basePricePerKg}/kg` : `KSh ${dData.basePricePerKg}`,
            totalPriceText: dData.isPerKg
              ? `KSh ${dData.basePricePerKg + (dData.extraServices?.reduce((s: number, e: any) => s + e.price, 0) || 0)}/kg`
              : `KSh ${dData.basePricePerKg + (dData.extraServices?.reduce((s: number, e: any) => s + e.price, 0) || 0)}`,
            extras: (dData.extraServices || []).map((e: any) => e.name),
            status: dData.status || "pending",
          };
        });

        setBookingItems(linkedList);
        setShowDataTable(true);
        setLinkedOrderIds(allIds.filter((id) => id !== currentOrderId));
      }
    };

    loadOrderAndLinked();
  }, [currentOrderId, isAdd, isEdit, isContinue, navigate, keepDetailsForSession]);

  // When packageId changes, find and store the matching config
  useEffect(() => {
    if (!packageId || !mainServiceId || !selectedBranch) {
      setSelectedPackageConfig(null);
      return;
    }
    const config = pricingConfigs.find(
      (p) =>
        p.branchId === selectedBranch &&
        p.mainServiceId === mainServiceId &&
        p.isActive &&
        p.hasPackage &&
        p.packageId === packageId,
    );
    setSelectedPackageConfig(config || null);
  }, [packageId, mainServiceId, selectedBranch, pricingConfigs]);

  const availableMainServices = pricingConfigs
    .filter((p) => p.branchId === selectedBranch && p.isActive)
    .reduce((acc: any[], config) => {
      if (!acc.find((s) => s.mainServiceId === config.mainServiceId)) {
        acc.push({ mainServiceId: config.mainServiceId, mainServiceName: config.mainServiceName });
      }
      return acc;
    }, []);

  const mainServiceUsesPackage = pricingConfigs.some(
    (p) => p.branchId === selectedBranch && p.mainServiceId === mainServiceId && p.isActive && p.hasPackage,
  );

  const mainServiceUsesSize = pricingConfigs.some(
    (p) => p.branchId === selectedBranch && p.mainServiceId === mainServiceId && p.isActive && p.hasSize,
  );

  const availablePackageConfigs = pricingConfigs.filter(
    (p) => p.branchId === selectedBranch && p.mainServiceId === mainServiceId && p.isActive && p.hasPackage,
  );

  const availableSizes = sizes.filter((size) =>
    pricingConfigs.some(
      (config) =>
        config.branchId === selectedBranch &&
        config.mainServiceId === mainServiceId &&
        config.isActive === true &&
        config.hasSize === true &&
        config.sizeId === size.id,
    ),
  );

  const standaloneConfig = pricingConfigs.find(
    (p) => p.branchId === selectedBranch && p.mainServiceId === mainServiceId && p.isActive && !p.hasPackage && !p.hasSize,
  );
  const sizeConfig = pricingConfigs.find(
    (p) => p.branchId === selectedBranch && p.mainServiceId === mainServiceId && p.isActive && p.hasSize && p.sizeId === sizeId,
  );
  const currentConfig = mainServiceUsesPackage ? selectedPackageConfig : mainServiceUsesSize ? sizeConfig : standaloneConfig;

  const getBasePriceText = () => {
    if (!currentConfig) return "";
    return currentConfig.hasPackage ? `KSh ${currentConfig.basePricePerKg}/kg` : `KSh ${currentConfig.basePricePerKg}`;
  };

  const getTotalPriceText = () => {
    if (!currentConfig) return "";
    const qty = quantity === "" ? 1 : quantity;

    if (currentConfig.hasPackage) {
      const extrasTotal = (currentConfig.extraServices || []).reduce(
        (sum: number, e: any) => sum + (e.price || 0), 0,
      );
      return `KSh ${currentConfig.basePricePerKg + extrasTotal}/kg`;
    }

    return `KSh ${currentConfig.basePricePerKg * qty}`;
  };

  // Determine which slots are available for the selected date
  // If today: hide slots whose midpoint hour has already passed
  const getAvailableSlots = () => {
    if (!pickupDate) return TIME_SLOTS;
    if (!isToday(pickupDate)) return TIME_SLOTS;
    const currentHour = new Date().getHours();
    return TIME_SLOTS.filter((s) => s.hour > currentHour);
  };

  const isFormValid = () => {
    const quantityValid = mainServiceUsesPackage || (quantity !== "" && quantity > 0);
    return (
      selectedBranch &&
      mainServiceId &&
      formData.phone &&
      formData.areaOfResidence &&
      formData.pickupTime &&   // still the derived string — same as before
      (!mainServiceUsesPackage || (packageId && selectedPackageConfig)) &&
      (!mainServiceUsesSize || sizeId) &&
      quantityValid
    );
  };

  const updateUserProfile = async () => {
    const finalGender = showGenderDropdown
      ? selectedGender === "Type Gender"
        ? customGender.trim() ? `Type Gender: ${customGender.trim()}` : "Rather not say"
        : selectedGender || null
      : savedGender;

    const branchName = branches.find((b) => b.id === selectedBranch)?.name || "";

    await updateDoc(doc(db, "users", user!.uid), {
      name: formData.customerName,
      phone: formData.phone.trim() || null,
      gender: finalGender,
      areaOfResidence: formData.areaOfResidence.trim() || null,
      savedBranchId: selectedBranch || null,
      savedBranchName: branchName || null,
    });
  };

  const createNewLinkedOrder = async () => {
    if (!isFormValid()) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const finalGender = showGenderDropdown
        ? selectedGender === "Type Gender"
          ? customGender.trim() ? `Type Gender: ${customGender.trim()}` : "Rather not say"
          : selectedGender
        : savedGender;

      const laundryId = generateLaundryId();
      const newOrderRef = doc(collection(db, "laundryOrders"));

      let linkedToArray = [...linkedOrderIds];
      if (isContinue && currentOrderId && !linkedToArray.includes(currentOrderId)) {
        linkedToArray.push(currentOrderId);
      }

      const supportsPackage = mainServiceUsesPackage;
      const supportsSize = mainServiceUsesSize;
      const isPerKg = supportsPackage;
      const finalQuantity = quantity === "" ? 1 : quantity;

      const packageExtras = supportsPackage
        ? (selectedPackageConfig?.extraServices || []).map((e: any) => ({ name: e.name, price: e.price }))
        : [];

      const payload = {
        customerId: user!.uid,
        customerName: formData.customerName,
        phone: formData.phone,
        branchId: selectedBranch,
        branchName: branches.find((b) => b.id === selectedBranch)?.name || "",
        areaOfResidence: formData.areaOfResidence,
        apartment: formData.apartment || "",
        pickupTime: formData.pickupTime,
        specialInstructions: formData.specialInstructions || null,
        mainServiceId,
        mainServiceName: currentConfig?.mainServiceName || "",
        packageId: supportsPackage ? packageId : "",
        packageName: supportsPackage ? currentConfig?.packageName || "" : "",
        sizeId: supportsSize ? sizeId : "",
        sizeName: supportsSize ? currentConfig?.sizeName || "" : "",
        basePricePerKg: currentConfig?.basePricePerKg || 0,
        isPerKg,
        quantity: supportsSize || (!supportsPackage && !supportsSize) ? finalQuantity : 1,
        extraServices: packageExtras,
        gender: finalGender || null,
        status: "pending",
        linkedTo: linkedToArray,
        isLinked: linkedToArray.length > 0,
        bookedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(newOrderRef, { ...payload, laundryId });
      await updateUserProfile();

      if (linkedToArray.length > 0) {
        const batch = writeBatch(db);
        linkedToArray.forEach((prevId) => {
          batch.update(doc(db, "laundryOrders", prevId), {
            linkedTo: arrayUnion(newOrderRef.id),
            isLinked: true,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }

      setSavedBranchId(selectedBranch);
      setSavedBranchName(branches.find((b) => b.id === selectedBranch)?.name || "");
      setShowBranchDropdown(false);

      setLinkedOrderIds((prev) => [...prev, newOrderRef.id]);
      setLastSavedLaundryId(laundryId);
      setShowSuccessAlert(true);
      setShowDataTable(true);
      setShowRating(true);

      setBookingItems((prev) => [
        ...prev,
        {
          id: newOrderRef.id,
          laundryId,
          mainServiceName: currentConfig?.mainServiceName || "",
          packageName: currentConfig?.packageName || "",
          sizeName: currentConfig?.sizeName || "",
          quantity: payload.quantity,
          basePriceText: getBasePriceText(),
          totalPriceText: getTotalPriceText(),
          extras: packageExtras.map((e: any) => e.name),
          status: "pending",
        },
      ]);

      setMainServiceId("");
      setPackageId("");
      setSizeId("");
      setQuantity("");
      setSelectedPackageConfig(null);
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBooking = createNewLinkedOrder;
  const handleAddOrder = createNewLinkedOrder;

  const handleUpdateOnly = async () => {
    if (!currentOrderId || !isFormValid()) {
      toast.error("Invalid data");
      return;
    }

    setLoading(true);
    try {
      const supportsPackage = mainServiceUsesPackage;
      const supportsSize = mainServiceUsesSize;
      const isPerKg = supportsPackage;
      const finalQuantity = quantity === "" ? 1 : quantity;

      const packageExtras = supportsPackage
        ? (selectedPackageConfig?.extraServices || []).map((e: any) => ({ name: e.name, price: e.price }))
        : [];

      await updateDoc(doc(db, "laundryOrders", currentOrderId), {
        areaOfResidence: formData.areaOfResidence,
        apartment: formData.apartment || "",
        pickupTime: formData.pickupTime,
        specialInstructions: formData.specialInstructions || null,
        mainServiceId,
        mainServiceName: currentConfig?.mainServiceName || "",
        packageId: supportsPackage ? packageId : "",
        packageName: supportsPackage ? currentConfig?.packageName || "" : "",
        sizeId: supportsSize ? sizeId : "",
        sizeName: supportsSize ? currentConfig?.sizeName || "" : "",
        isPerKg,
        quantity: supportsSize || (!supportsPackage && !supportsSize) ? finalQuantity : 1,
        extraServices: packageExtras,
        updatedAt: serverTimestamp(),
      });

      await updateUserProfile();
      toast.success("Order updated successfully");
      navigate("/lms/customer/my-orders");
    } catch (err: any) {
      toast.error("Update failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueBooking = () => {
    setShowSuccessAlert(false);
    if (!keepDetailsForSession) {
      setShowQuestion(true);
      setLaundryItemsDisabled(true);
    } else {
      setLaundryItemsDisabled(false);
    }
  };

  const handleAlertClose = () => {
    setShowSuccessAlert(false);
    navigate("/lms/customer/my-orders");
  };

  const handleYes = () => {
    setShowQuestion(false);
    setLaundryItemsDisabled(false);
  };

  const handleNo = () => {
    setSelectedBranch(savedBranchId || "");
    setShowBranchDropdown(!savedBranchId);
    setFormData((prev) => ({ ...prev, areaOfResidence: "", apartment: "", pickupTime: "" }));
    setPickupDate(undefined);
    setPickupSlot("");
    setShowQuestion(false);
    setLaundryItemsDisabled(false);
  };

  const handleKeepForAll = () => {
    setShowQuestion(false);
    setKeepDetailsForSession(true);
    setLaundryItemsDisabled(false);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setQuantity("");
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 0) setQuantity(numValue);
    }
  };

  const getDisplayName = (item: BookingItem) => {
    let name = item.mainServiceName;
    if (item.packageName) name += ` [${item.packageName}]`;
    if (item.sizeName) name += ` [${item.sizeName}]`;
    if (item.quantity > 1) name += ` × ${item.quantity}`;
    return name;
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

  const availableSlots = getAvailableSlots();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/lms/customer/my-orders")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {isAdd ? "Book Laundry" : isView ? "View Order" : isContinue ? "Add Linked Order" : "Edit Order"}
        </h1>
      </div>

      <div className="bg-card border rounded-lg p-6 lg:p-8">
        <div className="space-y-8">

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
                disabled={isView}
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                disabled={isView}
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label>Gender</Label>
              {showGenderDropdown ? (
                selectedGender === "Type Gender" && !isView ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={selectedGender} onValueChange={setSelectedGender}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Rather not say">Rather not say</SelectItem>
                        <SelectItem value="Type Gender">Type Gender.....</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={customGender} onChange={(e) => setCustomGender(e.target.value)} placeholder="Type Gender" />
                  </div>
                ) : (
                  <Select value={selectedGender} onValueChange={setSelectedGender} disabled={isView}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Rather not say">Rather not say</SelectItem>
                      <SelectItem value="Type Gender">Type Gender.....</SelectItem>
                    </SelectContent>
                  </Select>
                )
              ) : (
                <div className="relative">
                  <Input value={savedGender} disabled />
                  {!isView && (
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3"
                      onClick={() => { setShowGenderDropdown(true); setSelectedGender(""); setCustomGender(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Branch — auto-save */}
            <div className="space-y-2">
              <Label>Branch *</Label>
              {!showBranchDropdown && savedBranchId ? (
                <div className="relative">
                  <Input value={savedBranchName} disabled />
                  {!isView && (
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3"
                      onClick={() => { setShowBranchDropdown(true); setSelectedBranch(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <Select
                  value={selectedBranch}
                  onValueChange={(val) => { setSelectedBranch(val); setMainServiceId(""); setPackageId(""); setSizeId(""); setSelectedPackageConfig(null); }}
                  required
                  disabled={isView}
                >
                  <SelectTrigger><SelectValue placeholder="Choose branch" /></SelectTrigger>
                  <SelectContent>
                              {branches
              .filter((b) => b.isActive)
              .map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {!showBranchDropdown && savedBranchId && !isView && (
                <p className="text-xs text-amber-700 mt-1 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Edit branch if you changed location!
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Area of Residence *</Label>
              <Input
                value={formData.areaOfResidence}
                onChange={(e) => setFormData({ ...formData, areaOfResidence: e.target.value })}
                required
                disabled={isView}
                placeholder="e.g. Kilimani, Westlands, Slaughter"
              />
              <p className="text-xs text-amber-700 mt-1 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Edit above Area of Residence if you relocated!
              </p>
            </div>

            <div className="space-y-2">
              <Label>Apartment / Room No.</Label>
              <Input
                value={formData.apartment}
                onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                disabled={isView}
              />
            </div>
          </div>

          {/* ===== PICKUP TIME — calendar + slots ===== */}
          <div className="space-y-4 pt-2">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="w-4 h-4" />
              Pickup Date & Time *
            </Label>

            {isView && formData.pickupTime ? (
              /* View mode: show a friendly read-only summary */
              <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-3 text-sm font-medium">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span>
                  {pickupDate ? format(pickupDate, "EEEE, MMMM d, yyyy") : ""}
                </span>
                {pickupSlot && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{TIME_SLOTS.find((s) => s.id === pickupSlot)?.window}</span>
                  </>
                )}
              </div>
            ) : !isView ? (
              <div className="flex flex-col lg:flex-row gap-6 items-start">

                {/* Calendar */}
                <div className="border rounded-xl overflow-hidden shadow-sm bg-card w-full lg:w-auto">
                  <DayPicker
                    mode="single"
                    selected={pickupDate}
                    onSelect={(date) => {
                      setPickupDate(date);
                      setPickupSlot(""); // reset slot when date changes
                    }}
                    disabled={(date) => isBefore(date, new Date(new Date().setHours(0, 0, 0, 0)))}
                    modifiersClassNames={{
                      selected: "rdp-day_selected",
                      today: "rdp-day_today",
                    }}
                    styles={{
                      caption: { padding: "0.5rem 0.75rem" },
                      head_cell: { fontSize: "0.75rem" },
                    }}
                  />
                </div>

                {/* Slots — only show once a date is picked */}
                {pickupDate && (
                  <div className="flex-1 w-full space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        Select a time slot for{" "}
                        <span className="text-foreground font-semibold">
                          {format(pickupDate, "EEE, MMM d")}
                        </span>
                      </span>
                    </div>

                    {availableSlots.length === 0 ? (
                      <div className="border-2 border-dashed rounded-xl p-6 text-center text-muted-foreground text-sm">
                        No more slots available today. Please select tomorrow or a future date.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {TIME_SLOTS.map((slot) => {
                          const isAvailable = availableSlots.some((s) => s.id === slot.id);
                          const isSelected = pickupSlot === slot.id;

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => setPickupSlot(slot.id)}
                              className={`
                                relative flex items-center justify-between rounded-xl border-2 px-5 py-4
                                transition-all duration-150 text-left w-full
                                ${!isAvailable
                                  ? "opacity-40 cursor-not-allowed border-border bg-muted/30"
                                  : isSelected
                                  ? "border-primary bg-primary/5 shadow-sm cursor-pointer"
                                  : "border-border bg-card hover:border-primary/40 hover:shadow-sm cursor-pointer"
                                }
                              `}
                            >
                              <div>
                                <p className={`font-semibold text-sm ${isSelected ? "text-primary" : "text-foreground"}`}>
                                  {slot.label}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">{slot.window}</p>
                              </div>

                              {isSelected && (
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                                </div>
                              )}

                              {!isAvailable && (
                                <span className="text-xs text-muted-foreground italic">Passed</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Summary of what's been picked */}
                    {pickupDate && pickupSlot && (
                      <div className="mt-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="font-medium text-primary">
                          {format(pickupDate, "EEEE, MMMM d")} ·{" "}
                          {TIME_SLOTS.find((s) => s.id === pickupSlot)?.window}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Keep Details Question */}
          {showQuestion && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
              <p className="font-semibold text-lg mb-6 text-gray-800">
                Are the next orders from the same branch, residence, and pickup time?
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleYes} className="bg-green-600 hover:bg-green-700">Yes, Use Same Details</Button>
                <Button variant="outline" onClick={handleNo} className="border-red-300 text-red-700 hover:bg-red-50">No, Change Details</Button>
                <Button variant="secondary" onClick={handleKeepForAll} className="bg-blue-600 hover:bg-blue-700 text-white">Keep for All Bookings</Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Select "Keep for All Bookings" to use these details for all remaining orders in this session.
              </p>
            </div>
          )}

          {/* Laundry Item */}
          <div className={`space-y-6 pt-6 border-t ${laundryItemsDisabled ? "opacity-50 pointer-events-none" : ""}`}>
            <h3 className="text-lg font-semibold">Laundry Item</h3>

            {laundryItemsDisabled && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
                <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Please answer the question above to continue adding items
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="space-y-2">
                <Label>Main Service *</Label>
                <Select value={mainServiceId} onValueChange={setMainServiceId} disabled={isView}>
                  <SelectTrigger><SelectValue placeholder="Choose service" /></SelectTrigger>
                  <SelectContent>
                    {availableMainServices.map((s) => (
                      <SelectItem key={s.mainServiceId} value={s.mainServiceId}>{s.mainServiceName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mainServiceUsesSize && (
                <div className="space-y-2">
                  <Label>Size *</Label>
                  <Select value={sizeId} onValueChange={setSizeId} disabled={isView || availableSizes.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={availableSizes.length === 0 && mainServiceId ? "No sizes available" : "Select size"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSizes.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No sizes available</div>
                      ) : (
                        availableSizes.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                  {mainServiceUsesSize && availableSizes.length === 0 && mainServiceId && (
                    <Alert variant="destructive" className="mt-2 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>No sizes defined for this service. Contact admin.</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {!mainServiceUsesPackage && (
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity === "" ? "" : quantity}
                    onChange={handleQuantityChange}
                    placeholder="e.g. 2 pieces"
                    disabled={isView}
                  />
                </div>
              )}

              {!mainServiceUsesPackage && currentConfig && (
                <div className="text-right space-y-1 text-sm text-muted-foreground self-end">
                  <p>Price Per Item: {getBasePriceText()}</p>
                  <p className="font-medium text-foreground">Total Price: {getTotalPriceText()}</p>
                </div>
              )}
            </div>

            {/* Package Cards */}
            {mainServiceUsesPackage && mainServiceId && (
              <div className="space-y-3">
                <Label>Select Package *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availablePackageConfigs.map((config) => {
                    const isSelected = packageId === config.packageId;
                    const extras: any[] = config.extraServices || [];
                    const extrasTotal = extras.reduce((sum: number, e: any) => sum + (e.price || 0), 0);
                    const totalPerKg = config.basePricePerKg + extrasTotal;

                    return (
                      <button
                        key={config.id}
                        type="button"
                        disabled={isView}
                        onClick={() => setPackageId(config.packageId)}
                        className={`
                          relative text-left rounded-xl border-2 p-4 transition-all duration-200 w-full
                          ${isView ? "cursor-default" : "cursor-pointer hover:shadow-md"}
                          ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"}
                        `}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-primary-foreground" />
                          </div>
                        )}

                        <div className="pr-8">
                          <p className="font-semibold text-base">{config.packageName}</p>
                          <p className="text-primary font-bold text-lg mt-0.5">
                            KSh {totalPerKg}
                            <span className="text-sm font-normal text-muted-foreground">/kg</span>
                          </p>
                        </div>

                        {extras.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Includes</p>
                            <div className="flex flex-wrap gap-1.5">
                              {extras.map((extra) => (
                                <span key={extra.name} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                  <Check className="w-3 h-3" />
                                  {extra.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {extras.length === 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground italic">Basic wash only</p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedPackageConfig && (
                  <div className="flex items-center justify-end mt-2">
                    <p className="text-sm font-medium text-foreground">
                      Total Price: <span className="text-primary font-bold">{getTotalPriceText()}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label>Special Instructions (applies to all items)</Label>
            <Textarea
              rows={4}
              value={formData.specialInstructions}
              onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
              placeholder="e.g. Use fabric softener, no bleach, delicate items"
              disabled={isView}
            />
          </div>

          {!showSuccessAlert && (
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t">
              {isAdd && (
                <Button onClick={handleSaveBooking} disabled={loading || !isFormValid()} className="bg-gradient-to-r from-primary to-accent">
                  {loading ? "Saving..." : "Save Booking"}
                </Button>
              )}
              {isEdit && (
                <Button onClick={handleUpdateOnly} disabled={loading || !isFormValid()} variant="default">
                  {loading ? "Updating..." : "Update"}
                </Button>
              )}
              {isContinue && (
                <Button onClick={handleAddOrder} disabled={loading || !isFormValid()} className="bg-gradient-to-r from-primary to-accent">
                  {loading ? "Adding..." : "Add Order"}
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate("/lms/customer/my-orders")}>Close</Button>
            </div>
          )}
        </div>
      </div>

      {showSuccessAlert && (
        <Alert className="mt-8 bg-green-500 border-green-300">
          <CheckCircle className="h-5 w-5 text-white" />
          <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-4 text-green-800">
            <span className="text-center sm:text-left font-medium text-white">
              {isContinue || isAdd
                ? `Order ${lastSavedLaundryId || ""} added successfully! Want to add more linked items?`
                : "Order updated successfully!"}
            </span>
            <div className="flex flex-row gap-3">
              <Button size="sm" variant="outline" className="hover:bg-green-600 hover:text-white" onClick={handleContinueBooking}>Yes</Button>
              <Button size="sm" variant="secondary" onClick={handleAlertClose}>No</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {showRating && <RatingPopup triggerAction="orderPlaced" onClose={() => setShowRating(false)} />}

      {(showDataTable || (!isAdd && bookingItems.length > 0)) && bookingItems.length > 0 && (
        <div className="mt-8 pt-8 border-t">
          <h3 className="text-lg font-semibold mb-6">
            {isAdd ? "Your Current Booking" : "Linked Orders"} ({bookingItems.length} item{bookingItems.length > 1 ? "s" : ""})
          </h3>

          {/* Mobile cards */}
          <div className="block md:hidden space-y-3">
            {bookingItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-2 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{item.laundryId}</p>
                    <p className="font-medium text-sm mt-0.5">{getDisplayName(item)}</p>
                  </div>
                  <Badge variant="outline">{getStatusDisplay(item.status)}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Base: {item.basePriceText}</span>
                  <span className="font-medium">{item.totalPriceText}</span>
                </div>
                {item.extras.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.extras.map((e) => (
                      <span key={e} className="text-xs bg-muted px-2 py-0.5 rounded-full">{e}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">Service</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">Base Price</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">Total Price</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">Includes</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookingItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 font-mono text-sm">{item.laundryId}</td>
                    <td className="px-6 py-4">{getDisplayName(item)}</td>
                    <td className="px-6 py-4 text-sm">{item.basePriceText}</td>
                    <td className="px-6 py-4 text-sm font-medium">{item.totalPriceText}</td>
                    <td className="px-6 py-4 text-sm">{item.extras.length > 0 ? item.extras.join(", ") : "—"}</td>
                    <td className="px-6 py-4"><Badge variant="outline">{getStatusDisplay(item.status)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookLaundryForm;

// // src/components/forms/BookLaundryForm.tsx — FINAL: APIs for writes + immediate continue question
// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { ArrowLeft, X, CheckCircle } from "lucide-react";
// import { Badge } from "@/components/ui/badge";
// import {
//   collection,
//   getDocs,
//   doc,
//   getDoc,
//   query,
//   where,
// } from "firebase/firestore";
// import { db } from "@/firebase";
// import { useAuth } from "@/context/AuthContext";
// import { useNavigate, useParams } from "react-router-dom";
// import { toast } from "sonner";
// import sessionManager from "@/utils/sessionManager";

// const generateLaundryId = () => {
//   const year = new Date().getFullYear();
//   const random = Math.floor(1000 + Math.random() * 9000);
//   return `LND-${year}-${random}`;
// };

// interface BookingItem {
//   id: string;
//   laundryId: string;
//   mainServiceName: string;
//   packageName?: string;
//   sizeName?: string;
//   quantity: number;
//   basePriceText: string;
//   totalPriceText: string;
//   extras: string[];
//   status: string;
// }

// interface BookLaundryFormProps {
//   mode: "add" | "view" | "edit" | "continue";
// }

// const BookLaundryForm = ({ mode }: BookLaundryFormProps) => {
//   const { user } = useAuth();
//   const navigate = useNavigate();
//   const { id: paramId } = useParams<{ id?: string }>();

//   const isAdd = mode === "add";
//   const isView = mode === "view";
//   const isEdit = mode === "edit";
//   const isContinue = mode === "continue";

//   const [loading, setLoading] = useState(false);

//   // Reference data
//   const [branches, setBranches] = useState<any[]>([]);
//   const [pricingConfigs, setPricingConfigs] = useState<any[]>([]);
//   const [packages, setPackages] = useState<any[]>([]);
//   const [sizes, setSizes] = useState<any[]>([]);

//   // Current item
//   const [selectedBranch, setSelectedBranch] = useState("");
//   const [mainServiceId, setMainServiceId] = useState("");
//   const [packageId, setPackageId] = useState("");
//   const [sizeId, setSizeId] = useState("");
//   const [quantity, setQuantity] = useState(1);
//   const [extraServices, setExtraServices] = useState<
//     { name: string; price: number }[]
//   >([]);

//   const [laundryItemsDisabled, setLaundryItemsDisabled] = useState(false);
//   const [keepDetailsForSession, setKeepDetailsForSession] = useState(false);

//   // Shared customer data
//   const [formData, setFormData] = useState({
//     customerName: "",
//     phone: "",
//     areaOfResidence: "",
//     apartment: "",
//     pickupTime: "",
//     specialInstructions: "",
//   });

//   // Gender state
//   const [savedGender, setSavedGender] = useState("");
//   const [showGenderDropdown, setShowGenderDropdown] = useState(true);
//   const [selectedGender, setSelectedGender] = useState("");
//   const [customGender, setCustomGender] = useState("");

//   // Booking state
//   const [bookingItems, setBookingItems] = useState<BookingItem[]>([]);
//   const [showQuestion, setShowQuestion] = useState(false);
//   const [showSuccessAlert, setShowSuccessAlert] = useState(false);
//   const [lastSavedLaundryId, setLastSavedLaundryId] = useState<string | null>(null);
//   const [showDataTable, setShowDataTable] = useState(false);
//   const [currentOrderId, setCurrentOrderId] = useState<string | null>(paramId || null);
//   const [linkedOrderIds, setLinkedOrderIds] = useState<string[]>([]);

//   // Load reference data
//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const [bSnap, pSnap, pkgSnap, sizeSnap] = await Promise.all([
//           getDocs(collection(db, "branches")),
//           getDocs(collection(db, "pricingConfig")),
//           getDocs(collection(db, "packages")),
//           getDocs(collection(db, "sizes")),
//         ]);
//         setBranches(bSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
//         setPricingConfigs(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
//         setPackages(pkgSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
//         setSizes(sizeSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
//       } catch (err) {
//         toast.error("Failed to load reference data");
//       }
//     };
//     loadData();
//   }, []);

//   // Load customer profile + gender
//   useEffect(() => {
//     if (!user?.uid) return;
//     const loadProfile = async () => {
//       try {
//         const snap = await getDoc(doc(db, "users", user.uid));
//         if (snap.exists()) {
//           const data = snap.data();
//           setFormData((prev) => ({
//             ...prev,
//             customerName: data.name || user.displayName || "",
//             phone: data.phone || "",
//           }));

//           const gender = data.gender || "";
//           if (gender) {
//             setSavedGender(gender);
//             setShowGenderDropdown(false);
//             setSelectedGender(gender.startsWith("Type Gender:") ? "Type Gender" : gender);
//             setCustomGender(gender.startsWith("Type Gender:") ? gender.slice(13) : "");
//           } else {
//             setShowGenderDropdown(true);
//           }
//         }
//       } catch (err) {
//         console.error("Profile load error:", err);
//       }
//     };
//     loadProfile();
//   }, [user]);

//   // Load current order + linked group for display (with continue mode special handling)
//   useEffect(() => {
//     if (!currentOrderId || isAdd) return;

//     const loadOrderAndLinked = async () => {
//       try {
//         const orderSnap = await getDoc(doc(db, "laundryOrders", currentOrderId));
//         if (!orderSnap.exists()) {
//           navigate("/lms/customer/my-orders");
//           return;
//         }

//         const orderData = orderSnap.data();

//         if ((isEdit || isContinue) && orderData.status !== "pending") {
//           toast.error("This order is no longer editable (status changed)");
//           navigate("/lms/customer/my-orders");
//           return;
//         }

//         // Pre-fill top customer fields from original order (always in continue mode)
//         setFormData((prev) => ({
//           ...prev,
//           customerName: orderData.customerName || prev.customerName || "",
//           phone: orderData.phone || prev.phone || "",
//           areaOfResidence: isContinue ? orderData.areaOfResidence || "" : orderData.areaOfResidence || "",
//           apartment: isContinue ? orderData.apartment || "" : orderData.apartment || "",
//           pickupTime: isContinue ? orderData.pickupTime?.slice(0, 16) || "" : orderData.pickupTime?.slice(0, 16) || "",
//           specialInstructions: isContinue ? orderData.specialInstructions || "" : orderData.specialInstructions || "",
//         }));

//         // In continue mode: pre-fill Branch too (as part of top fields)
//         setSelectedBranch(isContinue ? orderData.branchId || "" : orderData.branchId || "");

//         // Always clear item fields in continue mode
//         if (isContinue) {
//           setMainServiceId("");
//           setPackageId("");
//           setSizeId("");
//           setQuantity(1);
//           setExtraServices([]);
//         } else {
//           setMainServiceId(orderData.mainServiceId || "");
//           setPackageId(orderData.packageId || "");
//           setSizeId(orderData.sizeId || "");
//           setQuantity(orderData.quantity || 1);
//           setExtraServices(orderData.extraServices || []);
//         }

//         // Immediately show keep-details question in continue mode (no delay)
//         if (isContinue && !keepDetailsForSession) {
//           setShowQuestion(true);
//           setLaundryItemsDisabled(true);
//         }

//         // Load full linked group for display
//         const allIds = [currentOrderId, ...(orderData.linkedTo || [])];
//         if (allIds.length > 0) {
//           const linkedSnap = await getDocs(
//             query(collection(db, "laundryOrders"), where("__name__", "in", allIds))
//           );

//           const linkedList = linkedSnap.docs.map((d) => {
//             const dData = d.data();
//             return {
//               id: d.id,
//               laundryId: dData.laundryId,
//               mainServiceName: dData.mainServiceName,
//               packageName: dData.packageName || "",
//               sizeName: dData.sizeName || "",
//               quantity: dData.quantity || 1,
//               basePriceText: dData.isPerKg
//                 ? `KSh ${dData.basePricePerKg}/kg`
//                 : `KSh ${dData.basePricePerKg}`,
//               totalPriceText: dData.isPerKg
//                 ? `KSh ${dData.basePricePerKg + (dData.extraServices?.reduce((s, e) => s + e.price, 0) || 0)}/kg`
//                 : `KSh ${dData.basePricePerKg + (dData.extraServices?.reduce((s, e) => s + e.price, 0) || 0)}`,
//               extras: (dData.extraServices || []).map((e) => e.name),
//               status: dData.status || "pending",
//             };
//           });

//           setBookingItems(linkedList);
//           setShowDataTable(true);
//           setLinkedOrderIds(allIds.filter((id) => id !== currentOrderId));
//         }
//       } catch (err) {
//         toast.error("Failed to load order details");
//       }
//     };

//     loadOrderAndLinked();
//   }, [currentOrderId, isAdd, isEdit, isContinue, navigate, keepDetailsForSession]);

//   const availableMainServices = pricingConfigs
//     .filter((p) => p.branchId === selectedBranch && p.isActive)
//     .reduce((acc: any[], config) => {
//       if (!acc.find((s) => s.mainServiceId === config.mainServiceId)) {
//         acc.push({
//           mainServiceId: config.mainServiceId,
//           mainServiceName: config.mainServiceName,
//         });
//       }
//       return acc;
//     }, []);

//   const mainServiceUsesPackage = pricingConfigs.some(
//     (p) =>
//       p.branchId === selectedBranch &&
//       p.mainServiceId === mainServiceId &&
//       p.isActive &&
//       p.hasPackage
//   );

//   const mainServiceUsesSize = pricingConfigs.some(
//     (p) =>
//       p.branchId === selectedBranch &&
//       p.mainServiceId === mainServiceId &&
//       p.isActive &&
//       p.hasSize
//   );

//   const currentConfig = pricingConfigs.find(
//     (p) =>
//       p.branchId === selectedBranch &&
//       p.mainServiceId === mainServiceId &&
//       p.isActive &&
//       ((!p.hasPackage && !p.hasSize) ||
//         (p.hasPackage && p.packageId === packageId) ||
//         (p.hasSize && p.sizeId === sizeId))
//   );

//   useEffect(() => {
//     if (!currentConfig?.extraServices || isView) return;

//     const shouldAutoCheck =
//       (isAdd && !paramId && extraServices.length === 0) ||
//       (showSuccessAlert && extraServices.length === 0);

//     if (shouldAutoCheck && currentConfig.extraServices.length > 0) {
//       setExtraServices(
//         currentConfig.extraServices.map((extra: any) => ({
//           name: extra.name,
//           price: extra.price,
//         }))
//       );
//     }
//   }, [currentConfig?.id, isView, isAdd, paramId, showSuccessAlert]);

//   const getBasePriceText = () => {
//     if (!currentConfig) return "";
//     return currentConfig.hasPackage
//       ? `KSh ${currentConfig.basePricePerKg}/kg`
//       : `KSh ${currentConfig.basePricePerKg}`;
//   };

//   const getTotalPriceText = () => {
//     if (!currentConfig) return "";
//     const extrasTotal = extraServices.reduce((sum, e) => sum + e.price, 0);

//     if (currentConfig.hasPackage) {
//       return `KSh ${currentConfig.basePricePerKg + extrasTotal}/kg`;
//     }

//     const basePrice = currentConfig.basePricePerKg + extrasTotal;
//     return `KSh ${basePrice * quantity}`;
//   };

//   const isFormValid = () => {
//     return (
//       selectedBranch &&
//       mainServiceId &&
//       formData.phone &&
//       formData.areaOfResidence &&
//       formData.pickupTime &&
//       (!mainServiceUsesPackage || packageId) &&
//       (!mainServiceUsesSize || sizeId)
//     );
//   };

//   // Update user profile via API
//   const updateUserProfile = async () => {
//     const finalGender = showGenderDropdown
//       ? selectedGender === "Type Gender"
//         ? customGender.trim()
//           ? `Type Gender: ${customGender.trim()}`
//           : "Rather not say"
//         : selectedGender || null
//       : savedGender;

//     try {
//       const res = await sessionManager.fetchApi("/customer/profile", {
//         method: "PATCH",
//         body: JSON.stringify({
//           name: formData.customerName.trim(),
//           phone: formData.phone.trim(),
//           gender: finalGender,
//         }),
//       });

//       if (!res.ok) {
//         const err = await res.json();
//         throw new Error(err.error || "Profile update failed");
//       }
//     } catch (err) {
//       console.error("Profile update failed:", err);
//       // Non-blocking - don't stop order flow
//     }
//   };

//   // Create or add linked order via API
//   const createNewLinkedOrder = async () => {
//     if (!isFormValid()) {
//       toast.error("Please fill all required fields");
//       return;
//     }

//     setLoading(true);
//     try {
//       const finalGender = showGenderDropdown
//         ? selectedGender === "Type Gender"
//           ? customGender.trim()
//             ? `Type Gender: ${customGender.trim()}`
//             : "Rather not say"
//           : selectedGender
//         : savedGender;

//       const payload = {
//         customerName: formData.customerName.trim(),
//         phone: formData.phone.trim(),
//         areaOfResidence: formData.areaOfResidence.trim(),
//         apartment: formData.apartment.trim() || "",
//         pickupTime: formData.pickupTime,
//         specialInstructions: formData.specialInstructions?.trim() || null,
//         branchId: selectedBranch,
//         mainServiceId,
//         mainServiceName: currentConfig.mainServiceName,
//         packageId: packageId || "",
//         packageName: currentConfig.packageName || "",
//         sizeId: sizeId || "",
//         sizeName: currentConfig.sizeName || "",
//         quantity: (currentConfig.hasSize || (!currentConfig.hasPackage && !currentConfig.hasSize)) ? quantity : 1,
//         extraServices,
//         gender: finalGender || null,
//         linkedTo: linkedOrderIds,
//         isContinue,
//       };

//       if (isContinue && currentOrderId) {
//         payload.linkedTo = [currentOrderId, ...linkedOrderIds];
//       }

//       const res = await sessionManager.fetchApi("/customer/orders", {
//         method: "POST",
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         const errData = await res.json().catch(() => ({}));
//         throw new Error(errData.error || "Failed to create order");
//       }

//       const data = await res.json();
//       const newOrder = data.order;

//       await updateUserProfile();

//       setLinkedOrderIds((prev) => [...prev, newOrder.id]);
//       setLastSavedLaundryId(newOrder.laundryId);
//       setShowSuccessAlert(true);
//       setShowDataTable(true);

//       setBookingItems((prev) => [
//         ...prev,
//         {
//           id: newOrder.id,
//           laundryId: newOrder.laundryId,
//           mainServiceName: newOrder.mainServiceName,
//           packageName: newOrder.packageName || "",
//           sizeName: newOrder.sizeName || "",
//           quantity: newOrder.quantity,
//           basePriceText: getBasePriceText(),
//           totalPriceText: getTotalPriceText(),
//           extras: extraServices.map((e) => e.name),
//           status: "pending",
//         },
//       ]);

//       // Clear only item fields for next entry
//       setMainServiceId("");
//       setPackageId("");
//       setSizeId("");
//       setQuantity(1);
//       setExtraServices([]);
//     } catch (err: any) {
//       toast.error("Failed: " + err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Update existing order via API
//   const handleUpdateOnly = async () => {
//     if (!currentOrderId || !isFormValid()) {
//       toast.error("Invalid data");
//       return;
//     }

//     setLoading(true);
//     try {
//       const payload = {
//         areaOfResidence: formData.areaOfResidence.trim(),
//         apartment: formData.apartment.trim() || "",
//         pickupTime: formData.pickupTime,
//         specialInstructions: formData.specialInstructions?.trim() || null,
//         mainServiceId,
//         mainServiceName: currentConfig.mainServiceName,
//         packageId: packageId || "",
//         packageName: currentConfig.packageName || "",
//         sizeId: sizeId || "",
//         sizeName: currentConfig.sizeName || "",
//         quantity: (currentConfig.hasSize || (!currentConfig.hasPackage && !currentConfig.hasSize)) ? quantity : 1,
//         extraServices,
//       };

//       const res = await sessionManager.fetchApi(`/customer/orders/${currentOrderId}`, {
//         method: "PATCH",
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         const errData = await res.json().catch(() => ({}));
//         throw new Error(errData.error || "Failed to update order");
//       }

//       await updateUserProfile();

//       toast.success("Order updated successfully");
//       navigate("/lms/customer/my-orders");
//     } catch (err: any) {
//       toast.error(err.message || "Update failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleContinueBooking = () => {
//     setShowSuccessAlert(false);

//     if (!keepDetailsForSession) {
//       setShowQuestion(true);
//       setLaundryItemsDisabled(true);
//     } else {
//       setLaundryItemsDisabled(false);
//     }
//   };

//   const handleAlertClose = () => {
//     setShowSuccessAlert(false);
//     navigate("/lms/customer/my-orders");
//   };

//   const handleYes = () => {
//     setShowQuestion(false);
//     setLaundryItemsDisabled(false);
//   };

//   const handleNo = () => {
//     setSelectedBranch("");
//     setFormData((prev) => ({
//       ...prev,
//       areaOfResidence: "",
//       apartment: "",
//       pickupTime: "",
//     }));
//     setShowQuestion(false);
//     setLaundryItemsDisabled(false);
//   };

//   const handleKeepForAll = () => {
//     setShowQuestion(false);
//     setKeepDetailsForSession(true);
//     setLaundryItemsDisabled(false);
//   };

//   const getDisplayName = (item: BookingItem) => {
//     let name = item.mainServiceName;
//     if (item.packageName) name += ` [${item.packageName}]`;
//     if (item.sizeName) name += ` [${item.sizeName}]`;
//     if (item.quantity > 1) name += ` × ${item.quantity}`;
//     return name;
//   };

//   const getStatusDisplay = (status: string) => {
//     const labels: { [key: string]: string } = {
//       pending: "Booked",
//       collected: "Collected",
//       "in washing": "In Washing",
//       ready: "Ready",
//       delivered: "Delivered",
//     };
//     return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center gap-4">
//         <Button
//           variant="ghost"
//           size="icon"
//           onClick={() => navigate("/lms/customer/my-orders")}
//         >
//           <ArrowLeft className="w-5 h-5" />
//         </Button>
//         <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
//           {isAdd ? "Book Laundry" : isView ? "View Order" : isContinue ? "Add Linked Order" : "Edit Order"}
//         </h1>
//       </div>

//       <div className="bg-card border rounded-lg p-6 lg:p-8">
//         <div className="space-y-8">
//           {/* Customer Information */}
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             <div className="space-y-2">
//               <Label>Full Name *</Label>
//               <Input
//                 value={formData.customerName}
//                 onChange={(e) =>
//                   setFormData({ ...formData, customerName: e.target.value })
//                 }
//                 required
//                 disabled={isView}
//               />
//             </div>

//             <div className="space-y-2">
//               <Label>Phone Number *</Label>
//               <Input
//                 value={formData.phone}
//                 onChange={(e) =>
//                   setFormData({ ...formData, phone: e.target.value })
//                 }
//                 required
//                 disabled={isView}
//               />
//             </div>

//             {/* Gender Field */}
//             <div className="space-y-2">
//               <Label>Gender</Label>
//               {showGenderDropdown ? (
//                 selectedGender === "Type Gender" && !isView ? (
//                   <div className="grid grid-cols-2 gap-3">
//                     <Select
//                       value={selectedGender}
//                       onValueChange={setSelectedGender}
//                     >
//                       <SelectTrigger>
//                         <SelectValue placeholder="Select gender" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="Female">Female</SelectItem>
//                         <SelectItem value="Male">Male</SelectItem>
//                         <SelectItem value="Rather not say">
//                           Rather not say
//                         </SelectItem>
//                         <SelectItem value="Type Gender">Type Gender.....</SelectItem>
//                       </SelectContent>
//                     </Select>
//                     <Input
//                       value={customGender}
//                       onChange={(e) => setCustomGender(e.target.value)}
//                       placeholder="Type Gender"
//                     />
//                   </div>
//                 ) : (
//                   <Select
//                     value={selectedGender}
//                     onValueChange={setSelectedGender}
//                     disabled={isView}
//                   >
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select gender" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="Female">Female</SelectItem>
//                       <SelectItem value="Male">Male</SelectItem>
//                       <SelectItem value="Rather not say">
//                         Rather not say
//                       </SelectItem>
//                       <SelectItem value="Type Gender">Type Gender.....</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 )
//               ) : (
//                 <div className="relative">
//                   <Input value={savedGender} disabled />
//                   {!isView && (
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       size="icon"
//                       className="absolute right-0 top-0 h-full px-3"
//                       onClick={() => {
//                         setShowGenderDropdown(true);
//                         setSelectedGender("");
//                         setCustomGender("");
//                       }}
//                     >
//                       <X className="h-4 w-4" />
//                     </Button>
//                   )}
//                 </div>
//               )}
//             </div>

//             <div className="space-y-2">
//               <Label>Branch *</Label>
//               <Select
//                 value={selectedBranch}
//                 onValueChange={setSelectedBranch}
//                 required
//                 disabled={isView}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Choose branch" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {branches.map((b) => (
//                     <SelectItem key={b.id} value={b.id}>
//                       {b.name}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div className="space-y-2">
//               <Label>Area of Residence *</Label>
//               <Input
//                 value={formData.areaOfResidence}
//                 onChange={(e) =>
//                   setFormData({ ...formData, areaOfResidence: e.target.value })
//                 }
//                 required
//                 disabled={isView}
//               />
//             </div>

//             <div className="space-y-2">
//               <Label>Apartment / Room No.</Label>
//               <Input
//                 value={formData.apartment}
//                 onChange={(e) =>
//                   setFormData({ ...formData, apartment: e.target.value })
//                 }
//                 disabled={isView}
//               />
//             </div>

//             <div className="space-y-2">
//               <Label>Pickup Time *</Label>
//               <Input
//                 type="datetime-local"
//                 value={formData.pickupTime}
//                 onChange={(e) =>
//                   setFormData({ ...formData, pickupTime: e.target.value })
//                 }
//                 required
//                 disabled={isView}
//               />
//             </div>
//           </div>

//           {/* Keep Details Question */}
//           {showQuestion && (
//             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
//               <p className="font-semibold text-lg mb-6 text-gray-800">
//                 Are the next orders from the same branch, residence, and pickup time?
//               </p>
//               <div className="flex flex-col sm:flex-row gap-3">
//                 <Button
//                   onClick={handleYes}
//                   className="bg-green-600 hover:bg-green-700"
//                 >
//                   Yes, Use Same Details
//                 </Button>
//                 <Button
//                   variant="outline"
//                   onClick={handleNo}
//                   className="border-red-300 text-red-700 hover:bg-red-50"
//                 >
//                   No, Change Details
//                 </Button>
//                 <Button
//                   variant="secondary"
//                   onClick={handleKeepForAll}
//                   className="bg-blue-600 hover:bg-blue-700 text-white"
//                 >
//                   Keep for All Bookings
//                 </Button>
//               </div>
//               <p className="text-sm text-muted-foreground mt-4">
//                 Select "Keep for All Bookings" to use these details for all remaining orders in this session.
//               </p>
//             </div>
//           )}

//           {/* Laundry Item */}
//           <div className={`space-y-6 pt-6 border-t ${laundryItemsDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
//             <h3 className="text-lg font-semibold">Laundry Item</h3>
//             {laundryItemsDisabled && (
//               <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
//                 <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
//                   <span>⚠️</span>
//                   <span>Please answer the question above to continue adding items</span>
//                 </p>
//               </div>
//             )}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
//               <div className="space-y-2">
//                 <Label>Main Service *</Label>
//                 <Select
//                   value={mainServiceId}
//                   onValueChange={setMainServiceId}
//                   disabled={isView}
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Choose service" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {availableMainServices.map((s) => (
//                       <SelectItem key={s.mainServiceId} value={s.mainServiceId}>
//                         {s.mainServiceName}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               {mainServiceUsesPackage && (
//                 <div className="space-y-2">
//                   <Label>Package *</Label>
//                   <Select
//                     value={packageId}
//                     onValueChange={setPackageId}
//                     disabled={isView}
//                   >
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select package" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {packages
//                         .filter((p) => p.isActive)
//                         .map((p) => (
//                           <SelectItem key={p.id} value={p.id}>
//                             {p.name}
//                           </SelectItem>
//                         ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
//               )}

//               {mainServiceUsesSize && (
//                 <div className="space-y-2">
//                   <Label>Size *</Label>
//                   <Select
//                     value={sizeId}
//                     onValueChange={setSizeId}
//                     disabled={isView}
//                   >
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select size" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {sizes
//                         .filter((s) => s.isActive)
//                         .map((s) => (
//                           <SelectItem key={s.id} value={s.id}>
//                             {s.name}
//                           </SelectItem>
//                         ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
//               )}

//               {(currentConfig?.hasSize ||
//                 (!currentConfig?.hasPackage && !currentConfig?.hasSize)) && (
//                 <div className="space-y-2">
//                   <Label>Quantity</Label>
//                   <Input
//                     type="number"
//                     min="1"
//                     value={quantity}
//                     onChange={(e) => setQuantity(Number(e.target.value) || 1)}
//                     disabled={isView}
//                   />
//                 </div>
//               )}

//               <div className="text-right space-y-1 text-sm text-muted-foreground">
//                 {!currentConfig?.hasPackage && (
//                   <p>Price Per Item: {getBasePriceText()}</p>
//                 )}
//                 <p className="font-medium text-foreground">
//                   Total Price: {getTotalPriceText()}
//                 </p>
//               </div>
//             </div>

//             {/* Extra Services */}
//             {currentConfig?.extraServices?.length > 0 && (
//               <div className="space-y-3">
//                 <Label>Extra Services (Optional)</Label>
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                   {currentConfig.extraServices.map((extra: any) => (
//                     <div key={extra.name} className="flex items-center gap-2">
//                       <Checkbox
//                         checked={extraServices.some(
//                           (e) => e.name === extra.name,
//                         )}
//                         onCheckedChange={(checked) => {
//                           if (checked) {
//                             setExtraServices([
//                               ...extraServices,
//                               { name: extra.name, price: extra.price },
//                             ]);
//                           } else {
//                             setExtraServices(
//                               extraServices.filter(
//                                 (e) => e.name !== extra.name,
//                               ),
//                             );
//                           }
//                         }}
//                         disabled={isView}
//                       />
//                       <span className="text-sm">{extra.name}</span>
//                       <span className="text-xs text-muted-foreground">
//                         +KSh {extra.price}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Special Instructions */}
//           <div className="space-y-2">
//             <Label>Special Instructions (applies to all items)</Label>
//             <Textarea
//               rows={4}
//               value={formData.specialInstructions}
//               onChange={(e) =>
//                 setFormData({
//                   ...formData,
//                   specialInstructions: e.target.value,
//                 })
//               }
//               placeholder="e.g. Use fabric softener, no bleach, delicate items"
//               disabled={isView}
//             />
//           </div>

//           {/* Buttons */}
//           {!showSuccessAlert && (
//             <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t">
//               {isAdd && (
//                 <Button
//                   onClick={createNewLinkedOrder}
//                   disabled={loading || !isFormValid()}
//                   className="bg-gradient-to-r from-primary to-accent"
//                 >
//                   {loading ? "Saving..." : "Save Booking"}
//                 </Button>
//               )}

//               {isEdit && (
//                 <Button
//                   onClick={handleUpdateOnly}
//                   disabled={loading || !isFormValid()}
//                   variant="default"
//                 >
//                   {loading ? "Updating..." : "Update"}
//                 </Button>
//               )}

//               {isContinue && (
//                 <Button
//                   onClick={createNewLinkedOrder}
//                   disabled={loading || !isFormValid()}
//                   className="bg-gradient-to-r from-primary to-accent"
//                 >
//                   {loading ? "Adding..." : "Add Order"}
//                 </Button>
//               )}

//               <Button
//                 variant="outline"
//                 onClick={() => navigate("/lms/customer/my-orders")}
//               >
//                 Close
//               </Button>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Success / Continue Alert */}
//       {showSuccessAlert && (
//         <Alert className="mt-8 bg-green-500 border-green-300">
//           <CheckCircle className="h-5 w-5 text-white" />
//           <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-4 text-green-800">
//             <span className="text-center sm:text-left font-medium text-white">
//               {isContinue || isAdd
//                 ? `Order ${lastSavedLaundryId || ""} added successfully! Want to add more linked items?`
//                 : "Order updated successfully!"}
//             </span>
//             <div className="flex flex-row sm:flex-row gap-3">
//               <Button
//                 size="sm"
//                 variant="outline"
//                 className="hover:bg-green-600 hover:text-white"
//                 onClick={handleContinueBooking}
//               >
//                 Yes
//               </Button>
//               <Button size="sm" variant="secondary" onClick={handleAlertClose}>
//                 No
//               </Button>
//             </div>
//           </AlertDescription>
//         </Alert>
//       )}

//       {/* Data Table */}
//       {(showDataTable || (!isAdd && bookingItems.length > 0)) &&
//         bookingItems.length > 0 && (
//           <div className="mt-8 pt-8 border-t">
//             <h3 className="text-lg font-semibold mb-6">
//               {isAdd ? "Your Current Booking" : "Linked Orders"} (
//               {bookingItems.length} item{bookingItems.length > 1 ? "s" : ""})
//             </h3>
//             <div className="overflow-x-auto">
//               <table className="w-full">
//                 <thead className="bg-muted/50">
//                   <tr>
//                     <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">
//                       ID
//                     </th>
//                     <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">
//                       Service
//                     </th>
//                     <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">
//                       Base Price
//                     </th>
//                     <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">
//                       Total Price
//                     </th>
//                     <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">
//                       Extras
//                     </th>
//                     <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">
//                       Status
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-border">
//                   {bookingItems.map((item) => (
//                     <tr key={item.id}>
//                       <td className="px-6 py-4 font-mono text-sm">
//                         {item.laundryId}
//                       </td>
//                       <td className="px-6 py-4">{getDisplayName(item)}</td>
//                       <td className="px-6 py-4 text-sm">
//                         {item.basePriceText}
//                       </td>
//                       <td className="px-6 py-4 text-sm font-medium">
//                         {item.totalPriceText}
//                       </td>
//                       <td className="px-6 py-4 text-sm">
//                         {item.extras.length > 0
//                           ? item.extras.join(", ")
//                           : "None"}
//                       </td>
//                       <td className="px-6 py-4">
//                         <Badge variant="outline">
//                           {getStatusDisplay(item.status)}
//                         </Badge>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}
//     </div>
//   );
// };

// export default BookLaundryForm;
