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
 * Opposite moves mapping for 3x3
 */
const opposites: Record<string, string> = {
  'R': 'L', 'L': 'R',
  'U': 'D', 'D': 'U',
  'F': 'B', 'B': 'F'
};

/**
 * Moves in the same axis for 3x3
 */
const sameAxis: Record<string, string[]> = {
  'R': ['R', 'L'], 'L': ['R', 'L'],
  'U': ['U', 'D'], 'D': ['U', 'D'],
  'F': ['F', 'B'], 'B': ['F', 'B']
};

/**
 * Generate a 3x3 cube scramble
 * Format: 20 moves, following WCA regulations
 * - No move with its inverse in sequence (e.g., R L R')
 * - No redundant moves on the same axis (e.g., R L)
 */
function generate3x3Scramble(): string {
  const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
  const modifiers = ['', '\'', '2'];
  const scramble: string[] = [];
  let lastMove = '';
  let secondLastMove = '';

  for (let i = 0; i < 20; i++) {
    // Filter out moves on the same axis as the last move
    let availableMoves = [...moves];
    
    if (lastMove) {
      // Remove moves on the same axis as the last move
      availableMoves = availableMoves.filter(move => !sameAxis[lastMove].includes(move));
    }
    
    // Don't allow a move to return to the state before the last move
    // For example, avoid sequences like "R L R" or "R L R'"
    if (secondLastMove && lastMove) {
      // If we're potentially going back to the same face as two moves ago
      if (secondLastMove === availableMoves.find(m => m === secondLastMove)) {
        // Remove this option to avoid the pattern
        availableMoves = availableMoves.filter(move => move !== secondLastMove);
      }
    }
    
    // Ensure we always have moves to choose from
    if (availableMoves.length === 0) {
      availableMoves = moves.filter(move => move !== lastMove);
    }
    
    const face = getRandomElement(availableMoves);
    const modifier = getRandomElement(modifiers);
    
    scramble.push(`${face}${modifier}`);
    secondLastMove = lastMove;
    lastMove = face;
  }

  return scramble.join(' ');
}

/**
 * Generate a 2x2 cube scramble
 * Format: Exactly 11 moves, following WCA regulations
 */
function generate2x2Scramble(): string {
  // For 2x2, we use only RUF but follow the same rules as 3x3
  const moves = ['R', 'U', 'F'];
  const modifiers = ['', '\'', '2'];
  const scramble: string[] = [];
  let lastMove = '';
  
  for (let i = 0; i < 11; i++) {
    // Filter out the last face to avoid redundant moves
    const possibleMoves = moves.filter(move => move !== lastMove);
    const face = getRandomElement(possibleMoves);
    const modifier = getRandomElement(modifiers);
    
    scramble.push(`${face}${modifier}`);
    lastMove = face;
  }

  return scramble.join(' ');
}

/**
 * Generate a Pyraminx scramble
 * Format: WCA regulation - exactly 8-10 random moves followed by tips
 */
function generatePyraminxScramble(): string {
  const regularMoves = ['R', 'L', 'U', 'B'];
  const tipMoves = ['r', 'l', 'u', 'b'];
  const modifiers = ['', '\''];
  const scramble: string[] = [];
  let lastMove = '';
  
  // Regular moves (8-10 as per WCA regulations)
  const moveCount = getRandomInt(8, 10);
  for (let i = 0; i < moveCount; i++) {
    // Avoid the same move twice in a row
    const possibleMoves = regularMoves.filter(move => move !== lastMove);
    const move = getRandomElement(possibleMoves);
    const modifier = getRandomElement(modifiers);
    
    scramble.push(`${move}${modifier}`);
    lastMove = move;
  }
  
  // Add tips at the end (0-4 tips)
  // Each tip can only appear once
  const usedTips = new Set<string>();
  const tipCount = getRandomInt(0, 4);
  
  for (let i = 0; i < tipCount; i++) {
    const availableTips = tipMoves.filter(tip => !usedTips.has(tip));
    if (availableTips.length === 0) break;
    
    const tip = getRandomElement(availableTips);
    const modifier = getRandomElement(modifiers);
    
    scramble.push(`${tip}${modifier}`);
    usedTips.add(tip);
  }

  return scramble.join(' ');
}

/**
 * Generate a Skewb scramble
 * Format: WCA regulation - exactly 9 random moves with proper notation
 */
function generateSkewbScramble(): string {
  // For Skewb, the standard notation uses R, U, L, B referring to the 4 corners
  const corners = ['R', 'U', 'L', 'B'];
  const modifiers = ['', '\''];
  const scramble: string[] = [];
  let lastCorner = '';
  
  // Exactly 9 moves as per WCA regulations
  for (let i = 0; i < 9; i++) {
    // Avoid the same corner twice in a row
    const possibleCorners = corners.filter(corner => corner !== lastCorner);
    const corner = getRandomElement(possibleCorners);
    const modifier = getRandomElement(modifiers);
    
    scramble.push(`${corner}${modifier}`);
    lastCorner = corner;
  }

  return scramble.join(' ');
}

/**
 * Generate a Clock scramble
 * Format: WCA regulation - standard clock notation
 */
function generateClockScramble(): string {
  // WCA Clock notation:
  // - Pin configuration using UR DR DL UL (u=up, d=down)
  // - Clock positions using UURx URRx DRRx DLLx ULLx y2 UURx URRx DRRx DLLx ULLx
  
  const scramble: string[] = [];
  
  // Generate pin configurations (u=pin up, d=pin down)
  const pins: Record<string, string> = {
    'UR': getRandomElement(['u', 'd']),
    'DR': getRandomElement(['u', 'd']),
    'DL': getRandomElement(['u', 'd']),
    'UL': getRandomElement(['u', 'd'])
  };
  
  scramble.push(`(${pins.UR},${pins.DR},${pins.DL},${pins.UL})`);
  
  // First set of moves - 5 positions
  const positions = ['UL', 'UR', 'DR', 'DL', 'ALL'];
  for (const pos of positions) {
    // Clock positions range from 0-6 in either direction
    const hour = getRandomInt(0, 6);
    // For clock, adding + makes it clearer this is a clockwise movement
    scramble.push(`${pos}${hour >= 0 ? '+' : ''}${hour}`);
  }
  
  // y2 turn
  scramble.push('y2');
  
  // Second set of moves after y2
  for (const pos of positions) {
    const hour = getRandomInt(0, 6);
    scramble.push(`${pos}${hour >= 0 ? '+' : ''}${hour}`);
  }

  return scramble.join(' ');
}

/**
 * Generate a 3x3 BLD (Blindfolded) scramble
 * Format: 20 moves, same rules as 3x3
 */
function generate3x3BLDScramble(): string {
  // BLD uses the same scramble format as 3x3, but we'll make it 20 moves
  // to match standard 3x3 competition scrambles
  return generate3x3Scramble();
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
