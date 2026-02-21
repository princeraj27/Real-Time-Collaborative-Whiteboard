import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface RoomElement {
    id: string;
    type: string;
    points: { x: number; y: number }[];
    color: string;
    strokeWidth: number;
    text?: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    stickyColor?: string;
}

interface RoomUser {
    id: string;
    name: string;
    color: string;
    isOnline: boolean;
}

const rooms = new Map<string, { elements: RoomElement[]; users: Map<string, RoomUser> }>();

const USER_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
    "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b",
];

function getRoom(roomId: string) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, { elements: [], users: new Map() });
    }
    return rooms.get(roomId)!;
}

function getRandomColor(): string {
    return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    const io = new SocketIOServer(httpServer, {
        path: "/api/socketio",
        cors: { origin: "*" },
        transports: ["websocket", "polling"],
    });

    io.on("connection", (socket) => {
        let currentRoomId: string | null = null;
        let currentUser: RoomUser | null = null;

        socket.on("join-room", ({ roomId, userName }: { roomId: string; userName: string }) => {
            currentRoomId = roomId;
            const room = getRoom(roomId);

            currentUser = {
                id: socket.id,
                name: userName,
                color: getRandomColor(),
                isOnline: true,
            };

            room.users.set(socket.id, currentUser);
            socket.join(roomId);

            // Send assigned user ID
            socket.emit("user-id", socket.id);

            // Send current room state
            socket.emit("room-state", {
                elements: room.elements,
                users: Array.from(room.users.values()),
            });

            // Notify others
            socket.to(roomId).emit("users-updated", Array.from(room.users.values()));
        });

        socket.on("add-element", ({ roomId, element }: { roomId: string; element: RoomElement }) => {
            const room = getRoom(roomId);
            room.elements.push(element);
            socket.to(roomId).emit("element-added", element);
        });

        socket.on("update-element", ({ roomId, id, updates }: { roomId: string; id: string; updates: Partial<RoomElement> }) => {
            const room = getRoom(roomId);
            const idx = room.elements.findIndex((el) => el.id === id);
            if (idx !== -1) {
                room.elements[idx] = { ...room.elements[idx], ...updates };
            }
            socket.to(roomId).emit("element-updated", { id, updates });
        });

        socket.on("remove-element", ({ roomId, id }: { roomId: string; id: string }) => {
            const room = getRoom(roomId);
            room.elements = room.elements.filter((el) => el.id !== id);
            socket.to(roomId).emit("element-removed", id);
        });

        socket.on("clear-canvas", ({ roomId }: { roomId: string }) => {
            const room = getRoom(roomId);
            room.elements = [];
            socket.to(roomId).emit("canvas-cleared");
        });

        socket.on("cursor-move", ({ roomId, x, y }: { roomId: string; x: number; y: number }) => {
            if (currentUser) {
                socket.to(roomId).emit("cursor-moved", {
                    id: socket.id,
                    name: currentUser.name,
                    color: currentUser.color,
                    x,
                    y,
                });
            }
        });

        socket.on("leave-room", ({ roomId }: { roomId: string }) => {
            handleDisconnect(roomId);
        });

        socket.on("disconnect", () => {
            if (currentRoomId) {
                handleDisconnect(currentRoomId);
            }
        });

        function handleDisconnect(roomId: string) {
            const room = rooms.get(roomId);
            if (room) {
                room.users.delete(socket.id);
                socket.to(roomId).emit("user-left", socket.id);
                socket.to(roomId).emit("users-updated", Array.from(room.users.values()));
                if (room.users.size === 0) {
                    // Keep room data for a while, don't delete immediately
                }
            }
            socket.leave(roomId);
            currentRoomId = null;
            currentUser = null;
        }
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
