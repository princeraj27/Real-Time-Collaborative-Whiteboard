"use client";

import React from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Users, Link2 } from "lucide-react";

export default function Sidebar() {
    const { users, roomId } = useCanvasStore();

    const copyRoomId = () => {
        if (roomId) {
            navigator.clipboard.writeText(
                `${window.location.origin}/board/${roomId}`
            );
        }
    };

    return (
        <div className="absolute top-4 right-4 z-30 w-60">
            {/* Room Info Card */}
            <div className="bg-[#16213e]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
                {/* Room Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-blue-400" />
                        <span className="text-xs font-medium text-gray-300">Room</span>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                id="copy-room-btn"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                                onClick={copyRoomId}
                            >
                                <Copy className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                            Copy invite link
                        </TooltipContent>
                    </Tooltip>
                </div>
                <div className="text-[11px] text-gray-500 font-mono bg-white/5 rounded-lg px-2.5 py-1.5 truncate mb-4">
                    {roomId?.slice(0, 8)}...{roomId?.slice(-4)}
                </div>

                {/* Users */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-400" />
                        <span className="text-xs font-medium text-gray-300">Online</span>
                    </div>
                    <Badge
                        variant="secondary"
                        className="bg-green-500/20 text-green-400 border-0 text-[10px] px-2 py-0"
                    >
                        {users.filter((u) => u.isOnline).length}
                    </Badge>
                </div>

                <div className="space-y-2">
                    {users
                        .filter((u) => u.isOnline)
                        .map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <Avatar className="h-7 w-7 border-2" style={{ borderColor: user.color }}>
                                    <AvatarFallback
                                        className="text-[10px] font-bold text-white"
                                        style={{ backgroundColor: user.color + "33" }}
                                    >
                                        {user.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-200 truncate">
                                        {user.name}
                                    </p>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                            </div>
                        ))}
                </div>

                {users.filter((u) => u.isOnline).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-3">
                        No one else is here yet
                    </p>
                )}
            </div>
        </div>
    );
}
