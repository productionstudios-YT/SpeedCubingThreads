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
   * Schedule daily scramble posts to run 24/7
   * Create a challenge post if one doesn't exist for today
   */
  private scheduleScramblePosts() {
    // Run every hour to check if today's scramble is created
    // This ensures the bot is always active and posts even after restarts
    const job = cron.schedule('0 * * * *', async () => {
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
    console.log('Daily scramble posts scheduler active - running 24/7');
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
    
    // Always check both today and tomorrow
    const todayDay = currentDay;
    const tomorrowDay = (currentDay + 1) % 7;
    
    // Map to day names
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[todayDay];
    const tomorrowName = days[tomorrowDay];
    
    // Map to cube types
    const dayKeys = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
    const todayCubeType = daySchedule[dayKeys[todayDay]];
    const tomorrowCubeType = daySchedule[dayKeys[tomorrowDay]];
    
    // Calculate time until next day (midnight)
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(0, 0, 0, 0); // Midnight
    
    const timeUntil = nextDate.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
    
    // Check existing threads to determine if today's challenge is already created
    const isToday = true; // Default to today since we're now 24/7
    
    return {
      day: todayName,
      cubeType: todayCubeType,
      isToday,
      nextTime: 'Available 24/7',
      timeUntil: `${hoursUntil}h ${minutesUntil}m`,
      tomorrowCubeType // Add tomorrow's cube type for reference
    };
  }
  
  /**
   * Stop all scheduled jobs
   */
  stopAllJobs() {
    // Use Array.from to convert Map entries to an array to avoid iterator issues
    Array.from(this.cronJobs.entries()).forEach(([name, job]) => {
      console.log(`Stopping scheduled job: ${name}`);
      job.stop();
    });
    this.cronJobs.clear();
  }
}

export const scheduler = new Scheduler();
