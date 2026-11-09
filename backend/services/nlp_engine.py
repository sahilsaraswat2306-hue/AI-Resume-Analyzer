
import spacy
import re

nlp = spacy.load("en_core_web_sm")

SKILLS = [
    "python", "java", "javascript", "react",
    "html", "css", "sql", "fastapi",
    "machine learning", "data structures",
    "git", "communication"
]


def process_text(text):
    doc = nlp(text.lower())

    return [
        token.lemma_
        for token in doc
        if not token.is_stop
        and not token.is_punct
        and not token.is_space
        and token.is_alpha
    ]


def extract_skills(text):
    text = re.sub(r"\s+", " ", text.lower())

    return [
        skill for skill in SKILLS
        if re.search(
            r"(?<!\w)" + re.escape(skill) + r"(?!\w)",
            text
        )
    ]


if __name__ == "__main__":
    sample = """
    I develop web applications using Python and React.
    I also work with SQL and JavaScript.
    """

    print("Processed words:", process_text(sample))
    print("Extracted skills:", extract_skills(sample))
