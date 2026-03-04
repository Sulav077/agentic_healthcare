import pandas as pd
import os
from src.utils.config import DATA_PATH

class DoctorSearchEngine:
    def __init__(self):
        # Check if file exists to avoid crash
        if not os.path.exists(DATA_PATH):
            print(f"CRITICAL ERROR: Doctor database not found at {DATA_PATH}")
            self.df = pd.DataFrame()
        else:
            self.df = pd.read_csv(DATA_PATH)

    def search(self, specialty, city, urgency):
        if self.df.empty:
            return []

        df = self.df.copy()

        # 1. Normalize columns to avoid "KeyError" or comparison misses
        df["specialty"] = df["specialty"].astype(str).str.lower()
        df["city"] = df["city"].astype(str).str.lower()
        df["availability"] = df["availability"].astype(str).str.lower()

        search_specialty = specialty.lower()
        search_city = city.lower()
        search_urgency = urgency.lower()

        # 2. Filter by specialty and city
        filtered = df[
            (df["specialty"].str.contains(search_specialty)) & 
            (df["city"] == search_city)
        ]

        # 3. Emergency logic
        if search_urgency == "emergency":
            filtered = filtered[
                filtered["availability"].isin(["on-call", "immediate"])
            ]

        if filtered.empty:
            return []

        # 4. Sort by rating + experience
        filtered = filtered.sort_values(
            by=["rating", "experience_years"],
            ascending=[False, False]
        )

        # 5. Return top 3 as a list of dictionaries
        return filtered.head(3).to_dict(orient="records")