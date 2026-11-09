
import { useState } from "react";
import {
  FileText,
  Upload,
  Sparkles,
  Target,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
  Zap,
  RotateCcw,
} from "lucide-react";

import GitHubVerificationResult from "./components/GitHubVerificationResult";
import ImprovementSuggestions from "./components/ImprovementSuggestions";
import RecruiterChatbot from "./components/RecruiterChatbot";

const API_URL = "http://127.0.0.1:8000";

function ScoreCard({ label, score, icon: Icon }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));

  return (
    <div className="score-card">
      <div className="score-icon">
        <Icon size={20} />
      </div>
      <p>{label}</p>
      <div className="score-value">
        {safeScore}<span>/100</span>
      </div>
      <div className="progress">
        <div style={{ width: `${safeScore}%` }} />
      </div>
    </div>
  );
}

function TagList({ items, emptyText, type }) {
  if (!items?.length) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <div className="tags">
      {items.map((item, index) => (
        <span className={`tag ${type || ""}`} key={`${item}-${index}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [githubVerification, setGithubVerification] = useState(null);
  const [resumeText, setResumeText] = useState("");

  function handleFileChange(event) {
    const selected = event.target.files?.[0];

    setError("");
    setResult(null);
    setResumeText("");
    setGithubVerification(null);

    if (!selected) {
      setFile(null);
      return;
    }

    const validType = /\.(pdf|docx)$/i.test(selected.name);

    if (!validType) {
      setFile(null);
      setError("Please select a PDF or DOCX file.");
      event.target.value = "";
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setFile(null);
      setError("Your file must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setFile(selected);
  }

  async function handleAnalyze(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setResumeText("");
    setGithubVerification(null);

    if (!file) {
      setError("Please upload your resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please paste the job description.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("job_description", jobDescription);

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Analysis failed.");
      }

      setGithubVerification(data.github_verification ?? null);
      setResumeText(data.resume_text || "");
      setResult(data);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Make sure FastAPI is running at http://127.0.0.1:8000."
          : err.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFile(null);
    setJobDescription("");
    setResult(null);
    setResumeText("");
    setGithubVerification(null);
    setError("");

    const input = document.getElementById("resume-upload");
    if (input) input.value = "";
  }

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#home">
          <span className="brand-icon">
            <FileText size={22} />
          </span>
          Resume<span>SyncAI</span>
        </a>

        <div className="nav-right">
          <span className="secure-label">
            <ShieldCheck size={16} /> Privacy first
          </span>
          <a href="#analyzer" className="nav-link">
            Analyzer
          </a>
          {result && resumeText && (
            <a href="#recruiter-chatbot" className="nav-link">
              Recruiter Chat
            </a>
          )}
        </div>
      </header>

      <main id="home">
        <section className="hero">
          <div className="eyebrow">
            <Sparkles size={15} /> YOUR NEXT OPPORTUNITY STARTS HERE
          </div>

          <h1>
            Your resume deserves
            <br />
            <span>to stand out.</span>
          </h1>

          <p className="hero-text">
            Discover how well your resume matches a job.
            Get keyword insights and actionable feedback
            to improve your next application.
          </p>

          <div className="hero-points">
            <span><CheckCircle2 size={16} /> Resume insights</span>
            <span><CheckCircle2 size={16} /> Keyword matching</span>
            <span><CheckCircle2 size={16} /> AI suggestions</span>
          </div>
        </section>

        <section id="analyzer" className="workspace">
          <div className="section-heading">
            <div>
              <span className="section-kicker">RESUME WORKSPACE</span>
              <h2>Analyze your resume</h2>
              <p>Upload your file and add the target job description.</p>
            </div>
            <div className="step-badge">
              <Zap size={15} /> Quick analysis
            </div>
          </div>

          <form className="analyzer-grid" onSubmit={handleAnalyze}>
            <div className="panel">
              <div className="panel-title">
                <span className="number">01</span>
                <div>
                  <h3>Upload resume</h3>
                  <p>PDF or DOCX · Maximum 5 MB</p>
                </div>
              </div>

              <label
                className={`upload-area ${file ? "has-file" : ""}`}
                htmlFor="resume-upload"
              >
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                />

                <span className="upload-icon">
                  {file ? <FileText size={28} /> : <Upload size={28} />}
                </span>

                <strong>
                  {file ? file.name : "Choose your resume"}
                </strong>

                <span className="upload-subtext">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB · Ready to analyze`
                    : "Click to browse files on your device"}
                </span>

                {!file && (
                  <span className="browse-button">Browse files</span>
                )}
              </label>

              <div className="privacy-note">
                <ShieldCheck size={17} />
                <span>
                  Your file is processed by your backend.
                  This demo does not save uploaded files to disk.
                </span>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">
                <span className="number">02</span>
                <div>
                  <h3>Job description</h3>
                  <p>Paste the job requirements below</p>
                </div>
              </div>

              <textarea
                className="job-input"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder={"Paste the target job description here...\n\nExample:\nLooking for a software developer with Java, React, SQL, REST APIs and problem-solving skills."}
                maxLength={30000}
                required
              />

              <div className="textarea-footer">
                <span>Include responsibilities and required skills.</span>
                <span>{jobDescription.length}/30000</span>
              </div>
            </div>

            <div className="form-actions">
              <p className="form-hint">
                <ShieldCheck size={15} /> Analysis runs through your backend.
              </p>

              <button
                className="analyze-button"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle className="spin" size={18} />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze resume <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="error-message" role="alert">
              <AlertCircle size={19} /> {error}
            </div>
          )}

          {result && (
            <section className="results">
              <div className="results-heading">
                <div>
                  <span className="section-kicker">ANALYSIS REPORT</span>
                  <h2>Your resume insights</h2>
                  <p>File analyzed: {result.filename}</p>
                </div>

                <button
                  className="reset-button"
                  onClick={resetForm}
                  type="button"
                >
                  <RotateCcw size={16} /> New analysis
                </button>
              </div>

              <div className="score-grid">
                <ScoreCard
                  label="Overall score"
                  score={result.overall_score}
                  icon={Target}
                />
                <ScoreCard
                  label="Keyword match"
                  score={result.keyword_score}
                  icon={Sparkles}
                />
                <ScoreCard
                  label="Resume sections"
                  score={result.section_score}
                  icon={FileText}
                />
              </div>

              <p className="disclaimer">
                These are heuristic scores for guidance, not an official ATS
                rating or a guarantee of interview selection.
              </p>

              <div className="result-grid">
                <div className="result-card">
                  <h3><CheckCircle2 size={19} /> Matched keywords</h3>
                  <TagList
                    items={result.matched_keywords}
                    type="matched"
                    emptyText="No matching keywords found."
                  />
                </div>

                <div className="result-card">
                  <h3><AlertCircle size={19} /> Missing keywords</h3>
                  <TagList
                    items={result.missing_keywords}
                    type="missing"
                    emptyText="No missing keywords detected."
                  />
                  <p className="small-note">
                    Add only keywords that genuinely reflect your skills.
                  </p>
                </div>

                <div className="result-card">
                  <h3><FileText size={19} /> Detected sections</h3>
                  <TagList
                    items={result.found_sections}
                    type="matched"
                    emptyText="No standard sections detected."
                  />
                </div>

                <div className="result-card">
                  <h3><Sparkles size={19} /> Strengths</h3>
                  <ul className="feedback-list">
                    {(result.strengths || []).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="result-card">
                  <h3><Target size={19} /> Improvements</h3>
                  <ul className="feedback-list">
                    {(result.suggestions || []).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="result-card ai-card">
                  <h3><Sparkles size={19} /> AI review</h3>

                  {!result.ai_enabled ? (
                    <p className="muted">
                      AI feedback is unavailable. Check the Gemini API key
                      and model configuration in the backend .env file.
                      Your keyword and section analysis can still work.
                    </p>
                  ) : (
                    <>
                      <span className="ai-status">AI feedback generated</span>
                      <h4>Suggested professional summary</h4>
                      <p>{result.ai_feedback?.summary}</p>

                      <h4>Additional suggestions</h4>
                      <ul className="feedback-list">
                        {(result.ai_feedback?.improvements || []).map(
                          (item, index) => <li key={index}>{item}</li>
                        )}
                      </ul>

                      <h4>Practice interview questions</h4>
                      <ul className="feedback-list">
                        {(result.ai_feedback?.interview_questions || []).map(
                          (item, index) => <li key={index}>{item}</li>
                        )}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {/* GitHub verification results, if returned by the backend */}
              {githubVerification && (
                <GitHubVerificationResult
                  result={githubVerification}
                />
              )}

              {/* Recruiter chatbot: available after successful analysis */}
              {resumeText && (
                <RecruiterChatbot
                  resumeText={resumeText}
                  jobDescription={jobDescription}
                />
              )}
            </section>
          )}
        </section>

        <section id="improvement-suggestions">
          <ImprovementSuggestions />
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-icon">
            <FileText size={18} />
          </span>
          Resume<span>SyncAI</span>
        </a>
        <p>Built to help you prepare for your next opportunity.</p>
        <span>Resume analysis · AI-assisted feedback</span>
      </footer>
    </div>
  );
}
