import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, userRoles } from "@shared/schema";
import bcrypt from "bcryptjs";
import MemoryStore from "memorystore";

// Strong passwords for development and owner accounts
const DEVELOPER_PASSWORD = "Dev@SpeedCube2025#";
const OWNER_PASSWORD = "Owner@SpeedCube2025!";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

// Function to hash passwords
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hashSync(password, 10);
}

// Function to compare hashed passwords
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return bcrypt.compareSync(supplied, stored);
}

// Function to set up authentication middleware
export async function setupAuth(app: Express) {
  const MemStore = MemoryStore(session);
  
  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "speedcube-scrambler-secret",
    resave: false,
    saveUninitialized: false,
    store: new MemStore({
      checkPeriod: 86400000 // 24 hours
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  // Initialize session management
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up local authentication strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.passwordHash))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Update last login timestamp
        await storage.updateUserLastLogin(user.id);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Serialize user ID to the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Create initial users if they don't exist
  await createInitialUsers();

  // API endpoints for authentication
  // Login endpoint
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    const user = req.user as User;
    res.json({
      id: user.id,
      username: user.username,
      role: user.role
    });
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as User;
    res.json({
      id: user.id,
      username: user.username,
      role: user.role
    });
  });
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Create initial developer and owner accounts
async function createInitialUsers() {
  // Check if users exist
  const users = await storage.getAllUsers();
  
  // If no users exist, create the initial accounts
  if (users.length === 0) {
    // Create developer account
    const devPasswordHash = await hashPassword(DEVELOPER_PASSWORD);
    await storage.createUser("developer", devPasswordHash, userRoles.DEVELOPER);
    
    // Create owner account
    const ownerPasswordHash = await hashPassword(OWNER_PASSWORD);
    await storage.createUser("owner", ownerPasswordHash, userRoles.OWNER);
    
    console.log("Initial accounts created.");
  }
}