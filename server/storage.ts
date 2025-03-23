import { BotConfig, ChallengeThread, InsertBotConfig, InsertChallengeThread, User, UserRole } from '@shared/schema';

// Interface for the storage operations
export interface IStorage {
  // Bot config operations
  getBotConfig(id: number): Promise<BotConfig | undefined>;
  getBotConfigByGuildId(guildId: string): Promise<BotConfig | undefined>;
  getAllBotConfigs(): Promise<BotConfig[]>;
  createBotConfig(config: InsertBotConfig): Promise<BotConfig>;
  updateBotConfig(id: number, config: Partial<BotConfig>): Promise<BotConfig | undefined>;
  deleteBotConfig(id: number): Promise<boolean>;
  
  // Challenge thread operations
  getChallengeThread(id: number): Promise<ChallengeThread | undefined>;
  getChallengeThreadByThreadId(threadId: string): Promise<ChallengeThread | undefined>;
  getAllChallengeThreads(): Promise<ChallengeThread[]>;
  getExpiredThreads(): Promise<ChallengeThread[]>;
  createChallengeThread(thread: InsertChallengeThread): Promise<ChallengeThread>;
  markThreadAsDeleted(id: number): Promise<boolean>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(username: string, passwordHash: string, role: UserRole): Promise<User>;
  updateUserLastLogin(id: number): Promise<User | undefined>;
}

export class MemStorage implements IStorage {
  private botConfigs: Map<number, BotConfig>;
  private challengeThreads: Map<number, ChallengeThread>;
  private users: Map<number, User>;
  private botConfigCurrentId: number;
  private challengeThreadCurrentId: number;
  private userCurrentId: number;
  
  constructor() {
    this.botConfigs = new Map();
    this.challengeThreads = new Map();
    this.users = new Map();
    this.botConfigCurrentId = 1;
    this.challengeThreadCurrentId = 1;
    this.userCurrentId = 1;
  }
  
  // Bot config methods
  async getBotConfig(id: number): Promise<BotConfig | undefined> {
    return this.botConfigs.get(id);
  }
  
  async getBotConfigByGuildId(guildId: string): Promise<BotConfig | undefined> {
    return Array.from(this.botConfigs.values()).find(
      (config) => config.guildId === guildId
    );
  }
  
  async getAllBotConfigs(): Promise<BotConfig[]> {
    return Array.from(this.botConfigs.values());
  }
  
  async createBotConfig(config: InsertBotConfig): Promise<BotConfig> {
    const id = this.botConfigCurrentId++;
    // Ensure all required properties have values
    const newConfig: BotConfig = { 
      id,
      channelId: config.channelId,
      guildId: config.guildId,
      timeToPost: config.timeToPost || "16:00", // Default: 4:00 PM
      timezone: config.timezone || "Asia/Kolkata", // Default: IST
      enabled: config.enabled !== undefined ? config.enabled : true, // Default: true
      deleteAfterHours: config.deleteAfterHours || 24 // Default: 24 hours
    };
    this.botConfigs.set(id, newConfig);
    return newConfig;
  }
  
  async updateBotConfig(id: number, config: Partial<BotConfig>): Promise<BotConfig | undefined> {
    const existingConfig = this.botConfigs.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig = { ...existingConfig, ...config };
    this.botConfigs.set(id, updatedConfig);
    return updatedConfig;
  }
  
  async deleteBotConfig(id: number): Promise<boolean> {
    return this.botConfigs.delete(id);
  }
  
  // Challenge thread methods
  async getChallengeThread(id: number): Promise<ChallengeThread | undefined> {
    return this.challengeThreads.get(id);
  }
  
  async getChallengeThreadByThreadId(threadId: string): Promise<ChallengeThread | undefined> {
    return Array.from(this.challengeThreads.values()).find(
      (thread) => thread.threadId === threadId
    );
  }
  
  async getAllChallengeThreads(): Promise<ChallengeThread[]> {
    return Array.from(this.challengeThreads.values());
  }
  
  async getExpiredThreads(): Promise<ChallengeThread[]> {
    const now = new Date();
    return Array.from(this.challengeThreads.values()).filter(
      (thread) => !thread.isDeleted && thread.expiresAt < now
    );
  }
  
  async createChallengeThread(thread: InsertChallengeThread): Promise<ChallengeThread> {
    const id = this.challengeThreadCurrentId++;
    const newThread: ChallengeThread = { 
      ...thread, 
      id, 
      createdAt: new Date(),
      isDeleted: false 
    };
    this.challengeThreads.set(id, newThread);
    return newThread;
  }
  
  async markThreadAsDeleted(id: number): Promise<boolean> {
    const thread = this.challengeThreads.get(id);
    if (!thread) return false;
    
    thread.isDeleted = true;
    this.challengeThreads.set(id, thread);
    return true;
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async createUser(username: string, passwordHash: string, role: UserRole): Promise<User> {
    const id = this.userCurrentId++;
    const newUser: User = {
      id,
      username,
      passwordHash,
      role,
      createdAt: new Date(),
      lastLogin: null,
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    user.lastLogin = new Date();
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
