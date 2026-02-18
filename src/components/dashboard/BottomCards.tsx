import { useState } from "react";
import { Search, Square, Unlock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/shared/AppSelect";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export const BottomCards = () => {
  const [org, setOrg] = useState("igf2");
  const [location, setLocation] = useState("");
  const [charger, setCharger] = useState("prime07");
  const [connector, setConnector] = useState("gbtac");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <h3 className="text-sm font-semibold mb-4">Location</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Organization</label>
            <AppSelect
              options={[{ value: "igf2", label: "IGF2" }, { value: "other", label: "Other" }]}
              value={org}
              onChange={setOrg}
              placeholder="Select organization"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Location</label>
            <AppSelect
              options={[{ value: "gravity", label: "Gravity Gate" }, { value: "ajman", label: "North Ajman" }]}
              value={location}
              onChange={setLocation}
              placeholder="Select location"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Charger</label>
            <AppSelect
              options={[{ value: "prime07", label: "ION PRIME - 07" }, { value: "prime03", label: "ION PRIME - 03" }]}
              value={charger}
              onChange={setCharger}
              placeholder="Select charger"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Connector</label>
            <AppSelect
              options={[{ value: "gbtac", label: "GBT AC" }, { value: "ccsdc", label: "CCS DC" }]}
              value={connector}
              onChange={setConnector}
              placeholder="Select connector"
            />
          </div>

          <div className="pt-4 border-t border-border">
            <label className="text-xs text-muted-foreground mb-3 block">Connected</label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                <Square className="w-3 h-3 mr-1 fill-current" />
                Stop
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-primary border-primary hover:bg-primary hover:text-primary-foreground">
                <Unlock className="w-3 h-3 mr-1" />
                Unlock
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <RotateCcw className="w-3 h-3 mr-1" />
                Restart
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Enable</label>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <h3 className="text-sm font-semibold mb-4">User Information</h3>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by mobile number" 
            className="pl-10"
          />
        </div>

        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
          Select an ION session to view user information
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <div className="flex gap-2 mb-6">
          <button className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
            History
          </button>
          <button className="px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80">
            Payments
          </button>
        </div>

        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
          Select an ION session to view history
        </div>
      </div>
    </div>
  );
};
