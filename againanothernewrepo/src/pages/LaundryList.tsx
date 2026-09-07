import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, FileText, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";

const LaundryList = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Mock data for past orders
  const pastOrders = [
    {
      id: "LDY-2023-045",
      status: "Completed",
      laundryCount: 15,
      billAmount: "$45.00",
      billStatus: "Paid"
    },
    {
      id: "LDY-2023-044",
      status: "Completed",
      laundryCount: 8,
      billAmount: "$28.50",
      billStatus: "Paid"
    },
    {
      id: "LDY-2023-043",
      status: "Cancelled",
      laundryCount: 12,
      billAmount: "$36.00",
      billStatus: "Refunded"
    },
    {
      id: "LDY-2023-042",
      status: "Completed",
      laundryCount: 20,
      billAmount: "$62.00",
      billStatus: "Paid"
    },
    {
      id: "LDY-2023-041",
      status: "Completed",
      laundryCount: 10,
      billAmount: "$32.00",
      billStatus: "Paid"
    }
  ];

  // Pagination calculations
  const totalPages = Math.ceil(pastOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = pastOrders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Completed":
        return "default";
      case "Cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getBillStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Paid":
        return "default";
      case "Pending":
        return "secondary";
      case "Refunded":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Your Orders</h1>
        <p className="text-muted-foreground">View all your past laundry orders, {user?.displayName || user?.email}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{pastOrders.length}</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {pastOrders.filter(o => o.status === "Completed").length}
                </p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">
                  ${pastOrders.reduce((sum, order) => 
                    sum + parseFloat(order.billAmount.replace('$', '')), 0
                  ).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table - Mobile Card View with Pagination */}
      <div className="md:hidden space-y-4">
        {currentOrders.map((order) => (
          <Card key={order.id} className="overflow-hidden">
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg">{order.id}</p>
                  <p className="text-sm text-muted-foreground">{order.laundryCount} items</p>
                </div>
                <Badge variant={getStatusBadgeVariant(order.status)}>
                  {order.status}
                </Badge>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Bill Amount</p>
                  <p className="font-semibold text-lg">{order.billAmount}</p>
                </div>
                <Badge variant={getBillStatusBadgeVariant(order.billStatus)}>
                  {order.billStatus}
                </Badge>
              </div>

              <Button className="w-full mt-2">
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Mobile Pagination */}
        <div className="flex flex-col gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Items per page:</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Orders Table - Desktop View */}
      <Card className="hidden md:block">
        <CardContent className="pt-6">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Laundry ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Laundry Count</TableHead>
                  <TableHead>Bill Amount</TableHead>
                  <TableHead>Bill Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.laundryCount}</TableCell>
                    <TableCell className="font-semibold">{order.billAmount}</TableCell>
                    <TableCell>
                      <Badge variant={getBillStatusBadgeVariant(order.billStatus)}>
                        {order.billStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Desktop Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LaundryList;
