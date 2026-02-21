# Real-Time Collaborative Whiteboard

A real-time collaborative whiteboard built with **Next.js 15**, **Socket.IO**, **Redis**, and **Shadcn/UI**. Draw, sketch, and brainstorm together in real time with WebSocket-powered syncing.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-purple?style=flat-square&logo=socket.io)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-cyan?style=flat-square&logo=tailwindcss)

## Features

- **🎨 Drawing Tools** — Freehand pen (smooth Bézier curves), line, rectangle, circle, eraser, and text
- **👥 Real-Time Collaboration** — Live drawing sync, cursor tracking, and user presence indicators via WebSockets
- **🎯 Operational Transformation** — Conflict resolution for concurrent multi-user edits
- **🔄 Undo/Redo** — Full history stack with keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z)
- **🎨 Color & Stroke** — Customizable colors and stroke widths with a rich color picker
- **📤 Export** — Download whiteboard as high-quality PNG
- **🌙 Dark Mode** — Premium dark theme with glassmorphism UI
- **🔗 Room Sharing** — Share room links for instant collaboration

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| UI Components | Shadcn/UI, Tailwind CSS, Lucide Icons |
| Canvas | HTML5 Canvas API + perfect-freehand |
| Real-time | Socket.IO (custom Next.js server) |
| Pub/Sub | Redis (via ioredis) |
| State | Zustand |

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Redis (optional, for multi-server scaling)

### Installation

```bash
# Clone the repository
git clone https://github.com/princeraj27/Real-Time-Collaborative-Whiteboard.git
cd Real-Time-Collaborative-Whiteboard

# Install dependencies
bun install

# Start the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to start collaborating.

### Usage

1. **Create a Room** — Click "Create a Room", enter your name, and start drawing
2. **Join a Room** — Share the room link or paste a room ID to join an existing session
3. **Draw** — Use the toolbar to select drawing tools, colors, and stroke widths
4. **Collaborate** — See other users' cursors and drawings in real time
5. **Export** — Download your whiteboard as a PNG image

## Project Structure

```
├── server.ts                      # Custom Next.js server with Socket.IO
├── src/
│   ├── app/
│   │   ├── page.tsx               # Landing page
│   │   └── board/[roomId]/page.tsx # Whiteboard room
│   ├── components/
│   │   ├── canvas/                # Canvas, cursor overlay
│   │   ├── toolbar/               # Drawing tools, color picker
│   │   ├── sidebar/               # User presence, room info
│   │   └── ui/                    # Shadcn/UI components
│   ├── hooks/                     # useSocket, useHistory
│   ├── stores/                    # Zustand canvas store
│   └── lib/                       # Socket.IO client, utilities
```

## Architecture

```
Client A ──┐
Client B ──├── Socket.IO ──> Custom Server ──> Redis PubSub
Client C ──┘                    │
                                ├── Room State (in-memory)
                                └── Element Broadcasting
```

## License

MIT
