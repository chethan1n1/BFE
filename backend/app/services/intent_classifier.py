import json
from typing import Dict, Any
from app.config import settings
from app.services.prompt_library import INTENT_CLASSIFICATION_PROMPT
from groq import AsyncGroq

# Initialize Groq client only if key is configured
client = None
if settings.GROQ_API_KEY:
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

async def classify_intent(message: str) -> str:
    if not client:
        return "general_query"
        
    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": INTENT_CLASSIFICATION_PROMPT},
                {"role": "user", "content": f"User Request: {message}"}
            ],
            model=settings.GROQ_MODEL,
            response_format={"type": "json_object"},
            temperature=0.0
        )
        raw_response = chat_completion.choices[0].message.content
        parsed = json.loads(raw_response)
        return parsed.get("intent", "general_query")
    except Exception as e:
        print(f"Error classifying intent: {e}")
        return "general_query"
