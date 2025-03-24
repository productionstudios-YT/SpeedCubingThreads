import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CubeType, ChallengeThread } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [selectedTab, setSelectedTab] = useState<"bot" | "schedule" | "threads" | "settings">(
    "bot"
  );
  const [channelId, setChannelId] = useState("");
  const [guildId, setGuildId] = useState("");
  const { toast } = useToast();

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: threadsData, isLoading: threadsLoading } = useQuery({
    queryKey: ["/api/threads"],
  });

  const { data: nextChallengeData, isLoading: nextChallengeLoading } = useQuery({
    queryKey: ["/api/next-challenge"],
  });
  
  const { data: configData } = useQuery({
    queryKey: ["/api/config"],
  });
  
  // Update form values when config data is loaded
  useEffect(() => {
    if (configData && Array.isArray(configData) && configData.length > 0) {
      const config = configData[0];
      setGuildId(config.guildId || "");
      setChannelId(config.channelId || "");
    }
  }, [configData]);

  const configMutation = useMutation({
    mutationFn: async (data: { guildId: string; channelId: string }) => {
      return apiRequest("POST", "/api/config", {
        guildId: data.guildId,
        channelId: data.channelId,
        enabled: true,
        timeToPost: "16:00",
        timezone: "Asia/Kolkata",
        deleteAfterHours: 24,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({
        title: "Settings Saved",
        description: "Bot configuration has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-discord-bg-dark text-discord-text-normal">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-16 md:w-60 h-screen bg-[#2F3136] flex-shrink-0 flex flex-col">
          <div className="p-3 md:p-4 border-b border-[#202225]">
            <h1 className="text-white font-bold hidden md:block">
              SpeedCube Scrambler
            </h1>
            <div className="md:hidden flex justify-center">
              <span className="text-white text-xl">
                <i className="fas fa-cube"></i>
              </span>
            </div>
          </div>

          <div className="p-2 flex-grow overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-[#A3A6AA] text-xs uppercase ml-2 mb-1 hidden md:block">
                Bot Controls
              </h2>
              <div
                className={`flex items-center p-2 rounded hover:bg-[#36393F] cursor-pointer text-[#DCDDDE] ${
                  selectedTab === "bot" ? "bg-[#5865F2] text-white" : ""
                }`}
                onClick={() => setSelectedTab("bot")}
              >
                <span className="mr-3 text-[#A3A6AA]">
                  <i className="fas fa-robot"></i>
                </span>
                <span className="hidden md:block">Bot Status</span>
              </div>
              <div
                className={`flex items-center p-2 rounded hover:bg-[#36393F] cursor-pointer text-[#DCDDDE] ${
                  selectedTab === "schedule" ? "bg-[#5865F2] text-white" : ""
                }`}
                onClick={() => setSelectedTab("schedule")}
              >
                <span className="mr-3 text-[#A3A6AA]">
                  <i className="fas fa-calendar-alt"></i>
                </span>
                <span className="hidden md:block">Schedule</span>
              </div>
              <div
                className={`flex items-center p-2 rounded hover:bg-[#36393F] cursor-pointer text-[#DCDDDE] ${
                  selectedTab === "threads" ? "bg-[#5865F2] text-white" : ""
                }`}
                onClick={() => setSelectedTab("threads")}
              >
                <span className="mr-3 text-[#A3A6AA]">
                  <i className="fas fa-comments"></i>
                </span>
                <span className="hidden md:block">Threads</span>
              </div>
              <div
                className={`flex items-center p-2 rounded hover:bg-[#36393F] cursor-pointer text-[#DCDDDE] ${
                  selectedTab === "settings" ? "bg-[#5865F2] text-white" : ""
                }`}
                onClick={() => setSelectedTab("settings")}
              >
                <span className="mr-3 text-[#A3A6AA]">
                  <i className="fas fa-cog"></i>
                </span>
                <span className="hidden md:block">Settings</span>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-[#A3A6AA] text-xs uppercase ml-2 mb-1 hidden md:block">
                Cube Types
              </h2>

              <div className="flex items-center p-2 rounded hover:bg-[#36393F] cursor-pointer mb-1 text-discord-text-normal">
                <span className="mr-3 text-[#A3A6AA]">
                  <i className="fas fa-cube"></i>
                </span>
                <span className="hidden md:block">3x3</span>
              </div>

              <div className="flex items-center p-2 rounded hover:bg-[#36393F] cursor-pointer mb-1 text-discord-text-normal">
                <span className="mr-3 text-[#A3A6AA]">
                  <i className="fas fa-cube"></i>
                </span>
                <span className="hidden md:block">2x2</span>
              </div>

              <div className="flex items-center p-2 rounded hover:bg-[#36393F] cursor-pointer mb-1 text-discord-text-normal">
                <span className="mr-3 text-[#A3A6AA]">
                  <i className="fas fa-cube"></i>
                </span>
                <span className="hidden md:block">3x3 BLD</span>
              </div>

              <div className="flex items-center p-2 rounded hover:bg-[#36393F] cursor-pointer mb-1 text-discord-text-normal">
                <span className="mr-3 text-[#A3A6AA]">
                  <i className="fas fa-cube"></i>
                </span>
                <span className="hidden md:block">3x3 OH</span>
              </div>

              <div className="flex items-center p-2 rounded hover:bg-[#36393F] cursor-pointer mb-1 text-discord-text-normal">
                <span className="mr-3 text-[#A3A6AA]">
                  <i className="fas fa-cube"></i>
                </span>
                <span className="hidden md:block">Skewb</span>
              </div>

              <div className="flex items-center p-2 rounded hover:bg-[#36393F] cursor-pointer mb-1 text-discord-text-normal">
                <span className="mr-3 text-[#A3A6AA]">
                  <i className="fas fa-cube"></i>
                </span>
                <span className="hidden md:block">Pyraminx</span>
              </div>

              <div className="flex items-center p-2 rounded hover:bg-[#36393F] cursor-pointer mb-1 text-discord-text-normal">
                <span className="mr-3 text-[#A3A6AA]">
                  <i className="fas fa-clock"></i>
                </span>
                <span className="hidden md:block">Clock</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#202225]">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white mr-2">
                <i className="fas fa-robot"></i>
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-semibold text-white">CubeBot</div>
                <div className="text-xs text-[#A3A6AA]">
                  {healthData?.botStatus === "online" ? "Online" : "Offline"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Channel Header */}
          <div className="h-12 border-b border-[#202225] flex items-center px-4">
            <span className="mr-2 text-[#A3A6AA]">#</span>
            <span className="font-bold">🗓•daily-scramble</span>
            <div className="ml-2 text-xs text-[#A3A6AA] bg-[#2F3136] py-0.5 px-2 rounded">
              Daily Scrambles at 4:00 PM IST
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {selectedTab === "bot" && (
              <>
                {/* Bot Info Card */}
                <Card className="bg-[#2F3136] rounded-md mb-6 border-0">
                  <CardContent className="p-4">
                    <div className="flex items-start">
                      <div className="w-12 h-12 rounded-full bg-[#5865F2] flex items-center justify-center text-white mr-4 flex-shrink-0">
                        <i className="fas fa-robot text-2xl"></i>
                      </div>
                      <div>
                        <h2 className="text-white font-bold text-lg mb-1">
                          SpeedCube Scrambler Bot
                        </h2>
                        <p className="text-[#DCDDDE] mb-2">
                          This bot posts daily scramble challenges for different
                          cube types based on the day of the week. Challenges
                          are posted at 4:00 PM IST and threads are
                          automatically deleted after 24 hours.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-[#202225] text-xs px-2 py-1 rounded">
                            <i className="fas fa-calendar-alt mr-1"></i> Daily
                            Challenges
                          </span>
                          <span className="bg-[#202225] text-xs px-2 py-1 rounded">
                            <i className="fas fa-cube mr-1"></i> Multiple Cube
                            Types
                          </span>
                          <span className="bg-[#202225] text-xs px-2 py-1 rounded">
                            <i className="fas fa-clock mr-1"></i> Auto Thread
                            Cleanup
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bot Status */}
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-2">Bot Status</h3>
                  <Card className="bg-[#2F3136] border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center mb-4">
                        <div
                          className={`w-3 h-3 rounded-full mr-2 ${
                            healthData?.botStatus === "online"
                              ? "bg-[#57F287]"
                              : "bg-[#ED4245]"
                          }`}
                        ></div>
                        <span className="text-white font-medium">
                          {healthData?.botStatus === "online"
                            ? "Online"
                            : "Offline"}
                        </span>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-white font-medium mb-2">
                          Next Challenge
                        </h4>
                        {nextChallengeLoading ? (
                          <div className="text-[#A3A6AA]">Loading...</div>
                        ) : (
                          <div className="bg-[#202225] p-3 rounded-md">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-white font-medium">
                                {nextChallengeData?.day}{" "}
                                {nextChallengeData?.cubeType} Challenge
                              </span>
                              <Badge
                                className={
                                  nextChallengeData?.isToday
                                    ? "bg-[#57F287]"
                                    : "bg-[#FEE75C] text-black"
                                }
                              >
                                {nextChallengeData?.isToday
                                  ? "Today"
                                  : "Tomorrow"}
                              </Badge>
                            </div>
                            <div className="text-[#A3A6AA] text-sm">
                              Scheduled for{" "}
                              <span className="text-white">
                                {nextChallengeData?.nextTime}
                              </span>{" "}
                              (in {nextChallengeData?.timeUntil})
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {selectedTab === "schedule" && (
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-2">
                  Weekly Schedule
                </h3>
                <Card className="bg-[#2F3136] border-0">
                  <CardContent className="p-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-[#202225]">
                          <TableHead className="text-[#A3A6AA]">Day</TableHead>
                          <TableHead className="text-[#A3A6AA]">
                            Cube Type
                          </TableHead>
                          <TableHead className="text-[#A3A6AA]">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="border-b border-[#202225]">
                          <TableCell className="text-white">Monday</TableCell>
                          <TableCell>
                            <Badge className="bg-[#202225] text-[#DCDDDE]">
                              Skewb
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#DCDDDE]">
                            4:00 PM IST
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-[#202225]">
                          <TableCell className="text-white">Tuesday</TableCell>
                          <TableCell>
                            <Badge className="bg-[#202225] text-[#DCDDDE]">
                              3x3 BLD
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#DCDDDE]">
                            4:00 PM IST
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-[#202225]">
                          <TableCell className="text-white">
                            Wednesday
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-[#202225] text-[#DCDDDE]">
                              2x2
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#DCDDDE]">
                            4:00 PM IST
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-[#202225]">
                          <TableCell className="text-white">Thursday</TableCell>
                          <TableCell>
                            <Badge className="bg-[#202225] text-[#DCDDDE]">
                              3x3
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#DCDDDE]">
                            4:00 PM IST
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-[#202225]">
                          <TableCell className="text-white">Friday</TableCell>
                          <TableCell>
                            <Badge className="bg-[#202225] text-[#DCDDDE]">
                              Pyraminx
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#DCDDDE]">
                            4:00 PM IST
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-b border-[#202225]">
                          <TableCell className="text-white">Saturday</TableCell>
                          <TableCell>
                            <Badge className="bg-[#202225] text-[#DCDDDE]">
                              3x3 OH
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#DCDDDE]">
                            4:00 PM IST
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-white">Sunday</TableCell>
                          <TableCell>
                            <Badge className="bg-[#202225] text-[#DCDDDE]">
                              Clock
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#DCDDDE]">
                            4:00 PM IST
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "settings" && (
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-2">
                  Bot Settings
                </h3>
                <Card className="bg-[#2F3136] border-0">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[#DCDDDE] text-sm font-medium mb-1">
                          Discord Guild ID
                        </label>
                        <Input
                          className="bg-[#202225] border-[#202225] text-white placeholder:text-[#72767D]"
                          placeholder="Enter the Discord Guild ID"
                          value={guildId}
                          onChange={(e) => setGuildId(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[#DCDDDE] text-sm font-medium mb-1">
                          Channel ID for #🗓•daily-scramble
                        </label>
                        <Input
                          className="bg-[#202225] border-[#202225] text-white placeholder:text-[#72767D]"
                          placeholder="Enter the Channel ID"
                          value={channelId}
                          onChange={(e) => setChannelId(e.target.value)}
                        />
                      </div>
                      <div className="pt-2">
                        <Button
                          className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
                          onClick={() => {
                            if (!guildId || !channelId) {
                              toast({
                                title: "Missing Information",
                                description: "Please enter both Guild ID and Channel ID.",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            configMutation.mutate({ guildId, channelId });
                          }}
                          disabled={configMutation.isPending}
                        >
                          {configMutation.isPending ? "Saving..." : "Save Settings"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "threads" && (
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-2">
                  Challenge Threads
                </h3>
                <Card className="bg-[#2F3136] border-0">
                  <CardContent className="p-4">
                    {threadsLoading ? (
                      <div className="text-[#A3A6AA]">Loading threads...</div>
                    ) : threadsData?.length === 0 ? (
                      <div className="text-[#A3A6AA]">
                        No challenge threads yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {threadsData?.map((thread: ChallengeThread) => (
                          <div
                            key={thread.id}
                            className="bg-[#36393F] p-3 rounded-md"
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white mr-3 flex-shrink-0">
                                <i className="fas fa-robot"></i>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <span className="font-medium text-white">
                                    {thread.cubeType} Challenge
                                  </span>
                                  <Badge
                                    className={
                                      thread.isDeleted
                                        ? "ml-2 bg-[#202225] text-[#A3A6AA]"
                                        : new Date(thread.expiresAt) <
                                          new Date(
                                            Date.now() + 1000 * 60 * 60
                                          )
                                        ? "ml-2 bg-[#FEE75C] text-black"
                                        : "ml-2 bg-[#57F287] text-white"
                                    }
                                  >
                                    {thread.isDeleted
                                      ? "Deleted"
                                      : new Date(thread.expiresAt) <
                                        new Date(Date.now() + 1000 * 60 * 60)
                                      ? "Ending Soon"
                                      : "Active"}
                                  </Badge>
                                </div>
                                <div className="text-xs text-[#A3A6AA]">
                                  Created{" "}
                                  {formatDate(thread.createdAt.toString())} •
                                  Expires{" "}
                                  {formatDate(thread.expiresAt.toString())}
                                </div>
                                <div className="mt-2 font-mono text-sm bg-[#202225] p-2 rounded overflow-x-auto">
                                  {thread.scramble}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
