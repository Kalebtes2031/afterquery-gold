// src/pages/ManagerDashboard.tsx
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, DollarSign, Users, BarChart3, Home, CheckCircle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

import GeneralTab from "@/components/dashboard/GeneralTab";
import FinancialTab from "@/components/dashboard/FinancialTab";
import CustomersTab from "@/components/dashboard/CustomersTab";
import EmployeesTab from "@/components/dashboard/EmployeesTab";

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div >
       <div className="w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Manager Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Comprehensive business overview</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Employees
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <GeneralTab />
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <FinancialTab />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomersTab />
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <EmployeesTab />
          </TabsContent>
        </Tabs>

        {/* Quick Actions - Always visible */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button size="lg" onClick={() => navigate("/lms/manager/delivery-notifications")}>
                <Truck className="w-5 h-5 mr-2" />
                Confirm Deliveries
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/lms/manager/employee-list")}>
                <Users className="w-5 h-5 mr-2" />
                Manage Employees
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/lms/manager/customers")}>
                <CheckCircle className="w-5 h-5 mr-2" />
                View Customers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerDashboard;