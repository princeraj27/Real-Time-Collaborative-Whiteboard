"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { useCanvasStore, CanvasElement, Point } from "@/stores/canvasStore";
import { v4 as uuidv4 } from "uuid";
import getStroke from "perfect-freehand";

interface WhiteboardCanvasProps {
    emitAddElement: (element: CanvasElement) => void;
    emitUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    emitCursorMove: (x: number, y: number) => void;
}

function getSvgPathFromStroke(stroke: number[][]) {
    if (!stroke.length) return "";
    const d = stroke.reduce(
        (acc, [x0, y0], i, arr) => {
            const [x1, y1] = arr[(i + 1) % arr.length];
            acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
            return acc;
        },
        ["M", ...stroke[0], "Q"]
    );
    d.push("Z");
    return d.join(" ");
}

// -- Hit testing --
function hitTest(point: Point, elements: CanvasElement[]): CanvasElement | null {
    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el.type === "sticky") {
            const sx = el.x ?? 0, sy = el.y ?? 0, sw = el.width ?? 200, sh = el.height ?? 150;
            if (point.x >= sx && point.x <= sx + sw && point.y >= sy && point.y <= sy + sh)
                return el;
        } else if (el.type === "text") {
            const tx = el.x ?? 0, ty = el.y ?? 0;
            const tw = (el.text?.length ?? 0) * el.strokeWidth * 3;
            const th = el.strokeWidth * 6;
            if (point.x >= tx && point.x <= tx + tw && point.y >= ty - th && point.y <= ty)
                return el;
        } else if (el.type === "rectangle" && el.points.length >= 2) {
            const p1 = el.points[0], p2 = el.points[el.points.length - 1];
            if (point.x >= Math.min(p1.x, p2.x) - 5 && point.x <= Math.max(p1.x, p2.x) + 5 &&
                point.y >= Math.min(p1.y, p2.y) - 5 && point.y <= Math.max(p1.y, p2.y) + 5)
                return el;
        } else if (el.type === "circle" && el.points.length >= 2) {
            const p1 = el.points[0], p2 = el.points[el.points.length - 1];
            const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
            const rx = Math.abs(p2.x - p1.x) / 2 + 5, ry = Math.abs(p2.y - p1.y) / 2 + 5;
            const dx = (point.x - cx) / rx, dy = (point.y - cy) / ry;
            if (dx * dx + dy * dy <= 1) return el;
        } else if ((el.type === "pen" || el.type === "line" || el.type === "eraser") && el.points.length >= 2) {
            for (let j = 0; j < el.points.length - 1; j++) {
                if (distToSegment(point, el.points[j], el.points[j + 1]) < 10 + el.strokeWidth)
                    return el;
            }
        }
    }
    return null;
}

