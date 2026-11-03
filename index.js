

import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import "dotenv/config";

// Server port
const PORT = 5000;

// Express app
const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
app.use(express.json());

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("social-development-event");
const eventsCollection = db.collection("events");

// Connect to MongoDB
export async function connectToMongoDB() {
  try {
    await client.connect();

    console.log("You successfully connected to MongoDB!");

    return client;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

// Home route
app.get("/", (req, res) => {
  res.send("Kindora API is running!");
});

// CREATE EVENT API
app.post("/api/events", async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      imageUrl,
      location,
      eventDate,
      createdBy,
    } = req.body;

    // Required field validation
    if (
      !title?.trim() ||
      !description?.trim() ||
      !eventType ||
      !imageUrl?.trim() ||
      !location?.trim() ||
      !eventDate ||
      !createdBy
    ) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required event information.",
      });
    }

    // Date validation
    const selectedDate = new Date(eventDate);

    if (Number.isNaN(selectedDate.getTime())) {
      return res.status(400).send({
        success: false,
        message: "Please provide a valid event date.",
      });
    }

    if (selectedDate <= new Date()) {
      return res.status(400).send({
        success: false,
        message: "Event date must be in the future.",
      });
    }

    // Event document
    const newEvent = {
      title: title.trim(),
      description: description.trim(),
      eventType,
      imageUrl: imageUrl.trim(),
      location: location.trim(),
      eventDate: selectedDate,
      createdBy,
      createdAt: new Date(),
    };

    // Save to MongoDB
    const result = await eventsCollection.insertOne(newEvent);

    res.status(201).send({
      success: true,
      message: "Event created successfully!",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Create event error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to create event.",
    });
  }
});


import { ObjectId } from "mongodb";

// GET ALL UPCOMING EVENTS
app.get("/api/events", async (req, res) => {
  try {
    const events = await eventsCollection
      .find({ eventDate: { $gt: new Date() } })
      .sort({ eventDate: 1 })
      .toArray();

    res.send({
      success: true,
      events,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Failed to fetch events.",
    });
  }
});

// GET SINGLE EVENT DETAILS
app.get("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid event ID.",
      });
    }

    const event = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).send({
        success: false,
        message: "Event not found.",
      });
    }

    res.send({
      success: true,
      event,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Failed to fetch event.",
    });
  }
});


// Start server
async function startServer() {
  try {
    await connectToMongoDB();

    app.listen(PORT, () => {
      console.log(`Kindora API is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error);
  }
}

startServer();
