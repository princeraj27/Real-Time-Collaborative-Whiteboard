"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";

export function useHistory() {
    const { undo, redo, canUndo, canRedo } = useCanvasStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "z") {
                e.preventDefault();
                if (e.shiftKey) {
                    if (canRedo()) redo();
                } else {
                    if (canUndo()) undo();
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "y") {
                e.preventDefault();
                if (canRedo()) redo();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [undo, redo, canUndo, canRedo]);

    return { undo, redo, canUndo: canUndo(), canRedo: canRedo() };
}
