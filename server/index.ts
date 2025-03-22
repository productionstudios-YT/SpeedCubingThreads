import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { discordBot } from "./discord/bot";
import { scheduler } from "./discord/scheduler";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware for logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize Discord bot and scheduler
async function initializeServices() {
  try {
    // Initialize Discord bot with token from environment variable
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      console.error("DISCORD_TOKEN environment variable is required");
      process.exit(1);
    }
    
    // Initialize the Discord bot
    await discordBot.initialize(token);
    
    // Create a default bot config if none exists
    const configs = await storage.getAllBotConfigs();
    if (configs.length === 0) {
      // Default config - will need to be updated via API
      await storage.createBotConfig({
        channelId: process.env.DEFAULT_CHANNEL_ID || '',
        guildId: process.env.DEFAULT_GUILD_ID || '',
        timeToPost: "16:00", // 4:00 PM
        timezone: "Asia/Kolkata", // IST
        enabled: true,
        deleteAfterHours: 24
      });
    }
    
    // Initialize the scheduler
    await scheduler.initialize();
    
    console.log("Discord bot and scheduler initialized successfully");
  } catch (error) {
    console.error("Failed to initialize services:", error);
    process.exit(1);
  }
}

(async () => {
  // Register all routes
  const server = await registerRoutes(app);
  
  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite in development or serve static files in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Run on port 5000
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server listening on port ${port}`);
    
    // Initialize Discord bot and scheduler after server starts
    initializeServices().catch(err => {
      console.error("Failed to initialize services:", err);
    });
  });
  
  // Handle graceful shutdown
  const shutdown = async () => {
    log("Shutting down server...");
    
    // Stop all scheduled jobs
    scheduler.stopAllJobs();
    
    // Shutdown the Discord bot
    await discordBot.shutdown();
    
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
