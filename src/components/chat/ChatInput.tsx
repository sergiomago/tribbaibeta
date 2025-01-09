import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChatInput() {
  return (
    <div className="border-t p-4 bg-background mt-auto">
      <div className="flex gap-2">
        <Input placeholder="Type your message..." className="flex-1" />
        <Button>Send</Button>
      </div>
    </div>
  );
}