import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { FeedbackDialog } from "./FeedbackDialog";

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 rounded-full p-3 shadow-lg"
        size="icon"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
      <FeedbackDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}