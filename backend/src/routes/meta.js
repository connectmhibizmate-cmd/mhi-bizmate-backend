import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const VERIFY = process.env.META_VERIFY_TOKEN || "bizmate_verify";
  if (mode === "subscribe" && token === VERIFY) {
    console.log("WEBHOOK_VERIFIED");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post("/", (req, res) => {
  console.log("Meta event:", JSON.stringify(req.body, null, 2));
  return res.status(200).send("EVENT_RECEIVED");
});

export default router;