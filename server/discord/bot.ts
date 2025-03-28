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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages
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
      console.log(`Attempting to create daily scramble thread in guild ${config.guildId}, channel ${config.channelId}`);
      
      // Get the guild with error handling
      let guild;
      try {
        guild = await this.client.guilds.fetch(config.guildId);
        console.log(`Successfully fetched guild: ${guild.name}`);
      } catch (error) {
        console.error(`Failed to fetch guild with ID ${config.guildId}:`, error);
        throw new Error(`Guild not found or bot doesn't have access to guild with ID ${config.guildId}`);
      }
      
      // Get the channel with error handling
      let channel;
      try {
        channel = await guild.channels.fetch(config.channelId) as TextChannel;
        console.log(`Successfully fetched channel: ${channel.name}`);
      } catch (error) {
        console.error(`Failed to fetch channel with ID ${config.channelId}:`, error);
        throw new Error(`Channel not found or bot doesn't have access to channel with ID ${config.channelId}`);
      }
      
      // Verify channel is a text channel
      if (!channel || channel.type !== 0) { // 0 is GUILD_TEXT
        console.error(`Channel ${config.channelId} is not a text channel, type:`, channel?.type);
        throw new Error(`Channel ${config.channelId} is not a text channel`);
      }
      
      // Generate the thread title and content
      const threadTitle = scrambleManager.generateThreadTitle();
      const threadContent = scrambleManager.generateThreadContent();
      console.log(`Generated thread title: ${threadTitle}`);
      
      // Create the thread - with enhanced error handling
      let message;
      try {
        message = await channel.send({
          content: `New daily challenge is now available!`
        });
        console.log(`Successfully sent initial message to channel`);
      } catch (error) {
        console.error('Failed to send message to channel:', error);
        throw new Error(`Bot doesn't have permission to send messages in channel ${config.channelId}`);
      }
      
      // Start the thread
      let thread;
      try {
        thread = await message.startThread({
          name: threadTitle,
          autoArchiveDuration: 1440, // 24 hours
        });
        console.log(`Successfully created thread: ${thread.id}`);
      } catch (error) {
        console.error('Failed to create thread:', error);
        throw new Error(`Bot doesn't have permission to create threads in channel ${config.channelId}`);
      }
      
      // Send content to the thread
      try {
        await thread.send(threadContent);
        console.log(`Successfully sent content to thread`);
      } catch (error) {
        console.error('Failed to send message to thread:', error);
        // Don't throw here, we already created the thread
      }
      
      // Calculate expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + config.deleteAfterHours);
      
      // Get the cube type for today
      const cubeType = scrambleManager.getCubeTypeForDay();
      console.log(`Today's cube type: ${cubeType}`);
      
      // Extract scramble text
      let scrambleText;
      try {
        scrambleText = threadContent.split('```')[1].trim();
      } catch (error: any) {
        scrambleText = "Error extracting scramble text";
        console.error('Error extracting scramble text:', error);
      }
      
      // Store the thread information in the database
      const threadData: InsertChallengeThread = {
        threadId: thread.id,
        channelId: channel.id,
        guildId: guild.id,
        cubeType,
        scramble: scrambleText,
        expiresAt
      };
      
      try {
        await storage.createChallengeThread(threadData);
        console.log(`Successfully stored thread data in database`);
      } catch (error) {
        console.error('Failed to store thread data in database:', error);
        // Don't throw here, the thread is already created
      }
      
      console.log(`Successfully created daily scramble thread: ${threadTitle}`);
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
      } catch (error: unknown) {
        // Thread might already be deleted or inaccessible
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Thread ${thread.threadId} could not be deleted: ${errorMessage}`);
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
      console.log(`Attempting to create manual scramble thread in guild ${guildId}, channel ${channelId} for cube type ${cubeType}`);
      
      // Get the guild with error handling
      let guild;
      try {
        guild = await this.client.guilds.fetch(guildId);
        console.log(`Successfully fetched guild: ${guild.name}`);
      } catch (error) {
        console.error(`Failed to fetch guild with ID ${guildId}:`, error);
        throw new Error(`Guild not found or bot doesn't have access to guild with ID ${guildId}`);
      }
      
      // Get the channel with error handling
      let channel;
      try {
        channel = await guild.channels.fetch(channelId) as TextChannel;
        console.log(`Successfully fetched channel: ${channel.name}`);
      } catch (error) {
        console.error(`Failed to fetch channel with ID ${channelId}:`, error);
        throw new Error(`Channel not found or bot doesn't have access to channel with ID ${channelId}`);
      }
      
      // Verify channel is a text channel
      if (!channel || channel.type !== 0) { // 0 is GUILD_TEXT
        console.error(`Channel ${channelId} is not a text channel, type:`, channel?.type);
        throw new Error(`Channel ${channelId} is not a text channel`);
      }
      
      // Create a custom thread title and content for the specific cube type
      const today = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[today.getDay()];
      
      const threadTitle = `${dayName} ${cubeType} Challenge (Manual)`;
      const scramble = scrambleManager.generateDailyScramble();
      console.log(`Generated thread title: ${threadTitle}`);
      
      const threadContent = `# ${cubeType} Scramble Challenge
**Day**: ${dayName} (Manual Challenge)

Here's a ${cubeType} scramble. Post your times below!

\`\`\`
${scramble.scramble}
\`\`\`

Remember to use a timer and follow standard WCA regulations. Good luck!`;
      
      // Create the thread - with enhanced error handling
      let message;
      try {
        message = await channel.send({
          content: `New manual challenge for ${cubeType} is now available!`
        });
        console.log(`Successfully sent initial message to channel`);
      } catch (error) {
        console.error('Failed to send message to channel:', error);
        throw new Error(`Bot doesn't have permission to send messages in channel ${channelId}`);
      }
      
      // Start the thread
      let thread;
      try {
        thread = await message.startThread({
          name: threadTitle,
          autoArchiveDuration: 1440, // 24 hours
        });
        console.log(`Successfully created thread: ${thread.id}`);
      } catch (error) {
        console.error('Failed to create thread:', error);
        throw new Error(`Bot doesn't have permission to create threads in channel ${channelId}`);
      }
      
      // Send content to the thread
      try {
        await thread.send(threadContent);
        console.log(`Successfully sent content to thread`);
      } catch (error) {
        console.error('Failed to send message to thread:', error);
        // Don't throw here, we already created the thread
      }
      
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
      
      try {
        await storage.createChallengeThread(threadData);
        console.log(`Successfully stored thread data in database`);
      } catch (error) {
        console.error('Failed to store thread data in database:', error);
        // Don't throw here, the thread is already created
      }
      
      console.log(`Successfully created manual scramble thread: ${threadTitle}`);
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
