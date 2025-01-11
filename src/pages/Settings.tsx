import { AppNavbar } from "@/components/AppNavbar";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { settingsStore } from "@/stores/settingsStore";

const Settings = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(settingsStore.getSettings());

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setName(profile.username || "");
        }
      }
    };
    loadProfile();
  }, [session]);

  const updateSettings = (newSettings: Partial<typeof settings>) => {
    settingsStore.updateSettings(newSettings);
    setSettings(settingsStore.getSettings());
  };

  const handleUpdateProfile = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({ username: name })
      .eq("id", session.user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-background text-foreground">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue="theme" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="theme">
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
          </TabsContent>

          <TabsContent value="chat">
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
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your display name"
                  />
                </div>
                
                <Button
                  onClick={handleUpdateProfile}
                  disabled={loading}
                >
                  Update Profile
                </Button>

                <div className="space-y-2 pt-4">
                  <Label>Change Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="mb-2"
                  />
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                  />
                  <Button
                    onClick={handleChangePassword}
                    disabled={loading || !currentPassword || !newPassword}
                    className="mt-2"
                  >
                    Change Password
                  </Button>
                </div>

                <div className="pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete Account</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;