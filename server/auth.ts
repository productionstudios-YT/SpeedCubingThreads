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

// Define express user interface
declare global {
  namespace Express {
    // Define the User interface for Express.User
    interface User {
      id: number;
      username: string;
      passwordHash: string;
      role: string;
      createdAt: Date;
      lastLogin: Date | null;
    }
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
    resave: true, // Changed to true to ensure session is saved
    saveUninitialized: true, // Changed to true to ensure new sessions are saved
    store: new MemStore({
      checkPeriod: 86400000 // 24 hours
    }),
    cookie: {
      secure: false, // Set to false to work in development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/' // Ensure cookie is available for all paths
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
  
  // Log all existing users
  const allUsers = await storage.getAllUsers();
  console.log("All registered users:", allUsers.map(u => ({ id: u.id, username: u.username, role: u.role })));

  // API endpoints for authentication
  // Login endpoint with detailed logging
  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt for username:", req.body.username);
    
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
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
        
        return res.json({
          id: user.id,
          username: user.username,
          role: user.role
        });
      });
    })(req, res, next);
  });

  // Logout endpoint with detailed logging
  app.post("/api/logout", (req, res, next) => {
    console.log("Logout attempt - User authenticated:", req.isAuthenticated());
    console.log("Logout attempt - Session ID:", req.sessionID);
    
    if (req.user) {
      const username = (req.user as User).username;
      console.log("Logout attempt by user:", username);
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

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    console.log("Auth check - isAuthenticated:", req.isAuthenticated());
    console.log("Auth check - session id:", req.sessionID);
    console.log("Auth check - session:", req.session);
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated - isAuthenticated() returned false" });
    }
    
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated - req.user is undefined" });
    }
    
    const user = req.user as User;
    console.log("Auth check - returning user:", { id: user.id, username: user.username, role: user.role });
    
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