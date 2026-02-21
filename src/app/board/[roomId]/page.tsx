"use client";

import React, { useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useCanvasStore } from "@/stores/canvasStore";
import { useSocket } from "@/hooks/useSocket";
import WhiteboardCanvas from "@/components/canvas/WhiteboardCanvas";
import CursorOverlay from "@/components/canvas/CursorOverlay";
import StickyNoteOverlay from "@/components/canvas/StickyNote";
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
import { Plus, Minus, RotateCcw } from "lucide-react";

function ZoomControls() {
    const scale = useCanvasStore((s) => s.scale);
    const { zoomIn, zoomOut, resetZoom } = useCanvasStore();

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
            <div className="bg-[#16213e]/80 backdrop-blur-xl border border-white/10 rounded-xl px-1.5 py-1 flex items-center gap-0.5">
                <button
                    onClick={zoomOut}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                    <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={resetZoom}
                    className="h-7 min-w-[52px] inline-flex items-center justify-center rounded-lg text-[11px] font-mono text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                    {Math.round(scale * 100)}%
                </button>
                <button
                    onClick={zoomIn}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

export default function BoardPage() {
    const params = useParams();
    const roomId = params.roomId as string;
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
        emitUpdateElement,
        emitRemoveElement,
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

    const handleExportPng = useCallback(() => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = `whiteboard-${roomId}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }, [roomId]);

    const handleExportPdf = useCallback(async () => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return;
        const { default: jsPDF } = await import("jspdf");
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? "landscape" : "portrait",
            unit: "px",
            format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(`whiteboard-${roomId}.pdf`);
    }, [roomId]);

    // Handle Delete key for selected element
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") {
                const state = useCanvasStore.getState();
                if (state.selectedElementId && state.currentTool === "select") {
                    const active = document.activeElement;
                    if (
                        active &&
                        (active.tagName === "INPUT" ||
                            active.tagName === "TEXTAREA")
                    )
                        return;

                    e.preventDefault();
                    state.pushToHistory();
                    const id = state.selectedElementId;
                    state.removeElement(id);
                    emitRemoveElement(id);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [emitRemoveElement]);

    if (!userName) return null;

    return (
        <div className="h-screen w-screen flex flex-col bg-[#0a0a1a] overflow-hidden">
            {/* Toolbar */}
            <div className="relative">
                <Toolbar onClear={handleClear} onExportPng={handleExportPng} onExportPdf={handleExportPdf} />
            </div>

            {/* Canvas area */}
            <div className="flex-1 relative" id="canvas-area">
                <WhiteboardCanvas
                    emitAddElement={emitAddElement}
                    emitUpdateElement={emitUpdateElement}
                    emitCursorMove={emitCursorMove}
                />
                <StickyNoteOverlay
                    emitUpdateElement={emitUpdateElement}
                    emitRemoveElement={emitRemoveElement}
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

            {/* Zoom controls bottom-center */}
            <ZoomControls />

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
