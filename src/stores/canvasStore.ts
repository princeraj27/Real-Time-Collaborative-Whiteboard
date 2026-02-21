import { create } from "zustand";

export type Tool =
  | "pen"
  | "line"
  | "rectangle"
  | "circle"
  | "eraser"
  | "text"
  | "select"
  | "sticky";

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: Tool;
  points: Point[];
  color: string;
  strokeWidth: number;
  text?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  stickyColor?: string;
}

export interface RemoteCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  isOnline: boolean;
}

interface CanvasState {
  // Tools
  currentTool: Tool;
  strokeColor: string;
  strokeWidth: number;
  setTool: (tool: Tool) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;

  // Elements
  elements: CanvasElement[];
  setElements: (elements: CanvasElement[]) => void;
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  clearCanvas: () => void;

  // Selection
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;

  // History (undo/redo)
  history: CanvasElement[][];
  historyIndex: number;
  pushToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Users
  users: User[];
  setUsers: (users: User[]) => void;
  cursors: RemoteCursor[];
  setCursors: (cursors: RemoteCursor[]) => void;
  updateCursor: (cursor: RemoteCursor) => void;
  removeCursor: (id: string) => void;

  // Room
  roomId: string | null;
  userName: string;
  userId: string | null;
  setRoomId: (id: string) => void;
  setUserName: (name: string) => void;
  setUserId: (id: string) => void;
}

const MAX_HISTORY = 50;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Tools
  currentTool: "pen",
  strokeColor: "#ffffff",
  strokeWidth: 3,
  setTool: (tool) => set({ currentTool: tool }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),

  // Elements
  elements: [],
  setElements: (elements) => set({ elements }),
  addElement: (element) =>
    set((state) => ({ elements: [...state.elements, element] })),
  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })),
  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedElementId:
        state.selectedElementId === id ? null : state.selectedElementId,
    })),
  clearCanvas: () => {
    get().pushToHistory();
    set({ elements: [], selectedElementId: null });
  },

  // Selection
  selectedElementId: null,
  setSelectedElementId: (id) => set({ selectedElementId: id }),

  // History
  history: [[]],
  historyIndex: 0,
  pushToHistory: () => {
    const { elements, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(elements.map((el) => ({ ...el })));
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({
        historyIndex: newIndex,
        elements: history[newIndex].map((el) => ({ ...el })),
        selectedElementId: null,
      });
    }
  },
  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({
        historyIndex: newIndex,
        elements: history[newIndex].map((el) => ({ ...el })),
        selectedElementId: null,
      });
    }
  },
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // Users
  users: [],
  setUsers: (users) => set({ users }),
  cursors: [],
  setCursors: (cursors) => set({ cursors }),
  updateCursor: (cursor) =>
    set((state) => {
      const exists = state.cursors.find((c) => c.id === cursor.id);
      if (exists) {
        return {
          cursors: state.cursors.map((c) =>
            c.id === cursor.id ? cursor : c
          ),
        };
      }
      return { cursors: [...state.cursors, cursor] };
    }),
  removeCursor: (id) =>
    set((state) => ({
      cursors: state.cursors.filter((c) => c.id !== id),
    })),

  // Room
  roomId: null,
  userName: "",
  userId: null,
  setRoomId: (id) => set({ roomId: id }),
  setUserName: (name) => set({ userName: name }),
  setUserId: (id) => set({ userId: id }),
}));
