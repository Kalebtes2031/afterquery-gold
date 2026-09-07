import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  gender?: string;
  areaOfResidence?: string;
  createdAt: any;
}

const ITEMS_PER_PAGE = 10;

const Customers = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "customer"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Customer));
      setCustomers(data);
    }, (error) => {
      console.error("Error fetching customers:", error);
    });

    return () => unsubscribe();
  }, []);

  const filtered = customers.filter((c) =>
    (c.name?.toLowerCase().includes(search.toLowerCase()) ||
     c.email.toLowerCase().includes(search.toLowerCase()) ||
     c.phone?.includes(search) ||
     c.areaOfResidence?.toLowerCase().includes(search.toLowerCase()) ||
     c.gender?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCustomers = filtered.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", customerToDelete.id));
      toast({
        title: "Customer Deleted",
        description: `${customerToDelete.name || customerToDelete.email} has been removed.`,
      });
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Customers
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage all registered customers ({customers.length} total)
          </p>
        </div>
        <Button
          onClick={() => navigate(`/lms/${role}/add-customer`)}
          className="bg-gradient-to-r from-primary to-accent"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone, gender, area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Delete Confirmation */}
      {deleteDialogOpen && customerToDelete && (
        <Alert className="bg-destructive/10 border-destructive/30 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <span className="font-medium">
              Are you sure you want to delete{" "}
              <strong>{customerToDelete.name || customerToDelete.email}</strong>?
            </span>
            <div className="flex gap-3">
              <Button
                size="sm"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setCustomerToDelete(null);
                }}
                disabled={deleting}
              >
                No
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Actions</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Gender</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Area of Residence</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Joined</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    {search ? "No customers found matching your search" : "No customers yet"}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-primary cursor-pointer hover:underline"
                          onClick={() => navigate(`/lms/${role}/customer/${customer.id}`)}
                        >
                          View
                        </span>
                        <span
                          className="text-accent cursor-pointer hover:underline"
                          onClick={() => navigate(`/lms/${role}/customer/${customer.id}/edit`)}
                        >
                          Edit
                        </span>
                        {role === "manager" && (
                          <span
                            className="text-destructive cursor-pointer hover:underline inline-flex items-center gap-1"
                            onClick={() => handleDeleteClick(customer)}
                          >
                            
                            Delete
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium">{customer.name || "No Name"}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm">{customer.email}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm">{customer.phone || "—"}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {customer.gender
                          ? customer.gender.startsWith("Other:")
                            ? "Other"
                            : customer.gender
                          : "—"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {customer.areaOfResidence || "Not specified"}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {customer.createdAt
                        ? format(customer.createdAt.toDate(), "MMM d, yyyy")
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} customers
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;