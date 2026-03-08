import app from "./app.js";
import { ensureTables } from "./db/init.js";

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await ensureTables();
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize database", error);
    process.exit(1);
  }
}

startServer();
