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
  
  // Create a fixed CORS header middleware (will be applied to all session management routes)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
  });
  
  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "speedcube-scrambler-secret",
    resave: true,
    saveUninitialized: true,
    rolling: true,
    proxy: true,
    store: new MemStore({
      checkPeriod: 86400000 // 24 hours
    }),
    cookie: {
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
      path: '/',
      httpOnly: false // Allow JavaScript access to cookies for debugging
    },
    name: 'replit_sid' // Use a custom name to avoid conflicts
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
  passport.serializeUser((user: Express.User, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user ID:', id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log('User not found during deserialization');
        return done(null, false);
      }
      console.log('User deserialized successfully:', user.username);
      done(null, user);
    } catch (err) {
      console.log('Error during deserialization:', err);
      done(err);
    }
  });

  // Create initial users if they don't exist
  await createInitialUsers();

  // API endpoints for authentication
  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt for user:', req.body.username);
    
    passport.authenticate("local", (err: any, user: User, info: { message?: string }) => {
      if (err) {
        console.log('Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('Login failed - invalid credentials');
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.log('Login session error:', err);
          return next(err);
        }
        
        // Save the session explicitly to ensure it's stored
        req.session.save((err) => {
          if (err) {
            console.log('Session save error:', err);
            return next(err);
          }
          
          console.log('Login successful for:', user.username);
          console.log('Session ID:', req.sessionID);
          console.log('Session data:', req.session);
          console.log('Cookies:', req.cookies);
          
          const userResponse = {
            id: user.id,
            username: user.username,
            role: user.role
          };
          
          res.json(userResponse);
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("replit_sid"); // Match the cookie name we're using
        res.sendStatus(200);
      });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    console.log('Auth request received. Session ID:', req.sessionID);
    console.log('Cookies:', req.cookies);
    console.log('Session data:', req.session);
    
    if (!req.isAuthenticated() || !req.user) {
      console.log('User not authenticated:', { 
        isAuthenticated: req.isAuthenticated(), 
        hasUser: !!req.user,
        sessionID: req.sessionID,
        session: req.session
      });
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as User;
    console.log('User authenticated:', { 
      id: user.id, 
      username: user.username,
      sessionID: req.sessionID
    });
    
    // Refresh the session to extend its life
    req.session.touch();
    req.session.save((err) => {
      if (err) {
        console.log('Error saving session:', err);
      }
      
      res.json({
        id: user.id,
        username: user.username,
        role: user.role
      });
    });
  });
  
  // Debug endpoint to check session
  app.get("/api/debug/session", (req, res) => {
    console.log('Session debug info:', {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      cookies: req.cookies,
      session: req.session
    });
    
    res.json({
      sessionActive: !!req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user
    });
  });
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  console.log('Auth check - Session ID:', req.sessionID);
  console.log('Auth check - Cookies:', req.cookies);
  
  if (!req.isAuthenticated()) {
    console.log('Auth check failed - not authenticated');
    return res.status(401).json({ message: "Authentication required" });
  }
  console.log('Auth check passed - user is authenticated');
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