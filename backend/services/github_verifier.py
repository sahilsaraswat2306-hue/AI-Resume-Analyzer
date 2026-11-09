
import json
import re
import urllib.error
import urllib.parse
import urllib.request


GITHUB_URL_PATTERN = re.compile(
    r"https?://(?:www\.)?github\.com/"
    r"[A-Za-z0-9-]+/[A-Za-z0-9_.-]+",
    re.IGNORECASE,
)

TECHNOLOGIES = {
    "react": ["react", "react-dom"],
    "vite": ["vite"],
    "fastapi": ["fastapi"],
    "python": ["python"],
    "javascript": ["javascript"],
    "typescript": ["typescript"],
    "java": ["java"],
    "spring boot": ["spring-boot", "spring boot"],
    "node.js": ["node.js", "nodejs"],
    "express": ["express"],
    "mongodb": ["mongodb", "mongoose"],
    "mysql": ["mysql"],
    "postgresql": ["postgresql", "psycopg"],
    "gemini api": ["google-genai", "generativeai", "gemini"],
    "spacy": ["spacy"],
    "pytorch": ["torch", "pytorch"],
    "tensorflow": ["tensorflow"],
}

IGNORED_DIRS = {
    "node_modules", "venv", ".venv", "dist", "build",
    ".git", "__pycache__", "vendor",
}

SOURCE_EXTENSIONS = (
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java",
    ".html", ".css", ".json", ".toml", ".txt", ".md",
)


def github_get(url):
    """Fetch a public GitHub API URL with a timeout."""
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "ResumeSyncAI",
        },
    )

    with urllib.request.urlopen(request, timeout=8) as response:
        return json.loads(response.read(1_000_000).decode("utf-8"))


def normalize_github_url(url):
    """Remove trailing slashes and common .git suffix."""
    return url.rstrip("/").removesuffix(".git")


def extract_repository_urls(resume_text):
    """Find repository links written in the resume."""
    found = []
    seen = set()

    for match in GITHUB_URL_PATTERN.finditer(resume_text or ""):
        url = normalize_github_url(match.group(0))
        parts = urllib.parse.urlparse(url).path.strip("/").split("/")

        if len(parts) < 2:
            continue

        owner, repo = parts[0], parts[1]

        # Ignore links that are not normal repository names.
        if repo.lower() in {
            "settings", "organizations", "features", "marketplace",
            "topics", "login", "signup", "explore",
        }:
            continue

        key = f"{owner.lower()}/{repo.lower()}"
        if key not in seen:
            seen.add(key)
            found.append({
                "url": f"https://github.com/{owner}/{repo}",
                "owner": owner,
                "repo": repo,
            })

    return found[:3]


def verify_repository(repository, resume_text):
    owner = repository["owner"]
    repo = repository["repo"]
    api_base = (
        "https://api.github.com/repos/"
        f"{urllib.parse.quote(owner, safe='')}/"
        f"{urllib.parse.quote(repo, safe='')}"
    )

    try:
        metadata = github_get(api_base)

        if metadata.get("private"):
            return {
                "url": repository["url"],
                "status": "unavailable",
                "message": "This repository is private or inaccessible.",
            }

        default_branch = metadata.get("default_branch", "main")
        tree_url = (
            f"{api_base}/git/trees/"
            f"{urllib.parse.quote(default_branch, safe='')}"
            "?recursive=1"
        )
        tree_data = github_get(tree_url)

        file_paths = [
            item["path"]
            for item in tree_data.get("tree", [])
            if item.get("type") == "blob"
            and item.get("size", 0) <= 100_000
            and item["path"].lower().endswith(SOURCE_EXTENSIONS)
            and not any(
                part.lower() in IGNORED_DIRS
                for part in item["path"].split("/")
            )
        ]

        # Inspect a bounded selection of files, including README/config files.
        priority = sorted(
            file_paths,
            key=lambda path: (
                0 if "readme" in path.lower() else
                1 if path.lower().endswith(
                    ("package.json", "requirements.txt", "pyproject.toml")
                ) else 2,
                path,
            ),
        )[:20]

        evidence_text = " ".join(priority).lower()

        # Check the resume for technology claims and look for evidence
        # in repository file paths. This is a heuristic, not proof.
        claimed_technologies = [
            tech for tech, aliases in TECHNOLOGIES.items()
            if any(
                re.search(r"(?<!\w)" + re.escape(alias) + r"(?!\w)",
                          resume_text, re.IGNORECASE)
                for alias in [tech]
            )
        ]

        matched = []
        review = []

        for tech in claimed_technologies:
            aliases = TECHNOLOGIES[tech]
            if any(alias.lower() in evidence_text for alias in aliases):
                matched.append(tech)
            else:
                review.append(tech)

        return {
            "url": repository["url"],
            "name": metadata.get("full_name", f"{owner}/{repo}"),
            "description": metadata.get("description"),
            "default_branch": default_branch,
            "stars": metadata.get("stargazers_count", 0),
            "status": "evidence_found" if matched else "insufficient_evidence",
            "matched_technologies": matched,
            "technologies_needing_review": review,
            "files_inspected": priority,
            "warnings": (
                ["GitHub API returned a truncated file tree."]
                if tree_data.get("truncated") else []
            ),
        }

    except urllib.error.HTTPError as error:
        if error.code == 404:
            message = "Repository not found or not publicly accessible."
        elif error.code in (403, 429):
            message = "GitHub rate limit reached. Try again later."
        else:
            message = f"GitHub returned HTTP {error.code}."
        return {
            "url": repository["url"],
            "status": "error",
            "message": message,
        }
    except Exception as error:
        print(f"GitHub verification error for {repository['url']}: {error}")
        return {
            "url": repository["url"],
            "status": "error",
            "message": "Could not check this repository. Check your internet connection and try again.",
        }


def verify_github_from_resume(resume_text):
    """Return GitHub verification results without interrupting ATS analysis."""
    repositories = extract_repository_urls(resume_text)

    if not repositories:
        return {
            "status": "no_repository_found",
            "message": "No GitHub repository URL was detected in the resume.",
            "repositories": [],
        }

    results = [
        verify_repository(repository, resume_text)
        for repository in repositories
    ]

    return {
        "status": "checked",
        "message": (
            "Repository evidence was checked. Results are heuristic "
            "and do not prove project ownership or functionality."
        ),
        "repositories": results,
    }
