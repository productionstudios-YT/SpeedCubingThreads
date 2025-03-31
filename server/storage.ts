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
    
    // Load data from file if exists
    this.loadFromFile();
  }
  
  /**
   * Save current state to file for persistence between restarts
   */
  private saveToFile(): void {
    const data = {
      botConfigs: Array.from(this.botConfigs.entries()),
      challengeThreads: Array.from(this.challengeThreads.entries()),
      users: Array.from(this.users.entries()),
      botConfigCurrentId: this.botConfigCurrentId,
      challengeThreadCurrentId: this.challengeThreadCurrentId,
      userCurrentId: this.userCurrentId
    };
    
    try {
      // Using Node.js native fs module in ESM context
      import('node:fs').then(fs => {
        fs.writeFileSync('./data-storage.json', JSON.stringify(data, null, 2));
        console.log('Storage state saved to file');
      }).catch(err => {
        console.error('Error importing fs module:', err);
      });
    } catch (error) {
      console.error('Error saving storage state to file:', error);
    }
  }
  
  /**
   * Load state from file
   */
  private loadFromFile(): void {
    try {
      // Using dynamic import for fs in ESM context
      import('node:fs').then(fs => {
        if (fs.existsSync('./data-storage.json')) {
          const data = JSON.parse(fs.readFileSync('./data-storage.json', 'utf8'));
          
          // Restore bot configs
          data.botConfigs.forEach(([id, config]: [number, BotConfig]) => {
            this.botConfigs.set(id, {
              ...config
            });
          });
          
          // Restore challenge threads
          data.challengeThreads.forEach(([id, thread]: [number, ChallengeThread]) => {
            this.challengeThreads.set(id, {
              ...thread,
              createdAt: new Date(thread.createdAt),
              expiresAt: new Date(thread.expiresAt)
            });
          });
          
          // Restore users
          data.users.forEach(([id, user]: [number, User]) => {
            this.users.set(id, {
              ...user,
              createdAt: new Date(user.createdAt),
              lastLogin: user.lastLogin ? new Date(user.lastLogin) : null
            });
          });
          
          // Restore IDs
          this.botConfigCurrentId = data.botConfigCurrentId;
          this.challengeThreadCurrentId = data.challengeThreadCurrentId;
          this.userCurrentId = data.userCurrentId;
          
          console.log('Storage state loaded from file');
        }
      }).catch(err => {
        console.error('Error importing fs module:', err);
      });
    } catch (error) {
      console.error('Error loading storage state from file:', error);
    }
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
    this.saveToFile();
    return newConfig;
  }
  
  async updateBotConfig(id: number, config: Partial<BotConfig>): Promise<BotConfig | undefined> {
    const existingConfig = this.botConfigs.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig = { ...existingConfig, ...config };
    this.botConfigs.set(id, updatedConfig);
    this.saveToFile();
    return updatedConfig;
  }
  
  async deleteBotConfig(id: number): Promise<boolean> {
    const result = this.botConfigs.delete(id);
    this.saveToFile();
    return result;
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
    this.saveToFile();
    return newThread;
  }
  
  async markThreadAsDeleted(id: number): Promise<boolean> {
    const thread = this.challengeThreads.get(id);
    if (!thread) return false;
    
    thread.isDeleted = true;
    this.challengeThreads.set(id, thread);
    this.saveToFile();
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
    this.saveToFile();
    return newUser;
  }
  
  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    user.lastLogin = new Date();
    this.users.set(id, user);
    this.saveToFile();
    return user;
  }
}

export const storage = new MemStorage();
