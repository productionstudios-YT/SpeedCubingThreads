import { BotConfig, ChallengeThread, InsertBotConfig, InsertChallengeThread } from '@shared/schema';

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
}

export class MemStorage implements IStorage {
  private botConfigs: Map<number, BotConfig>;
  private challengeThreads: Map<number, ChallengeThread>;
  private botConfigCurrentId: number;
  private challengeThreadCurrentId: number;
  
  constructor() {
    this.botConfigs = new Map();
    this.challengeThreads = new Map();
    this.botConfigCurrentId = 1;
    this.challengeThreadCurrentId = 1;
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
    const newConfig: BotConfig = { ...config, id };
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
}

export const storage = new MemStorage();
