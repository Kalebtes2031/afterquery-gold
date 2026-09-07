// src/components/forms/EmployeeForm.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
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
import { Checkbox } from "@/components/ui/checkbox"; // ← added
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

type Mode = "add" | "edit" | "view";

const EmployeeForm = ({ mode = "add" }: { mode?: Mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isView = mode === "view";
  const isAdd = mode === "add";
  const isEdit = mode === "edit";

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [isRider, setIsRider] = useState(false); // ← NEW
  const [branches, setBranches] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load branches
  useEffect(() => {
    const loadBranches = async () => {
      const snap = await getDocs(collection(db, "branches"));
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    loadBranches();
  }, []);

  // Load existing employee data
  useEffect(() => {
    if ((isEdit || isView) && id) {
      const fetchEmployee = async () => {
        const snap = await getDoc(doc(db, "users", id));
        if (snap.exists()) {
          const data = snap.data();
          setEmail(data.email || "");
          setName(data.name || "");
          setUsername(data.username || "");
          setPhone(data.phone || "");
          setBranchId(data.branchId || "");
          setIsRider(data.isRider || false); // ← NEW
        }
      };
      fetchEmployee();
    }
  }, [id, isEdit, isView]);

  // Resolve branch name for view mode
  useEffect(() => {
    if (!branchId || branches.length === 0) return;
    const branch = branches.find((b) => b.id === branchId);
    setBranchName(branch?.name || "N/A");
  }, [branchId, branches]);

  const checkPhoneUniqueness = async (phoneNumber: string, excludeUid?: string) => {
    if (!phoneNumber) return true;

    const q = query(collection(db, "users"), where("phone", "==", phoneNumber));
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
    if (isView) return;

    setLoading(true);
    try {
      const selectedBranch = branches.find((b) => b.id === branchId);
      const resolvedBranchName = selectedBranch?.name || "";

      const isUnique = await checkPhoneUniqueness(phone, isEdit ? id : undefined);
      if (!isUnique) {
        toast.error("This phone number is already in use by another user.");
        return;
      }

      const baseData = {
        email,
        name,
        username,
        phone,
        branchId,
        branchName: resolvedBranchName,
        isRider, // ← NEW
        updatedAt: serverTimestamp(),
      };

      if (isEdit && id) {
        await setDoc(doc(db, "users", id), baseData, { merge: true });
        toast.success("Employee updated successfully");
        navigate("/lms/manager/employee-list");
        return;
      }

      // ADD new employee
      if (!email || !password || password !== confirmPassword || !branchId) {
        toast.error("Please fill all required fields and ensure passwords match");
        return;
      }

      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      const secondaryApp = initializeApp(firebaseConfig, "secondary");
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );

      const newUser = userCredential.user;

      await setDoc(doc(db, "users", newUser.uid), {
        ...baseData,
        role: "employee",
        createdAt: serverTimestamp(),
      });

      await deleteApp(secondaryApp);

      toast.success("Employee created successfully");
      navigate("/lms/manager/employee-list");
    } catch (err: any) {
      console.error("Employee creation error:", err);
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
          {isAdd && "Add Employee"}
          {isEdit && "Edit Employee"}
          {isView && "Employee Details"}
        </h1>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Email *</Label>
              {isAdd ? (
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                  placeholder="employee@example.com"
                  required
                  autoComplete="email"
                />
              ) : (
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              )}
            </div>

            <div>
              <Label>Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isView}
              />
            </div>

            <div>
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isView}
              />
            </div>

            <div>
              <Label>Phone Number</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.trim())}
                placeholder="e.g. 0712345678"
                disabled={isView}
              />
            </div>

            <div>
              <Label>Branch *</Label>
              {isView ? (
                <Input value={branchName} disabled />
              ) : (
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* ← NEW: Is Rider checkbox */}
            <div className="flex items-center space-x-2 pt-4 md:pt-0">
              <Checkbox
                id="isRider"
                checked={isRider}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") {
                    setIsRider(checked);
                  }
                }}
                disabled={isView}
              />
              <Label htmlFor="isRider" className="cursor-pointer">
                This employee is a <strong>Rider / Delivery Person</strong>
              </Label>
            </div>

            {isAdd && (
              <>
                <div className="md:col-span-2">
                  <Label>Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label>Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            {!isView && (
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : isAdd
                  ? "Create Employee"
                  : "Update Employee"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;