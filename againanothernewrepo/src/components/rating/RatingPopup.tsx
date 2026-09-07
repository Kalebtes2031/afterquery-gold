// src/components/RatingPopup.tsx
import { useState, useEffect } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { useRatingEligibility } from "@/hooks/useRatingEligibility";

interface RatingPopupProps {
  currentPage?: string;
  triggerAction?: "orderPlaced" | "orderDelivered";
  onClose?: () => void;
}

const RatingPopup = ({
  currentPage,
  triggerAction,
  onClose,
}: RatingPopupProps) => {
  const { user } = useAuth();
  const { isEligible, config, loading } = useRatingEligibility(
    currentPage,
    triggerAction,
  );

  const [isVisible, setIsVisible] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});
  // track optional follow‑up comments per question
  // stored under key `${question.id}_comment`
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEligible || !config) {
      setIsVisible(false);
      return;
    }

    // Handle page-based trigger with delay
    if (config.displaySettings.triggerType === "onPage" && currentPage) {
      const delayMs = (config.displaySettings.delaySeconds || 0) * 1000;
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delayMs);

      return () => clearTimeout(timer);
    }

    // Handle action-based trigger (immediate)
    if (config.displaySettings.triggerType === "afterAction" && triggerAction) {
      setIsVisible(true);
    }
  }, [isEligible, config, currentPage, triggerAction]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!config || !user) return;

    // Validate required questions
    const unanswered = config.questions.filter(
      (q) => q.required && !responses[q.id],
    );

    if (unanswered.length > 0) {
      toast.error("Please answer all required questions");
      return;
    }

    // enforce follow-up comment for rating answers
    for (const q of config.questions) {
      if (q.type !== "rating") continue;
      const val = responses[q.id];
      if (val === undefined || val === null) continue;
      const comment = responses[`${q.id}_comment`];
      // require some text in the comment field
      if (!comment || !comment.toString().trim()) {
        const prompt =
          val <= 3
            ? "Please let us know what we can improve on this question."
            : "Please share any additional notes about your rating.";
        toast.error(prompt);
        return;
      }
    }

    setSubmitting(true);

    try {
      const ratingData = {
        customerId: user.uid,
        configId: config.id,
        configName: config.name,
        responses: config.questions.map((q) => {
          const answer = responses[q.id] || null;
          const comment = responses[`${q.id}_comment`] || null;
          return {
            questionId: q.id,
            questionText: q.text,
            questionType: q.type,
            answer,
            comment,
          };
        }),
        submittedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "customerRatings", crypto.randomUUID()), ratingData);

      toast.success("Thank you for your feedback!");
      handleClose();
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: (typeof config.questions)[0]) => {
    const value = responses[question.id];

    switch (question.type) {
      case "rating":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() =>
                    setResponses({ ...responses, [question.id]: star })
                  }
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      value >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {/* follow-up comment based on rating */}
            {value !== undefined && (
              <Textarea
                value={responses[`${question.id}_comment`] || ""}
                onChange={(e) =>
                  setResponses({
                    ...responses,
                    [`${question.id}_comment`]: e.target.value,
                  })
                }
                placeholder={
                  value <= 3
                    ? "What do you think we can improve?"
                    : "Can you tell us more?"
                }
                rows={2}
                className="resize-none"
              />
            )}
          </div>
        );
      case "text":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) =>
              setResponses({ ...responses, [question.id]: e.target.value })
            }
            placeholder="Type your answer here..."
            rows={3}
            className="resize-none"
          />
        );

      case "yesno":
        return (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant={value === "yes" ? "default" : "outline"}
              onClick={() =>
                setResponses({ ...responses, [question.id]: "yes" })
              }
              className="flex-1"
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Yes
            </Button>
            <Button
              type="button"
              variant={value === "no" ? "default" : "outline"}
              onClick={() =>
                setResponses({ ...responses, [question.id]: "no" })
              }
              className="flex-1"
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              No
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading || !isVisible || !config) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] animate-in fade-in duration-200" />

      {/* Popup Card */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 md:p-0 animate-in zoom-in-95 duration-300">
        {/* ensure popup doesn't exceed viewport height and width */}
        <div className="w-full max-w-sm bg-card border-2 border-primary/20 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-accent p-4 md:p-6 text-primary-foreground flex-shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">
                  We'd Love Your Feedback!
                </h2>
                <p className="text-xs md:text-sm opacity-90">
                  Help us improve your laundry experience
                </p>
              </div>
              <button
                onClick={handleClose}
                className="flex-shrink-0 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </div>

          {/* Questions */}
          <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1">
            {config.questions.map((question, index) => (
              <div key={question.id} className="space-y-2 md:space-y-3">
                <label className="block">
                  <span className="text-xs md:text-sm font-medium line-clamp-4">
                    {index + 1}. {question.text}
                    {question.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </span>
                </label>
                <div className="text-sm md:text-base">
                  {renderQuestion(question)}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t bg-muted/30 p-4 md:p-6 flex flex-col sm:flex-row items-stretch gap-2 md:gap-3 flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
              className="text-sm md:text-base"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="text-sm md:text-base bg-gradient-to-r from-primary to-accent"
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RatingPopup;
