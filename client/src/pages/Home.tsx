import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, PowerOff, Calendar, Save, LogOut } from "lucide-react";
import { CubeType, ChallengeThread } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const [selectedTab, setSelectedTab] = useState<"bot" | "schedule" | "threads" | "settings">(
    "bot"
  );
  const [channelId, setChannelId] = useState("");
  const [guildId, setGuildId] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isConfirmRestartOpen, setIsConfirmRestartOpen] = useState(false);
  const [isConfirmShutdownOpen, setIsConfirmShutdownOpen] = useState(false);
  const [selectedCubeType, setSelectedCubeType] = useState<string>("");
  const [isReschedulePasswordOpen, setIsReschedulePasswordOpen] = useState(false);
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();

  const { data: healthData, isLoading: healthLoading } = useQuery<{
    status: string;
    botStatus: string;
    timestamp: string;
  }>({
    queryKey: ["/api/health"],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: threadsData, isLoading: threadsLoading } = useQuery<ChallengeThread[]>({
    queryKey: ["/api/threads"],
  });

  const { data: nextChallengeData, isLoading: nextChallengeLoading } = useQuery<{
    day: string;
    cubeType: string;
    nextTime: string;
    timeUntil: string;
    isToday: boolean;
  }>({
    queryKey: ["/api/next-challenge"],
  });
  
  const { data: configData } = useQuery<any[]>({
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
    mutationFn: async (data: { guildId: string; channelId: string; password: string }) => {
      return apiRequest("POST", "/api/config", {
        guildId: data.guildId,
        channelId: data.channelId,
        password: data.password,
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
      setIsPasswordDialogOpen(false);
      setPassword("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const restartBotMutation = useMutation({
    mutationFn: async (password: string) => {
      return apiRequest("POST", "/api/bot/restart", { password });
    },
    onSuccess: () => {
      toast({
        title: "Bot Restarted",
        description: "The bot has been restarted successfully.",
      });
      setIsConfirmRestartOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/health"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restart the bot. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const shutdownBotMutation = useMutation({
    mutationFn: async (password: string) => {
      return apiRequest("POST", "/api/bot/shutdown", { password });
    },
    onSuccess: () => {
      toast({
        title: "Bot Shutdown",
        description: "The bot has been shut down successfully.",
      });
      setIsConfirmShutdownOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/health"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to shut down the bot. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const rescheduleChallengeMutation = useMutation({
    mutationFn: async (data: { cubeType: string; password: string }) => {
      return apiRequest("POST", "/api/reschedule", data);
    },
    onSuccess: () => {
      toast({
        title: "Challenge Rescheduled",
        description: "A new challenge thread has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reschedule the challenge. Please try again.",
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
              Daily Scrambles Available 24/7
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
                          are posted automatically and available 24/7, with threads
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
                              Available{" "}
                              <span className="text-white">
                                24/7
                              </span>
                              {nextChallengeData?.isToday ? 
                                " (already created for today)" : 
                                " (next type changes in " + nextChallengeData?.timeUntil + ")"}
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
                          <TableHead className="text-[#A3A6AA]">Availability</TableHead>
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
                            Available 24/7
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
                            Available 24/7
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
                            Available 24/7
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
                            Available 24/7
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
                            Available 24/7
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
                            Available 24/7
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
                            Available 24/7
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
                            
                            // Open password confirmation dialog
                            setIsPasswordDialogOpen(true);
                          }}
                          disabled={configMutation.isPending}
                        >
                          {configMutation.isPending ? "Saving..." : "Save Settings"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* System Control Section */}
                <h3 className="text-white font-semibold mb-2 mt-6">
                  System Controls
                </h3>
                <Card className="bg-[#2F3136] border-0">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-[#36393F] border-0">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-white text-base">Bot Control</CardTitle>
                          <CardDescription className="text-[#A3A6AA]">Restart or shut down the bot</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="flex flex-col space-y-2">
                            <Button 
                              className="bg-[#5865F2] hover:bg-[#4752C4] text-white w-full"
                              onClick={() => setIsConfirmRestartOpen(true)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Restart Bot
                            </Button>
                            <Button 
                              variant="destructive"
                              className="w-full"
                              onClick={() => setIsConfirmShutdownOpen(true)}
                            >
                              <PowerOff className="mr-2 h-4 w-4" />
                              Shutdown Bot
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-[#36393F] border-0">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-white text-base">Account</CardTitle>
                          <CardDescription className="text-[#A3A6AA]">
                            Logged in as <span className="text-white">{user?.username}</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <Button 
                            variant="outline"
                            className="w-full bg-[#202225] text-white hover:bg-[#36393F] hover:text-[#DCDDDE]"
                            onClick={() => logoutMutation.mutate()}
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Password Dialog */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogContent className="bg-[#36393F] text-white border-none">
                <DialogHeader>
                  <DialogTitle>Confirm Password</DialogTitle>
                  <DialogDescription className="text-[#A3A6AA]">
                    Please enter your password to save settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-[#DCDDDE]">Password</label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    className="bg-[#202225] border-[#202225] text-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setIsPasswordDialogOpen(false);
                      setPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
                    onClick={() => {
                      if (!password) {
                        toast({
                          title: "Password Required",
                          description: "Please enter your password to continue.",
                          variant: "destructive"
                        });
                        return;
                      }
                      configMutation.mutate({ guildId, channelId, password });
                    }}
                    disabled={configMutation.isPending}
                  >
                    {configMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Restart Confirmation Dialog */}
            <Dialog open={isConfirmRestartOpen} onOpenChange={setIsConfirmRestartOpen}>
              <DialogContent className="bg-[#36393F] text-white border-none">
                <DialogHeader>
                  <DialogTitle>Confirm Bot Restart</DialogTitle>
                  <DialogDescription className="text-[#A3A6AA]">
                    Please enter your password to restart the bot.
                  </DialogDescription>
                </DialogHeader>
                <div className="mb-4">
                  <Alert className="bg-[#FFEEB3] text-black border-none">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      Restarting the bot will temporarily disrupt service.
                    </AlertDescription>
                  </Alert>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-[#DCDDDE]">Password</label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    className="bg-[#202225] border-[#202225] text-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setIsConfirmRestartOpen(false);
                      setPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
                    onClick={() => {
                      if (!password) {
                        toast({
                          title: "Password Required",
                          description: "Please enter your password to continue.",
                          variant: "destructive"
                        });
                        return;
                      }
                      restartBotMutation.mutate(password);
                    }}
                    disabled={restartBotMutation.isPending}
                  >
                    {restartBotMutation.isPending ? "Restarting..." : "Restart Bot"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Shutdown Confirmation Dialog */}
            <Dialog open={isConfirmShutdownOpen} onOpenChange={setIsConfirmShutdownOpen}>
              <DialogContent className="bg-[#36393F] text-white border-none">
                <DialogHeader>
                  <DialogTitle>Confirm Bot Shutdown</DialogTitle>
                  <DialogDescription className="text-[#A3A6AA]">
                    Please enter your password to shut down the bot.
                  </DialogDescription>
                </DialogHeader>
                <div className="mb-4">
                  <Alert className="bg-[#F8A4A8] text-black border-none">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Caution</AlertTitle>
                    <AlertDescription>
                      Shutting down the bot will stop all operations until manually restarted.
                    </AlertDescription>
                  </Alert>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-[#DCDDDE]">Password</label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    className="bg-[#202225] border-[#202225] text-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setIsConfirmShutdownOpen(false);
                      setPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      if (!password) {
                        toast({
                          title: "Password Required",
                          description: "Please enter your password to continue.",
                          variant: "destructive"
                        });
                        return;
                      }
                      shutdownBotMutation.mutate(password);
                    }}
                    disabled={shutdownBotMutation.isPending}
                  >
                    {shutdownBotMutation.isPending ? "Shutting Down..." : "Shutdown Bot"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Reschedule Password Dialog */}
            <Dialog open={isReschedulePasswordOpen} onOpenChange={setIsReschedulePasswordOpen}>
              <DialogContent className="bg-[#36393F] text-white border-none">
                <DialogHeader>
                  <DialogTitle>Confirm Password</DialogTitle>
                  <DialogDescription className="text-[#A3A6AA]">
                    Please enter your password to reschedule a {selectedCubeType} challenge
                  </DialogDescription>
                </DialogHeader>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#202225] border-0 text-white"
                />
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsReschedulePasswordOpen(false);
                      setPassword("");
                    }}
                    className="text-[#A3A6AA] hover:text-white hover:bg-[#2F3136]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedCubeType && password) {
                        rescheduleChallengeMutation.mutate({
                          cubeType: selectedCubeType,
                          password,
                        });
                        setIsReschedulePasswordOpen(false);
                        setPassword("");
                      }
                    }}
                    className="bg-[#5865F2] text-white hover:bg-[#4752C4]"
                    disabled={rescheduleChallengeMutation.isPending || !password}
                  >
                    {rescheduleChallengeMutation.isPending ? "Rescheduling..." : "Reschedule"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {selectedTab === "threads" && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white font-semibold">
                    Challenge Threads
                  </h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs"
                        size="sm"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Reschedule Challenge
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#36393F] text-white border-none">
                      <DialogHeader>
                        <DialogTitle>Reschedule Challenge</DialogTitle>
                        <DialogDescription className="text-[#A3A6AA]">
                          Create a new challenge thread immediately.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-2">
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant="outline"
                            className="bg-[#202225] hover:bg-[#36393F] text-white border-[#202225]"
                            onClick={() => {
                              setSelectedCubeType("3x3");
                              setIsReschedulePasswordOpen(true);
                            }}
                          >
                            3x3
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-[#202225] hover:bg-[#36393F] text-white border-[#202225]"
                            onClick={() => {
                              setSelectedCubeType("2x2");
                              setIsReschedulePasswordOpen(true);
                            }}
                          >
                            2x2
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-[#202225] hover:bg-[#36393F] text-white border-[#202225]"
                            onClick={() => {
                              setSelectedCubeType("3x3 BLD");
                              setIsReschedulePasswordOpen(true);
                            }}
                          >
                            3x3 BLD
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-[#202225] hover:bg-[#36393F] text-white border-[#202225]"
                            onClick={() => {
                              setSelectedCubeType("3x3 OH");
                              setIsReschedulePasswordOpen(true);
                            }}
                          >
                            3x3 OH
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-[#202225] hover:bg-[#36393F] text-white border-[#202225]"
                            onClick={() => {
                              setSelectedCubeType("Skewb");
                              setIsReschedulePasswordOpen(true);
                            }}
                          >
                            Skewb
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-[#202225] hover:bg-[#36393F] text-white border-[#202225]"
                            onClick={() => {
                              setSelectedCubeType("Pyraminx");
                              setIsReschedulePasswordOpen(true);
                            }}
                          >
                            Pyraminx
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-[#202225] hover:bg-[#36393F] text-white border-[#202225]"
                            onClick={() => {
                              setSelectedCubeType("Clock");
                              setIsReschedulePasswordOpen(true);
                            }}
                          >
                            Clock
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
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
