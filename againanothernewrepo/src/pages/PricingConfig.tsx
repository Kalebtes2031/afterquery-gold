// src/pages/manager/utilities/PricingConfig.tsx
import { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import PricingConfigForm from "@/components/forms/PricingConfigForm";

interface Pricing {
  id: string;
  branchName: string;
  mainServiceName: string;
  basePricePerKg: number;
  hasPackage: boolean;
  packageName: string;
  hasSize: boolean;
  sizeName: string;
  extraServices: { name: string; price: number }[];
  stages: string[];
  isActive: boolean;
  createdAt?: any; // for sorting
}

type Mode = "list" | "add" | "view" | "edit";

const ITEMS_PER_PAGE = 10;

const PricingConfig = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [pricingList, setPricingList] = useState<Pricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const mode: Mode = id
    ? location.pathname.includes("/edit") ? "edit" : "view"
    : location.pathname.includes("/add") ? "add"
    : "list";

  useEffect(() => {
    const q = query(collection(db, "pricingConfig"), orderBy("createdAt", "desc")); // ← Latest on top
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pricing));
      setPricingList(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const calculateTotalPrice = (p: Pricing) => {
    const extrasTotal = p.extraServices?.reduce((sum, e) => sum + e.price, 0) || 0;
    return p.basePricePerKg + extrasTotal;
  };

  const handleDelete = async (pricingId: string) => {
    if (!confirm("Are you sure you want to delete this pricing config?")) return;
    try {
      await deleteDoc(doc(db, "pricingConfig", pricingId));
      toast.success("Pricing config deleted");
    } catch (err) {
      toast.error("Failed to delete");
      console.error(err);
    }
  };

  // Search filter (live)
  const filteredPricing = useMemo(() => {
    if (!searchTerm.trim()) return pricingList;

    const term = searchTerm.toLowerCase();
    return pricingList.filter(p =>
      [
        p.branchName?.toLowerCase(),
        p.mainServiceName?.toLowerCase(),
        p.packageName?.toLowerCase(),
        p.sizeName?.toLowerCase(),
      ].some(text => text?.includes(term))
    );
  }, [pricingList, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredPricing.length / ITEMS_PER_PAGE);
  const paginatedPricing = filteredPricing.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (mode !== "list") {
    return (
      <PricingConfigForm
        mode={mode}
        pricingId={id}
        onSuccess={() => navigate("/lms/manager/utilities/pricing")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Pricing Configuration
          </h1>
          <p className="text-muted-foreground mt-2">Set prices, stages and trackable items per branch & service</p>
        </div>
        <Button onClick={() => navigate("/lms/manager/utilities/pricing/add")} className="bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-2" /> Add Pricing
        </Button>
      </div>

      {/* Search bar - top right */}
      <div className="flex justify-end">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search branch, service, package..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // reset to page 1 on search
            }}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-32 sm:w-40">Action</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Main Service</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Total Price/Kg</TableHead>
                <TableHead>Extra Services</TableHead>
                <TableHead>Stages</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading pricing configurations...
                  </TableCell>
                </TableRow>
              ) : paginatedPricing.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    <div className="space-y-4">
                      <p className="text-lg">No pricing configurations found</p>
                      {searchTerm && (
                        <p className="text-sm">Try clearing the search or adding a new config</p>
                      )}
                      <Button onClick={() => navigate("/lms/manager/utilities/pricing/add")}>
                        Create First Pricing
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPricing.map((p) => {
                  const totalPrice = calculateTotalPrice(p);
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/lms/manager/utilities/pricing/${p.id}`)}
                    >
                      {/* Actions - text links + Delete word button */}
                      <TableCell className="font-medium py-4">
                        <div className="flex items-center gap-4 sm:gap-5 whitespace-nowrap">
                          <span
                            className="underline cursor-pointer hover:text-primary transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/lms/manager/utilities/pricing/${p.id}`);
                            }}
                          >
                            View
                          </span>

                          <span
                            className="underline cursor-pointer hover:text-primary transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/lms/manager/utilities/pricing/${p.id}/edit`);
                            }}
                          >
                            Edit
                          </span>

                          {/* Delete - word button, same style as others */}
                          <button
                            className="text-destructive underline hover:text-destructive/80 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(p.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </TableCell>

                      <TableCell className="font-medium">{p.branchName || "—"}</TableCell>
                      <TableCell>{p.mainServiceName || "—"}</TableCell>

                      <TableCell>
                        {p.hasPackage ? (
                          <Badge variant="outline">{p.packageName || "Unnamed"}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {p.hasSize ? (
                          <Badge variant="outline">{p.sizeName || "Unnamed"}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="font-bold text-primary">
                        KSh {totalPrice}
                      </TableCell>
                      <TableCell>{p.extraServices?.length || 0}</TableCell>
                      <TableCell>{p.stages?.length || 0}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={p.isActive ? "default" : "secondary"}
                          className={p.isActive ? "bg-green-600 hover:bg-green-600" : ""}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination - same as CustomerOrders.tsx */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredPricing.length)} of{" "}
              {filteredPricing.length} configs
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

export default PricingConfig;