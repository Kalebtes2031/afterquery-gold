// src/components/forms/StaffBookLaundryForm.tsx — FINAL: With editable Name & Email after customer select
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, X, CheckCircle } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const generateLaundryId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `LND-${year}-${random}`;
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

const StaffBookLaundryForm = () => {
  const { user, role, branchId, branchName: staffBranchName } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  // Reference data
  const [branches, setBranches] = useState<any[]>([]);
  const [pricingConfigs, setPricingConfigs] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);

  // Customer search + data
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    areaOfResidence: "",
    apartment: "",
    pickupTime: "",
    specialInstructions: "",
    gender: "",
  });

  // Gender
  const [selectedGender, setSelectedGender] = useState("");
  const [customGender, setCustomGender] = useState("");

  // Current item
  const [selectedBranch, setSelectedBranch] = useState("");
  const [mainServiceId, setMainServiceId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [extraServices, setExtraServices] = useState<{ name: string; price: number }[]>([]);

  // Session state
  const [bookingItems, setBookingItems] = useState<BookingItem[]>([]);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [linkedOrderIds, setLinkedOrderIds] = useState<string[]>([]);

  // Load reference data + customers
  useEffect(() => {
    const load = async () => {
      const [custSnap, bSnap, pSnap, pkgSnap, sizeSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "customer"))),
        getDocs(collection(db, "branches")),
        getDocs(collection(db, "pricingConfig")),
        getDocs(collection(db, "packages")),
        getDocs(collection(db, "sizes")),
      ]);

      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setBranches(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPricingConfigs(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSizes(sizeSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    load();
  }, []);

  // Auto-select branch for employee
  useEffect(() => {
    if (role === "employee" && branchId) {
      setSelectedBranch(branchId);
    }
  }, [role, branchId]);

  const availableMainServices = pricingConfigs
    .filter(p => p.branchId === selectedBranch && p.isActive)
    .reduce((acc: any[], config) => {
      if (!acc.find(s => s.mainServiceId === config.mainServiceId)) {
        acc.push({ mainServiceId: config.mainServiceId, mainServiceName: config.mainServiceName });
      }
      return acc;
    }, []);

  const mainServiceUsesPackage = pricingConfigs.some(p => p.branchId === selectedBranch && p.mainServiceId === mainServiceId && p.isActive && p.hasPackage);
  const mainServiceUsesSize = pricingConfigs.some(p => p.branchId === selectedBranch && p.mainServiceId === mainServiceId && p.isActive && p.hasSize);

  const currentConfig = pricingConfigs.find(p =>
    p.branchId === selectedBranch &&
    p.mainServiceId === mainServiceId &&
    p.isActive &&
    ((!p.hasPackage && !p.hasSize) ||
      (p.hasPackage && p.packageId === packageId) ||
      (p.hasSize && p.sizeId === sizeId))
  );

  const getBasePriceText = () => {
    if (!currentConfig) return "";
    return currentConfig.hasSize
      ? `KSh ${currentConfig.basePricePerKg}`
      : `KSh ${currentConfig.basePricePerKg}/kg`;
  };

  const getTotalPriceText = () => {
    if (!currentConfig) return "";
    const extrasTotal = extraServices.reduce((sum, e) => sum + e.price, 0);
    const total = currentConfig.basePricePerKg + extrasTotal;
    return currentConfig.hasSize
      ? `KSh ${total}`
      : `KSh ${total}/kg`;
  };

  const isFormValid = () => {
    return (
      formData.customerId &&
      formData.customerName.trim() &&
      selectedBranch &&
      mainServiceId &&
      formData.pickupTime &&
      formData.areaOfResidence &&
      (!mainServiceUsesPackage || packageId) &&
      (!mainServiceUsesSize || sizeId)
    );
  };

  const handleCustomerSelect = (customer: any) => {
    setFormData({
      ...formData,
      customerId: customer.id,
      customerName: customer.name || customer.displayName || "",
      customerEmail: customer.email || "",
      customerPhone: customer.phone || "",
    });
    setSelectedGender(customer.gender || "");
    setSearchCustomer("");
  };

  const handleAddItem = async () => {
    if (!isFormValid()) {
      toast.error("Complete all required fields (including customer name)");
      return;
    }

    setLoading(true);
    try {
      const finalGender = selectedGender === "Other"
        ? customGender.trim() || "Rather not say"
        : selectedGender;

      const laundryId = generateLaundryId();
      const newOrderRef = doc(collection(db, "laundryOrders"));

      const payload = {
        customerId: formData.customerId,
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim(),
        phone: formData.customerPhone,
        branchId: selectedBranch,
        branchName: branches.find(b => b.id === selectedBranch)?.name || "",
        areaOfResidence: formData.areaOfResidence,
        apartment: formData.apartment || "",
        pickupTime: formData.pickupTime,
        specialInstructions: formData.specialInstructions || null,
        mainServiceId,
        mainServiceName: currentConfig.mainServiceName,
        packageId: packageId || "",
        packageName: currentConfig.packageName || "",
        sizeId: sizeId || "",
        sizeName: currentConfig.sizeName || "",
        basePricePerKg: currentConfig.basePricePerKg,
        isPerKg: !currentConfig.hasSize,
        quantity: currentConfig.hasSize ? quantity : 1,
        extraServices,
        gender: finalGender,
        status: "pending",
        linkedTo: linkedOrderIds,
        isLinked: linkedOrderIds.length > 0,
        bookedBy: role,
        bookedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(newOrderRef, { ...payload, laundryId });

      // Link previous orders
      if (linkedOrderIds.length > 0) {
        const batch = writeBatch(db);
        linkedOrderIds.forEach(id => {
          batch.update(doc(db, "laundryOrders", id), {
            linkedTo: arrayUnion(newOrderRef.id),
            isLinked: true,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }

      setLinkedOrderIds(prev => [...prev, newOrderRef.id]);

      setBookingItems(prev => [...prev, {
        id: newOrderRef.id,
        laundryId,
        mainServiceName: currentConfig.mainServiceName,
        packageName: currentConfig.packageName || "",
        sizeName: currentConfig.sizeName || "",
        quantity: currentConfig.hasSize ? quantity : 1,
        basePriceText: getBasePriceText(),
        totalPriceText: getTotalPriceText(),
        extras: extraServices.map(e => e.name),
        status: "pending",
      }]);

      toast.success(`Added ${laundryId}`);

      // Reset item fields only (keep customer info)
      setMainServiceId("");
      setPackageId("");
      setSizeId("");
      setQuantity(1);
      setExtraServices([]);

    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (bookingItems.length === 0) {
      toast.error("No items added");
      return;
    }
    toast.success("All bookings saved successfully!");
    navigate("/lms/" + (role === "manager" ? "manager" : "employee") + "/customer-orders");
  };

  const handleContinue = () => {
    setShowSuccessAlert(false);
  };

  const getDisplayName = (item: BookingItem) => {
    let name = item.mainServiceName;
    if (item.packageName) name += ` (${item.packageName})`;
    if (item.sizeName) name += ` [${item.sizeName}]`;
    if (item.quantity > 1) name += ` ×${item.quantity}`;
    return name;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Book Laundry for Customer
        </h1>
      </div>

      <div className="bg-card border rounded-lg p-6 lg:p-8">
        {/* Customer Search */}
        <div className="space-y-2 mb-8">
          <Label>Search Customer *</Label>
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            value={searchCustomer}
            onChange={e => setSearchCustomer(e.target.value)}
            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-primary"
          />
          {searchCustomer && (
            <div className="border rounded-md max-h-64 overflow-auto bg-white shadow-lg">
              {customers
                .filter(c =>
                  (c.name || "").toLowerCase().includes(searchCustomer.toLowerCase()) ||
                  (c.phone || "").includes(searchCustomer) ||
                  (c.email || "").toLowerCase().includes(searchCustomer.toLowerCase())
                )
                .slice(0, 10)
                .map(c => (
                  <div
                    key={c.id}
                    className="p-3 hover:bg-muted cursor-pointer flex flex-col"
                    onClick={() => {
                      handleCustomerSelect(c);
                      setSearchCustomer("");
                    }}
                  >
                    <span className="font-medium">{c.name || "Unnamed"}</span>
                    <span className="text-sm text-muted-foreground">
                      {c.phone || "No phone"} • {c.email || "No email"}
                    </span>
                  </div>
                ))}
              {customers.filter(c =>
                (c.name || "").toLowerCase().includes(searchCustomer.toLowerCase()) ||
                (c.phone || "").includes(searchCustomer) ||
                (c.email || "").toLowerCase().includes(searchCustomer.toLowerCase())
              ).length === 0 && (
                <div className="p-3 text-muted-foreground">No customers found</div>
              )}
            </div>
          )}
        </div>

        {/* Customer Info - Editable Name & Email */}
        {formData.customerId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 p-6 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={formData.customerName}
                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Customer full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.customerEmail}
                onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.customerPhone} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Rather not say">Rather not say</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedGender === "Other" && (
              <div className="space-y-2">
                <Label>Specify Gender</Label>
                <Input
                  value={customGender}
                  onChange={e => setCustomGender(e.target.value)}
                  placeholder="Enter gender"
                />
              </div>
            )}
          </div>
        )}

        {/* Shared Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {role !== "employee" && (
            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger><SelectValue placeholder="Choose branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Area of Residence *</Label>
            <Input
              value={formData.areaOfResidence}
              onChange={e => setFormData({ ...formData, areaOfResidence: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Apartment / Room No.</Label>
            <Input
              value={formData.apartment}
              onChange={e => setFormData({ ...formData, apartment: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Pickup Time *</Label>
            <Input
              type="datetime-local"
              value={formData.pickupTime}
              onChange={e => setFormData({ ...formData, pickupTime: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Laundry Item Section */}
        <div className="space-y-6 pt-8 border-t">
          <h3 className="text-lg font-semibold">Add Laundry Item</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label>Main Service *</Label>
              <Select value={mainServiceId} onValueChange={setMainServiceId}>
                <SelectTrigger><SelectValue placeholder="Choose service" /></SelectTrigger>
                <SelectContent>
                  {availableMainServices.map(s => (
                    <SelectItem key={s.mainServiceId} value={s.mainServiceId}>
                      {s.mainServiceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mainServiceUsesPackage && (
              <div className="space-y-2">
                <Label>Package *</Label>
                <Select value={packageId} onValueChange={setPackageId}>
                  <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                  <SelectContent>
                    {packages.filter(p => p.isActive).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mainServiceUsesSize && (
              <div className="space-y-2">
                <Label>Size *</Label>
                <Select value={sizeId} onValueChange={setSizeId}>
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {sizes.filter(s => s.isActive).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentConfig?.hasSize && (
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value) || 1)}
                />
              </div>
            )}

            <div className="text-right space-y-1 text-sm text-muted-foreground pt-8">
              <p>Base: {getBasePriceText()}</p>
              <p className="font-medium text-foreground">Total: {getTotalPriceText()}</p>
            </div>
          </div>

          {/* Extra Services */}
          {currentConfig?.extraServices?.length > 0 && (
            <div className="space-y-3">
              <Label>Extra Services (Optional)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {currentConfig.extraServices.map((extra: any) => (
                  <div key={extra.name} className="flex items-center gap-2">
                    <Checkbox
                      checked={extraServices.some(e => e.name === extra.name)}
                      onCheckedChange={checked => {
                        if (checked) {
                          setExtraServices([...extraServices, { name: extra.name, price: extra.price }]);
                        } else {
                          setExtraServices(extraServices.filter(e => e.name !== extra.name));
                        }
                      }}
                    />
                    <span className="text-sm">{extra.name} (+KSh {extra.price})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleAddItem}
              disabled={loading || !isFormValid()}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? "Adding..." : "Add to Booking"}
            </Button>
          </div>
        </div>

        {/* Current Session Preview */}
        {bookingItems.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-lg font-semibold mb-4">
              Current Booking Session ({bookingItems.length} item{bookingItems.length > 1 ? "s" : ""})
            </h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Base Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Extras</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bookingItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 font-mono text-sm font-medium">{item.laundryId}</td>
                      <td className="px-6 py-4">{getDisplayName(item)}</td>
                      <td className="px-6 py-4 text-sm">{item.basePriceText}</td>
                      <td className="px-6 py-4 font-medium text-primary">{item.totalPriceText}</td>
                      <td className="px-6 py-4 text-sm">{item.extras.length ? item.extras.join(", ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Special Instructions */}
        <div className="space-y-2 mt-10">
          <Label>Special Instructions (applies to all items in this booking)</Label>
          <Textarea
            rows={4}
            value={formData.specialInstructions}
            onChange={e => setFormData({ ...formData, specialInstructions: e.target.value })}
            placeholder="e.g. No bleach, separate delicate items, use fabric softener"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-12 pt-8 border-t">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          {bookingItems.length > 0 && (
            <Button
              onClick={handleFinish}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              Finish & Save Booking
            </Button>
          )}
        </div>

        {/* Success Alert */}
        {showSuccessAlert && (
          <Alert className="mt-10 bg-green-50 border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDescription className="flex items-center justify-between text-green-700">
              <span>Booking session completed successfully!</span>
              <div className="flex gap-3">
                <Button size="sm" variant="outline" onClick={() => setShowSuccessAlert(false)}>
                  Add More Items
                </Button>
                <Button size="sm" onClick={handleFinish}>
                  Finish
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default StaffBookLaundryForm;