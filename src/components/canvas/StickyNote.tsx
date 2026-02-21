"use client";

import React, { useState, useRef, useCallback } from "react";
import { useCanvasStore, CanvasElement } from "@/stores/canvasStore";
import { X } from "lucide-react";

interface StickyNoteOverlayProps {
    emitUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    emitRemoveElement: (id: string) => void;
}

export default function StickyNoteOverlay({
    emitUpdateElement,
    emitRemoveElement,
}: StickyNoteOverlayProps) {
    const elements = useCanvasStore((s) => s.elements);
    const panOffset = useCanvasStore((s) => s.panOffset);
    const scale = useCanvasStore((s) => s.scale);
    const stickyNotes = elements.filter((el) => el.type === "sticky");

    if (stickyNotes.length === 0) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            <div
                style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
                    transformOrigin: "0 0",
                }}
            >
                {stickyNotes.map((note) => (
                    <StickyNote
                        key={note.id}
                        note={note}
                        emitUpdateElement={emitUpdateElement}
                        emitRemoveElement={emitRemoveElement}
                    />
                ))}
            </div>
        </div>
    );
}

function StickyNote({
    note,
    emitUpdateElement,
    emitRemoveElement,
}: {
    note: CanvasElement;
    emitUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    emitRemoveElement: (id: string) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(note.text || "");
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const noteStart = useRef({ x: 0, y: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (isEditing) return;
            e.stopPropagation();
            e.preventDefault();
            isDragging.current = true;

            const scale = useCanvasStore.getState().scale;
            dragStart.current = { x: e.clientX, y: e.clientY };
            noteStart.current = { x: note.x ?? 0, y: note.y ?? 0 };

            const handleMouseMove = (ev: MouseEvent) => {
                if (!isDragging.current) return;
                const dx = (ev.clientX - dragStart.current.x) / scale;
                const dy = (ev.clientY - dragStart.current.y) / scale;
                useCanvasStore.getState().updateElement(note.id, {
                    x: noteStart.current.x + dx,
                    y: noteStart.current.y + dy,
                });
            };

            const handleMouseUp = () => {
                isDragging.current = false;
                const state = useCanvasStore.getState();
                const el = state.elements.find((e) => e.id === note.id);
                if (el) emitUpdateElement(note.id, { x: el.x, y: el.y });
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            };

            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        },
        [note.id, note.x, note.y, isEditing, emitUpdateElement]
    );

    const handleDoubleClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            setIsEditing(true);
            setEditText(note.text || "");
            setTimeout(() => textareaRef.current?.focus(), 50);
        },
        [note.text]
    );

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        useCanvasStore.getState().updateElement(note.id, { text: editText });
        emitUpdateElement(note.id, { text: editText });
    }, [note.id, editText, emitUpdateElement]);

    const handleDelete = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            useCanvasStore.getState().pushToHistory();
            useCanvasStore.getState().removeElement(note.id);
            emitRemoveElement(note.id);
        },
        [note.id, emitRemoveElement]
    );

    return (
        <div
            className="absolute pointer-events-auto group"
            style={{
                left: note.x ?? 0,
                top: note.y ?? 0,
                width: note.width ?? 200,
                height: note.height ?? 150,
            }}
        >
            <div
                className="relative w-full h-full rounded-lg shadow-xl cursor-grab active:cursor-grabbing select-none flex flex-col overflow-hidden"
                style={{ backgroundColor: note.stickyColor || "#fef08a" }}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
            >
                <div className="h-6 flex items-center justify-between px-2 opacity-60 shrink-0">
                    <div className="flex gap-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-black/20" />
                        <div className="w-1.5 h-1.5 rounded-full bg-black/20" />
                        <div className="w-1.5 h-1.5 rounded-full bg-black/20" />
                    </div>
                    <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-black/10 cursor-pointer"
                        onClick={handleDelete}
                    >
                        <X className="h-3 w-3 text-black/50" />
                    </button>
                </div>

                <div className="flex-1 px-3 pb-2 overflow-hidden">
                    {isEditing ? (
                        <textarea
                            ref={textareaRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={(e) => { if (e.key === "Escape") handleBlur(); }}
                            className="w-full h-full bg-transparent text-sm text-black/80 resize-none outline-none border-none font-medium leading-relaxed"
                        />
                    ) : (
                        <p className="text-sm text-black/80 font-medium leading-relaxed whitespace-pre-wrap break-words">
                            {note.text || "Double-click to edit"}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
