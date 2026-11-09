
import os
import time
import io
from pathlib import Path


import pymupdf
from dotenv import load_dotenv
from docx import Document
from fastapi import APIRouter, HTTPException, File, Form, UploadFile
from google import genai

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

router = APIRouter()


def extract_resume_text(filename: str, file_bytes: bytes) -> str:
    extension = filename.lower().rsplit(".", 1)[-1]

    if extension == "pdf":
        with pymupdf.open(stream=file_bytes, filetype="pdf") as pdf:
            text = "\n".join(page.get_text() for page in pdf)
    elif extension == "docx":
        document = Document(io.BytesIO(file_bytes))
        parts = [p.text for p in document.paragraphs]

        for table in document.tables:
            for row in table.rows:
                parts.append(" | ".join(cell.text for cell in row.cells))

        text = "\n".join(parts)
    else:
        raise HTTPException(
            status_code=400,
            detail="Upload a PDF or DOCX resume."
        )

    text = text.strip()

    if len(text) < 50:
        raise HTTPException(
            status_code=400,
            detail="Resume text is too short or unreadable."
        )

    if len(text) > 20000:
        raise HTTPException(
            status_code=400,
            detail="Resume text must be 20,000 characters or fewer."
        )

    return text


@router.post("/api/improvement-suggestions")
async def improvement_suggestions(
    job_description: str = Form(...),
    resume_text: str = Form(""),
    file: UploadFile | None = File(None),
):
    job_description = job_description.strip()
    resume_text = resume_text.strip()

    if len(job_description) < 20:
        raise HTTPException(
            status_code=400,
            detail="Please enter a job description of at least 20 characters."
        )

    if len(job_description) > 12000:
        raise HTTPException(
            status_code=400,
            detail="Job description must be 12,000 characters or fewer."
        )

    if file and file.filename:
        if not file.filename.lower().endswith((".pdf", ".docx")):
            raise HTTPException(
                status_code=400,
                detail="Upload a PDF or DOCX resume."
            )

        file_bytes = await file.read()

        if len(file_bytes) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="Resume file must be 5 MB or smaller."
            )

        resume_text = extract_resume_text(file.filename, file_bytes)

    if len(resume_text) < 50:
        raise HTTPException(
            status_code=400,
            detail="Upload a resume or paste at least 50 characters of resume text."
        )

    if len(resume_text) > 20000:
        raise HTTPException(
            status_code=400,
            detail="Resume text must be 20,000 characters or fewer."
        )

    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured in backend/.env."
        )

    prompt = f"""
You are an expert resume reviewer and career coach.

Compare the resume with the job description.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

Provide practical, specific improvement suggestions.

Cover these areas:
1. Professional summary
2. Relevant skills and missing keywords
3. Work experience or project bullet points
4. Measurable achievements
5. Education and relevant certifications
6. Formatting and readability
7. Top five actions the candidate should take first

Rules:
- Never invent experience, skills, qualifications, or achievements.
- Distinguish missing information from confirmed weaknesses.
- Suggest metrics only when the candidate can verify them.
- Give examples of stronger wording where useful.
- Keep advice relevant to the supplied job description.
- Use clear headings and bullet points.
"""

   
    try:
        client = genai.Client(api_key=api_key)

        response = None

        for attempt in range(3):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                break

            except Exception as exc:
                error_message = str(exc)
                temporary_error = any(
                    code in error_message
                    for code in (
                        "503",
                        "UNAVAILABLE",
                        "429",
                        "RESOURCE_EXHAUSTED",
                    )
                )

                if not temporary_error or attempt == 2:
                    raise

                print(
                    f"Temporary Gemini error. "
                    f"Retrying ({attempt + 1}/2)..."
                )
                time.sleep(2 * (attempt + 1))

        suggestions = response.text if response else None

        if not suggestions:
            raise ValueError("The AI returned an empty response.")

        return {
            "success": True,
            "suggestions": suggestions,
            "model": model_name,
        }

    except Exception as exc:
        print("Improvement suggestions error:", repr(exc))

        raise HTTPException(
            status_code=502,
            detail=(
                "Gemini is temporarily unavailable or the request failed. "
                "Please try again later."
            ),
        ) from exc
