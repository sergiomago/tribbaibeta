import { AppNavbar } from "@/components/AppNavbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { settingsStore } from "@/stores/settingsStore";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { ChatSettings } from "@/components/settings/ChatSettings";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { SubscriptionStatus } from "@/components/settings/SubscriptionStatus";

const Settings = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(settingsStore.getSettings());

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
        
        <Tabs defaultValue="subscription" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="subscription">
            <SubscriptionStatus />
          </TabsContent>

          <TabsContent value="theme">
            <ThemeSettings settings={settings} updateSettings={updateSettings} />
          </TabsContent>

          <TabsContent value="chat">
            <ChatSettings settings={settings} updateSettings={updateSettings} />
          </TabsContent>

          <TabsContent value="account">
            <AccountSettings
              name={name}
              currentPassword={currentPassword}
              newPassword={newPassword}
              loading={loading}
              setName={setName}
              setCurrentPassword={setCurrentPassword}
              setNewPassword={setNewPassword}
              handleUpdateProfile={handleUpdateProfile}
              handleChangePassword={handleChangePassword}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;