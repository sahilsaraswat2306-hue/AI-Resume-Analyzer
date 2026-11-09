
import { useState } from "react";
import {
  Bot,
  Send,
  User,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import "./RecruiterChatbot.css";

const API_URL = "http://127.0.0.1:8000";

const suggestions = [
  "Am I suitable for this job?",
  "What skills should I improve?",
  "Ask me an interview question.",
  "How should I explain my projects?",
];

// Clean AI formatting while preserving useful technical terms.
function cleanChatResponse(text = "") {
  return String(text)
    // Remove Markdown heading markers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold and italic Markdown markers
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1")
    // Remove inline code formatting but preserve its content
    .replace(/`([^`]+)`/g, "$1")
    // Remove @ only when it is not part of an email address
    .replace(/(?<![a-zA-Z0-9._%+-])@(?![a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, "")
    // Remove decorative # symbols, preserving C# and similar terms
    .replace(/(?<![A-Za-z0-9])#(?![A-Za-z0-9])/g, "")
    // Remove remaining asterisks used as decoration
    .replace(/\*/g, "")
    // Remove Markdown horizontal separators
    .replace(/^\s*[-_]{3,}\s*$/gm, "")
    // Clean extra spaces and excessive blank lines
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function RecruiterChatbot({
  resumeText,
  jobDescription,
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your ResumeSyncAI Recruiter Assistant. I've got your resume and job description as context. Ask me about your job fit, skill gaps, projects, or interview preparation.",
    },
  ]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(text = question) {
    const trimmed = text.trim();

    if (!trimmed || loading) return;

    if (!resumeText) {
      setError("Please analyze your resume first.");
      return;
    }

    const userMessage = { role: "user", content: trimmed };
    const previousMessages = messages.slice(1);

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/recruiter-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmed,
          resume_text: resumeText,
          job_description: jobDescription || "",
          history: previousMessages.slice(-8),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "The chatbot could not answer. Please try again."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer || "Sorry, I couldn't generate an answer.",
        },
      ]);
    } catch (err) {
      setError(
        err.message || "Unable to connect to the recruiter chatbot."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([
      {
        role: "assistant",
        content:
          "Chat restarted! Ask me anything about your resume or target job.",
      },
    ]);
    setError("");
  }

  return (
    <section className="recruiter-chat-card" id="recruiter-chatbot">
      <div className="recruiter-chat-header">
        <div className="recruiter-chat-title">
          <div className="recruiter-chat-icon">
            <Bot size={24} />
          </div>
          <div>
            <h2>Recruiter Assistant</h2>
            <p>Personalized resume and interview guidance</p>
          </div>
        </div>

        <button
          type="button"
          className="recruiter-reset-button"
          onClick={resetChat}
          disabled={loading}
          title="Restart conversation"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      <div className="recruiter-chat-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`recruiter-message ${
              message.role === "user" ? "user-message" : "assistant-message"
            }`}
          >
            <div className="recruiter-message-avatar">
              {message.role === "user" ? (
                <User size={17} />
              ) : (
                <Bot size={17} />
              )}
            </div>

            <div className="recruiter-message-content">
              <span className="recruiter-message-label">
                {message.role === "user" ? "You" : "Recruiter Assistant"}
              </span>

              <p>
                {message.role === "assistant"
                  ? cleanChatResponse(message.content)
                  : message.content}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="recruiter-loading">
            <LoaderCircle size={18} className="recruiter-spinner" />
            Generating your answer...
          </div>
        )}
      </div>

      {messages.length === 1 && (
        <div className="recruiter-suggestions">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => sendMessage(item)}
              disabled={loading || !resumeText}
            >
              <MessageCircle size={14} />
              {item}
            </button>
          ))}
        </div>
      )}

      {error && <p className="recruiter-chat-error">{error}</p>}

      <form
        className="recruiter-chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about your resume or target job..."
          maxLength={2000}
          disabled={loading || !resumeText}
          aria-label="Your question"
        />

        <button
          type="submit"
          disabled={loading || !question.trim() || !resumeText}
          aria-label="Send message"
        >
          {loading ? (
            <LoaderCircle size={19} className="recruiter-spinner" />
          ) : (
            <Send size={19} />
          )}
          Send
        </button>
      </form>

      <p className="recruiter-chat-disclaimer">
        AI-generated guidance only. Verify important advice before relying on it.
      </p>
    </section>
  );
}
