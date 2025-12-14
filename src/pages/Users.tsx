import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { DataTable } from "@/components/shared/DataTable";
import { FormPlaceholder } from "@/components/shared/FormPlaceholder";
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
import { fetchLeadershipUsers, organizationOptions, roleOptions, languageOptions } from "@/services/api";
import type { User } from "@/types";

const tabs = [
  { id: "leadership", label: "Leadership" },
  { id: "addUsers", label: "Add users" },
  { id: "addPartner", label: "Add Partner User" },
  { id: "reimbursement", label: "Reimbursement" },
];

const columns = [
  { key: "firstName" as const, header: "First Name" },
  { key: "lastName" as const, header: "Last Name" },
  { key: "count" as const, header: "Count" },
  { key: "mobile" as const, header: "Mobile" },
  { 
    key: "energy" as const, 
    header: "Energy",
    render: (user: User) => `${user.energy.toLocaleString()} kWh`,
  },
  { 
    key: "amount" as const, 
    header: "Amount",
    render: (user: User) => `$${user.amount.toLocaleString()}`,
  },
];

const Users = () => {
  const [activeTab, setActiveTab] = useState("leadership");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchLeadershipUsers().then(setUsers);
  }, []);

  const getBreadcrumb = () => {
    switch (activeTab) {
      case "addUsers":
        return "ION Dashboard / Users / Add users";
      case "addPartner":
        return "ION Dashboard / Users / Add Partner User";
      case "reimbursement":
        return "ION Dashboard / Users / Reimbursement";
      default:
        return "ION Dashboard / Users";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Users</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage users and partners
          </p>

          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="text-xs text-muted-foreground pb-4 border-b border-border">
            {getBreadcrumb()}
          </div>
        </div>

        <div className="pt-2">
          {activeTab === "leadership" && (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <DataTable columns={columns} data={users} />
            </div>
          )}

          {activeTab === "addUsers" && (
            <FormPlaceholder 
              title="Add Users" 
              description="Add new users to the system."
            />
          )}

          {activeTab === "addPartner" && (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizationOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input placeholder="Enter first name" />
                  </div>

                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input placeholder="Enter last name" />
                  </div>

                  <div className="space-y-2">
                    <Label>Mobile</Label>
                    <Input placeholder="+971 50 000 0000" />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="email@example.com" />
                  </div>

                  <div className="space-y-2">
                    <Label>Roles</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                  <Button type="submit">Add user</Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "reimbursement" && (
            <FormPlaceholder 
              title="Reimbursement" 
              description="Manage user reimbursements."
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Users;
