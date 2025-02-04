import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsType } from "@/stores/settingsStore";

interface ChatSettingsProps {
  settings: SettingsType;
  updateSettings: (settings: Partial<SettingsType>) => void;
}

export const ChatSettings = ({ settings, updateSettings }: ChatSettingsProps) => {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label>Message Display</Label>
          <Select 
            value={settings.messageDisplay}
            onValueChange={(value) => updateSettings({ messageDisplay: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select display mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};