import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Agent from "@/components/agent";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/clerk-react";
import { initVapi, stopVapiCall, startVapiCall } from "../lib/vapi";
import { useLocation } from "react-router-dom";
import FeedbackModal from "@/components/feedbackModal";

const isMostlyIncluded = (prevText, currentText, threshold = 0.8) => {
  const prevWords = prevText.split(/\s+/);
  const currentWords = currentText.split(/\s+/);

  if (prevWords.length === 0) return false;

  const matchCount = prevWords.filter((word) =>
    currentWords.includes(word)
  ).length;

  const matchRatio = matchCount / prevWords.length;

  return matchRatio >= threshold;
};
const InterviewPage = () => {
  const VAPI_PUBLIC_KEY =
    import.meta.env.VITE_VAPI_PUBLIC_KEY || "YOUR_VAPI_PUBLIC_KEY";
  const { user } = useUser();
  const { id } = useParams();
  const navigate = useNavigate();
  const [initializing, setInitializing] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const location = useLocation();
  const { job } = location.state || {};
  const initializeVapi = () => {
    return initVapi(VAPI_PUBLIC_KEY, {
      onSpeechStart: (speaker) => {
        if (speaker === "agent") setIsInterviewerSpeaking(true);
        else if (speaker === "user") setIsUserSpeaking(true);
      },
      onSpeechEnd: (speaker) => {
        if (speaker === "agent") {
          setIsInterviewerSpeaking(false);
          setConversation([]);
        } else if (speaker === "user") {
          setIsUserSpeaking(false);
          setConversation([]);
        }
      },
      onTranscript: (speaker, text) => {
        setConversation((prev) => {
          const last = prev[prev.length - 1];

          // Only deduplicate for the same speaker
          if (last?.speaker === speaker) {
            // If current text includes previous as a prefix, it's an update
            if (isMostlyIncluded(last.text, text, 0.7)) {
              // Most content matches, replace
              return [...prev.slice(0, -1), { speaker, text }];
            }

            // If it's exactly the same, also ignore
            if (last.text === text) {
              return prev;
            }
          }

          return [...prev, { speaker, text }];
        });
      },
    });
  };

  useEffect(() => {
    (async () => {
      if (!VAPI_PUBLIC_KEY || VAPI_PUBLIC_KEY === "YOUR_VAPI_PUBLIC_KEY") {
        setError("Vapi public key not configured");
        setInitializing(false);
        return;
      }

      try {
        setInitializing(true); // Start loading screen

        await navigator.mediaDevices.getUserMedia({ audio: true });
        initializeVapi();
        await startVapiCall(job);
      } catch (err) {
        console.error("Interview start error:", err);

        if (err.name === "NotAllowedError") {
          setError(
            "Microphone permission denied. Please allow microphone access and try again."
          );
        } else if (err.name === "NotFoundError") {
          setError(
            "No microphone found. Please connect a microphone and try again."
          );
        } else if (err.message?.includes("not initialized")) {
          setError(
            "Voice service not initialized. Please refresh the page and try again."
          );
        } else {
          setError("Unable to start interview. Please try again.");
        }
      } finally {
        setInitializing(false); // End loading screen
      }
    })();
  }, [VAPI_PUBLIC_KEY]);

  const handleEndInterview = () => {
    // TODO: Show an input field to recive openai key for generating feedback
    stopVapiCall();
    setShowModal(true); //open popup for openai key
    // TODO: Generate summary and feedback. show the feedback in a modal popup in md format. Create a okay button in the popup onclick of that it will redirect to the job page.
  };

  // Improved system prompt for better interview feedback
  const getSystemPrompt = (jobTitle, jobDescription) => `
You are an expert interview evaluator analyzing a technical interview conversation. 

**Job Context:**
- Position: ${jobTitle || "Software Developer"}
- Requirements: ${jobDescription || "General software development role"}

**Your Task:**
Provide comprehensive feedback on the candidate's interview performance in well-structured markdown format.

**Evaluation Criteria:**
1. **Technical Knowledge** - Accuracy and depth of technical responses
2. **Communication Skills** - Clarity, articulation, and explanation ability
3. **Problem-Solving Approach** - Logical thinking and methodology
4. **Behavioral Responses** - Professionalism and cultural fit indicators
5. **Question Handling** - How well they addressed interviewer questions

**Feedback Structure:**
Use this exact markdown format:

# Interview Feedback Report

## Overall Performance Score: [X/10]

## Strengths
- [List 3-5 key strengths with specific examples]

## Areas for Improvement
- [List 3-5 areas needing work with specific examples]

## Technical Assessment
- [Evaluate technical knowledge relevant to the role]

## Communication & Soft Skills
- [Assess communication effectiveness]

## Recommendations
- [Provide 3-4 specific, actionable improvement suggestions]

## Decision Recommendation
**[HIRE/MAYBE/NO HIRE]** - [Brief justification]

**Requirements:**
- Be specific and cite actual conversation examples
- Provide constructive, actionable feedback
- Consider the job requirements in your evaluation
- Keep feedback professional and balanced
- Limit response to 500-600 words maximum
`;

  const handleSubmitKey = async () => {
    if (!openaiKey) return alert("Please provide OpenAI key");

    setIsLoading(true);
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4", // Consider upgrading to GPT-4 for better analysis
            messages: [
              {
                role: "system",
                content: getSystemPrompt(job?.title, job?.description),
              },
              {
                role: "user",
                content: `Please analyze this interview conversation and provide feedback:

${conversation
  .map(
    (msg) =>
      `**${msg.speaker === "user" ? "Candidate" : "Interviewer"}:** ${msg.text}`
  )
  .join("\n\n")}

Total conversation length: ${conversation.length} exchanges`,
              },
            ],
            temperature: 0.7, // Add some creativity while maintaining consistency
            max_tokens: 1500, // Ensure adequate response length
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const summary =
        data.choices?.[0]?.message?.content || "No feedback received.";
      setFeedback(summary);
    } catch (err) {
      console.error("Error generating feedback:", err);
      let errorMessage = "Failed to generate feedback.";

      if (err.message.includes("401")) {
        errorMessage =
          "Invalid OpenAI API key. Please check your key and try again.";
      } else if (err.message.includes("429")) {
        errorMessage = "API rate limit exceeded. Please try again later.";
      } else if (err.message.includes("403")) {
        errorMessage =
          "API access denied. Please check your OpenAI account status.";
      }

      setFeedback(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    navigate(`/job/${id}`);
  };
  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="flex items-center gap-3">
          <svg
            className="animate-spin h-8 w-8 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
          <span className="text-xl">
            Initializing Interview... Please wait.
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-xl">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-12">
      <div className="w-full max-w-6xl flex justify-center">
        <Agent
          name="AI Interviewer"
          avatarSrc="https://cdn2.futurepedia.io/2024-11-26T18-51-51.356Z-MtXWJEI4O08DkXhcFo8z7VXOEe00XPWLb.webp?w=1920"
          isSpeaking={isInterviewerSpeaking}
          text={
            conversation
              .slice()
              .reverse()
              .find((msg) => msg.speaker === "agent")?.text || ""
          }
        />
        <Agent
          name={user?.fullName}
          avatarSrc={user?.imageUrl}
          isSpeaking={isUserSpeaking}
          text={
            conversation
              .slice()
              .reverse()
              .find((msg) => msg.speaker === "user")?.text || ""
          }
        />
      </div>

      <div
        className={`mb-4 p-3 rounded-lg ${
          conversation[conversation.length - 1]?.speaker === "user"
            ? "bg-blue-600 text-white"
            : "bg-green-600 text-white"
        }`}
      >
        <strong>
          {conversation[conversation.length - 1]?.speaker === "user"
            ? "Candidate"
            : "Interviewer"}
          :
        </strong>
        {conversation[conversation.length - 1]?.text}
      </div>

      <Button onClick={handleEndInterview} className="mt-6">
        End Interview
      </Button>

      <FeedbackModal
        isOpen={showModal}
        openaiKey={openaiKey}
        setOpenaiKey={setOpenaiKey}
        onSubmit={handleSubmitKey}
        isLoading={isLoading}
        feedback={feedback}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default InterviewPage;
