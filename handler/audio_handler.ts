// takes in an audio and returns the transcription of that audio
import axios from "axios";

export const vtt = async (message: any) => {
  const audioData = await axios.get(message.audio.url, {
    headers: {
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
    },
    responseType: "arraybuffer",
  });

  const stt = await axios.post(
    `${process.env.BACKEND_URL}/api/v1/asha/twi_transcribe`,
    audioData.data,
    {
      headers: {
        "Content-Type": message.audio.mime_type ?? "audio/ogg",
      },
    },
  );
  console.log(stt.data);
  return stt.data;
};
