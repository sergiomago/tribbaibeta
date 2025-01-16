import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageSquare, Star, ThumbsUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExperienceRating = "excellent" | "good" | "average" | "poor" | "needs_improvement";

export function FeedbackDialog({ isOpen, onClose }: FeedbackDialogProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState<ExperienceRating | "">("");
  const [features, setFeatures] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [hasBugs, setHasBugs] = useState(false);
  const [bugReport, setBugReport] = useState("");
  const [recommend, setRecommend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) {
      toast({
        title: "Error",
        description: "Please select an experience rating",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("feedback").insert({
      experience_rating: rating,
      favorite_features: features,
      improvement_suggestions: suggestions,
      has_bugs: hasBugs,
      bug_report: hasBugs ? bugReport : null,
      would_recommend: recommend,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
        duration: 3000,
      });
    } else {
      toast({
        title: "Thank you for your feedback!",
        description: "You've unlocked the Feedback Expert role! Check your templates.",
        duration: 5000,
      });
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Share Your Feedback
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>How would you rate your experience?</Label>
            <RadioGroup
              value={rating}
              onValueChange={(value: ExperienceRating) => setRating(value)}
              className="flex flex-col space-y-1"
            >
              {[
                { value: "excellent", label: "Excellent", icon: Star },
                { value: "good", label: "Good", icon: ThumbsUp },
                { value: "average", label: "Average", icon: MessageSquare },
                { value: "poor", label: "Poor", icon: AlertCircle },
                { value: "needs_improvement", label: "Needs Improvement", icon: AlertCircle },
              ].map(({ value, label, icon: Icon }) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={value} />
                  <Label htmlFor={value} className="flex items-center gap-1">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="features">What features do you like the most?</Label>
            <Textarea
              id="features"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="Tell us what you enjoy..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestions">What could we improve?</Label>
            <Textarea
              id="suggestions"
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="Share your suggestions..."
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="bugs">Have you encountered any bugs?</Label>
              <Switch
                id="bugs"
                checked={hasBugs}
                onCheckedChange={setHasBugs}
              />
            </div>

            {hasBugs && (
              <div className="space-y-2">
                <Label htmlFor="bugReport">Please describe the bug(s):</Label>
                <Textarea
                  id="bugReport"
                  value={bugReport}
                  onChange={(e) => setBugReport(e.target.value)}
                  placeholder="Describe what went wrong..."
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="recommend">
                Would you recommend us?
              </Label>
              <Switch
                id="recommend"
                checked={recommend}
                onCheckedChange={setRecommend}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}