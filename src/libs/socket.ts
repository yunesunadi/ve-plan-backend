import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { corsOrigin } from "./env";
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
      console.error('Socket authentication error:', error);
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
        console.error(`Error enforcing socket cap for user ${socket.userId}:`, error);
      }

      socket.join(userRoom);
      console.log(`Socket.IO connected: user=${socket.userId} socket=${socket.id}`);
    }

    socket.on("disconnect", () => {
      if (socket.userId) {
        const userRoom = `user_${socket.userId}`;
        socket.leave(userRoom);
        console.log(`Socket.IO disconnected: user=${socket.userId} socket=${socket.id}`);
      }
    });
  });
}

export const disconnectUser = (userId: string) => {
  if (!io) return;
  try {
    io.in(`user_${userId}`).disconnectSockets(true);
  } catch (error) {
    console.error(`Error disconnecting sockets for user ${userId}:`, error);
  }
};

export const sendToUser = (userId: string, emitted_event: string, data: any) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }

  const userRoom = `user_${userId}`;

  try {
    io.to(userRoom).emit(emitted_event, data);
  } catch (error) {
    console.error(`Error sending ${emitted_event} to user ${userId}:`, error);
  }
}
