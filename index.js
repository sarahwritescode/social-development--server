
import { verifyToken } from "./middleware/verifyToken.js";
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

// Server port
const PORT = 5000;

// Express app
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URI,
  })
);
app.use(express.json());

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("social-development-event");
const eventsCollection = db.collection("events");
const joinedEventsCollection = db.collection("joinedEvents");

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


app.post("/api/events", verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      imageUrl,
      location,
      eventDate,
    } = req.body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !eventType ||
      !imageUrl?.trim() ||
      !location?.trim() ||
      !eventDate
    ) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required event information.",
      });
    }

    const selectedDate = new Date(eventDate);

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate <= new Date()
    ) {
      return res.status(400).send({
        success: false,
        message: "Please provide a valid future event date.",
      });
    }

    const newEvent = {
      title: title.trim(),
      description: description.trim(),
      eventType,
      imageUrl: imageUrl.trim(),
      location: location.trim(),
      eventDate: selectedDate,

      // Verified user information
      createdBy: req.user.email,
      createdById: req.user.id,

      createdAt: new Date(),
    };

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


app.get("/api/test-auth", verifyToken, (req, res) => {
  res.send({
    success: true,
    message: "JWT verified successfully!",
    user: req.user,
  });
});


// GET MY EVENTS
app.get("/api/my-events", verifyToken, async (req, res) => {
  try {
    const events = await eventsCollection
      .find({ createdById: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      events,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Failed to fetch your events.",
    });
  }
});

// UPDATE MY EVENT
app.patch("/api/events/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid event ID.",
      });
    }

    const {
      title,
      description,
      eventType,
      imageUrl,
      location,
      eventDate,
    } = req.body;

    const updates = {};

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (eventType !== undefined) updates.eventType = eventType;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl.trim();
    if (location !== undefined) updates.location = location.trim();

    if (eventDate !== undefined) {
      const selectedDate = new Date(eventDate);

      if (
        Number.isNaN(selectedDate.getTime()) ||
        selectedDate <= new Date()
      ) {
        return res.status(400).send({
          success: false,
          message: "Please provide a valid future event date.",
        });
      }

      updates.eventDate = selectedDate;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).send({
        success: false,
        message: "No fields provided to update.",
      });
    }

    updates.updatedAt = new Date();

    const result = await eventsCollection.updateOne(
      {
        _id: new ObjectId(id),
        createdById: req.user.id,
      },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Event not found or you are not the owner.",
      });
    }

    res.send({
      success: true,
      message: "Event updated successfully!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Failed to update event.",
    });
  }
});

// DELETE MY EVENT
app.delete("/api/events/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid event ID.",
      });
    }

    const result = await eventsCollection.deleteOne({
      _id: new ObjectId(id),
      createdById: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Event not found or you are not the owner.",
      });
    }

    res.send({
      success: true,
      message: "Event deleted successfully!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Failed to delete event.",
    });
  }
});
// JOIN EVENT API
app.post("/api/events/:id/join", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid event ID.",
      });
    }

    // Check if event exists
    const event = await eventsCollection.findOne({
      _id: new ObjectId(id),
      eventDate: { $gt: new Date() },
    });

    if (!event) {
      return res.status(404).send({
        success: false,
        message: "Upcoming event not found.",
      });
    }

    // Prevent duplicate joining
    const existingJoin = await joinedEventsCollection.findOne({
      eventId: new ObjectId(id),
      userId: req.user.id,
    });

    if (existingJoin) {
      return res.status(409).send({
        success: false,
        message: "You have already joined this event.",
      });
    }

    const joinData = {
      eventId: new ObjectId(id),
      userId: req.user.id,
      userEmail: req.user.email,
      joinedAt: new Date(),
    };

    await joinedEventsCollection.insertOne(joinData);

    res.status(201).send({
      success: true,
      message: "You have successfully joined the event!",
    });
  } catch (error) {
    console.error("Join event error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to join event.",
    });
  }
});

// GET JOINED EVENTS API
app.get("/api/joined-events", verifyToken, async (req, res) => {
  try {
    const joinedEvents = await joinedEventsCollection
      .aggregate([
        {
          $match: {
            userId: req.user.id,
          },
        },
        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "event",
          },
        },
        {
          $unwind: "$event",
        },
        {
          $sort: {
            "event.eventDate": 1,
          },
        },
      ])
      .toArray();

    res.send({
      success: true,
      joinedEvents,
    });
  } catch (error) {
    console.error("Joined events error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to fetch joined events.",
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
