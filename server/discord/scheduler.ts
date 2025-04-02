import cron from 'node-cron';
import { storage } from '../storage';
import { scrambleManager } from './scrambleManager';
import { discordBot } from './bot';
import { daySchedule } from '@shared/schema';

/**
 * Class to handle scheduling of daily tasks
 */
export class Scheduler {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  
  /**
   * Initialize the scheduler
   */
  async initialize() {
    // Schedule the daily scramble posts at 4:00 PM IST
    // (now includes thread cleanup right before posting)
    this.scheduleScramblePosts();
  }
  
  /**
   * Manually trigger the daily scramble post creation
   * First cleans up all existing threads, then creates a new thread
   * Used for testing or forcing an immediate post
   */
  async triggerDailyScramblePost(): Promise<boolean> {
    try {
      console.log('Manually triggering daily scramble post creation (with cleanup)');
      
      // First clean up all threads
      console.log('First cleaning up all existing threads');
      const allThreads = await storage.getAllChallengeThreads();
      if (allThreads.length > 0) {
        for (const thread of allThreads) {
          try {
            await discordBot.archiveThread(thread);
            console.log(`Successfully archived thread ${thread.id} before manual post`);
          } catch (threadError) {
            console.error(`Error archiving thread ${thread.id}:`, threadError);
            // Continue with other threads even if one fails
          }
        }
      } else {
        console.log('No threads to clean up before manual post');
      }
      
      // Then create new threads
      const configs = await storage.getAllBotConfigs();
      
      if (configs.length === 0) {
        console.error('No bot configurations found');
        return false;
      }
      
      for (const config of configs) {
        if (!config.enabled) {
          console.log(`Config ${config.id} is disabled, skipping`);
          continue;
        }
        
        await discordBot.createDailyScrambleThread(config);
        console.log(`Successfully triggered daily thread for config ${config.id}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error manually triggering daily scramble post:', error);
      return false;
    }
  }

  /**
   * Manually trigger cleanup of expired threads
   * Used for immediate cleanup from the dashboard
   */
  async triggerThreadCleanup(): Promise<{success: boolean, count: number}> {
    try {
      console.log('Manually triggering thread cleanup');
      const expiredThreads = await storage.getExpiredThreads();
      
      if (expiredThreads.length === 0) {
        console.log('No expired threads found');
        return { success: true, count: 0 };
      }
      
      let cleanedCount = 0;
      for (const thread of expiredThreads) {
        try {
          console.log(`Processing thread ${thread.id} (${thread.threadId}) for archiving`);
          
          // Archive the thread through Discord but don't mark as deleted
          try {
            await discordBot.archiveThread(thread);
            cleanedCount++;
            console.log(`Discord archival successful for thread ${thread.id}`);
          } catch (discordError) {
            console.error(`Discord API error on thread ${thread.id}:`, discordError);
          }
        } catch (error) {
          console.error(`Critical error processing thread ${thread.id}:`, error);
          // Continue with other threads even if one fails
        }
      }
      
      console.log(`Thread cleanup completed: ${cleanedCount} threads processed`);
      return { success: true, count: cleanedCount };
    } catch (error) {
      console.error('Error manually triggering thread cleanup:', error);
      return { success: false, count: 0 };
    }
  }
  
  /**
   * Schedule daily scramble posts at 4:00 PM IST
   * Cron format: minute hour * * *
   * IST is UTC+5:30, so 10:30 UTC = 4:00 PM IST
   * 
   * Right at 4:00 PM IST, it first cleans up all existing threads
   * and then immediately creates the new thread for the day
   */
  private scheduleScramblePosts() {
    // At 10:30 UTC (4:00 PM IST)
    const job = cron.schedule('30 10 * * *', async () => {
      try {
        console.log('Executing daily thread cleanup before posting new scramble');
        
        // First clean up all threads (expired or not)
        const allThreads = await storage.getAllChallengeThreads();
        if (allThreads.length > 0) {
          console.log(`Cleaning up ${allThreads.length} threads before posting new daily scramble`);
          for (const thread of allThreads) {
            try {
              console.log(`Daily cleanup: Processing thread ${thread.id} (${thread.threadId})`);
              
              // Archive the thread through Discord but don't mark as deleted in database
              try {
                await discordBot.archiveThread(thread);
                console.log(`Daily cleanup: Discord archival successful for thread ${thread.id}`);
              } catch (discordError) {
                console.error(`Daily cleanup: Discord API error on thread ${thread.id}:`, discordError);
              }
            } catch (threadError) {
              console.error(`Daily cleanup: Critical error processing thread ${thread.id}:`, threadError);
              // Continue with other threads even if one fails
            }
          }
        } else {
          console.log('No threads to clean up before posting new daily scramble');
        }
        
        // Then create new threads
        console.log('Now creating new daily scramble threads');
        const configs = await storage.getAllBotConfigs();
        
        for (const config of configs) {
          if (!config.enabled) {
            console.log(`Config ${config.id} is disabled, skipping`);
            continue;
          }
          
          await discordBot.createDailyScrambleThread(config);
          console.log(`Successfully created daily thread for config ${config.id}`);
        }
      } catch (error) {
        console.error('Error in scheduled scramble post process:', error);
      }
    });
    
    this.cronJobs.set('dailyPost', job);
    console.log('Daily scramble posts (with cleanup) scheduled for 4:00 PM IST');
  }
  
  /**
   * Schedule hourly checks for threads that need to be archived
   * This is a backup clean-up mechanism in case the daily cleanup fails
   */
  private scheduleHourlyThreadCleanup() {
    // Run every hour at minute 0
    const job = cron.schedule('0 * * * *', async () => {
      try {
        console.log('Executing hourly thread cleanup (backup)');
        const expiredThreads = await storage.getExpiredThreads();
        
        if (expiredThreads.length > 0) {
          console.log(`Found ${expiredThreads.length} expired threads to clean up`);
          for (const thread of expiredThreads) {
            try {
              console.log(`Hourly cleanup: Processing thread ${thread.id} (${thread.threadId})`);
              
              // Archive the thread through Discord but don't mark as deleted in database
              try {
                await discordBot.archiveThread(thread);
                console.log(`Hourly cleanup: Discord archival successful for thread ${thread.id}`);
              } catch (discordError) {
                console.error(`Hourly cleanup: Discord API error on thread ${thread.id}:`, discordError);
              }
            } catch (threadError) {
              console.error(`Hourly cleanup: Critical error processing thread ${thread.id}:`, threadError);
              // Continue with other threads even if one fails
            }
          }
        } else {
          console.log('No expired threads found in hourly cleanup');
        }
      } catch (error) {
        console.error('Error in hourly thread cleanup:', error);
      }
    });
    
    this.cronJobs.set('hourlyCleanup', job);
    console.log('Hourly thread cleanup scheduled as backup');
  }
  
  /**
   * Get the next scheduled cube type
   * @returns Object with the next cube type and time
   */
  getNextScheduledChallenge() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if today's challenge is still upcoming (before 4:00 PM IST / 10:30 UTC)
    let nextDay = currentDay;
    let isToday = false;
    
    // 10 = 10 AM UTC, 30 = 30 minutes, equivalent to 4:00 PM IST
    if (currentHour < 10 || (currentHour === 10 && currentMinute < 30)) {
      isToday = true;
    } else {
      // Move to next day
      nextDay = (currentDay + 1) % 7;
    }
    
    // Map to day name in proper case
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[nextDay];
    
    // Map to cube type for that day
    const dayKeys = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
    const cubeType = daySchedule[dayKeys[nextDay]];
    
    // Calculate time until next challenge
    const nextDate = new Date();
    if (!isToday) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    nextDate.setHours(10, 30, 0, 0); // 10:30 UTC = 4:00 PM IST
    
    const timeUntil = nextDate.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      day: dayName,
      cubeType,
      isToday,
      nextTime: '4:00 PM IST',
      timeUntil: `${hoursUntil}h ${minutesUntil}m`
    };
  }
  
  /**
   * Stop all scheduled jobs
   */
  stopAllJobs() {
    // Use forEach directly on the Map instead of using entries() iterator
    this.cronJobs.forEach((job, name) => {
      console.log(`Stopping scheduled job: ${name}`);
      job.stop();
    });
    this.cronJobs.clear();
  }
}

export const scheduler = new Scheduler();
