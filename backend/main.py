
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from services.resume_parser import extract_resume_text
from services.analyzer import analyze_resume
from services.github_verifier import verify_github_from_resume

from routes.suggestions import router as suggestions_router
from routes.improvement import router as improvement_router


from routes.recruiter_chat import router as recruiter_chat_router


# Create the FastAPI application once
app = FastAPI(
    title="ResumeSyncAI",
    version="1.0.0"
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register existing API routes
app.include_router(suggestions_router)
app.include_router(improvement_router)
app.include_router(recruiter_chat_router)


@app.get("/")
def home():
    return {
        "message": "ResumeSyncAI API is running",
        "docs": "/docs"
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze(
    resume: UploadFile = File(...),
    job_description: str = Form(...)
):
    filename = resume.filename or ""

    # Validate resume format
    if not filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(
            status_code=400,
            detail="Upload a PDF or DOCX resume."
        )

    # Validate job description
    if not job_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Please enter the job description."
        )

    if len(job_description) > 30_000:
        raise HTTPException(
            status_code=400,
            detail="Job description is too long."
        )

    # Read uploaded resume
    file_bytes = await resume.read()

    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Resume file must be 5 MB or smaller."
        )

    try:
        # Extract text from PDF or DOCX
        resume_text = extract_resume_text(
            filename,
            file_bytes
        )

        # Existing ATS score and keyword analysis
        result = analyze_resume(
            resume_text,
            job_description.strip()
        )

        # New feature: verify GitHub repositories found in resume
        # GitHub errors should not prevent ATS results from returning.
        try:
            github_verification = verify_github_from_resume(
                resume_text
            )
        except Exception as github_error:
            print(f"GitHub verification error: {github_error}")

            github_verification = {
                "status": "error",
                "message": (
                    "GitHub verification could not be completed. "
                    "Your resume analysis is still available."
                ),
                "repositories": []
            }

        # Return existing analysis and GitHub results together
        return {
            "filename": filename,
            "resume_characters": len(resume_text),
            "resume_text": resume_text,
            **result,
            "github_verification": github_verification
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        ) from error

    except Exception as error:
        print(f"Resume analysis error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Analysis failed. Please try another resume."
        ) from error
