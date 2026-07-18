import { app } from "../core/express";
import { Groq_LLMHandler } from "../handler/groq.js";

app.post("/asha/sensor-trigger", async (req, res) => {
  const { phone, sensor_data } = req.body;
  res.sendStatus(200);

  const pseudoMessage = {
    from: phone,
    text: { body: `[data from SENSOR] ${sensor_data}` },
  };

  await Groq_LLMHandler(pseudoMessage);
});

const verify_token = "ashatheworldtothefuture";

// webhook call
app.get("/api/v1/webhook_whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  console.log("verify");
  if (mode === "subscribe" && token === verify_token) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
