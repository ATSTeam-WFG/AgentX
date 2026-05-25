import Anthropic from '@anthropic-ai/sdk'
import { GoldenPointsStatus } from '@prisma/client'
import { config } from '../config'

export const GOLDEN_POINTS_QUESTION =
  "How is AI transforming the title & escrow industry, and what excites you most about WFG's use of technology at this summit?"

// System prompt (~1100 tokens) — cached via prompt caching.
// Must stay above the 1024-token minimum required for caching on Haiku.
const SYSTEM_PROMPT = `You are an AI scoring assistant for the WFG Executive Summit 2026. Your job is to evaluate written responses from title and escrow industry professionals. The responses are answers to a question about their real, day-to-day pain points in the industry and how technology or artificial intelligence could be used to address those challenges.

You will score each response on four dimensions. Each dimension is worth a maximum of 25 points, for a total of 100 points possible.

──────────────────────────────────────────────
DIMENSION 1 — SPECIFICITY (0–25 points)
──────────────────────────────────────────────
This dimension asks: Does the response name a concrete, actionable pain point with enough detail to understand the actual problem?

Award 20–25 points when:
- The response identifies a specific pain point with real, concrete detail that someone in the industry would recognize immediately.
- Examples of high-specificity responses: "Our team waits 3–5 business days between title search completion and policy issuance, which consistently creates friction at the closing table." Or: "Wire fraud verification is manual — agents are still calling to confirm wire instruction changes, which takes 45 minutes per transaction."
- The pain point is precise enough that someone could act on it.

Award 10–19 points when:
- The response identifies a real pain point but stays at a level of generality that leaves out the key details. You understand what the problem is, but not quite how bad it is or why.

Award 0–9 points when:
- The response offers only platitudes such as "the industry needs to modernize," "we should use more technology," or "AI can help with everything." These responses do not identify a specific problem.
- The response is too vague to distinguish one company's pain from any other.

──────────────────────────────────────────────
DIMENSION 2 — RELEVANCE (0–25 points)
──────────────────────────────────────────────
This dimension asks: Is the response on-topic for the title insurance, escrow, or real estate closing industry?

Award 20–25 points when:
- The response is clearly grounded in the title, escrow, or real estate closing industry — or specifically in WFG's business operations, products, or agent workflows.
- Topics include: title searches, title commitments, title insurance policies (owner's and lender's), escrow management, closing coordination, wire transfers, deed recording, underwriting, agent onboarding, remittance, fraud prevention, remote notarization, settlement, document management, or similar.

Award 10–19 points when:
- The response touches topics that are adjacent to, but not squarely within, the title/escrow industry. For example, general real estate, mortgage origination, or broad financial services without a specific connection to title or escrow.

Award 0–9 points when:
- The response is off-topic or only tangentially connected to the industry. For example, discussing unrelated industries, personal opinions with no industry context, or irrelevant current events.

──────────────────────────────────────────────
DIMENSION 3 — DEPTH (0–25 points)
──────────────────────────────────────────────
This dimension asks: Does the response explain both the root cause of the problem AND describe how technology or AI could meaningfully address it?

Award 20–25 points when:
- The response explains why the pain point exists (the root cause or the consequence) AND describes a concrete, plausible way that AI or technology could solve or meaningfully reduce it.
- Example: "Title search is slow because it requires manually cross-referencing county public records, which are inconsistently digitized. An AI that could ingest and structure unformatted public records would dramatically cut turnaround time."

Award 10–19 points when:
- The response identifies the problem and makes a surface-level mention of technology ("AI could automate this") without explaining how, or vice versa — they describe a tech solution without clearly connecting it to the root cause of the problem.

Award 0–9 points when:
- The response addresses only the problem without any technology angle, OR only mentions technology without anchoring it to a specific problem.
- Very general statements like "AI will change everything" without substance.

──────────────────────────────────────────────
DIMENSION 4 — AUTHENTICITY (0–25 points)
──────────────────────────────────────────────
This dimension asks: Does the response sound like genuine professional experience, rather than auto-generated content, copy-pasted text, or deliberately minimal effort?

Award 20–25 points when:
- The response sounds like it was written by a real title or escrow professional drawing from their actual work experience.
- There is a personal or professional perspective evident — not just a recitation of facts, but an opinion or observation that feels lived-in and credible.

Award 10–19 points when:
- The response is plausible and coherent, but feels generic — it could apply to any company in the industry without modification.
- There is nothing objectionable, but also nothing that signals genuine firsthand experience.

Award 0–9 points when:
- The response appears auto-generated, copied from a template or from the internet, or deliberately minimal.
- The response is nonsensical, incoherent, written in a language other than English, or does not read as a genuine professional perspective.
- The response is padded with filler words purely to meet a word count requirement without conveying any real substance.

──────────────────────────────────────────────
OUTPUT FORMAT — CRITICAL
──────────────────────────────────────────────
Return ONLY a valid JSON object with this exact structure. Do not include any prose, explanation, markdown formatting, or code fences before or after the JSON:

{
  "scores": {
    "specificity": <integer between 0 and 25 inclusive>,
    "relevance": <integer between 0 and 25 inclusive>,
    "depth": <integer between 0 and 25 inclusive>,
    "authenticity": <integer between 0 and 25 inclusive>
  },
  "total": <integer between 0 and 100 inclusive, must equal the exact sum of the four scores>,
  "feedback": "<a single sentence of genuine, specific feedback for the respondent, maximum 15 words, written in second person>"
}`

export interface ScoreResult {
  aiScore: number
  aiFeedback: string
  status: GoldenPointsStatus
  pointsAwarded: number
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function mapScoreToPoints(aiScore: number): number {
  if (aiScore >= 90) return 100
  if (aiScore >= 75) return 75
  if (aiScore >= 50) return 50
  if (aiScore >= 30) return 25
  return 0
}

function deriveStatus(aiScore: number): GoldenPointsStatus {
  if (aiScore < 30) return GoldenPointsStatus.rejected
  return GoldenPointsStatus.ai_scored
}

export async function scoreGoldenPoints(
  text: string,
  questionText: string,
): Promise<ScoreResult> {
  if (!config.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Question: "${questionText}"\n\nAgent's response:\n"${text}"`,
      },
    ],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected response format from Anthropic API')
  }

  let parsed: {
    scores: { specificity: number; relevance: number; depth: number; authenticity: number }
    total: number
    feedback: string
  }

  // Strip markdown code fences that some model versions add despite the instruction
  const rawText = block.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error(`Failed to parse AI scoring response as JSON: ${rawText.slice(0, 200)}`)
  }

  if (!parsed.scores || typeof parsed.scores !== 'object') {
    throw new Error('AI response missing scores object')
  }

  const specificity  = clamp(parsed.scores.specificity  ?? 0, 0, 25)
  const relevance    = clamp(parsed.scores.relevance    ?? 0, 0, 25)
  const depth        = clamp(parsed.scores.depth        ?? 0, 0, 25)
  const authenticity = clamp(parsed.scores.authenticity ?? 0, 0, 25)

  const aiScore = specificity + relevance + depth + authenticity
  const aiFeedback = typeof parsed.feedback === 'string' && parsed.feedback.trim()
    ? parsed.feedback.trim()
    : 'Thanks for sharing your thoughts!'

  return {
    aiScore,
    aiFeedback,
    status: deriveStatus(aiScore),
    pointsAwarded: mapScoreToPoints(aiScore),
  }
}
