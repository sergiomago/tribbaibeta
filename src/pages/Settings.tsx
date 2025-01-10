import { AppNavbar } from "@/components/AppNavbar";

const Settings = () => {
  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        {/* Settings content will go here */}
      </main>
    </div>
  );
};

export default Settings;