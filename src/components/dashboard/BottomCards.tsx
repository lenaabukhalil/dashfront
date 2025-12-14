import { Search, Square, Unlock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export const BottomCards = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
      {/* Location Control Card */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <h3 className="text-sm font-semibold mb-4">Location</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Organization</label>
            <Select defaultValue="igf2">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="igf2">IGF2</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Location</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gravity">Gravity Gate</SelectItem>
                <SelectItem value="ajman">North Ajman</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Charger</label>
            <Select defaultValue="prime07">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prime07">ION PRIME - 07</SelectItem>
                <SelectItem value="prime03">ION PRIME - 03</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Connector</label>
            <Select defaultValue="gbtac">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gbtac">GBT AC</SelectItem>
                <SelectItem value="ccsdc">CCS DC</SelectItem>
              </SelectContent>
            </Select>
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

      {/* User Information Card */}
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

      {/* History / Payments Card */}
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
