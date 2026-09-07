// src/components/forms/CustomerForm.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db, firebaseConfig } from "@/firebase";
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
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type Mode = "add" | "edit" | "view";

const CustomerForm = ({ mode }: { mode: Mode }) => {
  const { role } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    customGender: "",
    areaOfResidence: "",
    apartment: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showGenderCustom, setShowGenderCustom] = useState(false);

  const isView = mode === "view";
  const isAdd = mode === "add";
  const isEdit = mode === "edit";

  useEffect(() => {
    if ((isEdit || isView) && id) {
      const fetchCustomer = async () => {
        const snap = await getDoc(doc(db, "users", id));
        if (snap.exists()) {
          const data = snap.data();
          const genderVal = data.gender || "";
          const isCustom = genderVal.startsWith("Other:");
          setFormData({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            gender: isCustom ? "Other" : genderVal,
            customGender: isCustom ? genderVal.replace("Other:", "").trim() : "",
            areaOfResidence: data.areaOfResidence || "",
            apartment: data.apartment || "",
            password: "",
            confirmPassword: "",
          });
          setShowGenderCustom(isCustom);
        }
      };
      fetchCustomer();
    }
  }, [id, mode]);

  const checkPhoneUniqueness = async (phoneNumber: string, excludeUid?: string) => {
    if (!phoneNumber.trim()) return true;

    const q = query(
      collection(db, "users"),
      where("phone", "==", phoneNumber.trim())
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return true;

    if (excludeUid) {
      const docs = snapshot.docs;
      return docs.length === 1 && docs[0].id === excludeUid;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isUnique = await checkPhoneUniqueness(formData.phone, isAdd ? undefined : id);
      if (!isUnique) {
        toast.error("This phone number is already in use by another customer.");
        return;
      }

      let finalGender: string | null = null;
      if (formData.gender) {
        if (formData.gender === "Other") {
          finalGender = formData.customGender.trim()
            ? `Other: ${formData.customGender.trim()}`
            : null;
        } else {
          finalGender = formData.gender;
        }
      }

      if (isAdd) {
        if (!formData.name || !formData.email || !formData.password) {
          toast.error("Name, email and password are required");
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }

        if (formData.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          return;
        }

        if (!formData.areaOfResidence.trim()) {
          toast.error("Area of residence is required");
          return;
        }

        const secondaryApp = initializeApp(firebaseConfig, "secondary-customer");
        const secondaryAuth = getAuth(secondaryApp);

        const cred = await createUserWithEmailAndPassword(
          secondaryAuth,
          formData.email.trim(),
          formData.password
        );

        await setDoc(doc(db, "users", cred.user.uid), {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          gender: finalGender,
          areaOfResidence: formData.areaOfResidence.trim(),
          apartment: formData.apartment.trim() || null,
          role: "customer",
          createdAt: serverTimestamp(),
        });

        await deleteApp(secondaryApp);
        toast.success("Customer created successfully");
      }

      if (isEdit && id) {
        await updateDoc(doc(db, "users", id), {
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          gender: finalGender,
          areaOfResidence: formData.areaOfResidence.trim(),
          apartment: formData.apartment.trim() || null,
        });
        toast.success("Customer updated successfully");
      }

      navigate(`/lms/${role}/customers`);
    } catch (err: any) {
      console.error("Customer operation error:", err);
      toast.error(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {isAdd ? "Add Customer" : isEdit ? "Edit Customer" : "Customer Details"}
        </h1>
      </div>

      <div className="bg-card border rounded-lg p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isView}
                required={!isView}
              />
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isView || isEdit}
                required={!isView}
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isView}
                placeholder="e.g. 0712345678"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label>Gender</Label>
              <div className="space-y-3">
                <Select
                  value={formData.gender}
                  onValueChange={(val) => {
                    setFormData({ ...formData, gender: val });
                    setShowGenderCustom(val === "Other");
                  }}
                  disabled={isView}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Rather not say">Rather not say</SelectItem>
                    <SelectItem value="Other">Other...</SelectItem>
                  </SelectContent>
                </Select>

                {showGenderCustom && !isView && (
                  <div className="relative">
                    <Input
                      value={formData.customGender}
                      onChange={(e) =>
                        setFormData({ ...formData, customGender: e.target.value })
                      }
                      placeholder="Please specify"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => {
                        setFormData({ ...formData, gender: "", customGender: "" });
                        setShowGenderCustom(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Area of Residence *</Label>
              <Input
                value={formData.areaOfResidence}
                onChange={(e) =>
                  setFormData({ ...formData, areaOfResidence: e.target.value })
                }
                disabled={isView}
                placeholder="e.g. Kilimani, Westlands, Ongata Rongai"
                required={!isView}
              />
            </div>

            <div className="space-y-2">
              <Label>Apartment / Room No.</Label>
              <Input
                value={formData.apartment}
                onChange={(e) =>
                  setFormData({ ...formData, apartment: e.target.value })
                }
                disabled={isView}
                placeholder="e.g. Apt 4C, Room 212"
              />
            </div>
          </div>

          {isAdd && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirm Password *</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              {isView ? "Back" : "Cancel"}
            </Button>
            {!isView && (
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-primary to-accent"
              >
                {loading ? "Saving..." : isAdd ? "Add Customer" : "Save Changes"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerForm;