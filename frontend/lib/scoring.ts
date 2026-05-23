export interface ScoreResult {
  isValid: boolean;
  qualityScore: number;
  pointsAwarded: number;
  updatedTotal: number;
  reason: string;
}

const SPAM_WORDS = new Set(['asdf', 'test', 'idk', 'blah', 'lol', 'haha', 'ok', 'yes', 'no']);

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter((t) => t.length > 3);
}

export function scoreGoldenAnswer(
  question: string,
  answer: string,
  currentTotal: number,
): ScoreResult {
  const trimmed = answer.trim();

  if (trimmed.length < 20) {
    return { isValid: false, qualityScore: 0, pointsAwarded: 0, updatedTotal: currentTotal, reason: 'Response is too short. Share a bit more.' };
  }

  if (/^(.)\1{4,}$/.test(trimmed)) {
    return { isValid: false, qualityScore: 0, pointsAwarded: 0, updatedTotal: currentTotal, reason: 'Response appears to be spam.' };
  }

  const words = trimmed.toLowerCase().split(/\s+/);
  if (words.length > 0 && words.every((w) => SPAM_WORDS.has(w))) {
    return { isValid: false, qualityScore: 0, pointsAwarded: 0, updatedTotal: currentTotal, reason: 'Response does not meet quality standards.' };
  }

  const qTokens = new Set(tokenize(question));
  const aTokens = tokenize(answer);
  const uniqueATokens = new Set(aTokens);

  // Relevance (40pts): keyword overlap
  const overlap = aTokens.filter((t) => qTokens.has(t)).length;
  const relevance = Math.min(40, Math.round((overlap / Math.max(qTokens.size, 1)) * 40));

  // Specificity (30pts): unique word ratio + sentence count
  const uniqueRatio = uniqueATokens.size / Math.max(aTokens.length, 1);
  const sentenceCount = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const specificity = Math.min(30, Math.round(uniqueRatio * 20 + (sentenceCount >= 2 ? 10 : sentenceCount * 5)));

  // Effort (20pts): word count
  const wordCount = aTokens.length;
  const effort = wordCount >= 100 ? 20 : wordCount >= 50 ? 15 : wordCount >= 20 ? 10 : 5;

  // Tone (10pts)
  const tone = 10;

  const qualityScore = Math.min(100, relevance + specificity + effort + tone);

  if (currentTotal >= 100) {
    return { isValid: true, qualityScore, pointsAwarded: 0, updatedTotal: currentTotal, reason: "You've reached the 100-point maximum. Outstanding work!" };
  }

  let rawPoints = 0;
  if (qualityScore >= 90) rawPoints = 20;
  else if (qualityScore >= 70) rawPoints = 15;
  else if (qualityScore >= 50) rawPoints = 10;
  else if (qualityScore >= 30) rawPoints = 5;

  const pointsAwarded = Math.min(rawPoints, 100 - currentTotal);
  const updatedTotal = currentTotal + pointsAwarded;

  const reasons: Record<number, string> = {
    20: 'Outstanding response! Your depth and insight shine through.',
    15: 'Great response! You demonstrated solid industry knowledge.',
    10: 'Good response. Adding more specific examples could earn more points.',
    5: 'Solid start. Expand on your ideas for a higher score next time.',
    0: 'Keep going. Share more specific insights to earn points.',
  };

  return { isValid: true, qualityScore, pointsAwarded, updatedTotal, reason: reasons[rawPoints] ?? reasons[0] };
}

export interface TouchpointScoreResult {
  isValid: boolean;
  pointsAwarded: number;
  reason: string;
}

export function scoreTouchpointAnswer(
  question: string,
  answer: string,
  _touchpointIndex: number,
): TouchpointScoreResult {
  const trimmed = answer.trim();

  if (trimmed.length < 20) {
    return { isValid: false, pointsAwarded: 0, reason: 'Please share at least a sentence.' };
  }

  if (/^(.)\1{4,}$/.test(trimmed)) {
    return { isValid: false, pointsAwarded: 0, reason: 'Response appears to be spam.' };
  }

  if (SPAM_WORDS.has(trimmed.toLowerCase())) {
    return { isValid: false, pointsAwarded: 0, reason: 'Response does not meet quality standards.' };
  }

  const qTokens = new Set(tokenize(question));
  const aTokens = tokenize(answer);
  const uniqueATokens = new Set(aTokens);

  // Relevance (12pts)
  const overlap = aTokens.filter((t) => qTokens.has(t)).length;
  const relevance = Math.min(12, Math.round((overlap / Math.max(qTokens.size, 1)) * 12));

  // Specificity (8pts)
  const uniqueRatio = uniqueATokens.size / Math.max(aTokens.length, 1);
  const specificity = Math.min(8, Math.round(uniqueRatio * 8));

  // Effort (6pts)
  const wordCount = aTokens.length;
  const effort = wordCount >= 40 ? 6 : wordCount >= 20 ? 4 : wordCount >= 10 ? 2 : 1;

  // Tone (4pts)
  const tone = 4;

  const pointsAwarded = Math.min(30, relevance + specificity + effort + tone);

  const reason =
    pointsAwarded >= 20 ? 'Excellent insight! Your response showed real engagement.'
    : pointsAwarded >= 12 ? 'Good response. Your perspective adds value.'
    : 'Thanks for sharing. More specific details could earn more points.';

  return { isValid: true, pointsAwarded, reason };
}
