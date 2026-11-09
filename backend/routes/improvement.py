import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from google import genai

router = APIRouter()

# Load the backend .env file
BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


class ResumeImprovementRequest(BaseModel):
    resume_text: str = Field(min_length=50, max_length=20000)
    job_description: str = Field(min_length=20, max_length=12000)


@router.post("/api/improve-resume")
def improve_resume(request: ResumeImprovementRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured in the backend."
        )

    if not model_name:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_MODEL is missing from the backend .env file."
        )

    prompt = f"""
You are an expert resume writer and career coach.

Improve the following resume for the target job description.

IMPORTANT RULES:
1. Never invent experience, qualifications, projects, achievements,
   certifications, dates, or technical skills.
2. Keep all factual claims based on the supplied resume.
3. Improve grammar, clarity, professionalism, and readability.
4. Use relevant keywords from the job description only when truthful.
5. If important information is missing, suggest what the applicant
   could add rather than inventing it.
6. Return plain text with clear headings.

TARGET JOB DESCRIPTION:
{request.job_description}

ORIGINAL RESUME:
{request.resume_text}

Return these sections:

IMPROVED RESUME
Write the improved resume here.

KEY IMPROVEMENTS
List the most important changes made.

SUGGESTED ADDITIONS
List useful details the applicant could add if they are accurate.

FINAL CHECKLIST
List final checks before applying.
"""

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )

        improved_text = (response.text or "").strip()

        if not improved_text:
            raise HTTPException(
                status_code=502,
                detail="The AI returned an empty response. Please try again."
            )

        return {
            "success": True,
            "improved_resume": improved_text,
            "model": model_name,
        }

    except HTTPException:
        raise

    except Exception as exc:
        print(f"Resume improvement error: {exc}")

        raise HTTPException(
            status_code=502,
            detail=(
                "AI resume improvement failed. Check the backend terminal "
                "for the actual error and verify your Gemini model settings."
            ),
        )