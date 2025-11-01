// ✅ Import required modules
import express from "express";
import bodyParser from "body-parser";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import cors from "cors";

// ✅ Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Webhook route (Dialogflow fulfillment)
app.post("/webhook", async (req, res) => {
  try {
    const intent = req.body.queryResult.intent.displayName;
    const params = req.body.queryResult.parameters || {};

    console.log(`🧠 Intent Triggered: ${intent}`);
    console.log("📦 Parameters:", params);

    // 🎯 INTENT 1: Get classes for a specific day
    if (intent === "GetTodayClasses") {
      let dateParam = params["date-time"];
      let day;

      // Extract the weekday name (e.g., Monday)
      if (dateParam) {
        const date = new Date(dateParam);
        day = date.toLocaleString("en-US", { weekday: "long" });
      } else {
        day = new Date().toLocaleString("en-US", { weekday: "long" });
      }

      console.log(`📅 Fetching timetable for: ${day}`);

      const docRef = db.collection("timetable").doc(day);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.json({
          fulfillmentText: `No timetable found for ${day}.`,
        });
      }

      const data = docSnap.data();
      const classes = data.classes || data.timetable; // Support both field names

      if (!classes || classes.length === 0) {
        return res.json({
          fulfillmentText: `No classes found for ${day}.`,
        });
      }

      // Format class info nicely
      const formatted = classes
        .map(
          (cls) =>
            `📘 ${cls.course_name} (${cls.start_time}–${cls.end_time}) in ${cls.location}`
        )
        .join("\n");

      return res.json({
        fulfillmentText: `Here are your classes for ${day}:\n${formatted}`,
      });
    }

    // 🎯 INTENT 2: Get next class for today
    if (intent === "GetNextClass") {
      const today = new Date().toLocaleString("en-US", { weekday: "long" });
      const docRef = db.collection("timetable").doc(today);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.json({ fulfillmentText: `No timetable found for ${today}.` });
      }

      const data = docSnap.data();
      const classes = data.classes || data.timetable;
      const now = new Date();

      // Find the next upcoming class
      const next = classes.find((c) => {
        const [h, m] = c.start_time.split(":").map(Number);
        const classTime = new Date();
        classTime.setHours(h, m, 0);
        return classTime > now;
      });

      if (next) {
        return res.json({
          fulfillmentText: `⏰ Your next class is ${next.course_name} in ${next.location} at ${next.start_time}.`,
        });
      } else {
        return res.json({
          fulfillmentText: "🎉 You have no more classes today!",
        });
      }
    }

    // 🎯 INTENT 3: Get class location by course name
    if (intent === "GetClassLocation") {
      const course = params["course_name"];
      if (!course) {
        return res.json({
          fulfillmentText: "Please tell me the course name (e.g., OOPS, DBMS).",
        });
      }

      const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      let found = null;

      // Search across all weekday docs
      for (const day of days) {
        const docSnap = await db.collection("timetable").doc(day).get();
        if (!docSnap.exists) continue;

        const data = docSnap.data();
        const classes = data.classes || data.timetable;

        const match = classes.find(
          (cls) =>
            cls.course_name.toLowerCase() === course.toLowerCase()
        );

        if (match) {
          found = { day, ...match };
          break;
        }
      }

      if (found) {
        return res.json({
          fulfillmentText: `📍 The ${found.course_name} class is on ${found.day} in ${found.location} at ${found.start_time}.`,
        });
      } else {
        return res.json({
          fulfillmentText: `I couldn’t find any class named ${course}.`,
        });
      }
    }

    // 🧩 Fallback
    return res.json({
      fulfillmentText: "Sorry, I didn’t understand that. Could you repeat?",
    });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return res.json({
      fulfillmentText: "Something went wrong. Please try again later.",
    });
  }
});

// ✅ Start server
app.listen(3000, () => console.log("✅ Webhook is running on port 3000"));
// ✅ Add this GET route so Vercel can check if the webhook is live
app.get("/", (req, res) => {
  res.send("✅ Webhook is live and working on Vercel!");
});

// ✅ Add this so Vercel can export the app properly
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
export default app;

