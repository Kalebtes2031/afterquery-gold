// src/pages/manager/CustomerReviews.tsx
import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Star, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Rating {
  id: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  configId: string;
  configName: string;
  responses: Array<{
    questionId: string;
    questionText: string;
    questionType: "rating" | "text" | "yesno";
    answer: any;
  }>;
  submittedAt: any;
}

const ITEMS_PER_PAGE = 10;

const CustomerReviews = () => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [search, setSearch] = useState("");
  const [filterConfig, setFilterConfig] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [configs, setConfigs] = useState<Array<{ id: string; name: string }>>(
    [],
  );

  useEffect(() => {
    // Fetch rating configs
    const configsQuery = query(
      collection(db, "ratingConfigs"),
      orderBy("name", "asc"),
    );
    const unsubConfigs = onSnapshot(configsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setConfigs(data);
    });

    // Fetch ratings
    const ratingsQuery = query(
      collection(db, "customerRatings"),
      orderBy("submittedAt", "desc"),
    );

    const unsubRatings = onSnapshot(ratingsQuery, async (snapshot) => {
      const data = await Promise.all(
        snapshot.docs.map(async (ratingDoc) => {
          const ratingData = ratingDoc.data();

          // Fetch customer info
          let customerName = "Unknown";
          let customerEmail = "";
          try {
            const userDoc = await getDoc(
              doc(db, "users", ratingData.customerId),
            );
            if (userDoc.exists()) {
              customerName = userDoc.data().name || "Unknown";
              customerEmail = userDoc.data().email || "";
            }
          } catch (error) {
            console.error("Error fetching customer:", error);
          }

          return {
            id: ratingDoc.id,
            customerName,
            customerEmail,
            ...ratingData,
          } as Rating;
        }),
      );
      setRatings(data);
    });

    return () => {
      unsubConfigs();
      unsubRatings();
    };
  }, []);

  const getAverageRating = (rating: Rating): number | null => {
    const ratingResponses = rating.responses.filter(
      (r) => r.questionType === "rating",
    );
    if (ratingResponses.length === 0) return null;

    const sum = ratingResponses.reduce((acc, r) => acc + (r.answer || 0), 0);
    return sum / ratingResponses.length;
  };

  const getComments = (rating: Rating): string => {
    return rating.responses
      .map((r: any) => r.comment)
      .filter((c) => c && c.toString().trim())
      .join("\n");
  };

  const filtered = ratings.filter((r) => {
    const matchesSearch =
      r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      r.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
      r.configName?.toLowerCase().includes(search.toLowerCase());

    const matchesConfig = filterConfig === "all" || r.configId === filterConfig;

    let matchesRating = true;
    if (filterRating !== "all") {
      const avgRating = getAverageRating(r);
      const filterValue = parseInt(filterRating);
      matchesRating =
        avgRating !== null && Math.round(avgRating) === filterValue;
    }

    return matchesSearch && matchesConfig && matchesRating;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRatings = filtered.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterConfig, filterRating]);

  const renderStars = (count: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= count
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Customer Reviews & Ratings
        </h1>
        <p className="text-muted-foreground mt-2">
          View all customer feedback and ratings ({ratings.length} total)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, email, or campaign..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterConfig} onValueChange={setFilterConfig}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="All Campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {configs.map((config) => (
              <SelectItem key={config.id} value={config.id}>
                {config.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ratings Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead className="max-w-xs">Questions</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="whitespace-nowrap">Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRatings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-16 text-muted-foreground"
                  >
                    {search || filterConfig !== "all" || filterRating !== "all"
                      ? "No ratings found matching your filters"
                      : "No customer ratings yet"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRatings.map((rating) => {
                  const avgRating = getAverageRating(rating);
                  return (
                    <TableRow key={rating.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {rating.customerName}
                      </TableCell>
                      <TableCell>{rating.customerEmail}</TableCell>
                      <TableCell>{rating.configName}</TableCell>
                      <TableCell className="max-w-xs break-words">
                        {rating.responses.map((resp, idx) => (
                          <div key={idx} className="mb-2">
                            <div className="text-sm font-medium break-words">
                              {resp.questionText}
                            </div>
                            {/* <div className="text-sm">
                              {resp.questionType === "rating" && (
                                <div className="flex items-center gap-1">
                                  {renderStars(resp.answer || 0)}
                                  <span className="text-muted-foreground">
                                    {resp.answer}/5
                                  </span>
                                </div>
                              )}
                              {resp.questionType === "text" && (
                                <div className="bg-muted/50 rounded-lg p-2 break-words">
                                  {resp.answer || (
                                    <span className="italic text-muted-foreground">
                                      No answer
                                    </span>
                                  )}
                                </div>
                              )}
                              {resp.questionType === "yesno" && (
                                <Badge
                                  variant={
                                    resp.answer === "yes"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {resp.answer || "No answer"}
                                </Badge>
                              )}
                            </div> */}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="max-w-xs break-words whitespace-pre-line text-sm">
                        {getComments(rating) || "-"}
                      </TableCell>
                      <TableCell>
                        {avgRating !== null && (
                          <div className="flex items-center gap-1">
                            {renderStars(Math.round(avgRating))}
                            <span className="text-sm font-medium">
                              {avgRating.toFixed(1)}/5
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {rating.submittedAt
                          ? format(
                              rating.submittedAt.toDate(),
                              "MMM d, yyyy h:mm a",
                            )
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 bg-card border rounded-xl">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of{" "}
            {filtered.length} ratings
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ),
              )}
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
  );
};

export default CustomerReviews;
