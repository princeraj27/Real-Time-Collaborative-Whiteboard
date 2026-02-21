"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pencil,
  Users,
  Share2,
  Download,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const createRoom = () => {
    if (!userName.trim()) return;
    const roomId = uuidv4();
    localStorage.setItem("whiteboard-username", userName);
    router.push(`/board/${roomId}`);
  };

  const joinRoom = () => {
    if (!joinRoomId.trim() || !userName.trim()) return;
    localStorage.setItem("whiteboard-username", userName);
    // Extract room ID from URL if user pastes full URL
    const id = joinRoomId.includes("/board/")
      ? joinRoomId.split("/board/")[1]
      : joinRoomId;
    router.push(`/board/${id}`);
  };

  const features = [
    {
      icon: Pencil,
      title: "Drawing Tools",
      description:
        "Freehand pen, shapes, text, and sticky notes with customizable colors and stroke widths.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Users,
      title: "Real-Time Collaboration",
      description:
        "See live cursors, presence indicators, and instant drawing sync across all connected users.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Share2,
      title: "Instant Sharing",
      description:
        "Share your room link and collaborate with anyone, anywhere. No sign-up required.",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: Download,
      title: "Export Anywhere",
      description:
        "Download your whiteboard as high-quality PNG images for presentations and documentation.",
      gradient: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a1a] text-white overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-300">
              Real-Time Collaborative Whiteboard
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-white via-blue-200 to-purple-300 bg-clip-text text-transparent">
              Draw Together
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              In Real Time
            </span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            A collaborative canvas for teams. Sketch ideas, plan projects, and
            brainstorm together — all in real time with WebSocket-powered
            syncing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button
                  id="create-room-btn"
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl px-8 py-6 text-base font-semibold shadow-2xl shadow-blue-600/20 transition-all hover:shadow-blue-600/40 hover:scale-105"
                >
                  Create a Room
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#16213e] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Create a New Room
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1.5 block">
                      Your Name
                    </label>
                    <Input
                      id="create-name-input"
                      placeholder="Enter your name..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createRoom()}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    id="confirm-create-btn"
                    onClick={createRoom}
                    disabled={!userName.trim()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl w-full"
                  >
                    Create & Join
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
              <DialogTrigger asChild>
                <Button
                  id="join-room-btn"
                  size="lg"
                  variant="outline"
                  className="border-white/10 text-white hover:bg-white/5 rounded-xl px-8 py-6 text-base font-semibold transition-all hover:scale-105"
                >
                  Join a Room
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#16213e] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Join an Existing Room
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1.5 block">
                      Your Name
                    </label>
                    <Input
                      id="join-name-input"
                      placeholder="Enter your name..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1.5 block">
                      Room ID or Link
                    </label>
                    <Input
                      id="join-room-id-input"
                      placeholder="Paste room ID or link..."
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    id="confirm-join-btn"
                    onClick={joinRoom}
                    disabled={!joinRoomId.trim() || !userName.trim()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl w-full"
                  >
                    Join Room
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} mb-3 shadow-lg`}
              >
                <feature.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">
                {feature.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-xs text-gray-600">
            Built with Next.js • WebSockets • Redis • Shadcn/UI
          </p>
        </div>
      </div>
    </main>
  );
}
