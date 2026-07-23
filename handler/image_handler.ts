// takes in an audio and returns the transcription of that audio
import axios from "axios";
import sharp from "sharp";

export const imtb64 = async (message: any) => {
  const image = await axios.get(message.image.url, {
    headers: {
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
    },
    responseType: "arraybuffer",
  });

  const resized = await sharp(Buffer.from(image.data))
    .resize(768, 768, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const base64 = resized.toString("base64");
  return base64;
};
