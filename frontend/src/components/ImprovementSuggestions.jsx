
import { useState } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  Copy,
  LoaderCircle,
} from "lucide-react";
import "./ImprovementSuggestions.css";

const API_URL = "http://127.0.0.1:8000";

// Clean Markdown formatting without unnecessarily removing
// special characters from technical terms.
function cleanSuggestions(text = "") {
  return String(text)
    // Remove Markdown headings
    .replace(/^#{1,6}\s+/gm, "")
    // Convert Markdown bold and italic into plain text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    // Remove inline code formatting
    .replace(/`([^`]+)`/g, "$1")
    // Remove decorative @ symbols, but preserve email addresses
    .replace(
      /(?<![a-zA-Z0-9._%+-])@(?![a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      ""
    )
    // Remove standalone heading/hash symbols, preserving C#
    .replace(/(?<![A-Za-z0-9])#(?![A-Za-z0-9])/g, "")
    // Remove remaining decorative asterisks
    .replace(/\*/g, "")
    // Remove Markdown horizontal separators
    .replace(/^\s*[-_]{3,}\s*$/gm, "")
    // Normalize spacing
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function ImprovementSuggestions() {
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!file && !resumeText.trim()) {
      setError("Please upload a PDF or paste your resume text.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please enter the job description.");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestions("");

    try {
      const formData = new FormData();

      if (file) {
        formData.append("file", file);
      } else {
        formData.append("resume_text", resumeText);
      }

      formData.append("job_description", jobDescription);

      const response = await fetch(
        `${API_URL}/api/improvement-suggestions`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to generate suggestions."
        );
      }

      setSuggestions(
        cleanSuggestions(data.suggestions || "No suggestions returned.")
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend. Check that FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(suggestions);
    } catch {
      setError("Could not copy. Please select and copy the text manually.");
    }
  };

  return (
    <section className="improvement-container">
      <div className="improvement-heading">
        <span className="improvement-icon">
          <Sparkles size={24} />
        </span>

        <div>
          <h2>AI Resume Improvement Suggestions</h2>
          <p>
            Upload your resume and get AI-powered suggestions
            tailored to your target job.
          </p>
        </div>
      </div>

      <div className="improvement-form">
        <label className="improvement-label">Your Resume</label>

        <label className="pdf-upload-box">
          <Upload size={28} />

          <span>
            {file ? file.name : "Click to upload your resume PDF"}
          </span>

          <small>PDF format only · Maximum 5 MB</small>

          <input
            type="file"
            accept=".pdf,application/pdf"
            hidden
            onChange={(event) => {
              const selectedFile = event.target.files?.[0];

              if (!selectedFile) return;

              if (selectedFile.type !== "application/pdf") {
                setError("Please select a PDF file.");
                event.target.value = "";
                return;
              }

              if (selectedFile.size > 5 * 1024 * 1024) {
                setError("PDF must be smaller than 5 MB.");
                event.target.value = "";
                return;
              }

              setFile(selectedFile);
              setResumeText("");
              setError("");
              setSuggestions("");
            }}
          />
        </label>

        {file && (
          <div className="selected-pdf">
            <FileText size={18} />
            <span>{file.name}</span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setSuggestions("");
              }}
            >
              Remove
            </button>
          </div>
        )}

        <div className="input-divider">
          <span>OR paste resume text</span>
        </div>

        <textarea
          className="improvement-textarea"
          placeholder="Paste your resume text here..."
          value={resumeText}
          onChange={(event) => {
            setResumeText(event.target.value);
            if (event.target.value.trim()) setFile(null);
          }}
          rows={6}
          disabled={Boolean(file)}
        />

        <label className="improvement-label">
          Target Job Description
        </label>

        <textarea
          className="improvement-textarea"
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(event) =>
            setJobDescription(event.target.value)
          }
          rows={6}
        />

        {error && (
          <p className="improvement-error">{error}</p>
        )}

        <button
          type="button"
          className="improvement-generate-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <LoaderCircle size={18} className="recruiter-spinner" />
              Analyzing Resume...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate Suggestions
            </>
          )}
        </button>
      </div>

      {suggestions && (
        <div className="suggestions-result">
          <div className="suggestions-result-header">
            <h3>Your Improvement Suggestions</h3>

            <button type="button" onClick={handleCopy}>
              <Copy size={16} />
              Copy
            </button>
          </div>

          <pre>{suggestions}</pre>
        </div>
      )}
    </section>
  );
}
