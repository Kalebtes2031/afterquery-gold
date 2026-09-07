// src/pages/customer/BookLaundry.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "@/components/ui/sonner";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";

const BookLaundry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    customerName: user?.displayName || "",
    phone: "",
    location: "",
    apartment: "",
    serviceType: "",
    pickupTime: "",
    specialInstructions: "",
  });

  const services = [
    "Wash & Fold",
    "Wash & Iron",
    "Dry Cleaning",
    "Iron Only",
    "Beddings & Curtains",
    "Shoes Cleaning",
  ];

  const generateLaundryId = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `LND-${year}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to book laundry");
      return;
    }

    setLoading(true);

    try {
      const laundryId = generateLaundryId();

      await addDoc(collection(db, "laundryOrders"), {
        laundryId,
        customerId: user.uid,
        customerName: formData.customerName,
        customerEmail: user.email,
        phone: formData.phone,
        location: formData.location,
        apartment: formData.apartment || "N/A",
        serviceType: formData.serviceType,
        pickupTime: formData.pickupTime,
        specialInstructions: formData.specialInstructions || "None",
        status: "pending",
        bookedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Laundry booked successfully! Redirecting to your orders...");
      setTimeout(() => {
        navigate("/lms/customer/my-orders");
      }, 1500);
    } catch (error: any) {
      toast.error("Failed to book laundry: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Book Your Laundry
        </h1>
        <p className="text-muted-foreground mt-2">
          Fill in your details below and we'll take care of the rest!
        </p>
      </div>

      {/* Form Card - Same style as Add Employee */}
      <div className="bg-card border border-border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customerName">Full Name</Label>
              <Input
                id="customerName"
                placeholder="John Doe"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0712345678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Location & Apartment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="location">Pickup Location</Label>
              <Input
                id="location"
                placeholder="e.g. Westlands, Ngong Road, Juja"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apartment">
                Apartment / Hostel / Room No. <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="apartment"
                placeholder="e.g. Room 204, Sunrise Hostel"
                value={formData.apartment}
                onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Service Type & Pickup Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Select
                value={formData.serviceType}
                onValueChange={( value ) => setFormData({ ...formData, serviceType: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupTime">Preferred Pickup Time</Label>
              <Input
                id="pickupTime"
                type="datetime-local"
                value={formData.pickupTime}
                onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">
              Special Instructions <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Textarea
              id="instructions"
              placeholder="e.g. Separate whites, use fabric softener, delicate items, etc."
              rows={4}
              value={formData.specialInstructions}
              onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {loading ? "Booking Laundry..." : "Book Laundry Now"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookLaundry;