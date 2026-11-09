
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY", "").strip()
)

response = client.models.generate_content(
    model=os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
    contents="Reply with the single word OK."
)

print("SUCCESS: Gemini API is working!")
print("Response:", response.text)
