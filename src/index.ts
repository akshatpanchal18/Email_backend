import env from "dotenv";
env.config({ path: ".env", quiet: true });
import app from "./app.js";
import logger from "./config/pino.js";
import http from "http";
import SocketService from "./service/socket.js";

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
SocketService.initialize(httpServer);
httpServer.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
// app.listen(PORT, () => {
//   logger.info(`Server running on http://localhost:${PORT}`);
// });
