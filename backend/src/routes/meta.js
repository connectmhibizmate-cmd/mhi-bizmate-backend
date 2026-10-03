import express from "express";
const router = express.Router();
const VERIFY = "bizmate_verify";
router.get("/", (req, res) => {
  const m = req.query["hub.mode"];
  const t = req.query["hub.verify_token"];
  const c = req.query["hub.challenge"];
  if (m === "subscribe" && t === VERIFY) return res.status(200).send(c);
  return res.sendStatus(403);
});
router.post("/", (req, res) => {
  console.log(req.body);
  return res.status(200).send("EVENT_RECEIVED");
});
export default router;