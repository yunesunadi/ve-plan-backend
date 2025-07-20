import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

let io: SocketIOServer | null = null;

export const initializeSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      credentials: true
    }
  });

  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      socket.userId = decoded._id;
      socket.user = decoded;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    if (socket.userId) {
      const userRoom = `user_${socket.userId}`;
      socket.join(userRoom);
    }

    socket.on("disconnect", () => {
      if (socket.userId) {
        const userRoom = `user_${socket.userId}`;
        socket.leave(userRoom);
      }
    });

    console.log("Socket.IO connected...");
  });
}

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
