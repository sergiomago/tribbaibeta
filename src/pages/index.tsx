
import { AppNavbar } from "@/components/AppNavbar";
import { ChatLayout } from "@/components/chat/ChatLayout";

const Index = () => {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppNavbar />
      <div className="flex-1 overflow-hidden">
        <ChatLayout />
      </div>
    </div>
  );
};

export default Index;
