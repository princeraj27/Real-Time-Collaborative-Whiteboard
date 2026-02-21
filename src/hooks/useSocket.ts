"use client";

import { useEffect, useCallback, useRef } from "react";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useCanvasStore, CanvasElement, RemoteCursor } from "@/stores/canvasStore";

export function useSocket() {
    const socketRef = useRef(getSocket());
    const {
        roomId,
        userName,
        userId,
        setElements,
        addElement,
        updateElement,
        removeElement,
        setUsers,
        updateCursor,
        removeCursor,
        setUserId,
    } = useCanvasStore();

    useEffect(() => {
        if (!roomId || !userName) return;

        const socket = socketRef.current;
        if (!socket.connected) {
            socket.connect();
        }

        socket.emit("join-room", { roomId, userName });

        socket.on("room-state", (data: { elements: CanvasElement[]; users: { id: string; name: string; color: string; isOnline: boolean }[] }) => {
            setElements(data.elements);
            setUsers(data.users);
        });

        socket.on("user-id", (id: string) => {
            setUserId(id);
        });

        socket.on("element-added", (element: CanvasElement) => {
            addElement(element);
        });

        socket.on("element-updated", (data: { id: string; updates: Partial<CanvasElement> }) => {
            updateElement(data.id, data.updates);
        });

        socket.on("element-removed", (id: string) => {
            removeElement(id);
        });

        socket.on("canvas-cleared", () => {
            setElements([]);
        });

        socket.on("cursor-moved", (cursor: RemoteCursor) => {
            updateCursor(cursor);
        });

        socket.on("user-left", (id: string) => {
            removeCursor(id);
        });

        socket.on("users-updated", (users: { id: string; name: string; color: string; isOnline: boolean }[]) => {
            setUsers(users);
        });

        return () => {
            socket.emit("leave-room", { roomId });
            socket.off("room-state");
            socket.off("user-id");
            socket.off("element-added");
            socket.off("element-updated");
            socket.off("element-removed");
            socket.off("canvas-cleared");
            socket.off("cursor-moved");
            socket.off("user-left");
            socket.off("users-updated");
            disconnectSocket();
        };
    }, [roomId, userName]);

    const emitAddElement = useCallback(
        (element: CanvasElement) => {
            socketRef.current.emit("add-element", { roomId, element });
        },
        [roomId]
    );

    const emitUpdateElement = useCallback(
        (id: string, updates: Partial<CanvasElement>) => {
            socketRef.current.emit("update-element", { roomId, id, updates });
        },
        [roomId]
    );

    const emitRemoveElement = useCallback(
        (id: string) => {
            socketRef.current.emit("remove-element", { roomId, id });
        },
        [roomId]
    );

    const emitClearCanvas = useCallback(() => {
        socketRef.current.emit("clear-canvas", { roomId });
    }, [roomId]);

    const emitCursorMove = useCallback(
        (x: number, y: number) => {
            socketRef.current.emit("cursor-move", { roomId, x, y });
        },
        [roomId]
    );

    return {
        emitAddElement,
        emitUpdateElement,
        emitRemoveElement,
        emitClearCanvas,
        emitCursorMove,
    };
}
