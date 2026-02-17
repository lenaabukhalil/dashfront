import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import {
  fetchUserInfo,
  fetchUserSessions,
  fetchUserPayments,
  type UserInfo as UserInfoType,
  type UserSession,
  type UserPayment,
} from "@/services/api";
import { useToast } from "@/hooks/use-toast";

export const UserInfo = () => {
  const [mobile, setMobile] = useState("");
  const [searchedMobile, setSearchedMobile] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfoType | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!mobile || mobile.length < 10) {
      toast({
        title: "Error",
        description: "Please enter a valid mobile number (at least 10 digits)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const queryMobile = mobile.trim();
      setSearchedMobile(queryMobile);

      const [info, userSessions, userPayments] = await Promise.all([
        fetchUserInfo(queryMobile),
        fetchUserSessions(queryMobile),
        fetchUserPayments(queryMobile),
      ]);

      let finalInfo = info;
      if (!finalInfo && queryMobile.startsWith("+")) {
        finalInfo = await fetchUserInfo(queryMobile.slice(1));
      }

      setUserInfo(finalInfo);
      setSessions(userSessions);
      setPayments(userPayments);

      if (!finalInfo && userSessions.length === 0 && userPayments.length === 0) {
        toast({
          title: "Not Found",
          description: "User not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const getPlatform = (deviceId: string): string => {
    if (deviceId && deviceId.length > 16) {
      return "iPhone";
    }
    return "Android";
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">User Info</CardTitle>

          <div className="relative w-full sm:w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="+9627XXXXXXXX"
              className="pl-10"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
        ) : !userInfo && sessions.length === 0 && payments.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Enter mobile number to search
          </div>
        ) : (
          <>
            <div className="space-y-6">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Mobile</Label>
                  <p className="text-sm font-medium">{searchedMobile || mobile}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="text-sm font-semibold">
                    {userInfo
                      ? `${userInfo.first_name ?? ""} ${userInfo.last_name ?? ""}`.trim() || "—"
                      : "—"}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Language</Label>
                    <p className="text-sm font-medium">
                      {userInfo?.language ? String(userInfo.language).toUpperCase() : "EN"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Balance</Label>
                    <p className="text-base font-semibold">
                      {typeof userInfo?.balance === "number"
                        ? userInfo.balance.toFixed(2)
                        : userInfo?.balance
                          ? Number(userInfo.balance).toFixed(2)
                          : "0.00"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Platform</Label>
                    <p className="text-sm font-medium">
                      {userInfo?.platform || getPlatform(String(userInfo?.device_id ?? ""))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Sessions</h3>
                  <DataTable
                    data={sessions as unknown as Record<string, unknown>[]}
                    columns={[
                      {
                        key: "Date/Time",
                        header: "Date/Time",
                        render: (row: Record<string, unknown>) => String(row["Date/Time"] ?? ""),
                      },
                      {
                        key: "Charger",
                        header: "Charger",
                        render: (row: Record<string, unknown>) => String(row["Charger"] ?? row.Charger ?? ""),
                      },
                      {
                        key: "Energy",
                        header: "Energy",
                        render: (row: Record<string, unknown>) => String(row["Energy"] ?? row.Energy ?? ""),
                      },
                      {
                        key: "Amount",
                        header: "Amount (JOD)",
                        render: (row: Record<string, unknown>) => String(row["Amount"] ?? row.Amount ?? ""),
                      },
                    ]}
                    showSearch={false}
                    defaultPageSize={5}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Payments</h3>
                  <DataTable
                    data={payments as unknown as Record<string, unknown>[]}
                    columns={[
                      {
                        key: "Date/Time",
                        header: "Date/Time",
                        render: (row: Record<string, unknown>) => String(row["Date/Time"] ?? ""),
                      },
                      {
                        key: "Source",
                        header: "Source",
                        render: (row: Record<string, unknown>) => String(row["Source"] ?? row.Source ?? ""),
                      },
                      {
                        key: "Amount (JOD)",
                        header: "Amount (JOD)",
                        render: (row: Record<string, unknown>) => String(row["Amount (JOD)"] ?? ""),
                      },
                    ]}
                    showSearch={false}
                    defaultPageSize={5}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

