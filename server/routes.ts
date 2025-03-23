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
  
  // Register the API router
  app.use("/api", apiRouter);
  
  return httpServer;
}