function distToSegment(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x, dy = b.y - a.y, lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export default function WhiteboardCanvas({
    emitAddElement,
    emitUpdateElement,
    emitCursorMove,
}: WhiteboardCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDrawing = useRef(false);
    const isDragging = useRef(false);
    const isPanning = useRef(false);
    const currentPoints = useRef<Point[]>([]);
    const currentElementId = useRef<string>("");
    const startPoint = useRef<Point>({ x: 0, y: 0 });
    const panStartMouse = useRef<Point>({ x: 0, y: 0 });
    const panStartOffset = useRef<Point>({ x: 0, y: 0 });
    const dragOffset = useRef<Point>({ x: 0, y: 0 });
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Text input state
    const [textInput, setTextInput] = useState<{
        visible: boolean;
        x: number;
        y: number;
        canvasX: number;
        canvasY: number;
        value: string;
    }>({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0, value: "" });
    const textInputRef = useRef<HTMLInputElement>(null);

    const elements = useCanvasStore((s) => s.elements);
    const currentTool = useCanvasStore((s) => s.currentTool);
    const selectedElementId = useCanvasStore((s) => s.selectedElementId);
    const panOffset = useCanvasStore((s) => s.panOffset);
    const scale = useCanvasStore((s) => s.scale);

    // Handle resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({ width: rect.width, height: rect.height });
            }
        };
        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    // Convert screen coords to canvas (world) coords
    const screenToCanvas = useCallback(
        (screenX: number, screenY: number): Point => {
            const canvas = canvasRef.current;
            if (!canvas) return { x: 0, y: 0 };
            const rect = canvas.getBoundingClientRect();
            return {
                x: (screenX - rect.left - panOffset.x) / scale,
                y: (screenY - rect.top - panOffset.y) / scale,
            };
        },
        [panOffset, scale]
    );

    // Redraw canvas with transforms
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid pattern for infinite canvas feel
        ctx.save();
        const gridSize = 40 * scale;
        const offsetX = panOffset.x % gridSize;
        const offsetY = panOffset.y % gridSize;
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.lineWidth = 1;
        for (let x = offsetX; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = offsetY; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        ctx.restore();

        // Apply pan/zoom transform
        ctx.save();
        ctx.translate(panOffset.x, panOffset.y);
        ctx.scale(scale, scale);

        elements.forEach((element) => {
            if (element.type === "sticky") return;

            ctx.save();

            if (element.type === "pen") {
                if (element.points.length < 2) { ctx.restore(); return; }
                const stroke = getStroke(
                    element.points.map((p) => [p.x, p.y]),
                    { size: element.strokeWidth * 2, thinning: 0.5, smoothing: 0.5, streamline: 0.5 }
                );
                const pathData = getSvgPathFromStroke(stroke);
                const path = new Path2D(pathData);
                ctx.fillStyle = element.color;
                ctx.fill(path);
            } else if (element.type === "eraser") {
                if (element.points.length < 2) { ctx.restore(); return; }
                ctx.globalCompositeOperation = "destination-out";
                const stroke = getStroke(
                    element.points.map((p) => [p.x, p.y]),
                    { size: element.strokeWidth * 4, thinning: 0, smoothing: 0.5, streamline: 0.5 }
                );
                const pathData = getSvgPathFromStroke(stroke);
                const path = new Path2D(pathData);
                ctx.fillStyle = "rgba(0,0,0,1)";
                ctx.fill(path);
            } else if (element.type === "line") {
                if (element.points.length >= 2) {
                    ctx.strokeStyle = element.color;
                    ctx.lineWidth = element.strokeWidth;
                    ctx.lineCap = "round";
                    ctx.beginPath();
                    ctx.moveTo(element.points[0].x, element.points[0].y);
                    ctx.lineTo(element.points[element.points.length - 1].x, element.points[element.points.length - 1].y);
                    ctx.stroke();
                }
            } else if (element.type === "rectangle") {
                if (element.points.length >= 2) {
                    const start = element.points[0], end = element.points[element.points.length - 1];
                    ctx.strokeStyle = element.color;
                    ctx.lineWidth = element.strokeWidth;
                    ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
                }
            } else if (element.type === "circle") {
                if (element.points.length >= 2) {
                    const start = element.points[0], end = element.points[element.points.length - 1];
                    const rx = Math.abs(end.x - start.x) / 2, ry = Math.abs(end.y - start.y) / 2;
                    const cx = start.x + (end.x - start.x) / 2, cy = start.y + (end.y - start.y) / 2;
                    ctx.strokeStyle = element.color;
                    ctx.lineWidth = element.strokeWidth;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else if (element.type === "text") {
                if (element.text && element.x !== undefined && element.y !== undefined) {
                    ctx.font = `${element.strokeWidth * 5}px Inter, sans-serif`;
                    ctx.fillStyle = element.color;
                    ctx.fillText(element.text, element.x, element.y);
                }
            }

            // Selection outline
            if (element.id === selectedElementId) {
                ctx.strokeStyle = "#3b82f6";
                ctx.lineWidth = 2 / scale;
                ctx.setLineDash([6 / scale, 3 / scale]);
                if (element.type === "rectangle" && element.points.length >= 2) {
                    const s = element.points[0], e = element.points[element.points.length - 1];
                    ctx.strokeRect(s.x - 4, s.y - 4, e.x - s.x + 8, e.y - s.y + 8);
                } else if (element.type === "text" && element.x !== undefined && element.y !== undefined) {
                    const tw = (element.text?.length ?? 0) * element.strokeWidth * 3;
                    const th = element.strokeWidth * 6;
                    ctx.strokeRect(element.x - 4, element.y - th - 4, tw + 8, th + 8);
                } else if (element.points.length > 0) {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    element.points.forEach((p) => {
                        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
                        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
                    });
                    ctx.strokeRect(minX - 8, minY - 8, maxX - minX + 16, maxY - minY + 16);
                }
            }

            ctx.restore();
        });

        ctx.restore();
    }, [elements, dimensions, selectedElementId, panOffset, scale]);

    // Mouse wheel -> zoom or pan
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            if (e.ctrlKey || e.metaKey) {
                // Zoom
                const state = useCanvasStore.getState();
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const zoom = e.deltaY < 0 ? 1.08 : 1 / 1.08;
                const newScale = Math.max(0.1, Math.min(5, state.scale * zoom));

                // Zoom towards mouse position
                const newPanX = mouseX - (mouseX - state.panOffset.x) * (newScale / state.scale);
                const newPanY = mouseY - (mouseY - state.panOffset.y) * (newScale / state.scale);

                state.setScale(newScale);
                state.setPanOffset({ x: newPanX, y: newPanY });
            } else {
                // Pan
                const state = useCanvasStore.getState();
                state.setPanOffset({
                    x: state.panOffset.x - e.deltaX,
                    y: state.panOffset.y - e.deltaY,
                });
            }
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => container.removeEventListener("wheel", handleWheel);
    }, []);

    const handlePointerDown = useCallback(
        (e: React.MouseEvent) => {
            const state = useCanvasStore.getState();
            const tool = state.currentTool;
            const color = state.strokeColor;
            const width = state.strokeWidth;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            // World coordinates
            const point: Point = {
                x: (screenX - state.panOffset.x) / state.scale,
                y: (screenY - state.panOffset.y) / state.scale,
            };

            // Middle mouse button or Space + click -> pan
            if (e.button === 1 || (e.button === 0 && e.altKey)) {
                isPanning.current = true;
                panStartMouse.current = { x: e.clientX, y: e.clientY };
                panStartOffset.current = { ...state.panOffset };
                return;
            }

            // SELECT
            if (tool === "select") {
                const hit = hitTest(point, state.elements);
                if (hit) {
                    state.setSelectedElementId(hit.id);
                    isDragging.current = true;
                    if (hit.type === "sticky" || hit.type === "text") {
                        dragOffset.current = { x: point.x - (hit.x ?? 0), y: point.y - (hit.y ?? 0) };
                    } else if (hit.points.length > 0) {
                        let minX = Infinity, minY = Infinity;
                        hit.points.forEach((p) => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); });
                        dragOffset.current = { x: point.x - minX, y: point.y - minY };
                    }
                    startPoint.current = point;
                    state.pushToHistory();
                } else {
                    state.setSelectedElementId(null);
                }
                return;
            }

            // STICKY NOTE
            if (tool === "sticky") {
                const stickyColors = ["#fef08a", "#fca5a5", "#93c5fd", "#86efac", "#fdba74"];
                const stickyColor = stickyColors[Math.floor(Math.random() * stickyColors.length)];
                const element: CanvasElement = {
                    id: uuidv4(), type: "sticky", points: [], color: "#1a1a2e", strokeWidth: width,
                    text: "Double-click to edit", x: point.x - 100, y: point.y - 75,
                    width: 200, height: 150, stickyColor,
                };
                state.pushToHistory();
                state.addElement(element);
                emitAddElement(element);
                return;
            }

            // TEXT — show inline input at screen position relative to container
            if (tool === "text") {
                setTextInput({
                    visible: true,
                    x: screenX,
                    y: screenY,
                    canvasX: point.x,
                    canvasY: point.y,
                    value: "",
                });
                setTimeout(() => textInputRef.current?.focus(), 50);
                return;
            }

            // DRAWING TOOLS
            isDrawing.current = true;
            currentElementId.current = uuidv4();
            startPoint.current = point;
            currentPoints.current = [point];
            state.setSelectedElementId(null);

            const element: CanvasElement = {
                id: currentElementId.current, type: tool, points: [point],
                color, strokeWidth: width,
            };
            state.pushToHistory();
            state.addElement(element);
        },
        [emitAddElement]
    );

    const handlePointerMove = useCallback(
        (e: React.MouseEvent) => {
            // Panning
            if (isPanning.current) {
                const state = useCanvasStore.getState();
                state.setPanOffset({
                    x: panStartOffset.current.x + (e.clientX - panStartMouse.current.x),
                    y: panStartOffset.current.y + (e.clientY - panStartMouse.current.y),
                });
                return;
            }

            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const state = useCanvasStore.getState();
            const point: Point = {
                x: (e.clientX - rect.left - state.panOffset.x) / state.scale,
                y: (e.clientY - rect.top - state.panOffset.y) / state.scale,
            };

            emitCursorMove(point.x, point.y);

            // Dragging (select)
            if (isDragging.current) {
                const selId = state.selectedElementId;
                if (!selId) return;
                const el = state.elements.find((e) => e.id === selId);
                if (!el) return;
                const dx = point.x - startPoint.current.x;
                const dy = point.y - startPoint.current.y;
                startPoint.current = point;
                if (el.type === "sticky" || el.type === "text") {
                    state.updateElement(selId, { x: (el.x ?? 0) + dx, y: (el.y ?? 0) + dy });
                } else if (el.points.length > 0) {
                    state.updateElement(selId, {
                        points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
                    });
                }
                return;
            }

            if (!isDrawing.current) return;

            const tool = state.currentTool;
            const currentElement = state.elements.find((el) => el.id === currentElementId.current);
            if (!currentElement) return;

            if (tool === "pen" || tool === "eraser") {
                currentPoints.current.push(point);
                state.updateElement(currentElementId.current, { points: [...currentPoints.current] });
            } else {
                state.updateElement(currentElementId.current, { points: [startPoint.current, point] });
            }
        },
        [emitCursorMove]
    );

    const handlePointerUp = useCallback(() => {
        if (isPanning.current) {
            isPanning.current = false;
            return;
        }

        if (isDragging.current) {
            isDragging.current = false;
            const state = useCanvasStore.getState();
            const selId = state.selectedElementId;
            if (selId) {
                const el = state.elements.find((e) => e.id === selId);
                if (el) emitUpdateElement(selId, el);
            }
            return;
        }

        if (!isDrawing.current) return;
        isDrawing.current = false;

        const state = useCanvasStore.getState();
        const element = state.elements.find((el) => el.id === currentElementId.current);
        if (element) emitAddElement(element);
        currentPoints.current = [];
    }, [emitAddElement, emitUpdateElement]);

    // Submit text input
    const submitText = useCallback(() => {
        const val = textInput.value.trim();
        if (!val) {
            setTextInput({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0, value: "" });
            return;
        }
        const state = useCanvasStore.getState();
        const element: CanvasElement = {
            id: uuidv4(), type: "text", points: [], color: state.strokeColor,
            strokeWidth: state.strokeWidth, text: val,
            x: textInput.canvasX, y: textInput.canvasY,
        };
        state.pushToHistory();
        state.addElement(element);
        emitAddElement(element);
        setTextInput({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0, value: "" });
    }, [textInput, emitAddElement]);

    const getCursorStyle = (): string => {
        switch (currentTool) {
            case "pen": return "crosshair";
            case "eraser": return "cell";
            case "text": return "text";
            case "select": return "default";
            case "sticky": return "copy";
            default: return "crosshair";
        }
    };

    return (
        <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#1a1a2e]">
            <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                className="absolute inset-0 touch-none"
                style={{ cursor: getCursorStyle() }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
            />

            {/* Direct inline text input — click, type, Enter to commit */}
            {textInput.visible && (
                <div
                    className="absolute z-50"
                    style={{
                        left: textInput.x,
                        top: textInput.y - 14,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        ref={textInputRef}
                        type="text"
                        value={textInput.value}
                        onChange={(e) =>
                            setTextInput((prev) => ({ ...prev, value: e.target.value }))
                        }
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") submitText();
                            if (e.key === "Escape")
                                setTextInput({ visible: false, x: 0, y: 0, canvasX: 0, canvasY: 0, value: "" });
                        }}
                        placeholder="Type here, Enter to add"
                        className="bg-transparent outline-none border-b-2 border-blue-500 text-white px-1 py-0.5 placeholder:text-white/30"
                        style={{
                            fontSize: `${Math.max(14, useCanvasStore.getState().strokeWidth * 5 * scale)}px`,
                            fontFamily: "Inter, sans-serif",
                            color: useCanvasStore.getState().strokeColor,
                            minWidth: "180px",
                            caretColor: "#3b82f6",
                        }}
                        autoFocus
                    />
                </div>
            )}
        </div>
    );
}

