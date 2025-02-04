import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsType } from "@/stores/settingsStore";

interface ThemeSettingsProps {
  settings: SettingsType;
  updateSettings: (settings: Partial<SettingsType>) => void;
}

export const ThemeSettings = ({ settings, updateSettings }: ThemeSettingsProps) => {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Dark Theme</Label>
            <div className="text-sm text-muted-foreground">
              Switch between light and dark mode
            </div>
          </div>
          <Switch 
            checked={settings.isDarkMode}
            onCheckedChange={(checked) => updateSettings({ isDarkMode: checked })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Font Size</Label>
          <Select 
            value={settings.fontSize}
            onValueChange={(value) => updateSettings({ fontSize: value as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select font size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};