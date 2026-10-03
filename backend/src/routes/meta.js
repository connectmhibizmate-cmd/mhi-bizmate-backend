import express from "express";
const router = express.Router();

const VERIFY = process.env.META_VERIFY_TOKEN || "bizmate_verify";

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY) {
    console.log("WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    if (body.object === "page") {
      for (const entry of body.entry) {
        if (entry.messaging) {
          for (const event of entry.messaging) {
            console.log("INBOX:", JSON.stringify(event, null, 2));
          }
        }
        if (entry.changes) {
          for (const change of entry.changes) {
            console.log("FEED:", JSON.stringify(change, null, 2));
          }
        }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(200).send("EVENT_RECEIVED");
  }
});

export default router;
