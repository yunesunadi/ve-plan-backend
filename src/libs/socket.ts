import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { corsOrigin } from "./env";
import { logger } from "../helpers/logger";
import * as UserService from "../services/UserService";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

const MAX_SOCKETS_PER_USER = 5;

let io: SocketIOServer | null = null;

export const initializeSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: corsOrigin(),
      credentials: true
    }
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

      const user = await UserService.findAuthContext(decoded._id);

      if (!user || decoded.tokenVersion !== user.tokenVersion) {
        return next(new Error("Authentication error"));
      }

      socket.userId = decoded._id;
      socket.user = { _id: user._id.toString(), role: user.role };

      next();
    } catch (error) {
      logger.error({ err: error }, "socket authentication error");
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket: AuthenticatedSocket) => {
    if (socket.userId) {
      const userRoom = `user_${socket.userId}`;

      try {
        const existing = await io!.in(userRoom).fetchSockets();
        if (existing.length >= MAX_SOCKETS_PER_USER) {
          existing[0].disconnect(true);
        }
      } catch (error) {
        logger.error({ err: error, userId: socket.userId }, "failed to enforce socket cap");
      }

      socket.join(userRoom);
      logger.info({ userId: socket.userId, socketId: socket.id }, "socket connected");
    }

    socket.on("disconnect", () => {
      if (socket.userId) {
        const userRoom = `user_${socket.userId}`;
        socket.leave(userRoom);
        logger.info({ userId: socket.userId, socketId: socket.id }, "socket disconnected");
      }
    });
  });
}

export const disconnectUser = (userId: string) => {
  if (!io) return;
  try {
    io.in(`user_${userId}`).disconnectSockets(true);
  } catch (error) {
    logger.error({ err: error, userId }, "failed to disconnect user sockets");
  }
};

export const sendToUser = (userId: string, emitted_event: string, data: any) => {
  if (!io) {
    logger.error("socket.io not initialized");
    return;
  }

  const userRoom = `user_${userId}`;

  try {
    io.to(userRoom).emit(emitted_event, data);
  } catch (error) {
    logger.error({ err: error, userId, event: emitted_event }, "failed to send socket event");
  }
}
