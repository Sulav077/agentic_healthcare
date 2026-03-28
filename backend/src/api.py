from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from src.agents.triage_agent import TriageAgent
from src.tools.search_engine import DoctorSearchEngine
from src.agents.booking_agent import BookingAgent
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

triage = TriageAgent()
search_engine = DoctorSearchEngine()
booking_agent = BookingAgent()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class SymptomRequest(BaseModel):
    symptoms: str
    city: str
    follow_up_answers: Optional[List[dict]] = None


# In api.py
class BookingRequest(BaseModel):
    patient_name: str
    patient_age: int      
    patient_phone: str
    patient_address: str
    doctor: dict
# --------------------
# Routes
# --------------------

@app.post("/triage")
def triage_route(request: SymptomRequest):

    triage_result = triage.analyze(
        request.symptoms,
        request.city,
        request.follow_up_answers
    )

    if triage_result.get("needs_follow_up"):
        return {
            "status": "follow_up",
            "triage": triage_result,
            "doctors": []
        }

    doctors = search_engine.search(
        triage_result["specialty"],
        request.city,
        triage_result["urgency"]
    )

    return {
        "status": "final",
        "triage": triage_result,
        "doctors": doctors
    }


@app.post("/book")
def book_route(request: BookingRequest):
    # Pass the whole request object or a dictionary of patient info
    confirmation = booking_agent.book(
        patient_info={
            "name": request.patient_name,
            "age": request.patient_age,
            "phone": request.patient_phone,
            "address": request.patient_address
        },
        doctor=request.doctor
    )
    return confirmation