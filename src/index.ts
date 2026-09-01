import env from "dotenv";
env.config({ path: ".env", quiet: true });
import app from "./app.js";
import logger from "./config/pino.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
