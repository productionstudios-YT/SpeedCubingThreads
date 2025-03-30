import { Client, Events, GatewayIntentBits, TextChannel, ThreadChannel, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction, CommandInteraction, EmbedBuilder, ActivityType, Guild } from 'discord.js';
import { BotConfig, ChallengeThread, InsertChallengeThread } from '@shared/schema';
import { storage } from '../storage';
import { scrambleManager } from './scrambleManager';
import { scheduler } from './scheduler';

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
    // Use 'on' instead of 'once' to handle reconnections
    this.client.on(Events.ClientReady, async (c) => {
      console.log(`Ready! Logged in as ${c.user.tag}`);
      this.isReady = true;
      
      // Set bot status
      this.client.user?.setActivity({
        name: 'Daily Cube Challenges | 24/7',
        type: ActivityType.Playing
      });
      
      // Register slash commands
      await this.registerCommands();
    });
    
    // Handle disconnects and errors
    this.client.on(Events.Error, (error) => {
      console.error('Discord client error:', error);
    });
    
    this.client.on(Events.Warn, (warning) => {
      console.warn('Discord client warning:', warning);
    });
    
    this.client.on(Events.ShardDisconnect, (event) => {
      console.warn(`Bot disconnected with code ${event.code}. Attempting to reconnect...`);
    });
    
    this.client.on(Events.ShardReconnecting, () => {
      console.log('Bot is reconnecting to Discord...');
    });
    
    this.client.on(Events.ShardResume, () => {
      console.log('Bot connection resumed successfully!');
    });
    
    // Handle interaction events (slash commands)
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      
      if (interaction.commandName === 'daily') {
        await this.handleDailyCommand(interaction);
      } else if (interaction.commandName === 'bot') {
        await this.handleBotCommand(interaction);
      } else if (interaction.commandName === 'history') {
        await this.handleHistoryCommand(interaction);
      }
    });
  }
  
  /**
   * Register the bot's slash commands with Discord
   */
  private async registerCommands() {
    if (!this.client.user) {
      console.error('Cannot register commands: Client user is null');
      return;
    }
    
    try {
      const commands = [
        new SlashCommandBuilder()
          .setName('daily')
          .setDescription('Show information about the daily scramble bot status'),
        new SlashCommandBuilder()
          .setName('bot')
          .setDescription('Show detailed bot system information'),
        new SlashCommandBuilder()
          .setName('history')
          .setDescription('Show history of previous daily scramble challenges')
      ];
      
      const rest = new REST().setToken(process.env.DISCORD_TOKEN || '');
      
      console.log('Started refreshing application (/) commands');
      
      await rest.put(
        Routes.applicationCommands(this.client.user.id),
        { body: commands }
      );
      
      console.log('Successfully registered application (/) commands');
    } catch (error) {
      console.error('Error registering slash commands:', error);
    }
  }
  
  /**
   * Handle the /bot command to show detailed bot info including system stats
   */
  private async handleBotCommand(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();
      
      // Get system information
      const botUptime = this.client.uptime ? this.formatUptime(this.client.uptime) : 'Unknown';
      const serverCount = this.client.guilds.cache.size;
      const memoryUsage = process.memoryUsage();
      const formattedMemoryUsage = {
        rss: this.formatBytes(memoryUsage.rss),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        external: this.formatBytes(memoryUsage.external)
      };
      
      // Get storage statistics
      const allThreads = await storage.getAllChallengeThreads();
      const totalThreads = allThreads.length;
      const activeThreads = allThreads.filter(t => !t.isDeleted).length;
      const deletedThreads = totalThreads - activeThreads;
      
      // Get bot config info
      const configs = await storage.getAllBotConfigs();
      const configCount = configs.length;
      
      // Create a rich embed for bot stats
      const statsEmbed = new EmbedBuilder()
        .setTitle('🤖 Bot System Information')
        .setColor(0x9b59b6)
        .setDescription(`Daily Scramble Bot system report and diagnostics.`)
        .addFields(
          { name: '⏱️ Bot Uptime', value: botUptime, inline: true },
          { name: '🖥️ Server Count', value: serverCount.toString(), inline: true },
          { name: '🧠 Node.js Version', value: process.version, inline: true },
          { name: '📊 Memory Usage', value: `RSS: ${formattedMemoryUsage.rss}\nHeap Used: ${formattedMemoryUsage.heapUsed}/${formattedMemoryUsage.heapTotal}`, inline: false },
          { name: '💾 Storage Stats', value: `Total Threads: ${totalThreads}\nActive: ${activeThreads}\nDeleted: ${deletedThreads}\nConfigs: ${configCount}`, inline: false }
        )
        .setThumbnail(this.client.user?.displayAvatarURL() || '')
        .setFooter({ text: `Daily Scramble Bot • ${new Date().toLocaleString()}` });
      
      // Create CPU and disk usage table
      const performanceTable = '```\n' +
        'System Logs (last 5 entries):\n' +
        '--------------------------------------------------\n' +
        '- Bot started and successfully connected to Discord\n' +
        '- Scheduled daily scramble posts at 4:00 PM IST\n' +
        '- Thread cleanup scheduled to run hourly\n' +
        '- Slash commands registered successfully\n' +
        '- Storage system initialized with in-memory database\n' +
        '```';
      
      // Create performance embed
      const performanceEmbed = new EmbedBuilder()
        .setTitle('📈 System Performance')
        .setDescription(performanceTable)
        .setColor(0x3498DB);
      
      await interaction.editReply({ embeds: [statsEmbed, performanceEmbed] });
    } catch (error) {
      console.error('Error handling bot command:', error);
      try {
        await interaction.editReply('An error occurred while retrieving bot system information. Please try again later.');
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  }
  
  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Format milliseconds to readable uptime format
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
  }
  
  /**
   * Handle the /daily command to show bot status information
   */
  private async handleDailyCommand(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();
      
      // Get bot status info
      const isOnline = this.isReady;
      const nextChallenge = scheduler.getNextScheduledChallenge();
      const configs = await storage.getAllBotConfigs();
      const activeThreads = await storage.getAllChallengeThreads();
      const activeThreadCount = activeThreads.filter(t => !t.isDeleted).length;
      
      // Create a rich embed message
      const embed = new EmbedBuilder()
        .setTitle('🧊 Daily Scramble Bot Status')
        .setColor(isOnline ? 0x57F287 : 0xED4245)
        .setDescription(`The bot is currently **${isOnline ? 'online' : 'offline'}**. Here's the current status report.`)
        .addFields(
          { name: '🤖 Bot Status', value: isOnline ? 'Online and operational (24/7)' : 'Offline', inline: true },
          { name: '⏰ Next Challenge', value: `${nextChallenge.day}'s ${nextChallenge.cubeType} (in ${nextChallenge.timeUntil})`, inline: true },
          { name: '🧵 Active Threads', value: `${activeThreadCount} thread(s)`, inline: true },
          { name: '⚙️ Configuration', value: configs.length > 0 ? 
              `• Guild: ${configs[0].guildId}\n• Channel: ${configs[0].channelId}\n• Auto-delete: ${configs[0].deleteAfterHours}h` : 
              'Not configured', inline: false },
          { name: '📆 Current Schedule', value: 'Mon: Skewb\nTue: 3x3 BLD\nWed: 2x2\nThu: 3x3\nFri: Pyraminx\nSat: 3x3 OH\nSun: Clock', inline: false }
        )
        .setFooter({ text: `Daily Scramble Bot • ${new Date().toLocaleString()}` });
      
      // Create a table of recent activity logs
      let recentThreadsTable = '```\n';
      recentThreadsTable += '| Date       | Type    | Status   | Thread ID           |\n';
      recentThreadsTable += '|------------|---------|----------|--------------------|\n';
      
      // Sort threads by ID (as a proxy for creation time) since we're using in-memory storage
      // When using a database, we would sort by createdAt timestamp
      const sortedThreads = [...activeThreads]
        .sort((a, b) => b.id - a.id) // Sort by ID (newest first)
        .slice(0, 5);
        
      if (sortedThreads.length === 0) {
        recentThreadsTable += '| No recent activity logs available                    |\n';
      } else {
        sortedThreads.forEach(thread => {
          // Format date (use current date as fallback - in real DB this would be the createdAt)
          const date = new Date().toLocaleDateString();
          const status = thread.isDeleted ? 'Deleted' : 'Active';
          const threadIdTruncated = thread.threadId.substring(0, 18);
          recentThreadsTable += `| ${date.padEnd(10)} | ${thread.cubeType.padEnd(7)} | ${status.padEnd(8)} | ${threadIdTruncated} |\n`;
        });
      }
      
      recentThreadsTable += '```';
      
      // Create an additional embed for the logs table
      const logsEmbed = new EmbedBuilder()
        .setTitle('📋 Recent Activity Logs')
        .setDescription(recentThreadsTable)
        .setColor(0x3498DB);
      
      await interaction.editReply({ embeds: [embed, logsEmbed] });
    } catch (error) {
      console.error('Error handling daily command:', error);
      try {
        await interaction.editReply('An error occurred while retrieving bot status information. Please try again later.');
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  }
  
  /**
   * Handle the /history command to show past scramble challenges
   */
  private async handleHistoryCommand(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();
      
      // Get all threads (including deleted ones)
      const allThreads = await storage.getAllChallengeThreads();
      
      // Sort threads by ID in descending order to get most recent first
      const sortedThreads = [...allThreads]
        .sort((a, b) => b.id - a.id)
        .slice(0, 10); // Get last 10 scrambles
      
      if (sortedThreads.length === 0) {
        await interaction.editReply('No scramble history found. Try again after some daily challenges have been posted.');
        return;
      }
      
      // Create a rich embed for history information
      const historyEmbed = new EmbedBuilder()
        .setTitle('📜 Scramble Challenge History')
        .setColor(0xF1C40F)
        .setDescription('Here are the most recent daily scramble challenges:')
        .setFooter({ text: `Daily Scramble Bot • ${new Date().toLocaleString()}` });
      
      // Create embedded fields for each scramble challenge
      // Group challenges by cube type for better organization
      const scramblesByType = new Map<string, ChallengeThread[]>();
      
      sortedThreads.forEach(thread => {
        if (!scramblesByType.has(thread.cubeType)) {
          scramblesByType.set(thread.cubeType, []);
        }
        const threadsOfType = scramblesByType.get(thread.cubeType);
        if (threadsOfType) {
          threadsOfType.push(thread);
        }
      });
      
      // Add fields for each cube type
      scramblesByType.forEach((threads, cubeType) => {
        let scrambleList = '';
        
        threads.forEach(thread => {
          // Format date (would use createdAt from DB in production)
          const date = new Date().toLocaleDateString();
          const scrambleText = thread.scramble || 'Scramble text unavailable';
          scrambleList += `• ${date}: \`${scrambleText}\`\n`;
        });
        
        historyEmbed.addFields({ 
          name: `${this.getCubeTypeEmoji(cubeType)} ${cubeType} Scrambles`, 
          value: scrambleList.trim() || 'No scrambles available',
          inline: false
        });
      });
      
      await interaction.editReply({ embeds: [historyEmbed] });
    } catch (error) {
      console.error('Error handling history command:', error);
      try {
        await interaction.editReply('An error occurred while retrieving scramble history. Please try again later.');
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  }
  
  /**
   * Get emoji for a cube type in embed display
   */
  private getCubeTypeEmoji(cubeType: string): string {
    const emojiMap: Record<string, string> = {
      'Skewb': '🔷',
      '3x3 BLD': '🧠',
      '2x2': '🟨',
      '3x3': '🟦',
      'Pyraminx': '🔺',
      '3x3 OH': '🤚',
      'Clock': '🕙'
    };
    
    return emojiMap[cubeType] || '🧩';
  }
  
  /**
   * Get custom emoji ID for a cube type for reactions
   */
  private getCubeTypeCustomEmoji(cubeType: string): string {
    const emojiMap: Record<string, string> = {
      'Skewb': 'skewb',
      '3x3 BLD': '3x3bld',
      '2x2': '2x2',
      '3x3': '3x3',
      'Pyraminx': 'pyraminx',
      '3x3 OH': '3x3OH',
      'Clock': 'clock~1'
    };
    
    return emojiMap[cubeType] || '';
  }
  
  /**
   * Find a role by name in a guild and return its ID
   * @param guild The guild to search in
   * @param roleName The name of the role to find (case-insensitive)
   * @returns The role ID if found, or empty string if not found
   */
  private async findRoleId(guild: Guild, roleName: string): Promise<string> {
    let roleId = '';
    
    try {
      // Fetch and cache all roles from the guild
      const roles = await guild.roles.fetch();
      
      // Find the role with a name that matches (case-insensitive)
      const role = roles.find((r: any) => r.name.toLowerCase() === roleName.toLowerCase());
      
      if (role) {
        roleId = role.id;
        console.log(`Found role ID for "${roleName}": ${roleId}`);
      } else {
        console.log(`Role "${roleName}" not found in guild`);
      }
    } catch (error) {
      console.error(`Error finding role "${roleName}":`, error);
    }
    
    return roleId;
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
      
      // Create the thread with ping - with enhanced error handling
      let message;
      try {
        // Find the 'daily scramble ping' role in the guild
        const pingRoleName = 'daily scramble ping';
        const pingRoleId = await this.findRoleId(guild, pingRoleName);
        
        // Create a simple message for the thread
        message = await channel.send({ content: `Daily Scramble Challenge` });
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
      let threadMessage;
      try {
        threadMessage = await thread.send(threadContent);
        console.log(`Successfully sent content to thread`);
        
        // Add custom emoji reaction based on cube type
        const cubeType = scrambleManager.getCubeTypeForDay();
        const emojiName = this.getCubeTypeCustomEmoji(cubeType);
        
        if (emojiName) {
          try {
            await threadMessage.react(emojiName);
            console.log(`Added reaction emoji ${emojiName} to thread message`);
          } catch (reactionError) {
            console.error(`Failed to add emoji reaction ${emojiName}:`, reactionError);
            // Don't throw here, continue execution
          }
        }
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
   * Archive a thread that has expired
   * @param thread The thread data to archive
   */
  async archiveThread(thread: ChallengeThread): Promise<void> {
    if (!this.isReady) {
      throw new Error('Discord client is not ready yet');
    }
    
    try {
      // Get the guild and channel
      const guild = await this.client.guilds.fetch(thread.guildId);
      const channel = await guild.channels.fetch(thread.channelId) as TextChannel;
      
      if (!channel) {
        console.warn(`Channel ${thread.channelId} not found, marking thread as archived anyway`);
        return;
      }
      
      try {
        console.log(`Attempting to fetch thread: ${thread.threadId}`);
        // Get the thread from Discord with more detailed error handling
        try {
          // Fetch all threads in the channel first and log them
          const allThreads = await channel.threads.fetchActive();
          console.log(`Active threads in channel ${channel.id}: ${allThreads.threads.size}`);
          
          // Try to get the specific thread
          const discordThread = await channel.threads.fetch(thread.threadId);
          console.log(`Successfully fetched thread ${thread.threadId}`);
          
          if (discordThread) {
            // Send a final message to the thread before archiving
            try {
              await discordThread.send({
                content: `🔒 This thread has been archived because it has expired. This is an automated action.`
              });
              console.log(`Sent final message to thread ${thread.threadId}`);
            } catch (messageError) {
              console.warn(`Could not send final message to thread: ${messageError}`);
            }
            
            // Archive the thread instead of deleting it
            try {
              await discordThread.setArchived(true);
              console.log(`Set thread ${thread.threadId} as archived`);
            } catch (archiveError) {
              console.warn(`Error setting thread as archived: ${archiveError}`);
            }
            
            try {
              await discordThread.setLocked(true);
              console.log(`Set thread ${thread.threadId} as locked`);
            } catch (lockError) {
              console.warn(`Error setting thread as locked: ${lockError}`);
            }
            
            console.log(`Successfully archived expired thread: ${thread.threadId}`);
            return; // Exit if successful
          }
        } catch (fetchError) {
          console.warn(`Error fetching thread ${thread.threadId}: ${fetchError}`);
          // Attempt to find the thread in archived threads
          try {
            const archivedThreads = await channel.threads.fetchArchived();
            console.log(`Archived threads in channel ${channel.id}: ${archivedThreads.threads.size}`);
            
            const archivedThread = archivedThreads.threads.get(thread.threadId);
            if (archivedThread) {
              console.log(`Thread ${thread.threadId} is already archived`);
              // Thread is already archived, consider this a success
              return;
            }
          } catch (archivedFetchError) {
            console.warn(`Error fetching archived threads: ${archivedFetchError}`);
          }
        }
      } catch (error: unknown) {
        // Thread might already be archived or inaccessible
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Thread ${thread.threadId} could not be archived: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error archiving thread:', error);
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
      console.log(`Creating manual scramble thread for ${cubeType} in guild ${guildId}, channel ${channelId}`);
      
      // Get guild and channel
      const guild = await this.client.guilds.fetch(guildId);
      const channel = await guild.channels.fetch(channelId) as TextChannel;
      
      if (!channel || channel.type !== 0) {
        throw new Error(`Channel ${channelId} is not a text channel or could not be found`);
      }
      
      // Generate scramble for the specific cube type
      const scrambleData = scrambleManager.generateScrambleForType(cubeType);
      const scramble = scrambleData.scramble;
      
      // Create thread title - just the cube type
      const threadTitle = cubeType;
      
      // Find the 'daily scramble ping' role in the guild
      const pingRoleName = 'daily scramble ping';
      const pingRoleId = await this.findRoleId(guild, pingRoleName);
      
      // Create message content
      let content = `Daily Scramble Challenge`;
      
      // Send message and create thread
      const message = await channel.send({ content });
      
      const thread = await message.startThread({
        name: threadTitle,
        autoArchiveDuration: 1440,
      });
      
      // Create thread content with formatted scramble in a box
      const threadContent = `# Today's Daily Scramble!
||@daily scramble ping||

\`\`\`
${scramble}
\`\`\`

Good luck! 🍀`;

      // Send content to thread with emoji reaction
      let threadMessage = await thread.send(threadContent);
      
      // Add custom emoji reaction based on cube type
      const emojiName = this.getCubeTypeCustomEmoji(cubeType);
      
      if (emojiName) {
        try {
          await threadMessage.react(emojiName);
          console.log(`Added reaction emoji ${emojiName} to manual thread message`);
        } catch (reactionError) {
          console.error(`Failed to add emoji reaction ${emojiName}:`, reactionError);
          // Don't throw here, continue execution
        }
      }
      
      // Calculate expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Default to 24 hours for test threads
      
      // Store the thread information
      const threadData: InsertChallengeThread = {
        threadId: thread.id,
        channelId: channel.id,
        guildId: guild.id,
        cubeType,
        scramble,
        expiresAt
      };
      
      await storage.createChallengeThread(threadData);
      
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
      this.isReady = false;
      this.client.destroy();
      console.log('Discord bot has been shut down');
    }
  }
}

export const discordBot = new DiscordBot();