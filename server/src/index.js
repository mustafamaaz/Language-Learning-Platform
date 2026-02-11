import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;

app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from Express" });
});

app.get("/", (_req, res) => {
  res.type("text").send("Server is running. Try /api/hello");
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
