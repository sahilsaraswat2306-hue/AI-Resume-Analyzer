
import io
import pymupdf
from docx import Document


def extract_resume_text(filename: str, file_bytes: bytes) -> str:
    extension = filename.lower().rsplit(".", 1)[-1]

    if extension == "pdf":
        text_parts = []

        with pymupdf.open(
            stream=file_bytes,
            filetype="pdf"
        ) as pdf:
            for page in pdf:
                text_parts.append(page.get_text())

        text = "\n".join(text_parts)

    elif extension == "docx":
        document = Document(io.BytesIO(file_bytes))

        parts = [
            paragraph.text
            for paragraph in document.paragraphs
        ]

        for table in document.tables:
            for row in table.rows:
                parts.append(
                    " | ".join(cell.text for cell in row.cells)
                )

        text = "\n".join(parts)

    else:
        raise ValueError(
            "Only PDF and DOCX files are supported."
        )

    text = text.strip()

    if not text:
        raise ValueError(
            "No readable text found. "
            "Scanned PDFs may require OCR."
        )

    if len(text) > 100_000:
        raise ValueError(
            "Resume text is too long to analyze."
        )

    return text
