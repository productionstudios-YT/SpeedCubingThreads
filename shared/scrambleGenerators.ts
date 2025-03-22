import { CubeType, cubeTypes } from './schema';

/**
 * Get a random integer between min and max (inclusive)
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get a random element from an array
 */
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Generate a 3x3 cube scramble
 * Format: 20 moves, no redundant moves (e.g., R R')
 */
function generate3x3Scramble(): string {
  const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
  const modifiers = ['', '\'', '2'];
  const scramble: string[] = [];
  let lastFace = '';

  for (let i = 0; i < 20; i++) {
    // Filter out the last face to avoid redundant moves
    const possibleMoves = moves.filter(move => move !== lastFace);
    const face = getRandomElement(possibleMoves);
    const modifier = getRandomElement(modifiers);
    
    scramble.push(`${face}${modifier}`);
    lastFace = face;
  }

  return scramble.join(' ');
}

/**
 * Generate a 2x2 cube scramble
 * Format: Typically 9-11 moves
 */
function generate2x2Scramble(): string {
  const moves = ['R', 'U', 'F'];
  const modifiers = ['', '\'', '2'];
  const scramble: string[] = [];
  let lastFace = '';
  const moveCount = getRandomInt(9, 11);

  for (let i = 0; i < moveCount; i++) {
    const possibleMoves = moves.filter(move => move !== lastFace);
    const face = getRandomElement(possibleMoves);
    const modifier = getRandomElement(modifiers);
    
    scramble.push(`${face}${modifier}`);
    lastFace = face;
  }

  return scramble.join(' ');
}

/**
 * Generate a Pyraminx scramble
 * Format: 8-12 moves with tip notation
 */
function generatePyraminxScramble(): string {
  const regularMoves = ['R', 'L', 'U', 'B'];
  const tipMoves = ['r', 'l', 'u', 'b'];
  const modifiers = ['', '\''];
  const scramble: string[] = [];
  let lastFace = '';
  
  // Regular moves (8-10)
  const moveCount = getRandomInt(8, 10);
  for (let i = 0; i < moveCount; i++) {
    const possibleMoves = regularMoves.filter(move => move !== lastFace);
    const face = getRandomElement(possibleMoves);
    const modifier = getRandomElement(modifiers);
    
    scramble.push(`${face}${modifier}`);
    lastFace = face;
  }
  
  // Add 0-4 tip rotations
  const tipCount = getRandomInt(0, 4);
  const tipsToUse = shuffleArray(tipMoves).slice(0, tipCount);
  
  for (const tip of tipsToUse) {
    const modifier = getRandomElement(modifiers);
    scramble.push(`${tip}${modifier}`);
  }

  return scramble.join(' ');
}

/**
 * Generate a Skewb scramble
 * Format: 8-12 moves
 */
function generateSkewbScramble(): string {
  const moves = ['R', 'L', 'U', 'B'];
  const modifiers = ['', '\''];
  const scramble: string[] = [];
  let lastFace = '';
  
  const moveCount = getRandomInt(8, 12);
  for (let i = 0; i < moveCount; i++) {
    const possibleMoves = moves.filter(move => move !== lastFace);
    const face = getRandomElement(possibleMoves);
    const modifier = getRandomElement(modifiers);
    
    scramble.push(`${face}${modifier}`);
    lastFace = face;
  }

  return scramble.join(' ');
}

/**
 * Generate a Clock scramble
 * Format: Standard clock notation
 */
function generateClockScramble(): string {
  const scramble: string[] = [];
  
  // Generate pin configurations (UL, UR, DL, DR)
  const pins = ['U', 'd'];
  scramble.push(`UR${getRandomElement(pins)}`);
  scramble.push(`DR${getRandomElement(pins)}`);
  scramble.push(`DL${getRandomElement(pins)}`);
  scramble.push(`UL${getRandomElement(pins)}`);
  
  // Generate clock moves
  for (const position of ['UL', 'UR', 'DR', 'DL', 'ALL']) {
    // Random between -6 and 6
    const hour = getRandomInt(-6, 6);
    const sign = hour < 0 ? '-' : '+';
    scramble.push(`${position}${sign}${Math.abs(hour)}`);
  }
  
  // Final 'y2' if needed (50% chance)
  if (Math.random() > 0.5) {
    scramble.push('y2');
  }

  return scramble.join(' ');
}

/**
 * Generate a 3x3 BLD (Blindfolded) scramble
 * Similar to regular 3x3 but longer (25 moves)
 */
function generate3x3BLDScramble(): string {
  const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
  const modifiers = ['', '\'', '2'];
  const scramble: string[] = [];
  let lastFace = '';

  for (let i = 0; i < 25; i++) {
    const possibleMoves = moves.filter(move => move !== lastFace);
    const face = getRandomElement(possibleMoves);
    const modifier = getRandomElement(modifiers);
    
    scramble.push(`${face}${modifier}`);
    lastFace = face;
  }

  return scramble.join(' ');
}

/**
 * Generate a 3x3 OH (One-Handed) scramble
 * Same as regular 3x3 - just a different event
 */
function generate3x3OHScramble(): string {
  return generate3x3Scramble();
}

/**
 * Generate a scramble for the specified cube type
 */
export function generateScramble(cubeType: CubeType): string {
  switch (cubeType) {
    case cubeTypes.THREE:
      return generate3x3Scramble();
    case cubeTypes.TWO:
      return generate2x2Scramble();
    case cubeTypes.PYRAMINX:
      return generatePyraminxScramble();
    case cubeTypes.SKEWB:
      return generateSkewbScramble();
    case cubeTypes.CLOCK:
      return generateClockScramble();
    case cubeTypes.THREE_BLD:
      return generate3x3BLDScramble();
    case cubeTypes.THREE_OH:
      return generate3x3OHScramble();
    default:
      return generate3x3Scramble(); // Default to 3x3
  }
}
