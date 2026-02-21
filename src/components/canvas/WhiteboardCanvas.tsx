"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { useCanvasStore, CanvasElement, Point } from "@/stores/canvasStore";
import { v4 as uuidv4 } from "uuid";
import getStroke from "perfect-freehand";

interface WhiteboardCanvasProps {
    emitAddElement: (element: CanvasElement) => void;
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

export default function WhiteboardCanvas({
    emitAddElement,
    emitCursorMove,
}: WhiteboardCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDrawing = useRef(false);
    const currentPoints = useRef<Point[]>([]);
    const currentElementId = useRef<string>("");
    const startPoint = useRef<Point>({ x: 0, y: 0 });
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const elements = useCanvasStore((s) => s.elements);
    const currentTool = useCanvasStore((s) => s.currentTool);

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

    // Redraw canvas whenever elements change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        elements.forEach((element) => {
            ctx.save();

            if (element.type === "pen") {
                if (element.points.length < 2) {
                    ctx.restore();
                    return;
                }
                const stroke = getStroke(
                    element.points.map((p) => [p.x, p.y]),
                    {
                        size: element.strokeWidth * 2,
                        thinning: 0.5,
                        smoothing: 0.5,
                        streamline: 0.5,
                    }
                );
                const pathData = getSvgPathFromStroke(stroke);
                const path = new Path2D(pathData);
                ctx.fillStyle = element.color;
                ctx.fill(path);
            } else if (element.type === "eraser") {
                if (element.points.length < 2) {
                    ctx.restore();
                    return;
                }
                ctx.globalCompositeOperation = "destination-out";
                const stroke = getStroke(
                    element.points.map((p) => [p.x, p.y]),
                    {
                        size: element.strokeWidth * 4,
                        thinning: 0,
                        smoothing: 0.5,
                        streamline: 0.5,
                    }
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
                    ctx.lineTo(
                        element.points[element.points.length - 1].x,
                        element.points[element.points.length - 1].y
                    );
                    ctx.stroke();
                }
            } else if (element.type === "rectangle") {
                if (element.points.length >= 2) {
                    const start = element.points[0];
                    const end = element.points[element.points.length - 1];
                    ctx.strokeStyle = element.color;
                    ctx.lineWidth = element.strokeWidth;
                    ctx.strokeRect(
                        start.x,
                        start.y,
                        end.x - start.x,
                        end.y - start.y
                    );
                }
            } else if (element.type === "circle") {
                if (element.points.length >= 2) {
                    const start = element.points[0];
                    const end = element.points[element.points.length - 1];
                    const radiusX = Math.abs(end.x - start.x) / 2;
                    const radiusY = Math.abs(end.y - start.y) / 2;
                    const centerX = start.x + (end.x - start.x) / 2;
                    const centerY = start.y + (end.y - start.y) / 2;
                    ctx.strokeStyle = element.color;
                    ctx.lineWidth = element.strokeWidth;
                    ctx.beginPath();
                    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else if (element.type === "text") {
                if (
                    element.text &&
                    element.x !== undefined &&
                    element.y !== undefined
                ) {
                    ctx.font = `${element.strokeWidth * 5}px Inter, sans-serif`;
                    ctx.fillStyle = element.color;
                    ctx.fillText(element.text, element.x, element.y);
                }
            }

            ctx.restore();
        });
    }, [elements, dimensions]);

    const getCanvasPoint = (e: React.MouseEvent): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handlePointerDown = useCallback(
        (e: React.MouseEvent) => {
            // Always read fresh state
            const state = useCanvasStore.getState();
            const tool = state.currentTool;
            const color = state.strokeColor;
            const width = state.strokeWidth;

            if (tool === "select" || tool === "sticky") return;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const point: Point = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };

            isDrawing.current = true;
            currentElementId.current = uuidv4();
            startPoint.current = point;

            if (tool === "text") {
                const text = prompt("Enter text:");
                if (text) {
                    const element: CanvasElement = {
                        id: currentElementId.current,
                        type: "text",
                        points: [],
                        color,
                        strokeWidth: width,
                        text,
                        x: point.x,
                        y: point.y,
                    };
                    state.pushToHistory();
                    state.addElement(element);
                    emitAddElement(element);
                }
                isDrawing.current = false;
                return;
            }

            currentPoints.current = [point];

            const element: CanvasElement = {
                id: currentElementId.current,
                type: tool,
                points: [point],
                color,
                strokeWidth: width,
            };
            state.pushToHistory();
            state.addElement(element);
        },
        [emitAddElement]
    );

    const handlePointerMove = useCallback(
        (e: React.MouseEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const point: Point = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };

            // Emit cursor position for collaboration
            emitCursorMove(point.x, point.y);

            if (!isDrawing.current) return;

            // Always read fresh state
            const state = useCanvasStore.getState();
            const tool = state.currentTool;
            const currentElement = state.elements.find(
                (el) => el.id === currentElementId.current
            );
            if (!currentElement) return;

            if (tool === "pen" || tool === "eraser") {
                currentPoints.current.push(point);
                state.updateElement(currentElementId.current, {
                    points: [...currentPoints.current],
                });
            } else {
                // For shapes, store start and current point
                state.updateElement(currentElementId.current, {
                    points: [startPoint.current, point],
                });
            }
        },
        [emitCursorMove]
    );

    const handlePointerUp = useCallback(() => {
        if (!isDrawing.current) return;
        isDrawing.current = false;

        const state = useCanvasStore.getState();
        const element = state.elements.find(
            (el) => el.id === currentElementId.current
        );
        if (element) {
            emitAddElement(element);
        }
        currentPoints.current = [];
    }, [emitAddElement]);

    const getCursorStyle = (): string => {
        switch (currentTool) {
            case "pen":
                return "crosshair";
            case "eraser":
                return "cell";
            case "text":
                return "text";
            case "select":
                return "default";
            default:
                return "crosshair";
        }
    };

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 overflow-hidden bg-[#1a1a2e]"
        >
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
        </div>
    );
}
