import Vapi from "@vapi-ai/web";

let vapiInstance = null;
export const initVapi = (
  publicKey,
  { onSpeechStart, onSpeechEnd, onTranscript } = {}
) => {
  if (!publicKey) {
    console.error("Vapi public key is required");
    return;
  }
  if (!vapiInstance) {
    vapiInstance = new Vapi(publicKey);
  }

  // Call lifecycle events
  vapiInstance.on("call-start", () => {
    console.log("Vapi call started");
  });

  vapiInstance.on("call-end", () => {
    console.log("Vapi call ended");
  });

  // Real-time speech events for UI updates
  vapiInstance.on("speech-start", (event) => {
    const speaker = event?.speaker || "unknown";
    console.log("Speech started", speaker);
    if (onSpeechStart) onSpeechStart(speaker);
  });

  vapiInstance.on("speech-end", (event) => {
    const speaker = event?.speaker || "unknown";
    console.log("Speech ended", speaker);
    if (onSpeechEnd) onSpeechEnd(speaker);
  });

  // Real-time transcript updates
  vapiInstance.on("transcript", (event) => {
    const speaker = event?.speaker || "unknown";
    const transcript = event?.transcript || "";
    console.log("Live transcript:", speaker, transcript);
    if (onTranscript) onTranscript(speaker, transcript);
  });

  // Message events (for completed transcripts)
  vapiInstance.on("message", (event) => {
    console.log("Message event:", event);

    // Handle different message types
    if (event?.type === "transcript" && event?.transcript) {
      const speaker = event.role || "unknown";
      const text = event.transcript || "";
      if (onTranscript) onTranscript(speaker, text);
    }
  });

  // Error handling
  vapiInstance.on("error", (err) => {
    console.error("Vapi error:", err);
  });

  // Connection status events
  vapiInstance.on("call-connecting", () => {
    console.log("Vapi call connecting...");
  });

  vapiInstance.on("call-connected", () => {
    console.log("Vapi call connected");
  });

  return vapiInstance;
};

// Usage in your startVapiCall function:
export const startVapiCall = async (job) => {
  const improvedSystemPrompt = `You are a professional AI technical interviewer conducting an interview for ${job.company.name}.
  
  ROLE & CONTEXT:
  - Position: ${job.title}
  - Company: ${job.company.name}
  - Job Requirements: ${job.requirements}
  - Job Description: ${job.description}
  
  INTERVIEW STRUCTURE (EXACTLY 10 QUESTIONS):
  1. Always start with: "Hello! I'm your AI interviewer for the ${job.title} position at ${job.company.name}. Let's begin with Question 1."
  2. Clearly announce each question number: "Question 1:", "Question 2:", etc.
  3. Ask one question at a time and wait for complete response
  4. After each answer, give brief feedback (2-3 sentences max) before next question
  5. End with: "That concludes our interview. Thank you for your time!"
  
  QUESTION CATEGORIES (mix these across 10 questions):
  - Technical Fundamentals (2-3 questions)
  - Problem-solving scenarios (2-3 questions) 
  - Best practices and methodologies (2 questions)
  - System design or architecture (1-2 questions)
  - Practical application and experience (1-2 questions)
  
  COMMUNICATION STYLE:
  - Professional yet conversational tone
  - Encouraging and supportive
  - Keep questions concise and clear
  - Feedback should be constructive, not evaluative
  - Speak at a natural pace for voice interaction
  
  IMPORTANT RULES:
  - NEVER ask more than 10 questions total
  - ALWAYS announce question numbers clearly
  - Keep responses under 30 seconds when speaking
  - If candidate asks for clarification, provide it briefly
  - Stay focused on technical aspects relevant to the job
  - Do not provide final scores or hiring recommendations
  
  RESPONSE FORMAT:
  - Question: Clear, specific, relevant to job requirements
  - Feedback: "Thank you for that answer. [Brief positive comment]. Let's move to Question X."
  - Final: "That completes all 10 questions. Thank you for participating in this technical interview!"
  
  Begin the interview now with your greeting and Question 1.`;
  if (!vapiInstance) {
    throw new Error("Vapi not initialized. Call initVapi() first.");
  }

  try {
    await vapiInstance.start({
      model: {
        provider: "openai",
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: improvedSystemPrompt,
          },
        ],
        temperature: 0.7,
      },
      voice: {
        provider: "11labs",
        voiceId: "burt",
      },
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en-US",
      },
    });
  } catch (error) {
    console.error("Failed to start Vapi call:", error);
    throw error;
  }
};
export const stopVapiCall = () => {
  if (vapiInstance) {
    try {
      vapiInstance.stop();
      console.log("Vapi call stopped");
    } catch (error) {
      console.error("Error stopping Vapi call:", error);
    }
  }
};

export const getVapiInstance = () => vapiInstance;
