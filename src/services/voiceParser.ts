import { ClientWithVideos, PendingVoiceAction } from '../types/index';

export interface InterpretedIntent {
  clientName?: string;
  videoNumber?: number;
  actionDescription: string;
  targetStatus?: string;
  currentStatus?: string;
}

export interface ParseResult {
  success: boolean;
  message: string;
  actionType:
    | 'ADD_CLIENT'
    | 'COMPLETE_VIDEO'
    | 'NAVIGATE'
    | 'QUERY'
    | 'CLIENT_PROGRESS'
    | 'SELECT_VIDEO'
    | 'CLARIFICATION'
    | 'UNKNOWN';
  targetScreen?: 'dashboard' | 'clients' | 'new_client';
  pendingAction?: PendingVoiceAction;
  isAmbiguous?: boolean;
  ambiguityPrompt?: string;
  matchedClient?: ClientWithVideos;
  matchedVideoNumber?: number;
  alreadyCompleted?: boolean;
  requiresConfirmation?: boolean;
  interpretedIntent?: InterpretedIntent;
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
 * Normalizes speech recognition or typed command text.
 * Strictly preserves ordinary natural-language meanings outside command contexts.
 * Homophones are ONLY mapped in an unambiguous, explicitly specified video-number context.
 */
export function normalizeCommandText(raw: string): string {
  if (!raw) return '';

  // 1. Unicode apostrophe & quote normalization:
  // Convert all curly apostrophes, smart quotes, prime, backtick, etc. to standard ASCII '
  let text = raw.replace(/[\u2019\u2018\u02BC\u02BB\u00B4\u0060\u2032\uFF07]/g, "'");

  // 2. Whitespace normalization:
  // Collapse tabs, newlines, non-breaking spaces (\u00A0), narrow non-breaking spaces (\u202F), etc.
  text = text.replace(/[\s\u00A0\u202F]+/g, ' ').trim().toLowerCase();

  // 3. Normalize spacing around apostrophes (e.g. "Hardik 's" or "Hardik ' s" -> "Hardik's")
  text = text.replace(/\s*'\s*s\b/g, "'s");
  text = text.replace(/\s*'\s+/g, "' ");

  // 4. Strip surrounding punctuation and quotes (keeping internal punctuation like apostrophes)
  text = text.replace(/^[.,!?;:"“”«»'’‘`´()\s]+|[.,!?;:"“”«»'’‘`´()\s]+$/g, '');

  // 5. Normalize "video number 5", "video no. 5", "video no 5", "video #5" -> "video 5"
  text = text.replace(/\bvideo\s+(?:number|no\.?|#)\s*([a-z0-9]+)/gi, 'video $1');
  text = text.replace(/\bvideo\s*#\s*([a-z0-9]+)/gi, 'video $1');

  // 6. Handle homophone "ate" -> 8 ONLY in explicit video completion: "video ate is done/finished/completed"
  text = text.replace(/\bvideo\s+ate\s+(is\s+)?(done|completed|finished|complete|finish)\b/gi, 'video 8 $1$2');

  // 7. Handle homophone "for" -> 4 ONLY when preceded by a client name in a completion command:
  // e.g. "Hardik video for is done" -> "Hardik video 4 is done"
  // (Prevents converting "video for Hardik is done" into "video 4 Hardik")
  text = text.replace(/(\b[a-z0-9]+\s+)video\s+for\s+(is\s+)?(done|completed|finished|complete|finish)\b/gi, '$1video 4 $2$3');

  // 8. Handle homophones "to" / "too" -> 2 in explicit video completion
  text = text.replace(/\bvideo\s+(?:to|too)\s+(is\s+)?(done|completed|finished|complete|finish)\b/gi, 'video 2 $1$2');

  return text;
}

/**
 * Finds a client by name using case-insensitive exact, possessive-aware, prefix, and word boundary matching.
 */
export function findMatchingClient(
  query: string,
  clients: ClientWithVideos[]
): { client: ClientWithVideos | null; isAmbiguous: boolean; candidates: ClientWithVideos[] } {
  if (!query || clients.length === 0) {
    return { client: null, isAmbiguous: false, candidates: [] };
  }

  // 0. Clean input and strip explicit apostrophe-s or trailing apostrophe
  const rawClean = query
    .toLowerCase()
    .replace(/^(?:client|the|about)\s+/i, '')
    .replace(/[']s?$|s[']$/i, '')
    .trim();

  const cleanQuery = rawClean.replace(/[^a-z0-9]/g, '').trim();
  if (!cleanQuery) {
    return { client: null, isAmbiguous: false, candidates: [] };
  }

  // 1. Exact clean match (e.g. "hardik" === "hardik")
  const exact = clients.filter(
    (c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanQuery
  );
  if (exact.length === 1) {
    return { client: exact[0], isAmbiguous: false, candidates: exact };
  }
  if (exact.length > 1) {
    return { client: null, isAmbiguous: true, candidates: exact };
  }

  // 1b. Possessive trailing 's' check when speech engine omitted apostrophe (e.g. "hardiks" -> "hardik")
  if (cleanQuery.endsWith('s') && cleanQuery.length > 2) {
    const withoutS = cleanQuery.slice(0, -1);
    const exactWithoutS = clients.filter(
      (c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === withoutS
    );
    if (exactWithoutS.length === 1) {
      return { client: exactWithoutS[0], isAmbiguous: false, candidates: exactWithoutS };
    }
    if (exactWithoutS.length > 1) {
      return { client: null, isAmbiguous: true, candidates: exactWithoutS };
    }
  }

  // 2. Prefix or whole-word match
  const wordMatches = clients.filter((c) => {
    const cTokens = c.name.toLowerCase().split(/[\s_-]+/);
    return cTokens.some((tok) => tok === cleanQuery || tok.startsWith(cleanQuery));
  });

  if (wordMatches.length === 1) {
    return { client: wordMatches[0], isAmbiguous: false, candidates: wordMatches };
  }
  if (wordMatches.length > 1) {
    return { client: null, isAmbiguous: true, candidates: wordMatches };
  }

  // 3. Substring containment match
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
 * Strictly separates recognition from execution. Never executes partials or mutates without client.
 */
export function parseVoiceCommand(
  rawTranscript: string,
  clients: ClientWithVideos[],
  confidence?: number
): ParseResult {
  if (!rawTranscript || !rawTranscript.trim()) {
    return {
      success: false,
      message: 'No speech recognized. Please speak or type your command.',
      actionType: 'UNKNOWN',
    };
  }

  const lower = normalizeCommandText(rawTranscript);

  // Ambiguity check: detect multiple distinct video numbers in a single command
  // e.g. "Hardik video 2 and 4 are done" or "Hardik video 2 or 3 is done"
  const multiVideoMatch = lower.match(/\bvideo\s+([a-z0-9]+)\s*(?:and|or|to|,|&)\s*(?:video\s+)?([a-z0-9]+)/i);
  if (multiVideoMatch) {
    const v1 = wordsToNumber(multiVideoMatch[1]) || multiVideoMatch[1];
    const v2 = wordsToNumber(multiVideoMatch[2]) || multiVideoMatch[2];
    if (v1 !== v2) {
      return {
        success: false,
        isAmbiguous: true,
        ambiguityPrompt: `Multiple video numbers detected (Video ${v1} and Video ${v2}). Please specify a single video number to update.`,
        message: `Multiple video numbers detected in command: "${rawTranscript.trim()}".`,
        actionType: 'CLARIFICATION',
      };
    }
  }

  const separateVideoMatches = lower.match(/\bvideo\s+([a-z0-9]+)/gi);
  if (separateVideoMatches && separateVideoMatches.length > 1) {
    const resolvedNums = separateVideoMatches.map((m) => {
      const numStr = m.replace(/^video\s+/i, '').trim();
      return wordsToNumber(numStr) || numStr;
    });
    const uniqueNums = new Set(resolvedNums);
    if (uniqueNums.size > 1) {
      return {
        success: false,
        isAmbiguous: true,
        ambiguityPrompt: `Multiple video numbers detected (${Array.from(uniqueNums).map((n) => `Video ${n}`).join(', ')}). Please specify one video at a time.`,
        message: `Multiple video numbers detected in command: "${rawTranscript.trim()}".`,
        actionType: 'CLARIFICATION',
      };
    }
  }

  // Confidence check: if confidence is below 0.25, require explicit confirmation
  const isLowConfidence = typeof confidence === 'number' && confidence >= 0 && confidence < 0.25;

  // 1. Client Progress Query:
  // Supports:
  // - "Show Hardik's progress" / "Hardik's progress" / "Hardik progress" / "Hardiks progress"
  // - "Show progress of Hardik" / "Show progress for Hardik" / "Progress of Hardik"
  // - "Show Hardik's status" / "Hardik status" / "Status of Hardik"
  // - "What is Hardik's progress" / "Check Hardik's progress" / "Show client Hardik's progress"
  let progressCandidate: string | null = null;

  // Pattern A: "progress of/for/about <client>", "status of/for <client>"
  const matchProgressOf = lower.match(
    /^(?:show|view|check|open|get|tell\s+me|what\s+is|display)?\s*(?:the\s+)?(?:progress|status|stats|analytics)\s+(?:of|for|about)\s+(?:the\s+)?(?:client\s+)?(.+)$/i
  );
  if (matchProgressOf) {
    progressCandidate = matchProgressOf[1].trim();
  }

  // Pattern B: "<client>'s progress", "show <client>'s progress", "<client> progress", "<client> status"
  if (!progressCandidate) {
    const matchProgressClient = lower.match(
      /^(?:show|view|check|open|get|tell\s+me|what\s+is|display)?\s*(?:the\s+)?(?:client\s+)?(.+?)\s*(?:[']s?)?\s+(?:progress|status|stats|analytics)$/i
    );
    if (matchProgressClient) {
      progressCandidate = matchProgressClient[1].trim();
    }
  }

  if (progressCandidate) {
    const cleanCandidateName = progressCandidate
      .replace(/^(?:client|the|about)\s+/i, '')
      .replace(/[']s?$|s[']$/i, '')
      .trim();

    const match = findMatchingClient(cleanCandidateName, clients);
    if (match.client) {
      const c = match.client;
      const pct =
        c.calculations.totalVideos > 0
          ? Math.round((c.calculations.completedVideos / c.calculations.totalVideos) * 100)
          : 0;
      return {
        success: true,
        actionType: 'CLIENT_PROGRESS',
        matchedClient: c,
        message: `${c.name}'s Progress: ${c.calculations.completedVideos}/${c.calculations.totalVideos} videos completed (${pct}%). Pending work: ₹${c.calculations.remainingValue.toLocaleString('en-IN')}.`,
        interpretedIntent: {
          clientName: c.name,
          actionDescription: `View progress for ${c.name}`,
        },
      };
    }

    if (match.isAmbiguous) {
      return {
        success: false,
        isAmbiguous: true,
        ambiguityPrompt: `Which client's progress? Candidates: ${match.candidates.map((c) => c.name).join(', ')}`,
        message: `Ambiguous client name "${cleanCandidateName}".`,
        actionType: 'CLARIFICATION',
      };
    }

    // Client not found in progress query
    return {
      success: false,
      message: `Client "${cleanCandidateName}" not found. Try saying an existing client's name or add them first.`,
      actionType: 'CLIENT_PROGRESS',
    };
  }

  // 2. Specific Client Navigation: "Show client Rahul", "Open client Rahul", "View client Rahul"
  // Excludes progress queries to avoid false navigation
  const isProgressQuery = /(?:progress|status|stats|analytics)$/i.test(lower);
  const showClientMatch = !isProgressQuery ? lower.match(/^(?:show|open|view|go\s+to)\s+client\s+([^,]+)/i) : null;
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
        actionType: 'CLARIFICATION',
      };
    }
  }



  // 3. Global Navigation commands
  if (lower === 'new client' || lower === 'add client' || lower === 'create client') {
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

  // 4. Add Client Command
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
      requiresConfirmation: true,
      pendingAction: {
        type: 'ADD_CLIENT',
        description: `Add client ${clientName} with payment ₹${budget.toLocaleString('en-IN')} at ₹${rate}/video (${calculatedVideos} videos)`,
        clientName,
        totalBudget: budget,
        ratePerVideo: rate,
      },
    };
  }

  // 5. Completion Intent Keywords
  const doneKeywords = ['done', 'completed', 'finished', 'complete', 'finish', 'check', 'checked'];
  const hasDoneKeyword = doneKeywords.some((k) => {
    const regex = new RegExp(`\\b${k}\\b`, 'i');
    return regex.test(lower);
  });

  // Pattern A: "Mark video five as complete" (or "mark video 5 done")
  // Notice: could have a client mentioned (e.g. "mark video 5 as complete for Hardik") or bare ("mark video 5 as complete")
  const markVideoMatch = lower.match(
    /^mark\s+video\s+([a-zA-Z0-9]+)\s+(?:as\s+)?(?:done|complete|completed|finished)(?:\s+(?:for|of)\s+([a-zA-Z0-9\s]+))?$/i
  );

  // Pattern B: "[Client], video [number] is done" / "[Client] video [number] completed"
  const clientFirstMatch = lower.match(
    /^(?:please\s+)?([a-zA-Z0-9\s]+?)[,:]?\s+video\s+([a-zA-Z0-9]+)\s+(?:is\s+)?(?:done|completed|finished|complete|checked)$/i
  );

  // Pattern C: "video [number] is done for [Client]"
  const videoFirstMatch = lower.match(
    /^video\s+([a-zA-Z0-9]+)\s+(?:is\s+)?(?:done|completed|finished|complete|checked)\s+(?:for|of)\s+([a-zA-Z0-9\s]+)$/i
  );

  // Pattern D: "video [number] for [Client] is done"
  const videoForClientMatch = lower.match(
    /^video\s+([a-zA-Z0-9]+)\s+(?:for|of)\s+([a-zA-Z0-9\s]+?)\s+(?:is\s+)?(?:done|completed|finished|complete|checked)$/i
  );

  // Pattern E: Bare video + done without client: "video five is done" / "video 5 is done"
  const bareVideoDoneMatch = lower.match(
    /^video\s+([a-zA-Z0-9]+)\s+(?:is\s+)?(?:done|completed|finished|complete|checked)$/i
  );

  // Pattern F: Bare video selection without done keyword: "video five" / "video 5"
  const bareVideoOnlyMatch = lower.match(/^video\s+([a-zA-Z0-9]+)$/i);

  // Pattern G: Client + Video without done keyword: "Hardik, video five" / "Hardik video 5"
  const clientVideoSelectMatch = lower.match(
    /^([a-zA-Z0-9\s]+?)[,:]?\s+video\s+([a-zA-Z0-9]+)$/i
  );

  // --- Handling Bare Video Only (e.g. "video five" or "video 5") ---
  // RULE: A bare phrase such as "video five" must NEVER mark anything complete automatically!
  if (bareVideoOnlyMatch) {
    const rawNum = bareVideoOnlyMatch[1];
    const vNum = wordsToNumber(rawNum);
    const displayNum = vNum || rawNum;

    if (clients.length === 0) {
      return {
        success: false,
        message: 'No clients found. Please add a client first.',
        actionType: 'CLARIFICATION',
      };
    }

    if (clients.length === 1) {
      return {
        success: false,
        message: `Which client's video ${displayNum}? Do you mean ${clients[0].name}? Say "${clients[0].name}, video ${displayNum} is done" to mark complete.`,
        actionType: 'CLARIFICATION',
        matchedClient: clients[0],
        matchedVideoNumber: vNum || undefined,
      };
    }

    return {
      success: false,
      isAmbiguous: true,
      ambiguityPrompt: `Which client's video ${displayNum}? Available clients: ${clients.map((c) => c.name).join(', ')}.`,
      message: `Which client's video ${displayNum}? Please specify a client name.`,
      actionType: 'CLARIFICATION',
      matchedVideoNumber: vNum || undefined,
    };
  }

  // --- Handling Client + Video Selection without completion (e.g. "Hardik, video five") ---
  // User selected a specific video for a client, but did NOT state it was done.
  if (clientVideoSelectMatch && !hasDoneKeyword) {
    const rawClientName = clientVideoSelectMatch[1].trim();
    const rawNum = clientVideoSelectMatch[2].trim();
    const vNum = wordsToNumber(rawNum);

    const clientMatch = findMatchingClient(rawClientName, clients);

    if (clientMatch.client) {
      const c = clientMatch.client;
      if (!vNum || vNum <= 0) {
        return {
          success: false,
          message: `Could not identify video number in "${rawNum}".`,
          actionType: 'SELECT_VIDEO',
          matchedClient: c,
        };
      }

      const targetVideo = c.videos.find((v) => v.videoNumber === vNum);
      if (!targetVideo) {
        return {
          success: false,
          message: `${c.name} has ${c.calculations.totalVideos} videos. Video ${vNum} does not exist.`,
          actionType: 'SELECT_VIDEO',
          matchedClient: c,
        };
      }

      const statusText = targetVideo.isCompleted ? 'Completed' : 'Pending';
      return {
        success: true,
        actionType: 'SELECT_VIDEO',
        matchedClient: c,
        matchedVideoNumber: vNum,
        message: `${c.name} • Video ${vNum} is currently ${statusText}. Say "${c.name}, video ${vNum} is done" to mark as complete.`,
        interpretedIntent: {
          clientName: c.name,
          videoNumber: vNum,
          currentStatus: statusText,
          actionDescription: `Select Video ${vNum} for ${c.name}`,
        },
      };
    }

    if (clientMatch.isAmbiguous) {
      return {
        success: false,
        isAmbiguous: true,
        ambiguityPrompt: `Multiple clients matched "${rawClientName}": ${clientMatch.candidates.map((c) => c.name).join(', ')}.`,
        message: `Ambiguous client name "${rawClientName}".`,
        actionType: 'CLARIFICATION',
      };
    }
  }

  // --- Handling Bare Video Done (e.g. "video five is done" / "mark video five as complete" without client) ---
  if (bareVideoDoneMatch || (markVideoMatch && !markVideoMatch[2])) {
    const rawNum = bareVideoDoneMatch ? bareVideoDoneMatch[1] : markVideoMatch![1];
    const vNum = wordsToNumber(rawNum);
    const displayNum = vNum || rawNum;

    if (clients.length === 0) {
      return {
        success: false,
        message: 'No clients found. Please add a client first.',
        actionType: 'CLARIFICATION',
      };
    }

    // RULE: Even with 1 client, NEVER mutate automatically without client confirmation!
    return {
      success: false,
      isAmbiguous: true,
      ambiguityPrompt: `Which client's video ${displayNum}? Available clients: ${clients.map((c) => c.name).join(', ')}.`,
      message: `Which client's video ${displayNum}? Please say the client name (e.g. "${clients[0].name}, video ${displayNum} is done").`,
      actionType: 'CLARIFICATION',
      matchedVideoNumber: vNum || undefined,
    };
  }

  // --- Handling Explicit Video Completion with Client ---
  let targetClientQuery = '';
  let targetVideoStr = '';

  if (markVideoMatch && markVideoMatch[2]) {
    targetVideoStr = markVideoMatch[1];
    targetClientQuery = markVideoMatch[2].trim();
  } else if (videoFirstMatch) {
    targetVideoStr = videoFirstMatch[1];
    targetClientQuery = videoFirstMatch[2].trim();
  } else if (videoForClientMatch) {
    targetVideoStr = videoForClientMatch[1];
    targetClientQuery = videoForClientMatch[2].trim();
  } else if (clientFirstMatch) {
    targetClientQuery = clientFirstMatch[1].trim();
    targetVideoStr = clientFirstMatch[2].trim();
  }

  if (targetVideoStr && targetClientQuery) {
    const vNum = wordsToNumber(targetVideoStr);
    if (!vNum || vNum <= 0) {
      return {
        success: false,
        message: `Could not identify video number in "${targetVideoStr}".`,
        actionType: 'COMPLETE_VIDEO',
      };
    }

    const clientMatch = findMatchingClient(targetClientQuery, clients);

    if (clientMatch.isAmbiguous) {
      return {
        success: false,
        isAmbiguous: true,
        ambiguityPrompt: `Multiple clients matched "${targetClientQuery}". Candidates: ${clientMatch.candidates.map((c) => c.name).join(', ')}.`,
        message: `Ambiguous client name "${targetClientQuery}".`,
        actionType: 'CLARIFICATION',
      };
    }

    if (!clientMatch.client) {
      return {
        success: false,
        message: `No client found matching "${targetClientQuery}". Available clients: ${clients.map((c) => c.name).join(', ') || 'None'}`,
        actionType: 'COMPLETE_VIDEO',
      };
    }

    const client = clientMatch.client;
    const targetVideo = client.videos.find((v) => v.videoNumber === vNum);

    if (!targetVideo) {
      return {
        success: false,
        message: `${client.name} has ${client.calculations.totalVideos} videos configured. Video ${vNum} does not exist.`,
        actionType: 'COMPLETE_VIDEO',
        matchedClient: client,
      };
    }

    // Already completed check: zero mutation, zero duplicate history
    if (targetVideo.isCompleted) {
      return {
        success: true,
        alreadyCompleted: true,
        message: `Video ${vNum} is already completed for ${client.name}.`,
        actionType: 'COMPLETE_VIDEO',
        matchedClient: client,
        matchedVideoNumber: vNum,
        interpretedIntent: {
          clientName: client.name,
          videoNumber: vNum,
          currentStatus: 'Completed',
          actionDescription: `Video ${vNum} already completed for ${client.name}`,
        },
      };
    }

    // Unambiguous completion intent
    return {
      success: true,
      alreadyCompleted: false,
      message: `Marking Video ${vNum} for ${client.name} as complete.`,
      actionType: 'COMPLETE_VIDEO',
      matchedClient: client,
      matchedVideoNumber: vNum,
      requiresConfirmation: true,
      interpretedIntent: {
        clientName: client.name,
        videoNumber: vNum,
        currentStatus: 'Pending',
        targetStatus: 'Completed',
        actionDescription: `Mark Video ${vNum} completed for ${client.name}`,
      },
      pendingAction: {
        type: 'COMPLETE_VIDEO',
        description: `Mark Video ${vNum} completed for ${client.name}`,
        clientName: client.name,
        clientId: client.id,
        videoNumber: vNum,
        videoId: targetVideo.id,
      },
    };
  }

  // 6. Client Name Query / Identification (e.g. "Hardik", "client Hardik", "who is Hardik")
  // Allows user to speak a client name; recognizes and displays the client without completing any video or mutating SQLite!
  const candidateClientName = lower
    .replace(/^(?:client|who is|details of|details for|about|show|open|view)\s+/i, '')
    .replace(/\s+(?:videos?|details|profile|account|status|work|tasks?|progress|analytics|stats)$/i, '')
    .trim();

  if (candidateClientName.length > 0) {
    const clientMatch = findMatchingClient(candidateClientName, clients);
    if (clientMatch.client) {
      const matched = clientMatch.client;
      return {
        success: true,
        actionType: 'QUERY',
        matchedClient: matched,
        message: `Client "${matched.name}" recognized (${matched.calculations.completedVideos}/${matched.calculations.totalVideos} videos completed). Say e.g. "${matched.name}, video 5 is done" or "Show ${matched.name}'s progress".`,
        interpretedIntent: {
          clientName: matched.name,
          actionDescription: `Identify client ${matched.name}`,
        },
      };
    }

    if (clientMatch.isAmbiguous) {
      return {
        success: false,
        isAmbiguous: true,
        ambiguityPrompt: `Multiple clients matched "${candidateClientName}": ${clientMatch.candidates.map((c) => c.name).join(', ')}.`,
        message: `Ambiguous client name "${candidateClientName}".`,
        actionType: 'CLARIFICATION',
      };
    }
  }

  // Fallback / Unrecognized command
  return {
    success: false,
    message: `Command not recognized: "${rawTranscript.trim()}". Try: "Hardik, video 5 is done", "Show Hardik's progress", or say a client name.`,
    actionType: 'UNKNOWN',
  };
}
