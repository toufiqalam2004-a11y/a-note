import { ClientWithVideos, PendingVoiceAction } from '../types/index';

export interface ParseResult {
  success: boolean;
  message: string;
  actionType: 'ADD_CLIENT' | 'COMPLETE_VIDEO' | 'NAVIGATE' | 'QUERY' | 'UNKNOWN';
  targetScreen?: 'dashboard' | 'clients' | 'new_client';
  pendingAction?: PendingVoiceAction;
  isAmbiguous?: boolean;
  ambiguityPrompt?: string;
  matchedClient?: ClientWithVideos;
  matchedVideoNumber?: number;
  alreadyCompleted?: boolean;
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
  for: 4, // speech-to-text homophone for "four"
  five: 5,
  fifth: 5,
  six: 6,
  sixth: 6,
  seven: 7,
  seventh: 7,
  eight: 8,
  eighth: 8,
  ate: 8, // speech-to-text homophone for "eight"
  nine: 9,
  ninth: 9,
  ten: 10,
  tenth: 10,
  eleven: 11,
  eleventh: 11,
  twelve: 12,
  twelfth: 12,
  thirteen: 13,
  thirteenth: 13,
  fourteen: 14,
  fourteenth: 14,
  fifteen: 15,
  fifteenth: 15,
  sixteen: 16,
  sixteenth: 16,
  seventeen: 17,
  seventeenth: 17,
  eighteen: 18,
  eighteenth: 18,
  nineteen: 19,
  nineteenth: 19,
  twenty: 20,
  twentieth: 20,
  thirty: 30,
  thirtieth: 30,
  forty: 40,
  fourtieth: 40,
  fifty: 50,
  fiftieth: 50,
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
 * Converts English number phrases like "five", "video 5", "fifteen hundred",
 * or raw numbers ("5", "10000", "₹800", "12k") into an integer.
 */
export function wordsToNumber(text: string): number | null {
  if (!text) return null;
  const clean = text.toLowerCase().replace(/[,₹$#]/g, '').trim();

  // Direct numeric match (e.g. "5", "10000", "12k")
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
  if (!cleanQuery) {
    return { client: null, isAmbiguous: false, candidates: [] };
  }

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
 * Normalizes speech recognition or typed command text.
 */
function normalizeCommandText(raw: string): string {
  let text = raw.trim().toLowerCase();
  // Strip trailing punctuation
  text = text.replace(/^[.,!?;:\s]+|[.,!?;:\s]+$/g, '');

  // Normalize "video number 5", "video no. 5", "video no 5", "video #5" -> "video 5"
  text = text.replace(/\bvideo\s+(?:number|no\.?|#)\s*([a-z0-9]+)/gi, 'video $1');
  text = text.replace(/\bvideo\s*#\s*([a-z0-9]+)/gi, 'video $1');

  // Handle common speech recognition anomaly: "video for" when user said "video four"
  text = text.replace(/\bvideo\s+for\s+(is\s+)?(done|completed|finished)/gi, 'video 4 $1$2');

  return text;
}

/**
 * Parses user voice transcript against available clients and commands.
 */
export function parseVoiceCommand(
  rawTranscript: string,
  clients: ClientWithVideos[]
): ParseResult {
  if (!rawTranscript || !rawTranscript.trim()) {
    return {
      success: false,
      message: 'No speech recognized. Please speak or type your command.',
      actionType: 'UNKNOWN',
    };
  }

  const lower = normalizeCommandText(rawTranscript);

  // 1. Specific Client Navigation: "Show client Rahul", "Open client Rahul"
  const showClientMatch = lower.match(/(?:show|open|view|go\s+to)\s+client\s+([^,]+)/i);
  if (showClientMatch) {
    const rawTarget = showClientMatch[1].trim().replace(/[.,!?:;]/g, '');
    const match = findMatchingClient(rawTarget, clients);
    if (match.client) {
      return {
        success: true,
        message: `Opening details for client ${match.client.name}.`,
        actionType: 'NAVIGATE',
        targetScreen: 'dashboard',
        matchedClient: match.client,
      };
    }
    if (match.isAmbiguous) {
      return {
        success: false,
        isAmbiguous: true,
        ambiguityPrompt: `Multiple clients matched "${rawTarget}". Which one do you want to view? Candidates: ${match.candidates.map((c) => c.name).join(', ')}`,
        message: `Ambiguous client name "${rawTarget}".`,
        actionType: 'QUERY',
      };
    }
  }

  // 2. Navigation / Query commands
  if (
    lower === 'new client' ||
    lower === 'add client' ||
    lower === 'create client'
  ) {
    return {
      success: true,
      message: 'Opening Add Client modal.',
      actionType: 'NAVIGATE',
      targetScreen: 'new_client',
    };
  }

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
      message: `You have ${totalRemaining} remaining videos across all clients.`,
      actionType: 'QUERY',
      targetScreen: 'dashboard',
    };
  }

  if (
    lower.includes('show clients') ||
    lower.includes('open clients') ||
    lower.includes('go to clients') ||
    lower.includes('client list') ||
    lower === 'clients'
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
    lower.includes('open dashboard') ||
    lower === 'home' ||
    lower === 'dashboard'
  ) {
    return {
      success: true,
      message: 'Navigating to Dashboard.',
      actionType: 'NAVIGATE',
      targetScreen: 'dashboard',
    };
  }

  // 3. Add Client Command
  // "Add client Rahul, rate 800, payment 10000"
  // "New client Amit budget 5000 rate 500"
  const addClientMatch = lower.match(/(?:add|new|create)\s+client\s+([^,]+)/i);
  if (addClientMatch) {
    let rawName = addClientMatch[1].trim();
    const firstKeywordIndex = rawName.search(/(?:,|rate|budget|payment|advance|with)/i);
    if (firstKeywordIndex !== -1) {
      rawName = rawName.substring(0, firstKeywordIndex).trim();
    }

    const clientName = rawName
      .replace(/^(with|named|for)\s+/i, '')
      .replace(/[.,!?:;]/g, '')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .trim();

    const budgetMatch = lower.match(/(?:budget|payment|advance|total)\s*(?:of|is|:)?\s*([a-zA-Z0-9,\s₹$]+?)(?:,|rate|per|\band\b|$)/i);
    let budget: number | null = null;
    if (budgetMatch) {
      budget = wordsToNumber(budgetMatch[1]);
    }

    const rateMatch = lower.match(/(?:rate|per\s*video)\s*(?:of|is|:)?\s*([a-zA-Z0-9,\s₹$]+?)(?:,|budget|payment|advance|\band\b|$)/i);
    let rate: number | null = null;
    if (rateMatch) {
      rate = wordsToNumber(rateMatch[1]);
    }

    if (!clientName) {
      return {
        success: false,
        message: 'Could not detect client name. Example: "Add client Rahul, rate 800, payment 10000"',
        actionType: 'ADD_CLIENT',
      };
    }

    if (!budget || budget <= 0) {
      return {
        success: false,
        message: `Missing or invalid payment amount for ${clientName}.`,
        actionType: 'ADD_CLIENT',
      };
    }

    if (!rate || rate <= 0) {
      return {
        success: false,
        message: `Missing or invalid per-video rate for ${clientName}.`,
        actionType: 'ADD_CLIENT',
      };
    }

    const calculatedVideos = Math.floor(budget / rate);
    const unused = budget % rate;

    return {
      success: true,
      message: `Adding client ${clientName}: ₹${budget.toLocaleString('en-IN')} payment, ₹${rate}/video (${calculatedVideos} videos, ₹${unused} balance).`,
      actionType: 'ADD_CLIENT',
      pendingAction: {
        type: 'ADD_CLIENT',
        description: `Add client ${clientName} with payment ₹${budget.toLocaleString('en-IN')} at ₹${rate}/video (${calculatedVideos} videos)`,
        clientName,
        totalBudget: budget,
        ratePerVideo: rate,
      },
    };
  }

  // 4. Complete Video Command:
  // "Rahul, video five is done."
  // "Rahul, video 5 is done."
  // "Video five is done."
  // "Video 5 is done."
  // "Video 5 done for Rahul"
  // "Rahul video 5 completed"
  const doneKeywords = ['done', 'completed', 'finished', 'complete', 'finish', 'check', 'checked'];
  const hasDoneKeyword = doneKeywords.some((k) => lower.includes(k));

  if (hasDoneKeyword) {
    let potentialClientName = '';
    let potentialVideoStr = '';

    // Pattern 1: "[Client][,: ] (mark)? video [number] (is)? (done|completed)"
    // Example: "Rahul, video five is done", "Rahul video 5 completed", "mark Rahul video 5 done"
    const clientFirstMatch = lower.match(
      /^(?:please\s+)?(?:mark\s+)?([a-zA-Z0-9\s]+?)[,:]?\s+(?:mark\s+)?video\s+([a-zA-Z0-9]+)\s+(?:is\s+)?(?:done|completed|finished|complete|checked)/i
    );

    // Pattern 2: "(mark)? video [number] (is)? (done|completed) for/of [Client]"
    // Example: "Video 5 is done for Rahul", "Video five done for Rahul"
    const videoFirstMatch = lower.match(
      /^(?:mark\s+)?video\s+([a-zA-Z0-9]+)\s+(?:is\s+)?(?:done|completed|finished|complete|checked)\s+(?:for|of)\s+([a-zA-Z0-9\s]+)/i
    );

    // Pattern 3: "(mark)? video [number] for/of [Client] (is)? (done|completed)"
    // Example: "Video 5 for Rahul is done"
    const videoForClientMatch = lower.match(
      /^(?:mark\s+)?video\s+([a-zA-Z0-9]+)\s+(?:for|of)\s+([a-zA-Z0-9\s]+?)\s+(?:is\s+)?(?:done|completed|finished|complete|checked)/i
    );

    // Pattern 4: "(mark)? video [number] (is)? (done|completed)" (no client specified)
    // Example: "Video five is done", "Video 5 is done", "Mark video 5 done"
    const videoOnlyMatch = lower.match(
      /^(?:mark\s+)?video\s+([a-zA-Z0-9]+)\s*(?:is\s+)?(?:done|completed|finished|complete|checked)?$/i
    );

    if (videoFirstMatch) {
      potentialVideoStr = videoFirstMatch[1];
      potentialClientName = videoFirstMatch[2].trim();
    } else if (videoForClientMatch) {
      potentialVideoStr = videoForClientMatch[1];
      potentialClientName = videoForClientMatch[2].trim();
    } else if (clientFirstMatch) {
      potentialClientName = clientFirstMatch[1].trim();
      potentialVideoStr = clientFirstMatch[2].trim();
    } else if (videoOnlyMatch) {
      potentialVideoStr = videoOnlyMatch[1];
      if (clients.length === 1) {
        potentialClientName = clients[0].name;
      } else if (clients.length > 1) {
        const vNum = wordsToNumber(potentialVideoStr);
        return {
          success: false,
          isAmbiguous: true,
          ambiguityPrompt: `Which client is Video ${vNum || potentialVideoStr} for? Available clients: ${clients.map((c) => c.name).join(', ')}`,
          message: `Multiple clients found. Please specify client name (e.g., "${clients[0].name}, video ${vNum || potentialVideoStr} is done").`,
          actionType: 'COMPLETE_VIDEO',
        };
      } else {
        return {
          success: false,
          message: 'No clients available. Please add a client first.',
          actionType: 'COMPLETE_VIDEO',
        };
      }
    }

    if (potentialVideoStr) {
      const videoNum = wordsToNumber(potentialVideoStr);

      if (!videoNum || videoNum <= 0) {
        return {
          success: false,
          message: `Could not identify video number in "${potentialVideoStr}". Example: "Rahul, video 5 is done"`,
          actionType: 'COMPLETE_VIDEO',
        };
      }

      // If client name is present, match it
      if (!potentialClientName) {
        if (clients.length === 1) {
          potentialClientName = clients[0].name;
        } else if (clients.length > 1) {
          return {
            success: false,
            isAmbiguous: true,
            ambiguityPrompt: `Which client is Video ${videoNum} for? Available clients: ${clients.map((c) => c.name).join(', ')}`,
            message: `Please specify the client name for Video ${videoNum}.`,
            actionType: 'COMPLETE_VIDEO',
          };
        } else {
          return {
            success: false,
            message: 'No clients found. Please add a client first.',
            actionType: 'COMPLETE_VIDEO',
          };
        }
      }

      const match = findMatchingClient(potentialClientName, clients);

      if (match.isAmbiguous) {
        return {
          success: false,
          isAmbiguous: true,
          ambiguityPrompt: `Multiple clients matched "${potentialClientName}". Candidates: ${match.candidates.map((c) => c.name).join(', ')}`,
          message: `Ambiguous client name "${potentialClientName}". Candidates: ${match.candidates.map((c) => c.name).join(', ')}`,
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
      // Match strictly by displayed videoNumber
      const targetVideo = client.videos.find((v) => v.videoNumber === videoNum);

      if (!targetVideo) {
        return {
          success: false,
          message: `${client.name} has ${client.calculations.totalVideos} videos configured. Video ${videoNum} does not exist.`,
          actionType: 'COMPLETE_VIDEO',
          matchedClient: client,
        };
      }

      // Check if already completed: friendly message, no alarming error popup, no duplicate history
      if (targetVideo.isCompleted) {
        return {
          success: true,
          alreadyCompleted: true,
          message: `Video ${videoNum} is already completed.`,
          actionType: 'COMPLETE_VIDEO',
          matchedClient: client,
          matchedVideoNumber: videoNum,
        };
      }

      // Unambiguous, pending video: executes directly without unnecessary confirmation
      return {
        success: true,
        alreadyCompleted: false,
        message: `Video ${videoNum} for ${client.name} completed!`,
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

  // 5. Client Name Query / Identification (e.g. "Hardik", "client Hardik", "show Hardik", "Hardik videos")
  // Allows user to speak a client name; recognizes and displays the client without completing any video or mutating SQLite!
  const candidateClientName = lower
    .replace(/^(?:client|who is|details of|details for|about|show|open|view)\s+/i, '')
    .replace(/\s+(?:videos?|details|profile|account|status|work|tasks?)$/i, '')
    .trim();

  if (candidateClientName.length > 0) {
    const clientMatch = findMatchingClient(candidateClientName, clients);
    if (clientMatch.client) {
      const matched = clientMatch.client;
      return {
        success: true,
        actionType: 'QUERY',
        matchedClient: matched,
        message: `Client "${matched.name}" recognized (${matched.calculations.completedVideos}/${matched.calculations.totalVideos} videos completed). Say e.g. "Video 5 is done" to mark a video.`,
      };
    }

    if (clientMatch.isAmbiguous) {
      return {
        success: false,
        isAmbiguous: true,
        ambiguityPrompt: `Multiple clients matched "${candidateClientName}": ${clientMatch.candidates.map((c) => c.name).join(', ')}.`,
        message: `Ambiguous client name "${candidateClientName}". Candidates: ${clientMatch.candidates.map((c) => c.name).join(', ')}`,
        actionType: 'QUERY',
      };
    }
  }

  // Fallback / Unrecognized command
  return {
    success: false,
    message: `Command not recognized: "${rawTranscript.trim()}". Try: "Rahul, video 5 is done" or say a client name.`,
    actionType: 'UNKNOWN',
  };
}
