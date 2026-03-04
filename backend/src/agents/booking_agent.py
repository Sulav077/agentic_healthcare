import csv
import os
import uuid
from datetime import datetime

class BookingAgent:
    def __init__(self):
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        self.dir_path = os.path.join(base_path, "data", "processed")
        self.file_path = os.path.join(self.dir_path, "bookings.csv")

        os.makedirs(self.dir_path, exist_ok=True)

        # Header must match the order in the book() function below
        if not os.path.exists(self.file_path):
            with open(self.file_path, mode="w", newline="", encoding="utf-8") as file:
                writer = csv.writer(file)
                writer.writerow([
                    "Patient_UID", "Patient_Name", "Age", "Phone", "Address",
                    "Doctor_UUID", "Doctor_Name", "Hospital", "City", 
                    "Booking_Date", "Appointment_Time", "Status"
                ])

    def book(self, patient_info, doctor):
        p_uid = f"PAT-{str(uuid.uuid4())[:8].upper()}"
        appointment_date = datetime.now().strftime("%Y-%m-%d")
        appointment_time = "Tomorrow 10:00 AM"

        try:
            with open(self.file_path, mode="a", newline="", encoding="utf-8") as file:
                writer = csv.writer(file)
                writer.writerow([
                    p_uid,
                    patient_info["name"],
                    patient_info["age"],
                    patient_info["phone"],
                    patient_info["address"],
                    doctor.get("uuid", "N/A"), # Ensure your CSV uses 'uuid' key
                    doctor.get("name", "Unknown"),
                    doctor.get("hospital", "Unknown"),
                    doctor.get("city", "Unknown"),
                    appointment_date,
                    appointment_time,
                    "confirmed"
                ])

            return {
                "status": "confirmed",
                "patient_uid": p_uid,
                "doctor": doctor.get("name"),
                "date": appointment_date,
                "time": appointment_time
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}