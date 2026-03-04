from google import genai
from src.utils.config import GEMINI_API_KEY
import json

client = genai.Client(api_key=GEMINI_API_KEY)

class TriageAgent:
    def analyze(self, symptoms, city):
        prompt = f"""
        You are a medical triage AI for India. 
        Analyze these symptoms and determine the urgency and required specialty.
        
        Symptoms: {symptoms}
        City: {city}
        """

        try:
            # Note: Using gemini-1.5-flash as it is the most stable for free-tier quotas
            response = client.models.generate_content(
                model="gemini-1.5-flash", 
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": {
                        "type": "object",
                        "properties": {
                            "urgency": {
                                "type": "string",
                                "enum": ["emergency", "urgent", "normal"]
                            },
                            "specialty": {
                                "type": "string",
                                "enum": [
                                    "Cardiology", "Neurology", "Orthopedics",
                                    "ENT", "Oncology", "Dermatology",
                                    "Internal Medicine", "Pediatrics",
                                    "Psychiatry", "Gastroenterology"
                                ]
                            },
                            "reasoning": {
                                "type": "string"
                            }
                        },
                        "required": ["urgency", "specialty", "reasoning"]
                    }
                }
            )

            return response.parsed

        except Exception as e:
            print("--- Gemini API Error ---")
            print(str(e))
            
            # FALLBACK LOGIC: 
            # If the API hits a quota limit (429) or fails, don't crash.
            # Return a "General Medicine" assessment so the user can still see doctors.
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print("Quota reached. Providing fallback response.")
                return {
                    "urgency": "normal",
                    "specialty": "Internal Medicine",
                    "reasoning": "The AI service is currently at capacity. Please consult a General Physician (Internal Medicine) for an initial screening."
                }
            
            # If it's a different error, we still provide a safe default
            return {
                "urgency": "normal",
                "specialty": "Internal Medicine",
                "reasoning": "System is undergoing maintenance. For safety, we recommend starting with Internal Medicine."
            }