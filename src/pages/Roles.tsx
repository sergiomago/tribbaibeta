import { AppNavbar } from "@/components/AppNavbar";
import { RoleList } from "@/components/roles/RoleList";
import { Button } from "@/components/ui/button";
import { settingsStore } from "@/stores/settingsStore";

const Roles = () => {
  const playNotificationSound = () => {
    const settings = settingsStore.getSettings();
    if (settings.soundEnabled) {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(error => {
        console.error("Error playing notification sound:", error);
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Roles</h1>
          <Button 
            variant="outline" 
            onClick={playNotificationSound}
            className="ml-2"
          >
            Test Sound
          </Button>
        </div>
        <RoleList />
      </main>
    </div>
  );
};

export default Roles;