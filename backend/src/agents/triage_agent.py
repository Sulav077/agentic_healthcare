from google import genai
from src.utils.config import GEMINI_API_KEY, MODEL_PRIORITY
import json

client = genai.Client(api_key=GEMINI_API_KEY)

class TriageAgent:
    def __init__(self):
        configured_models = [model.replace("models/", "") for model in MODEL_PRIORITY]
        self.model_candidates = configured_models + [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
            "gemini-flash-latest"
        ]

    def _normalize_specialty(self, specialty):
        normalized = (specialty or "Internal Medicine").strip().lower()
        aliases = {
            "general medicine": "Internal Medicine",
            "internal medicine": "Internal Medicine",
            "general physician": "Internal Medicine",
            "family medicine": "Internal Medicine",
            "primary care": "Internal Medicine"
        }
        return aliases.get(normalized, specialty.title().strip())

    def _call_gemini(self, prompt, schema):
        errors = []
        for model_name in self.model_candidates:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": schema
                    }
                )
                if response.text:
                    return json.loads(response.text)
                errors.append(f"{model_name}: empty response")
            except Exception as e:
                errors.append(f"{model_name}: {e}")

        print("DEBUG: Gemini call failed across models - " + " | ".join(errors))
        return None

    def _start_ai_triage(self, symptoms, city):
        prompt = f"""
You are a clinical triage assistant for India.

Patient city: {city}
Initial symptoms: {symptoms}

Generate a safe preliminary triage and exactly 3 follow-up questions that help assess severity.
Rules:
- Questions must be short, natural, and patient-friendly.
- Include at least one red-flag screening question when symptoms might be serious.
- Keep reasoning to 1 or 2 short sentences.
- Use plain language and avoid technical jargon where possible.
- Do not provide diagnosis certainty.
- Return only JSON matching the schema.
""".strip()

        schema = {
            "type": "object",
            "properties": {
                "urgency": {"type": "string", "enum": ["emergency", "urgent", "normal"]},
                "specialty": {"type": "string"},
                "reasoning": {"type": "string"},
                "follow_up_questions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 3,
                    "maxItems": 3
                }
            },
            "required": ["urgency", "specialty", "reasoning", "follow_up_questions"]
        }

        result = self._call_gemini(prompt, schema)
        if result:
            return {
                "urgency": result.get("urgency", "normal"),
                "specialty": self._normalize_specialty(result.get("specialty", "Internal Medicine")),
                "reasoning": result.get("reasoning", "Initial AI triage completed."),
                "follow_up_questions": result.get("follow_up_questions", [])[:3]
            }

        return {
            "urgency": "normal",
            "specialty": "Internal Medicine",
            "reasoning": "I would like to ask a few quick questions before suggesting the right care.",
            "follow_up_questions": [
                "How long have these symptoms been present?",
                "Are your symptoms getting better, worse, or staying the same?",
                "Do you currently have severe pain, breathing trouble, fainting, or confusion?"
            ]
        }

    def _finalize_ai_triage(self, symptoms, city, follow_up_answers):
        follow_up_text = "\n".join(
            f"Q: {item.get('question', '')}\nA: {item.get('answer', '')}" for item in follow_up_answers
        )

        prompt = f"""
You are a clinical triage assistant for India.

Patient city: {city}
Initial symptoms: {symptoms}
Follow-up responses:
{follow_up_text}

Assess severity and appropriate department.
Rules:
- Use urgency levels: emergency, urgent, normal.
- If emergency, provide immediate-action advice in plain language.
- Keep reasoning concise, patient-friendly, and limited to 1 or 2 short sentences.
- Avoid technical jargon where simpler language is enough.
- Explain the main concern clearly without sounding alarming unless it is an emergency.
- Return only JSON matching the schema.
""".strip()

        schema = {
            "type": "object",
            "properties": {
                "urgency": {"type": "string", "enum": ["emergency", "urgent", "normal"]},
                "specialty": {"type": "string"},
                "reasoning": {"type": "string"},
                "emergency_advice": {"type": "string"}
            },
            "required": ["urgency", "specialty", "reasoning", "emergency_advice"]
        }

        result = self._call_gemini(prompt, schema)
        if result:
            return {
                "urgency": result.get("urgency", "normal"),
                "specialty": self._normalize_specialty(result.get("specialty", "Internal Medicine")),
                "reasoning": result.get("reasoning", "Final AI triage completed."),
                "needs_follow_up": False,
                "emergency_advice": result.get("emergency_advice", "")
            }

        return {
            "urgency": "urgent",
            "specialty": "Internal Medicine",
            "reasoning": "Based on the information shared, an in-person medical review should be arranged soon for safe assessment.",
            "needs_follow_up": False,
            "emergency_advice": "If symptoms become severe, especially trouble breathing, fainting, or confusion, seek emergency care immediately."
        }

    def analyze(self, symptoms, city, follow_up_answers=None):
        if not follow_up_answers:
            initial = self._start_ai_triage(symptoms, city)
            return {
                "urgency": initial["urgency"],
                "specialty": initial["specialty"],
                "reasoning": f"{initial['reasoning']} I would like to ask three quick follow-up questions before suggesting care.",
                "needs_follow_up": True,
                "follow_up_questions": initial["follow_up_questions"],
                "emergency_advice": ""
            }

        return self._finalize_ai_triage(symptoms, city, follow_up_answers)