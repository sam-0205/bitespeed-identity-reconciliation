import express from "express";
import dotenv from "dotenv";
import routes from "./routes.js";
import { initDB } from "./db.js";

dotenv.config();

const app = express();
app.use(express.json());

// Initialize DB before starting server
await initDB();

app.use("/", routes);

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});