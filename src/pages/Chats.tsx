import { AppNavbar } from "@/components/AppNavbar";

const Chats = () => {
  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Chats</h1>
        {/* Chat functionality will be implemented here */}
      </main>
    </div>
  );
};

export default Chats;