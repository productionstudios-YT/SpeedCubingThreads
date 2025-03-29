import { CubeType, daySchedule } from '@shared/schema';
import { generateScramble } from '@shared/scrambleGenerators';

/**
 * Class to manage daily scrambles based on the schedule
 */
export class ScrambleManager {
  /**
   * Get the cube type for a specific day
   * @param date The date to get the cube type for
   * @returns The cube type for the given day
   */
  getCubeTypeForDay(date: Date = new Date()): CubeType {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
    const day = days[date.getDay()];
    return daySchedule[day];
  }

  /**
   * Generate a scramble for the current day
   * @returns Object containing the day, cube type, and scramble
   */
  generateDailyScramble(date: Date = new Date()) {
    const cubeType = this.getCubeTypeForDay(date);
    const scramble = generateScramble(cubeType);
    
    // Get day name in proper case (e.g., "Monday")
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    
    return {
      day: dayName,
      cubeType,
      scramble
    };
  }
  
  /**
   * Generate a scramble for a specific cube type
   * @param cubeType The cube type to generate a scramble for
   * @returns Object containing the cube type and scramble
   */
  generateScrambleForType(cubeType: CubeType) {
    const scramble = generateScramble(cubeType);
    
    return {
      cubeType,
      scramble
    };
  }

  /**
   * Generate the thread title for a daily challenge
   * @param date The date for the challenge
   * @returns The formatted thread title
   */
  generateThreadTitle(date: Date = new Date()): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    const cubeType = this.getCubeTypeForDay(date);
    
    return `${dayName} ${cubeType} Challenge`;
  }

  /**
   * Generate the thread content with scramble details
   * @param date The date for the challenge
   * @returns Formatted message content for the thread
   */
  generateThreadContent(date: Date = new Date()): string {
    const { day, cubeType, scramble } = this.generateDailyScramble(date);
    
    return `# ${cubeType} Scramble Challenge
**Day**: ${day}

Here's today's ${cubeType} scramble. Post your times below!

\`\`\`
${scramble}
\`\`\`

Remember to use a timer and follow standard WCA regulations. Good luck!`;
  }
}

export const scrambleManager = new ScrambleManager();
