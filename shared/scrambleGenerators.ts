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
 * Format: 25 moves, extended from WCA regulations for higher difficulty
 * - No move with its inverse in sequence (e.g., R L R')
 * - No redundant moves on the same axis (e.g., R L)
 * - Higher preference for difficult move combinations
 */
function generate3x3Scramble(): string {
  const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
  // Increase frequency of inverted and double moves to increase difficulty
  const modifiers = ['', '\'', '\'', '2', '2'];
  const scramble: string[] = [];
  let lastMove = '';
  let secondLastMove = '';

  // Increased to 25 moves for more complexity
  for (let i = 0; i < 25; i++) {
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
    
    // For more difficulty, occasionally prefer slice-based combinations 
    // (adjacent faces that create slice-like movements)
    const adjacentPairs = [['R', 'F'], ['R', 'U'], ['U', 'F'], ['L', 'B'], ['L', 'D'], ['D', 'B']];
    if (i > 0 && i % 5 === 0 && lastMove) {
      const preferredPairs = adjacentPairs.filter(pair => pair.includes(lastMove));
      if (preferredPairs.length > 0) {
        const randomPair = getRandomElement(preferredPairs);
        const preferredMove = randomPair.find(move => move !== lastMove);
        if (preferredMove && availableMoves.includes(preferredMove)) {
          // 70% chance to use the preferred adjacent face for harder patterns
          if (Math.random() < 0.7) {
            const modifier = getRandomElement(modifiers);
            scramble.push(`${preferredMove}${modifier}`);
            secondLastMove = lastMove;
            lastMove = preferredMove;
            continue;
          }
        }
      }
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
 * Format: 15 moves, extended from WCA regulations for higher difficulty
 */
function generate2x2Scramble(): string {
  // For 2x2, we can use more types of moves for increased difficulty
  const moves = ['R', 'U', 'F', 'L', 'D', 'B'];
  // Increase frequency of inverted and double moves
  const modifiers = ['', '\'', '\'', '2', '2'];
  const scramble: string[] = [];
  let lastMove = '';
  let secondLastMove = '';
  
  // Increased from 11 to 15 moves
  for (let i = 0; i < 15; i++) {
    // Filter out moves on the same axis as the last move
    let availableMoves = [...moves];
    
    if (lastMove) {
      // Remove moves on the same axis for harder patterns
      // For 2x2 we can use the same axis mapping as 3x3
      availableMoves = availableMoves.filter(move => 
        !sameAxis[lastMove] || !sameAxis[lastMove].includes(move)
      );
    }
    
    // Don't allow a move to return to the state before the last move
    if (secondLastMove && lastMove) {
      if (secondLastMove === availableMoves.find(m => m === secondLastMove)) {
        availableMoves = availableMoves.filter(move => move !== secondLastMove);
      }
    }
    
    // Ensure we always have moves to choose from
    if (availableMoves.length === 0) {
      availableMoves = moves.filter(move => move !== lastMove);
    }
    
    // For 2x2, prioritize certain move combinations that create more complex patterns
    // These are typical move combinations in 2x2 algorithms that create harder states
    const hardPatterns = [
      ['R', 'U'], ['R', 'F'], ['U', 'F'], 
      ['R', 'D'], ['F', 'D'], ['U', 'L']
    ];
    
    // Occasionally prefer these harder patterns
    if (i > 0 && i % 3 === 0 && lastMove) {
      const relevantPatterns = hardPatterns.filter(pattern => pattern.includes(lastMove));
      if (relevantPatterns.length > 0) {
        const randomPattern = getRandomElement(relevantPatterns);
        const nextMove = randomPattern.find(move => move !== lastMove);
        if (nextMove && availableMoves.includes(nextMove)) {
          // 75% chance to use this harder pattern
          if (Math.random() < 0.75) {
            const modifier = getRandomElement(modifiers);
            scramble.push(`${nextMove}${modifier}`);
            secondLastMove = lastMove;
            lastMove = nextMove;
            continue;
          }
        }
      }
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
 * Generate a Pyraminx scramble
 * Format: Extended from WCA regulation - 12-14 random moves followed by minimal tips
 */
function generatePyraminxScramble(): string {
  const regularMoves = ['R', 'L', 'U', 'B'];
  const tipMoves = ['r', 'l', 'u', 'b'];
  // Increase the frequency of inverted moves
  const modifiers = ['', '\'', '\''];
  const scramble: string[] = [];
  let lastMove = '';
  let secondLastMove = '';
  
  // Increase move count for more difficulty (increased from 8-10 to 12-14)
  const moveCount = getRandomInt(12, 14);
  
  // Anti-rotation mapping to avoid cancellation patterns
  const antiRotation: Record<string, string> = {
    'R': 'L', 'L': 'R',
    'U': 'B', 'B': 'U'
  };
  
  // Hard pattern templates - common sequences in Pyraminx solving that create tough states
  const hardPatterns = [
    ['R', 'L', 'R'], 
    ['U', 'R', 'U'], 
    ['L', 'U', 'L'],
    ['B', 'R', 'B']
  ];
  
  for (let i = 0; i < moveCount; i++) {
    // Generate a hard pattern occasionally
    if (i % 4 === 0 && i+2 < moveCount) {
      const pattern = getRandomElement(hardPatterns);
      
      // Check if we can apply this pattern without immediate redundancy
      if (pattern[0] !== lastMove) {
        // Apply the pattern with random modifiers
        for (let j = 0; j < pattern.length; j++) {
          const mod = getRandomElement(modifiers);
          scramble.push(`${pattern[j]}${mod}`);
        }
        
        // Update move tracking
        secondLastMove = pattern[pattern.length - 2];
        lastMove = pattern[pattern.length - 1];
        
        // Skip ahead in the loop
        i += pattern.length - 1;
        continue;
      }
    }
    
    // Standard move selection with anti-patterns
    let availableMoves = [...regularMoves];
    
    // Avoid the same move twice in a row
    availableMoves = availableMoves.filter(move => move !== lastMove);
    
    // Avoid creating cancellation patterns (like R L' R)
    if (secondLastMove && lastMove && secondLastMove === antiRotation[lastMove]) {
      availableMoves = availableMoves.filter(move => move !== secondLastMove);
    }
    
    // Ensure we have moves to choose from
    if (availableMoves.length === 0) {
      availableMoves = regularMoves.filter(move => move !== lastMove);
    }
    
    const move = getRandomElement(availableMoves);
    const modifier = getRandomElement(modifiers);
    
    scramble.push(`${move}${modifier}`);
    secondLastMove = lastMove;
    lastMove = move;
  }
  
  // Add fewer tips than standard (0-2 tips) to make the puzzle harder to orient
  // Each tip can only appear once
  const usedTips = new Set<string>();
  const tipCount = getRandomInt(0, 2);
  
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
 * Format: Extended from WCA regulation - 12 random moves with complex patterns
 */
function generateSkewbScramble(): string {
  // For Skewb, the standard notation uses R, U, L, B referring to the 4 corners
  const corners = ['R', 'U', 'L', 'B'];
  // Increase the frequency of reverse moves for Skewb
  const modifiers = ['', '\'', '\'', '\''];
  const scramble: string[] = [];
  let lastCorner = '';
  let secondLastCorner = '';
  
  // Skewb "hedgeslammer" patterns that are known to create difficult states
  const hardPatterns = [
    ['R', 'U', 'R\''], // Hedgeslammer right
    ['L', 'U', 'L\''], // Hedgeslammer left
    ['U', 'R', 'U\''], // Reverse hedgeslammer top
    ['B', 'R', 'B\'']  // Back hedgeslammer
  ];
  
  // Skewb adjacency map - which corners are adjacent
  const adjacentCorners: Record<string, string[]> = {
    'R': ['U', 'L', 'B'],
    'U': ['R', 'L', 'B'],
    'L': ['R', 'U', 'B'],
    'B': ['R', 'U', 'L']
  };
  
  // Increase to 12 moves for higher difficulty
  for (let i = 0; i < 12; i++) {
    // Occasionally insert a hard pattern
    if (i % 4 === 0 && i + 2 < 12) {
      const pattern = getRandomElement(hardPatterns);
      
      // Check if pattern can be applied without redundancy
      if (lastCorner !== pattern[0]) {
        // Apply each move in the pattern
        for (let j = 0; j < pattern.length; j++) {
          // For the middle move, keep the modifier as in the pattern
          if (j === 1) {
            scramble.push(`${pattern[j]}`); // No modifier on middle move
          } else {
            // For first and last move, use the exact notation from the pattern
            const move = pattern[j];
            // Extract the modifier if present, or use empty string
            const mod = move.length > 1 ? move.substring(1) : '';
            scramble.push(`${move[0]}${mod}`);
          }
        }
        
        // Update tracking variables
        secondLastCorner = pattern[1][0]; // Just the corner letter
        lastCorner = pattern[0][0];       // Just the corner letter
        
        // Skip ahead
        i += pattern.length - 1;
        continue;
      }
    }
    
    // Standard move selection logic
    let availableCorners = [...corners];
    
    // Don't repeat the immediate last corner
    availableCorners = availableCorners.filter(corner => corner !== lastCorner);
    
    // For Skewb, prioritize adjacent corners for harder scrambles
    if (lastCorner && adjacentCorners[lastCorner]) {
      // 70% chance to use an adjacent corner
      if (Math.random() < 0.7) {
        const adjacentOptions = adjacentCorners[lastCorner]
          .filter(corner => corner !== secondLastCorner);
        
        if (adjacentOptions.length > 0) {
          const corner = getRandomElement(adjacentOptions);
          const modifier = getRandomElement(modifiers);
          
          scramble.push(`${corner}${modifier}`);
          secondLastCorner = lastCorner;
          lastCorner = corner;
          continue;
        }
      }
    }
    
    // Regular move if we didn't use the adjacency logic
    const corner = getRandomElement(availableCorners);
    const modifier = getRandomElement(modifiers);
    
    scramble.push(`${corner}${modifier}`);
    secondLastCorner = lastCorner;
    lastCorner = corner;
  }

  return scramble.join(' ');
}

/**
 * Generate a Clock scramble
 * Format: Extended from WCA regulation - more difficult pin and hour configurations
 */
function generateClockScramble(): string {
  // WCA Clock notation:
  // - Pin configuration using UR DR DL UL (u=up, d=down)
  // - Clock positions using UURx URRx DRRx DLLx ULLx y2 UURx URRx DRRx DLLx ULLx
  
  const scramble: string[] = [];
  
  // For harder scrambles, use asymmetric pin configurations
  // More down pins makes the puzzle harder to solve
  // Most difficult configurations are (d,d,d,u) and (u,d,d,d)
  const hardPinConfigs = [
    { UR: 'd', DR: 'd', DL: 'd', UL: 'u' },
    { UR: 'u', DR: 'd', DL: 'd', UL: 'd' },
    { UR: 'd', DR: 'u', DL: 'd', UL: 'd' },
    { UR: 'd', DR: 'd', DL: 'u', UL: 'd' }
  ];
  
  // 75% chance to use a hard pin configuration instead of random
  const pins: Record<string, string> = Math.random() < 0.75 
    ? getRandomElement(hardPinConfigs)
    : {
        'UR': getRandomElement(['u', 'd']),
        'DR': getRandomElement(['u', 'd']),
        'DL': getRandomElement(['u', 'd']),
        'UL': getRandomElement(['u', 'd'])
      };
  
  scramble.push(`(${pins.UR},${pins.DR},${pins.DL},${pins.UL})`);
  
  // First set of moves - 5 positions
  const positions = ['UL', 'UR', 'DR', 'DL', 'ALL'];
  
  // For more difficult scrambles, use the full range of clock movement (0-11)
  // and generate larger numbers more frequently
  for (const pos of positions) {
    // Increase the range to 0-11 for more complex positions
    // Bias towards larger numbers which create more difficult states
    const hourBase = getRandomInt(0, 11);
    // Add 25% chance of using larger numbers (6-11) by rerolling
    const hour = hourBase < 6 && Math.random() < 0.25 
      ? getRandomInt(6, 11) 
      : hourBase;
      
    // For clock, adding + makes it clearer this is a clockwise movement
    scramble.push(`${pos}${hour >= 0 ? '+' : ''}${hour}`);
  }
  
  // y2 turn
  scramble.push('y2');
  
  // Second set of moves after y2
  // Make these moves also favor difficult positions
  for (const pos of positions) {
    const hourBase = getRandomInt(0, 11); 
    // Add 25% chance of using larger numbers (6-11) by rerolling
    const hour = hourBase < 6 && Math.random() < 0.25 
      ? getRandomInt(6, 11) 
      : hourBase;
      
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
