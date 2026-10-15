import { ClientWithVideos, PendingVoiceAction } from '../types/index';

export interface ParseResult {
  success: boolean;
  message: string;
  actionType: 'ADD_CLIENT' | 'COMPLETE_VIDEO' | 'NAVIGATE' | 'QUERY' | 'UNKNOWN';
  targetScreen?: 'dashboard' | 'clients';
  pendingAction?: PendingVoiceAction;
  isAmbiguous?: boolean;
  ambiguityPrompt?: string;
  matchedClient?: ClientWithVideos;
  matchedVideoNumber?: number;
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  first: 1,
  two: 2,
  second: 2,
  three: 3,
  third: 3,
  four: 4,
  fourth: 4,
  five: 5,
  fifth: 5,
  six: 6,
  sixth: 6,
  seven: 7,
  seventh: 7,
  eight: 8,
  eighth: 8,
  nine: 9,
  ninth: 9,
  ten: 10,
  tenth: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  lakh: 100000,
  lac: 100000,
};

/**
 * Converts English number phrases like "ten thousand", "eight hundred", "fifteen hundred",
 * or raw numbers ("10000", "₹800", "12k") into an integer.
 */
export function wordsToNumber(text: string): number | null {
  if (!text) return null;
  const clean = text.toLowerCase().replace(/[,₹$]/g, '').trim();

  // Try direct number parse (e.g. "10000", "12.5k")
  if (/^\d+(\.\d+)?k?$/.test(clean)) {
    if (clean.endsWith('k')) {
      const val = parseFloat(clean.replace('k', ''));
      return isNaN(val) ? null : Math.round(val * 1000);
    }
    const val = parseFloat(clean);
    return isNaN(val) ? null : Math.round(val);
  }

  const tokens = clean.split(/[\s-]+/);
  let total = 0;
  let currentGroup = 0;
  let foundAny = false;

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      currentGroup += parseInt(token, 10);
      foundAny = true;
    } else if (token in NUMBER_WORDS) {
      foundAny = true;
      const val = NUMBER_WORDS[token];
      if (val === 100) {
        currentGroup = (currentGroup === 0 ? 1 : currentGroup) * 100;
      } else if (val >= 1000) {
        total += (currentGroup === 0 ? 1 : currentGroup) * val;
        currentGroup = 0;
      } else {
        currentGroup += val;
      }
    }
  }

  total += currentGroup;
  return foundAny ? total : null;
}

/**
 * Finds a client by name using case-insensitive and prefix/fuzzy matching.
 */
