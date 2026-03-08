import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import contentRoutes from "./routes/contentRoutes.js";
import playgroundRoutes from "./routes/playgroundRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { authenticate } from "./middleware/authenticate.js";
import { authorize } from "./middleware/authorize.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api", contentRoutes);
app.use(
  "/api/playground",
  authenticate,
  authorize("admin"),
  playgroundRoutes
);

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err?.code === "23505") {
    return res.status(409).json({ message: "Record already exists." });
  }

  return res.status(500).json({ message: "Internal server error." });
});

export default app;
