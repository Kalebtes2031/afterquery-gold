// src/pages/manager/RatingConfigs.tsx
import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Eye, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RatingConfig {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  questions: Array<{
    id: string;
    text: string;
    type: "rating" | "text" | "yesno";
    required: boolean;
  }>;
  eligibility: {
    minDeliveredOrders: number;
    maxDeliveredOrders?: number;
    excludeRecentRaters?: boolean;
    daysBeforeRerate?: number;
  };
  displaySettings: {
    triggerType: "onPage" | "afterAction";
    pages?: string[]; // ["dashboard", "invoices", "myOrders"]
    afterAction?: "orderPlaced" | "orderDelivered";
    delaySeconds?: number;
  };
  createdAt: any;
  updatedAt: any;
}

const ITEMS_PER_PAGE = 10;

const RatingConfigs = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<RatingConfig[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<RatingConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "ratingConfigs"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as RatingConfig));
      setConfigs(data);
    });

    return () => unsubscribe();
  }, []);

  const filtered = configs.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedConfigs = filtered.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const toggleActive = async (config: RatingConfig) => {
    try {
      await updateDoc(doc(db, "ratingConfigs", config.id), {
        isActive: !config.isActive,
        updatedAt: new Date(),
      });
      toast.success(
        config.isActive
          ? "Rating campaign deactivated"
          : "Rating campaign activated"
      );
    } catch (error) {
      console.error("Error toggling active state:", error);
      toast.error("Failed to update campaign status");
    }
  };

  const handleDelete = async () => {
    if (!configToDelete) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "ratingConfigs", configToDelete.id));
      toast.success("Rating campaign deleted");
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    } catch (error) {
      console.error("Error deleting config:", error);
      toast.error("Failed to delete campaign");
    } finally {
      setDeleting(false);
    }
  };

  const getTriggerLabel = (config: RatingConfig) => {
    const { triggerType, pages, afterAction } = config.displaySettings;
    
    if (triggerType === "onPage" && pages) {
      return `On pages: ${pages.join(", ")}`;
    }
    
    if (triggerType === "afterAction" && afterAction) {
      return afterAction === "orderPlaced" 
        ? "After order placed" 
        : "After order delivered";
    }
    
    return "Not configured";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Rating Campaigns
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage customer rating popups and feedback campaigns ({configs.length} total)
          </p>
        </div>
        <Button
          onClick={() => navigate("/lms/manager/add-rating-config")}
          className="bg-gradient-to-r from-primary to-accent"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Campaign Name</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Questions</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Eligibility</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Trigger</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Created</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {paginatedConfigs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    {search ? "No campaigns found" : "No rating campaigns created yet"}
                  </td>
                </tr>
              ) : (
                paginatedConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-muted/30">
                    {/* Status */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(config)}
                        className="flex items-center gap-2"
                      >
                        {config.isActive ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600">
                            <Power className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="hover:bg-secondary/80">
                            <PowerOff className="w-3 h-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </button>
                    </td>

                    {/* Campaign Name */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{config.name}</div>
                        {config.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {config.description}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Questions */}
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {config.questions.length} question{config.questions.length !== 1 ? "s" : ""}
                      </div>
                    </td>

                    {/* Eligibility */}
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {config.eligibility.minDeliveredOrders}+ delivered orders
                        {config.eligibility.maxDeliveredOrders && (
                          <>, max {config.eligibility.maxDeliveredOrders}</>
                        )}
                      </div>
                    </td>

                    {/* Trigger */}
                    <td className="px-6 py-4">
                      <div className="text-sm">{getTriggerLabel(config)}</div>
                    </td>

                    {/* Created */}
                    <td className="px-6 py-4 text-sm">
                      {config.createdAt
                        ? format(config.createdAt.toDate(), "MMM d, yyyy")
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/lms/manager/rating-config/${config.id}`)}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/lms/manager/rating-config/${config.id}/edit`)}
                          className="text-accent hover:underline flex items-center gap-1"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setConfigToDelete(config);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} campaigns
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rating Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{configToDelete?.name}</strong>?
              This will also affect any existing customer ratings associated with this campaign.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RatingConfigs;