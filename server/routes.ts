import express, { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { discordBot } from "./discord/bot";
import { scheduler } from "./discord/scheduler";
import { insertBotConfigSchema } from "@shared/schema";
import { z } from "zod";
import { requireAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // API routes - prefix with /api
  const apiRouter = express.Router();
  
  // Health check endpoint
  apiRouter.get("/health", (req, res) => {
    const botStatus = discordBot.isClientReady() ? "online" : "offline";
    res.json({ 
      status: "ok", 
      botStatus,
      timestamp: new Date().toISOString()
    });
  });
  
  // Get bot configuration
  apiRouter.get("/config", requireAuth, async (req, res) => {
    try {
      const configs = await storage.getAllBotConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching configurations:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });
  
  // Create or update bot configuration
  apiRouter.post("/config", requireAuth, async (req, res) => {
    try {
      const configData = insertBotConfigSchema.parse(req.body);
      
      // Check if config already exists for this guild
      const existingConfig = await storage.getBotConfigByGuildId(configData.guildId);
      
      if (existingConfig) {
        // Update existing config
        const updated = await storage.updateBotConfig(existingConfig.id, configData);
        res.json(updated);
      } else {
        // Create new config
        const newConfig = await storage.createBotConfig(configData);
        res.status(201).json(newConfig);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating/updating configuration:", error);
        res.status(500).json({ error: "Failed to create/update configuration" });
      }
    }
  });
  
  // Get all challenge threads
  apiRouter.get("/threads", requireAuth, async (req, res) => {
    try {
      const threads = await storage.getAllChallengeThreads();
      res.json(threads);
    } catch (error) {
      console.error("Error fetching threads:", error);
      res.status(500).json({ error: "Failed to fetch threads" });
    }
  });
  
  // Get the next scheduled challenge
  apiRouter.get("/next-challenge", (req, res) => {
    try {
      const nextChallenge = scheduler.getNextScheduledChallenge();
      res.json(nextChallenge);
    } catch (error) {
      console.error("Error getting next challenge:", error);
      res.status(500).json({ error: "Failed to get next challenge" });
    }
  });
  
  // Create a manual scramble thread
  apiRouter.post("/manual-scramble", requireAuth, async (req, res) => {
    try {
      const { guildId, channelId, cubeType } = req.body;
      
      if (!guildId || !channelId || !cubeType) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      const threadId = await discordBot.createManualScrambleThread(guildId, channelId, cubeType);
      res.status(201).json({ success: true, threadId });
    } catch (error) {
      console.error("Error creating manual scramble:", error);
      res.status(500).json({ error: "Failed to create manual scramble" });
    }
  });
  
  // Create a test thread using the currently configured channel and guild
  apiRouter.post("/create-test-thread", requireAuth, async (req, res) => {
    try {
      const configs = await storage.getAllBotConfigs();
      if (configs.length === 0) {
        return res.status(400).json({ error: "No bot configuration found" });
      }
      
      const config = configs[0];
      const { guildId, channelId } = config;
      const cubeType = req.body.cubeType || "3x3"; // Default to 3x3 if not specified
      
      if (!guildId || !channelId) {
        return res.status(400).json({ error: "Guild ID or Channel ID not configured" });
      }
      
      const threadId = await discordBot.createManualScrambleThread(guildId, channelId, cubeType);
      res.status(201).json({ success: true, threadId, channelId, guildId });
    } catch (error: unknown) {
      console.error("Error creating test thread:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: "Failed to create test thread", message: errorMessage });
    }
  });
  
  // Trigger the scheduled daily scramble post immediately
  apiRouter.post("/trigger-daily-post", requireAuth, async (req, res) => {
    try {
      console.log("Manual trigger of daily scramble post requested");
      const success = await scheduler.triggerDailyScramblePost();
      
      if (success) {
        res.status(200).json({ success: true, message: "Daily scramble post triggered successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to trigger daily scramble post" });
      }
    } catch (error: unknown) {
      console.error("Error triggering daily scramble post:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: "Failed to trigger daily scramble post", message: errorMessage });
    }
  });
  
  // Trigger thread cleanup manually (delete expired threads)
  apiRouter.post("/trigger-thread-cleanup", requireAuth, async (req, res) => {
    try {
      console.log("Manual trigger of thread cleanup requested");
      const result = await scheduler.triggerThreadCleanup();
      
      if (result.success) {
        res.status(200).json({ 
          success: true, 
          message: `Thread cleanup completed successfully. ${result.count} thread(s) processed.`,
          count: result.count 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to trigger thread cleanup",
          count: 0
        });
      }
    } catch (error: unknown) {
      console.error("Error triggering thread cleanup:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        error: "Failed to trigger thread cleanup", 
        message: errorMessage,
        count: 0
      });
    }
  });

  // Register the API router
  app.use("/api", apiRouter);
  
  // Add a simple keep-alive endpoint for external ping services
  app.get('/keep-alive', (_req, res) => {
    console.log('Keep-alive ping received at', new Date().toISOString());
    res.send('Bot is alive!');
  });
  
  return httpServer;
}
