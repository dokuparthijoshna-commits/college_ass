import json
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase
cred = credentials.Certificate("serviceAccount.json")  # Make sure file name matches
firebase_admin.initialize_app(cred)
db = firestore.client()

# Load your timetable data
with open("timetable.json", "r") as f:
    timetable_data = json.load(f)

# Upload each day as a document in Firestore
for day, classes in timetable_data.items():
    doc_ref = db.collection("timetable").document(day)
    doc_ref.set({"classes": classes})
    print(f"✅ Uploaded {day} timetable successfully.")

print("🎉 All timetables uploaded to Firestore!")