export function findMatchingClient(
  query: string,
  clients: ClientWithVideos[]
): { client: ClientWithVideos | null; isAmbiguous: boolean; candidates: ClientWithVideos[] } {
  if (!query || clients.length === 0) {
    return { client: null, isAmbiguous: false, candidates: [] };
  }

  const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  // Exact match first
  const exact = clients.filter(
    (c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanQuery
  );
  if (exact.length === 1) {
    return { client: exact[0], isAmbiguous: false, candidates: exact };
  }

  // Partial / contains match
  const contains = clients.filter((c) => {
    const cName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cName.includes(cleanQuery) || cleanQuery.includes(cName);
  });

  if (contains.length === 1) {
    return { client: contains[0], isAmbiguous: false, candidates: contains };
  }

  if (contains.length > 1) {
    return { client: null, isAmbiguous: true, candidates: contains };
  }

  return { client: null, isAmbiguous: false, candidates: [] };
}

/**
 * Parses user voice transcript against available clients and commands.
 */
export function parseVoiceCommand(
  rawTranscript: string,
  clients: ClientWithVideos[]
): ParseResult {
  const transcript = rawTranscript.trim();
  if (!transcript) {
    return {
      success: false,
      message: 'No speech recognized. Please try again.',
      actionType: 'UNKNOWN',
    };
  }

  const lower = transcript.toLowerCase();

  // 1. Navigation / Query commands
  if (
    lower.includes('show remaining') ||
    lower.includes('show remaining videos') ||
    lower.includes('remaining videos')
  ) {
    const totalRemaining = clients.reduce(
      (sum, c) => sum + c.calculations.remainingVideos,
      0
    );
    return {
      success: true,
      message: `You have ${totalRemaining} remaining videos to deliver across all clients.`,
      actionType: 'QUERY',
      targetScreen: 'dashboard',
    };
  }

  if (
    lower.includes('show clients') ||
    lower.includes('open clients') ||
    lower.includes('go to clients') ||
    lower.includes('client list')
  ) {
    return {
      success: true,
      message: `Navigating to Clients list. You have ${clients.length} active clients.`,
      actionType: 'NAVIGATE',
      targetScreen: 'clients',
    };
  }

  if (
    lower.includes('show dashboard') ||
    lower.includes('go to home') ||
    lower.includes('open home') ||
    lower.includes('open dashboard')
  ) {
    return {
      success: true,
      message: 'Navigating to Dashboard.',
      actionType: 'NAVIGATE',
      targetScreen: 'dashboard',
    };
  }

  // 2. Add client command:
  // "Add client Rahul, budget ten thousand, rate eight hundred."
  // "Add client Priya with budget 15000 and rate 1200"
  // "New client Amit budget 5000 rate 500"
  const addClientMatch = lower.match(/(?:add|new|create)\s+client\s+([^,]+)/i);
  if (addClientMatch) {
    const rest = lower.substring(addClientMatch.index! + addClientMatch[0].length);

    // Extract name: text between "add client" and "budget"
    let clientName = '';
    const budgetIndex = rest.indexOf('budget');

    if (budgetIndex !== -1) {
      clientName = rest.substring(0, budgetIndex).replace(/^(with|named|for)\s+/i, '').trim();
    } else {
      // Look for comma
      const parts = rest.split(',');
      clientName = parts[0].trim();
    }

    // Clean client name
    clientName = clientName
      .replace(/[.,!?:;]/g, '')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .trim();

    // Extract budget
    const budgetMatch = rest.match(/budget\s+([a-zA-Z0-9,\s₹$]+?)(?:rate|per|\band\b|$)/i);
    let budget: number | null = null;
    if (budgetMatch) {
      budget = wordsToNumber(budgetMatch[1]);
    }

    // Extract rate
    const rateMatch = rest.match(/(?:rate|per\s+video)\s+([a-zA-Z0-9,\s₹$]+)/i);
    let rate: number | null = null;
    if (rateMatch) {
      rate = wordsToNumber(rateMatch[1]);
    }

    if (!clientName) {
      return {
        success: false,
        message: 'Could not detect client name. Example: "Add client Rahul, budget 10000, rate 800"',
        actionType: 'ADD_CLIENT',
      };
    }

    if (!budget || budget <= 0) {
      return {
        success: false,
        message: `Missing or invalid budget for ${clientName}. Please specify total budget.`,
        actionType: 'ADD_CLIENT',
      };
    }

    if (!rate || rate <= 0) {
      return {
        success: false,
        message: `Missing or invalid rate for ${clientName}. Please specify per-video rate.`,
        actionType: 'ADD_CLIENT',
      };
    }

    const calculatedVideos = Math.floor(budget / rate);
    const unused = budget - calculatedVideos * rate;

    return {
      success: true,
      message: `Ready to add client ${clientName}: ₹${budget.toLocaleString('en-IN')} budget, ₹${rate}/video (${calculatedVideos} videos, ₹${unused} unused).`,
      actionType: 'ADD_CLIENT',
      pendingAction: {
        type: 'ADD_CLIENT',
        description: `Add client ${clientName} with budget ₹${budget.toLocaleString('en-IN')} at ₹${rate}/video (${calculatedVideos} videos)`,
        clientName,
        totalBudget: budget,
        ratePerVideo: rate,
      },
    };
  }

  // 3. Complete video command:
  // "Rahul, video one done"
  // "Rahul, video 1 done"
  // "Rahul, video two completed"
  // "Rahul video 3 finished"
  // "Video 4 done for Rahul"
  const doneKeywords = ['done', 'completed', 'finished', 'complete', 'finish', 'check'];
  const hasDoneKeyword = doneKeywords.some((k) => lower.includes(k));

  if (hasDoneKeyword) {
    // Attempt format: "Video [number] done for [Client]"
    const videoFirstMatch = lower.match(/video\s+([a-zA-Z0-9]+)\s+(?:done|completed|finished)\s+(?:for\s+)?([a-zA-Z0-9\s]+)/i);
    let potentialClientName = '';
    let potentialVideoStr = '';

    if (videoFirstMatch) {
      potentialVideoStr = videoFirstMatch[1];
      potentialClientName = videoFirstMatch[2].trim();
    } else {
      // Format: "[Client][,] video [number] (done|completed|finished)"
      const clientFirstMatch = lower.match(/([a-zA-Z0-9\s]+?)[,\s]+video\s+([a-zA-Z0-9]+)\s+(?:done|completed|finished|complete)/i);
      if (clientFirstMatch) {
        potentialClientName = clientFirstMatch[1].trim();
        potentialVideoStr = clientFirstMatch[2].trim();
      }
    }

    if (potentialClientName && potentialVideoStr) {
      const videoNum = wordsToNumber(potentialVideoStr);

      if (!videoNum || videoNum <= 0) {
        return {
          success: false,
          message: `Could not identify video number in "${potentialVideoStr}". Example: "Rahul, video 1 done"`,
          actionType: 'COMPLETE_VIDEO',
        };
      }

      // Match client
      const match = findMatchingClient(potentialClientName, clients);

      if (match.isAmbiguous) {
        return {
          success: false,
          isAmbiguous: true,
          ambiguityPrompt: `Multiple clients matched "${potentialClientName}". Please specify the full name.`,
          message: `Ambiguous client name. Matches: ${match.candidates.map((c) => c.name).join(', ')}`,
          actionType: 'COMPLETE_VIDEO',
        };
      }

      if (!match.client) {
        return {
          success: false,
          message: `No client found matching "${potentialClientName}". Available: ${clients.map((c) => c.name).join(', ') || 'None'}`,
          actionType: 'COMPLETE_VIDEO',
        };
      }

      const client = match.client;
      const targetVideo = client.videos.find((v) => v.videoNumber === videoNum);

      if (!targetVideo) {
        return {
          success: false,
          message: `${client.name} only has ${client.calculations.totalVideos} videos configured. Video ${videoNum} does not exist.`,
          actionType: 'COMPLETE_VIDEO',
          matchedClient: client,
        };
      }

      // Check duplicate completion
      if (targetVideo.isCompleted) {
        return {
          success: false,
          message: `Video ${videoNum} for ${client.name} is ALREADY marked as completed!`,
          actionType: 'COMPLETE_VIDEO',
          matchedClient: client,
          matchedVideoNumber: videoNum,
        };
      }

      return {
        success: true,
        message: `Marking Video ${videoNum} completed for ${client.name}.`,
        actionType: 'COMPLETE_VIDEO',
        matchedClient: client,
        matchedVideoNumber: videoNum,
        pendingAction: {
          type: 'COMPLETE_VIDEO',
          description: `Mark Video ${videoNum} completed for ${client.name}`,
          clientName: client.name,
          clientId: client.id,
          videoNumber: videoNum,
          videoId: targetVideo.id,
        },
      };
    }
  }

  // Fallback / Unrecognized command
  return {
    success: false,
    message: `Command not recognized: "${rawTranscript}". Try saying "Rahul, video 1 done" or "Add client Rahul, budget 10000, rate 800".`,
    actionType: 'UNKNOWN',
  };
}
