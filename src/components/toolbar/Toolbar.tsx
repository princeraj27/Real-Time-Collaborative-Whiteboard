"use client";

import React from "react";
import { useCanvasStore, Tool } from "@/stores/canvasStore";
import { useHistory } from "@/hooks/useHistory";
import { Slider } from "@/components/ui/slider";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Pencil,
    Minus,
    Square,
    Circle,
    Eraser,
    Type,
    MousePointer2,
    StickyNote,
    Undo2,
    Redo2,
    Trash2,
    Download,
    Palette,
} from "lucide-react";

interface ToolbarProps {
    onClear: () => void;
    onExport: () => void;
}

const TOOLS: { tool: Tool; icon: React.ElementType; label: string }[] = [
    { tool: "select", icon: MousePointer2, label: "Select" },
    { tool: "pen", icon: Pencil, label: "Pen" },
    { tool: "line", icon: Minus, label: "Line" },
    { tool: "rectangle", icon: Square, label: "Rectangle" },
    { tool: "circle", icon: Circle, label: "Circle" },
    { tool: "eraser", icon: Eraser, label: "Eraser" },
    { tool: "text", icon: Type, label: "Text" },
    { tool: "sticky", icon: StickyNote, label: "Sticky Note" },
];

const COLORS = [
    "#ffffff",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#6b7280",
];

export default function Toolbar({ onClear, onExport }: ToolbarProps) {
    const {
        currentTool,
        strokeColor,
        strokeWidth,
        setTool,
        setStrokeColor,
        setStrokeWidth,
    } = useCanvasStore();
    const { undo, redo, canUndo, canRedo } = useHistory();

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[#16213e]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-3 py-2 shadow-2xl">
            {/* Drawing Tools */}
            <div className="flex items-center gap-0.5">
                {TOOLS.map(({ tool, icon: Icon, label }) => (
                    <Tooltip key={tool}>
                        <TooltipTrigger asChild>
                            <button
                                id={`tool-${tool}`}
                                className={`inline-flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-150 cursor-pointer ${currentTool === tool
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                        : "text-gray-400 hover:text-white hover:bg-white/10"
                                    }`}
                                onClick={() => setTool(tool)}
                            >
                                <Icon className="h-4 w-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                            {label}
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>

            <div className="w-px h-8 bg-white/10 mx-1" />

            {/* Color Picker */}
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        id="color-picker-trigger"
                        className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-150 cursor-pointer"
                    >
                        <div className="relative">
                            <Palette className="h-4 w-4" />
                            <div
                                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-800"
                                style={{ backgroundColor: strokeColor }}
                            />
                        </div>
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-3 bg-[#16213e]/95 backdrop-blur-xl border-white/10"
                    side="bottom"
                >
                    <div className="grid grid-cols-5 gap-2">
                        {COLORS.map((color) => (
                            <button
                                key={color}
                                className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 cursor-pointer ${strokeColor === color
                                        ? "border-white scale-110 shadow-lg"
                                        : "border-transparent"
                                    }`}
                                style={{ backgroundColor: color }}
                                onClick={() => setStrokeColor(color)}
                            />
                        ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <input
                            type="color"
                            value={strokeColor}
                            onChange={(e) => setStrokeColor(e.target.value)}
                            className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs text-gray-400 uppercase">
                            {strokeColor}
                        </span>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Stroke Width */}
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        id="stroke-width-trigger"
                        className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-150 cursor-pointer"
                    >
                        <div className="flex items-center justify-center">
                            <div
                                className="rounded-full bg-white"
                                style={{
                                    width: Math.max(4, strokeWidth * 2),
                                    height: Math.max(4, strokeWidth * 2),
                                }}
                            />
                        </div>
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-48 p-3 bg-[#16213e]/95 backdrop-blur-xl border-white/10"
                    side="bottom"
                >
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Stroke Width</span>
                            <span>{strokeWidth}px</span>
                        </div>
                        <Slider
                            value={[strokeWidth]}
                            onValueChange={(value) => setStrokeWidth(value[0])}
                            min={1}
                            max={20}
                            step={1}
                            className="w-full"
                        />
                    </div>
                </PopoverContent>
            </Popover>

            <div className="w-px h-8 bg-white/10 mx-1" />

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            id="undo-btn"
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={!canUndo}
                            onClick={undo}
                        >
                            <Undo2 className="h-4 w-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        Undo (Ctrl+Z)
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            id="redo-btn"
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={!canRedo}
                            onClick={redo}
                        >
                            <Redo2 className="h-4 w-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        Redo (Ctrl+Shift+Z)
                    </TooltipContent>
                </Tooltip>
            </div>

            <div className="w-px h-8 bg-white/10 mx-1" />

            {/* Clear & Export */}
            <div className="flex items-center gap-0.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            id="clear-btn"
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-150 cursor-pointer"
                            onClick={onClear}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        Clear Canvas
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            id="export-btn"
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-all duration-150 cursor-pointer"
                            onClick={onExport}
                        >
                            <Download className="h-4 w-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        Export as PNG
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
