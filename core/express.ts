import express from "express";

export const app = express();
app.use(express.json());

export const init_and_handle_server = () => {
  app.listen(3000, () => {
    console.log("server running on 3000");
  });
};
