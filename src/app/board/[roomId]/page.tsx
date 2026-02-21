"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useCanvasStore } from "@/stores/canvasStore";
import { useSocket } from "@/hooks/useSocket";
import WhiteboardCanvas from "@/components/canvas/WhiteboardCanvas";
import CursorOverlay from "@/components/canvas/CursorOverlay";
import Toolbar from "@/components/toolbar/Toolbar";
import Sidebar from "@/components/sidebar/Sidebar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function BoardPage() {
    const params = useParams();
    const roomId = params.roomId as string;
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const [showClearDialog, setShowClearDialog] = React.useState(false);

    const { setRoomId, setUserName, userName } = useCanvasStore();

    useEffect(() => {
        setRoomId(roomId);
        const storedName = localStorage.getItem("whiteboard-username");
        if (storedName) {
            setUserName(storedName);
        } else {
            const name = `User-${Math.random().toString(36).slice(2, 6)}`;
            setUserName(name);
            localStorage.setItem("whiteboard-username", name);
        }
    }, [roomId, setRoomId, setUserName]);

    const {
        emitAddElement,
        emitCursorMove,
        emitClearCanvas,
    } = useSocket();

    const handleClear = useCallback(() => {
        setShowClearDialog(true);
    }, []);

    const confirmClear = useCallback(() => {
        useCanvasStore.getState().clearCanvas();
        emitClearCanvas();
        setShowClearDialog(false);
    }, [emitClearCanvas]);

    const handleExport = useCallback(() => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return;

        const link = document.createElement("a");
        link.download = `whiteboard-${roomId}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }, [roomId]);

    if (!userName) return null;

    return (
        <div className="h-screen w-screen flex flex-col bg-[#0a0a1a] overflow-hidden">
            {/* Toolbar */}
            <div className="relative" ref={canvasContainerRef}>
                <Toolbar onClear={handleClear} onExport={handleExport} />
            </div>

            {/* Canvas area */}
            <div className="flex-1 relative">
                <WhiteboardCanvas
                    emitAddElement={emitAddElement}
                    emitCursorMove={emitCursorMove}
                />
                <CursorOverlay />
                <Sidebar />
            </div>

            {/* Room indicator bottom-left */}
            <div className="absolute bottom-4 left-4 z-30">
                <div className="bg-[#16213e]/80 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[11px] text-gray-400 font-mono">
                        {roomId.slice(0, 8)}...
                    </span>
                </div>
            </div>

            {/* Clear confirmation dialog */}
            <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <DialogContent className="bg-[#16213e] border-white/10 text-white max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-white">Clear Canvas?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-400">
                        This will remove all drawings for everyone in the room. This action
                        cannot be undone.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowClearDialog(false)}
                            className="border-white/10 text-white hover:bg-white/5 rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmClear}
                            className="bg-red-600 hover:bg-red-500 text-white rounded-xl"
                        >
                            Clear All
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
