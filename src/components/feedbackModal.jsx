// components/FeedbackModal.jsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FeedbackModal = ({
  isOpen,
  openaiKey,
  setOpenaiKey,
  onSubmit,
  isLoading,
  feedback,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg">
        {!feedback ? (
          <>
            <DialogHeader>
              <DialogTitle>Enter OpenAI API Key</DialogTitle>
            </DialogHeader>
            <Input
              type="password"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="mt-2"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={onSubmit} disabled={isLoading}>
                {isLoading ? "Generating..." : "Generate Feedback"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Feedback Summary</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto border rounded p-3 text-sm whitespace-pre-wrap text-gray-200">
              {feedback}
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={onClose}>Okay</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
