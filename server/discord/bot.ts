import { Client, Events, GatewayIntentBits, TextChannel, ThreadChannel } from 'discord.js';
import { BotConfig, ChallengeThread, InsertChallengeThread } from '@shared/schema';
import { storage } from '../storage';
import { scrambleManager } from './scrambleManager';

class DiscordBot {
  private client: Client;
  private isReady: boolean = false;
  
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ]
    });
    
    this.setupEventHandlers();
  }
  
  /**
   * Set up event handlers for the Discord client
   */
  private setupEventHandlers() {
    this.client.once(Events.ClientReady, (c) => {
      console.log(`Ready! Logged in as ${c.user.tag}`);
      this.isReady = true;
    });
    
    this.client.on(Events.Error, (error) => {
      console.error('Discord client error:', error);
    });
  }
  
  /**
   * Initialize the Discord bot
   * @param token The Discord bot token
   */
  async initialize(token: string) {
    if (!token) {
      throw new Error('DISCORD_TOKEN is required to initialize the bot');
    }
    
    try {
      await this.client.login(token);
      console.log('Discord bot initialized');
    } catch (error) {
      console.error('Failed to initialize Discord bot:', error);
      throw error;
    }
  }
  
  /**
   * Check if the bot client is ready
   */
  isClientReady(): boolean {
    return this.isReady;
  }
  
  /**
   * Create a daily scramble thread in the specified channel
   * @param config The bot configuration
   */
  async createDailyScrambleThread(config: BotConfig): Promise<void> {
    if (!this.isReady) {
      throw new Error('Discord client is not ready yet');
    }
    
    try {
      // Check if we've already created a thread for today's cube type
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayKeys = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
      const todaysCubeType = daySchedule[dayKeys[dayOfWeek]];
      
      // Get all active threads for today
      const activeThreads = await storage.getAllChallengeThreads();
      const todaysThreadExists = activeThreads.some(thread => {
        // Check if thread is for today and for today's cube type
        const threadDate = new Date(thread.createdAt).toISOString().split('T')[0];
        return threadDate === todayStr && thread.cubeType === todaysCubeType && !thread.isDeleted;
      });
      
      // Skip if today's thread already exists
      if (todaysThreadExists) {
        console.log(`Thread for ${todaysCubeType} already exists for today (${todayStr}), skipping creation`);
        return;
      }
      
      // Get the guild and channel
      const guild = await this.client.guilds.fetch(config.guildId);
      const channel = await guild.channels.fetch(config.channelId) as TextChannel;
      
      if (!channel || channel.type !== 0) { // 0 is GUILD_TEXT
        throw new Error(`Channel ${config.channelId} is not a text channel`);
      }
      
      // Generate the thread title and content
      const threadTitle = scrambleManager.generateThreadTitle();
      const threadContent = scrambleManager.generateThreadContent();
      
      // Create the thread
      const message = await channel.send({
        content: `New daily challenge is now available!`
      });
      
      const thread = await message.startThread({
        name: threadTitle,
        autoArchiveDuration: 1440, // 24 hours
      });
      
      await thread.send(threadContent);
      
      // Calculate expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + config.deleteAfterHours);
      
      // Store the thread information in the database
      const threadData: InsertChallengeThread = {
        threadId: thread.id,
        channelId: channel.id,
        guildId: guild.id,
        cubeType: scrambleManager.getCubeTypeForDay(),
        scramble: threadContent.split('```')[1].trim(),
        expiresAt
      };
      
      await storage.createChallengeThread(threadData);
      
      console.log(`Created daily scramble thread: ${threadTitle}`);
    } catch (error) {
      console.error('Error creating daily scramble thread:', error);
      throw error;
    }
  }
  
  /**
   * Delete a thread that has expired
   * @param thread The thread data to delete
   */
  async deleteThread(thread: ChallengeThread): Promise<void> {
    if (!this.isReady) {
      throw new Error('Discord client is not ready yet');
    }
    
    try {
      // Get the guild and channel
      const guild = await this.client.guilds.fetch(thread.guildId);
      const channel = await guild.channels.fetch(thread.channelId) as TextChannel;
      
      if (!channel) {
        console.warn(`Channel ${thread.channelId} not found, marking thread as deleted anyway`);
        return;
      }
      
      try {
        // Get the thread from Discord
        const discordThread = await channel.threads.fetch(thread.threadId);
        
        if (discordThread) {
          // Delete the thread
          await discordThread.delete();
          console.log(`Deleted expired thread: ${thread.threadId}`);
        }
      } catch (error) {
        // Thread might already be deleted or inaccessible
        console.warn(`Thread ${thread.threadId} could not be deleted: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
      throw error;
    }
  }
  
  /**
   * Manually create a scramble thread for a specific cube type
   * @param guildId The ID of the guild
   * @param channelId The ID of the channel
   * @param cubeType The type of cube
   */
  async createManualScrambleThread(guildId: string, channelId: string, cubeType: string): Promise<string> {
    if (!this.isReady) {
      throw new Error('Discord client is not ready yet');
    }
    
    try {
      // Get the guild and channel
      const guild = await this.client.guilds.fetch(guildId);
      const channel = await guild.channels.fetch(channelId) as TextChannel;
      
      if (!channel || channel.type !== 0) {
        throw new Error(`Channel ${channelId} is not a text channel`);
      }
      
      // Create a custom thread title and content for the specific cube type
      const today = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[today.getDay()];
      
      const threadTitle = `${dayName} ${cubeType} Challenge (Manual)`;
      const scramble = scrambleManager.generateDailyScramble();
      
      const threadContent = `# ${cubeType} Scramble Challenge
**Day**: ${dayName} (Manual Challenge)

Here's a ${cubeType} scramble. Post your times below!

\`\`\`
${scramble.scramble}
\`\`\`

Remember to use a timer and follow standard WCA regulations. Good luck!`;
      
      // Create the thread
      const message = await channel.send({
        content: `New manual challenge for ${cubeType} is now available!`
      });
      
      const thread = await message.startThread({
        name: threadTitle,
        autoArchiveDuration: 1440, // 24 hours
      });
      
      await thread.send(threadContent);
      
      // Get bot config for the expiration duration
      const config = await storage.getBotConfigByGuildId(guildId);
      const deleteAfterHours = config?.deleteAfterHours || 24;
      
      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + deleteAfterHours);
      
      // Store the thread information in the database
      const threadData: InsertChallengeThread = {
        threadId: thread.id,
        channelId: channel.id,
        guildId: guild.id,
        cubeType: cubeType as any, // Type assertion here
        scramble: scramble.scramble,
        expiresAt
      };
      
      await storage.createChallengeThread(threadData);
      
      console.log(`Created manual scramble thread: ${threadTitle}`);
      return thread.id;
    } catch (error) {
      console.error('Error creating manual scramble thread:', error);
      throw error;
    }
  }
  
  /**
   * Shutdown the bot client
   */
  async shutdown() {
    if (this.client) {
      this.client.destroy();
      this.isReady = false;
      console.log('Discord bot client destroyed');
    }
  }
}

export const discordBot = new DiscordBot();
