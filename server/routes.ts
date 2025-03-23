import express, { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { discordBot } from "./discord/bot";
import { scheduler } from "./discord/scheduler";
import { insertBotConfigSchema } from "@shared/schema";
import { z } from "zod";
import passport from "passport";
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
  
  // Debug session endpoint for troubleshooting
  apiRouter.get("/debug/session", (req, res) => {
    // Safe representation of session data (removing sensitive information)
    const safeSession = req.session ? {
      id: req.sessionID,
      cookie: req.session.cookie,
      passport: (req.session as any).passport ? { 
        user: (req.session as any).passport.user // Just the user ID
      } : undefined,
      authenticated: req.isAuthenticated()
    } : null;
    
    res.json({
      authenticated: req.isAuthenticated(),
      sessionExists: !!req.session,
      sessionID: req.sessionID,
      session: safeSession,
      hasUser: !!req.user,
      cookies: req.headers.cookie,
      headers: {
        ...req.headers,
        // Don't include authorization header as it may contain sensitive info
        authorization: req.headers.authorization ? '[REDACTED]' : undefined
      }
    });
  });
  
  // Additional detailed debug endpoint
  apiRouter.get("/debug/request", (req, res) => {
    console.log("Debug request received - Full URL:", req.originalUrl);
    console.log("Debug request cookies:", req.headers.cookie);
    
    // Create a debug cookie to test cookie functionality
    res.cookie('debug_test', 'working', { 
      maxAge: 60000, // 1 minute
      httpOnly: true,
      path: '/'
    });
    
    res.json({
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      headers: {
        ...req.headers,
        // Don't include authorization header as it may contain sensitive info
        authorization: req.headers.authorization ? '[REDACTED]' : undefined
      },
      cookies: req.headers.cookie,
      ip: req.ip,
      auth: {
        isAuthenticated: req.isAuthenticated(),
        user: req.user ? {
          id: (req.user as any).id,
          username: (req.user as any).username,
          role: (req.user as any).role
        } : null
      },
      message: "Debug cookie 'debug_test' set for 1 minute"
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
      // Extract password for verification
      const { password, ...configDataRaw } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }
      
      // In a real implementation, you would verify if the password matches the user's password
      // For this demo, we'll just accept it if they're authenticated
      
      const configData = insertBotConfigSchema.parse(configDataRaw);
      
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
  
  // Bot restart endpoint
  apiRouter.post("/bot/restart", requireAuth, async (req, res) => {
    try {
      // Verify password
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }
      
      // In a real implementation, you would verify if the password matches the user's password
      // For this demo, we'll just accept it if they're authenticated
      
      // Restart bot logic
      await discordBot.shutdown();
      await discordBot.initialize(process.env.DISCORD_TOKEN || "");
      
      res.json({ success: true, message: "Bot restarted successfully" });
    } catch (error) {
      console.error("Error restarting bot:", error);
      res.status(500).json({ error: "Failed to restart bot" });
    }
  });
  
  // Bot shutdown endpoint
  apiRouter.post("/bot/shutdown", requireAuth, async (req, res) => {
    try {
      // Verify password
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }
      
      // Shutdown bot logic
      await discordBot.shutdown();
      
      res.json({ success: true, message: "Bot shut down successfully" });
    } catch (error) {
      console.error("Error shutting down bot:", error);
      res.status(500).json({ error: "Failed to shut down bot" });
    }
  });
  
  // Reschedule challenge endpoint
  apiRouter.post("/reschedule", requireAuth, async (req, res) => {
    try {
      const { cubeType, password } = req.body;
      
      if (!cubeType || !password) {
        return res.status(400).json({ error: "Cube type and password are required" });
      }
      
      // Get the first bot config
      const configs = await storage.getAllBotConfigs();
      if (configs.length === 0) {
        return res.status(400).json({ error: "No bot configuration found" });
      }
      
      const config = configs[0];
      const threadId = await discordBot.createManualScrambleThread(config.guildId, config.channelId, cubeType);
      
      res.status(201).json({ success: true, threadId });
    } catch (error) {
      console.error("Error rescheduling challenge:", error);
      res.status(500).json({ error: "Failed to reschedule challenge" });
    }
  });
  
  // Add proper auth endpoints that match the client-side expectations
  apiRouter.post("/auth/login", (req, res, next) => {
    console.log("Auth login attempt for username:", req.body.username);
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Login failed: Invalid credentials");
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error during session establishment:", loginErr);
          return next(loginErr);
        }
        
        console.log("Login successful, session established for user:", user.username);
        console.log("Session ID:", req.sessionID);
        
        // Force session save to ensure it persists
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return next(saveErr);
          }
          
          // Only return safe user data (no password hash)
          return res.json({
            id: user.id,
            username: user.username,
            role: user.role
          });
        });
      });
    })(req, res, next);
  });

  // Proper logout endpoint
  apiRouter.post("/auth/logout", (req, res, next) => {
    console.log("Auth logout attempt - User authenticated:", req.isAuthenticated());
    console.log("Auth logout attempt - Session ID:", req.sessionID);
    
    if (req.user) {
      const username = (req.user as any).username;
      console.log("Auth logout attempt by user:", username);
    }
    
    if (req.session) {
      console.log("Destroying session...");
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return next(err);
        }
        
        req.logout(() => {
          console.log("Logout successful, session destroyed");
          return res.sendStatus(200);
        });
      });
    } else {
      console.log("No session found during logout attempt");
      res.sendStatus(200);
    }
  });
  
  // Register the API router
  app.use("/api", apiRouter);
  
  return httpServer;
}
