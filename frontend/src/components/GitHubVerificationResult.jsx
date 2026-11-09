import "./GitHubVerificationResult.css";
import {
  Github,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  FileSearch,
} from "lucide-react";

function GitHubVerificationResult({ data }) {
  if (!data) return null;

  return (
    <section className="github-verification-card">
      <div className="github-verification-heading">
        <div className="github-icon">
          <Github size={24} />
        </div>
        <div>
          <h2>GitHub Project Verification</h2>
          <p>
            Public repository evidence based on links found in your resume.
          </p>
        </div>
      </div>

      {data.status === "no_repository_found" && (
        <div className="github-notice">
          <AlertTriangle size={20} />
          <div>
            <strong>No GitHub repository found</strong>
            <p>
              Add a public repository URL to your resume and upload it again.
              Your ATS analysis has still been completed.
            </p>
          </div>
        </div>
      )}

      {data.repositories?.map((repo, index) => (
        <div className="github-repository" key={repo.url || index}>
          <div className="github-repository-top">
            <div>
              <h3>{repo.name || repo.url}</h3>
              {repo.description && <p>{repo.description}</p>}
            </div>

            {repo.url && (
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                aria-label="Open GitHub repository"
              >
                <ExternalLink size={18} />
              </a>
            )}
          </div>

          {repo.status === "error" || repo.status === "unavailable" ? (
            <div className="github-notice">
              <AlertTriangle size={19} />
              <span>{repo.message}</span>
            </div>
          ) : (
            <>
              <div className="github-status">
                {repo.status === "evidence_found" ? (
                  <CheckCircle2 size={19} />
                ) : (
                  <AlertTriangle size={19} />
                )}
                <strong>
                  {repo.status === "evidence_found"
                    ? "Technology evidence found"
                    : "Insufficient technology evidence"}
                </strong>
              </div>

              <h4>Technologies with evidence</h4>
              {repo.matched_technologies?.length ? (
                <div className="github-tags">
                  {repo.matched_technologies.map((tech) => (
                    <span className="github-tag matched" key={tech}>
                      {tech}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="github-empty">
                  No matching technology evidence was found in the inspected
                  file paths.
                </p>
              )}

              {repo.technologies_needing_review?.length > 0 && (
                <>
                  <h4>Technologies needing review</h4>
                  <div className="github-tags">
                    {repo.technologies_needing_review.map((tech) => (
                      <span className="github-tag review" key={tech}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <div className="github-files">
                <FileSearch size={17} />
                <span>
                  {repo.files_inspected?.length || 0} file paths inspected
                </span>
              </div>

              {repo.warnings?.map((warning) => (
                <p className="github-warning" key={warning}>
                  {warning}
                </p>
              ))}
            </>
          )}
        </div>
      ))}

      <p className="github-disclaimer">
        This check is a heuristic, not proof of authorship, project quality,
        or functionality. Private repositories cannot be inspected without
        authorized access.
      </p>
    </section>
  );
}

export default GitHubVerificationResult;
