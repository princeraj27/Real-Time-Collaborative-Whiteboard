"use client";

import React from "react";
import { useCanvasStore } from "@/stores/canvasStore";

export default function CursorOverlay() {
    const { cursors, userId } = useCanvasStore();

    return (
        <div className="absolute inset-0 pointer-events-none z-20">
            {cursors
                .filter((c) => c.id !== userId)
                .map((cursor) => (
                    <div
                        key={cursor.id}
                        className="absolute transition-all duration-100 ease-out"
                        style={{
                            left: cursor.x,
                            top: cursor.y,
                            transform: "translate(-2px, -2px)",
                        }}
                    >
                        {/* Cursor arrow */}
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill={cursor.color}
                            className="drop-shadow-lg"
                        >
                            <path d="M5 3l14 8-7 2-3 7z" />
                        </svg>
                        {/* Name tag */}
                        <div
                            className="absolute left-5 top-4 px-2 py-0.5 rounded-md text-[11px] font-medium text-white whitespace-nowrap shadow-lg"
                            style={{ backgroundColor: cursor.color }}
                        >
                            {cursor.name}
                        </div>
                    </div>
                ))}
        </div>
    );
}
