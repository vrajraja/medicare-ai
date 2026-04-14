import os
import asyncio
from typing import List, Dict, Optional
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai

load_dotenv()

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
API_KEY = os.getenv("API_KEY")

if not GEMINI_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

client = genai.Client(api_key=GEMINI_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://vercel.com/vrajrajas-projects/medicare-ai-jgzz/E5rNpHmziLSJ8QjFr31K6mLrgG9g"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "Medical AI backend running"}


class Question(BaseModel):
    message: str
    history: List[Dict] = []
    image: Optional[str] = None
    profile: Optional[Dict] = {}   # 🔥 NEW


@app.post("/ask")
async def ask_question(
    data: Question,
    request: Request,
    x_api_key: str = Header(None)
):

    # ✅ Basic security
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")
    print("EXPECTED API_KEY:", API_KEY)
    print("RECEIVED x_api_key:", x_api_key)
    try:

        if not data.message.strip() and not data.image:
            return {"reply": "Please ask a medical question or upload an image.", "title": "Empty Chat"}

        conversation_history = ""

        for msg in data.history[-10:]:
            role = "User" if msg["type"] == "user" else "Assistant"
            conversation_history += f"{role}: {msg['text'][:200]}\n"

        # 🔥 PROFILE DATA
        profile_text = ""
        if data.profile:
            profile_text = f"""
        User Health Profile:
        Weight: {data.profile.get("weight")}
        Height: {data.profile.get("height")}
        Gender: {data.profile.get("gender")}
        Diseases: {data.profile.get("diseases")}
        Medications: {data.profile.get("medications")}
        """
                
        # 🔥 UPDATED PROMPT (only addition: title generation)


        prompt = f"""
You are a STRICT medical assistant AI.{profile_text}

You ONLY answer medical related questions.

If the question is not medical reply EXACTLY:
"I am a medical assistant and can only answer medical questions."

If the user uploads an image, analyze the image medically.

Conversation history:
{conversation_history}

Follow this format STRICTLY when possible:

Risk level:
Cause:
What to do:
What not to do:
Visit doctor suggestion:

If not possible, give a normal medical answer.

Ask a counter question if needed.

Respond in the SAME language as the user.
Give risk level as low medium high emergency or undetermined.

Also generate a SHORT chat title (max 5 words) based on the user's question.

Return your response in this EXACT format:

TITLE: <short title>
REPLY:
<your full medical answer>

User message:
{data.message}
"""

        contents = [{"text": prompt}]

        # ✅ Safe image handling (unchanged)
        if data.image and "," in data.image:
            try:
                header, image_data = data.image.split(",")
                mime_type = header.split(":")[1].split(";")[0]

                contents.append({
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": image_data
                    }
                })
            except:
                pass

        # ✅ Async call (unchanged)
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=contents
        )

        if hasattr(response, "text") and response.text:
            raw_text = response.text
        elif response.candidates:
            raw_text = response.candidates[0].content.parts[0].text
        else:
            raw_text = "Sorry, I could not generate a response."

        # 🔥 SAFE PARSING (new)
        title = "New Chat"
        reply = raw_text

        try:
            if "TITLE:" in raw_text and "REPLY:" in raw_text:
                title_part = raw_text.split("TITLE:")[1].split("REPLY:")[0].strip()
                reply_part = raw_text.split("REPLY:")[1].strip()

                if title_part:
                    title = title_part[:50]  # safety limit

                if reply_part:
                    reply = reply_part
        except:
            pass

        return {
            "reply": reply,
            "title": title
        }

    except Exception as e:
        return {"error": str(e)}


print("SERVER START")