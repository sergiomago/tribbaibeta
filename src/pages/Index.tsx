import { AppNavbar } from "@/components/AppNavbar";
import { ChatLayout } from "@/components/chat/ChatLayout";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1">
        <ChatLayout />
      </main>
    </div>
  );
};

export default Index;