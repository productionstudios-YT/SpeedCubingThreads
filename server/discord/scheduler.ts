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
    this.scheduleScramblePosts();
    
    // Schedule thread cleanup (check hourly for expired threads)
    this.scheduleThreadCleanup();
  }
  
  /**
   * Manually trigger the daily scramble post creation
   * Used for testing or forcing an immediate post
   */
  async triggerDailyScramblePost(): Promise<boolean> {
    try {
      console.log('Manually triggering daily scramble post creation');
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
   * Schedule daily scramble posts at 4:00 PM IST
   * Cron format: minute hour * * *
   * IST is UTC+5:30, so 10:30 UTC = 4:00 PM IST
   */
  private scheduleScramblePosts() {
    // At 10:30 UTC (4:00 PM IST)
    const job = cron.schedule('30 10 * * *', async () => {
      try {
        console.log('Executing scheduled scramble post creation');
        const configs = await storage.getAllBotConfigs();
        
        for (const config of configs) {
          if (!config.enabled) continue;
          
          await discordBot.createDailyScrambleThread(config);
        }
      } catch (error) {
        console.error('Error in scheduled scramble post:', error);
      }
    });
    
    this.cronJobs.set('dailyPost', job);
    console.log('Daily scramble posts scheduled for 4:00 PM IST');
  }
  
  /**
   * Schedule hourly checks for threads that need to be deleted
   */
  private scheduleThreadCleanup() {
    // Run every hour at minute 0
    const job = cron.schedule('0 * * * *', async () => {
      try {
        console.log('Executing scheduled thread cleanup');
        const expiredThreads = await storage.getExpiredThreads();
        
        for (const thread of expiredThreads) {
          await discordBot.deleteThread(thread);
          await storage.markThreadAsDeleted(thread.id);
        }
      } catch (error) {
        console.error('Error in scheduled thread cleanup:', error);
      }
    });
    
    this.cronJobs.set('threadCleanup', job);
    console.log('Thread cleanup scheduled to run hourly');
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
