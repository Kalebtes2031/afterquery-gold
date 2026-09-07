import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Employee {
  id: string;
  name?: string;
  email: string;
  username?: string;
  createdAt?: any;
}

const EmployeeList = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "employee")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Employee)
        );
        setEmployees(data);
      },
      (error) => {
        console.error("Error fetching employees:", error);
        toast.error("Failed to load employees");
      }
    );

    return () => unsubscribe();
  }, []);

  const handleDelete = async (employeeId: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${employeeId}?\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "users", employeeId));
      toast.success("Employee deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete employee");
    }
  };

  const filtered = employees.filter(
    (e) =>
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Employees
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your team ({employees.length} total)
          </p>
        </div>

        <Button
          onClick={() => navigate("/lms/manager/add-employee")}
          className="bg-gradient-to-r from-primary to-accent"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-16 text-muted-foreground"
                >
                  No employees found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="hover:bg-muted/50 transition"
                >
                  <TableCell className="font-medium">
                    {employee.name || "No Name"}
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.username || "—"}</TableCell>
                  <TableCell>
                    {employee.createdAt
                      ? format(employee.createdAt.toDate(), "MMM d, yyyy")
                      : "—"}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right space-x-3">
  <button
    onClick={() => navigate(`/lms/manager/employee/${employee.id}`)}
    className="text-primary hover:underline text-sm"
  >
    View
  </button>

  <button
    onClick={() => navigate(`/lms/manager/employee/${employee.id}/edit`)}
    className="text-accent hover:underline text-sm"
  >
    Edit
  </button>

  <button
    onClick={() => handleDelete(employee.id)}
    className="text-destructive hover:underline text-sm"
  >
    Delete
  </button>
</TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EmployeeList;
