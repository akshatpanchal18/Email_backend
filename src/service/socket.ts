import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import logger from "../config/pino";

class SocketService {
  private static io: Server;

  static initialize(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL,
        credentials: true,
      },
    });

    this.io.on("connection", (socket) => {
      logger.info({ socketId: socket.id }, "Socket connected");

      socket.on("join_mailbox", (mailboxId: string) => {
        if (!mailboxId) return;

        socket.join(`mailbox:${mailboxId}`);

        logger.info({ socketId: socket.id, mailboxId }, "Joined mailbox room");
      });

      socket.on("leave_mailbox", (mailboxId: string) => {
        if (!mailboxId) return;

        socket.leave(`mailbox:${mailboxId}`);
      });

      socket.on("disconnect", (reason) => {
        logger.info({ socketId: socket.id, reason }, "Socket disconnected");
      });
    });
  }

  static emitToMailbox(mailboxId: string, event: string, data: unknown) {
    if (!this.io) {
      logger.error("Socket.IO is not initialized");
      return;
    }

    const room = `mailbox:${mailboxId}`;
    this.io.to(room).emit(event, data);
  }
}

export default SocketService;
