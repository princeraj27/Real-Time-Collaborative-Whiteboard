"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(
            typeof window !== "undefined" ? window.location.origin : "",
            {
                path: "/api/socketio",
                transports: ["websocket", "polling"],
                autoConnect: false,
            }
        );
    }
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
