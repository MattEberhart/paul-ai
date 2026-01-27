import Groq from 'groq-sdk';
import type { GroupMeMessage, PlayerAnalysis, IntentDetection, WeekIntent } from '../types';

const SYSTEM_PROMPT = `You are analyzing GroupMe chat messages for a pickup basketball game roster tracker.

Your task is to analyze messages and extract:
1. Players who said they are "in" or similar confirmations (e.g., "I'm in", "count me in", "yes", "I'll be there")
2. Players who mentioned bringing +1 guests (track the inviter's name and count)
3. Players who initially said "in" but later said "out" or withdrew (e.g., "can't make it", "out", "not coming")
4. Whether the game was cancelled (look for phrases like "game off", "cancelled", "not enough players", "call it off")
5. If the game is cancelled, determine whose fault it is - provide a funny, lighthearted jab at someone who messaged in the last week based on their messages or behavior

IMPORTANT RULES:
- Process messages chronologically - later messages override earlier ones
- If someone says "in" then later says "out", they should be in withdrawnPlayers, NOT confirmedPlayers
- +1 guests should be tracked with the inviter's name (the person who said they're bringing someone)
- Use the actual names from the messages (the "name" field)
- Return valid JSON only, no markdown formatting
- The "whoseFault" field should ONLY be included when gameStatus is "cancelled"
- Make "whoseFault" a funny, playful jab at someone who messaged - be creative and lighthearted
- IMPORTANT: DO NOT be too mean to any given player - keep all jabs friendly and good-natured

Return a JSON object with this exact structure:
{
  "confirmedPlayers": ["Name1", "Name2", ...],
  "plusOnes": [{"inviter": "Name", "guestCount": 1}, ...],
  "withdrawnPlayers": ["Name1", ...],
  "gameStatus": "active" | "cancelled",
  "cancellationReason": "optional reason if cancelled",
  "whoseFault": "optional funny jab - only include when gameStatus is 'cancelled', keep it friendly and not too mean"
}`;

export class GroqClient {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({
      apiKey: apiKey,
    });
  }

  /**
   * Analyzes GroupMe messages to extract player roster information
   */
  async analyzeMessages(messages: GroupMeMessage[]): Promise<PlayerAnalysis> {
    if (messages.length === 0) {
      return {
        confirmedPlayers: [],
        plusOnes: [],
        withdrawnPlayers: [],
        gameStatus: 'active',
        totalCount: 0,
      };
    }

    // Format messages for the LLM
    const messagesText = messages
      .map((msg) => {
        const timestamp = new Date(msg.created_at * 1000).toISOString();
        return `[${timestamp}] ${msg.name}: ${msg.text}`;
      })
      .join('\n');

    const userPrompt = `Analyze these GroupMe messages and extract the roster information:\n\n${messagesText}`;

    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        model: 'openai/gpt-oss-120b', // Highest accuracy model
        temperature: 0.1, // Low temperature for consistent parsing
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from Groq API');
      }

      // Parse JSON response
      let analysis: PlayerAnalysis;
      try {
        analysis = JSON.parse(responseText);
      } catch (parseError) {
        // Try to extract JSON if wrapped in markdown
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error(`Failed to parse JSON response: ${responseText}`);
        }
      }

      // Validate and calculate total count
      analysis.confirmedPlayers = analysis.confirmedPlayers || [];
      analysis.plusOnes = analysis.plusOnes || [];
      analysis.withdrawnPlayers = analysis.withdrawnPlayers || [];
      analysis.gameStatus = analysis.gameStatus || 'active';
      
      // Set whoseFault default if game is cancelled and LLM didn't provide it
      if (analysis.gameStatus === 'cancelled' && !analysis.whoseFault) {
        analysis.whoseFault = 'When in doubt, Miles';
      }
      
      // Calculate total count (confirmed players + +1 guests)
      const plusOneCount = analysis.plusOnes.reduce(
        (sum, item) => sum + (item.guestCount || 1),
        0
      );
      analysis.totalCount = analysis.confirmedPlayers.length + plusOneCount;

      return analysis;
    } catch (error) {
      console.error('Error analyzing messages with Groq:', error);
      throw error;
    }
  }

  /**
   * Detects user intent from message text to determine if they want "last week", "this week", or a generic question
   */
  async detectIntent(messageText: string): Promise<WeekIntent> {
    const INTENT_PROMPT = `You are analyzing a user message to determine their intent.

The user can ask for:
- "this week" (or current week, this week's game, roster, "who's in?", etc.) - default if unclear or just a mention
- "last week" (or previous week, last week's game, last week's roster, etc.)
- "generic_question" - any request that is NOT about roster/week. This includes:
  * Questions (e.g., "what did John say?", "who won?", "is this player annoying?")
  * Instructions/commands (e.g., "drag this player", "roast John", "tell me about Mike")
  * Suggestions or any other non-roster interaction

Return a JSON object with this exact structure:
{
  "intent": "this_week" | "last_week" | "generic_question"
}

Examples:
- "who's in?" → "this_week"
- "show me last week's roster" → "last_week"
- "what about this week?" → "this_week"
- "last week" → "last_week"
- "@paul-ai" → "this_week" (default - just a mention)
- "roster" → "this_week" (default)
- "what did John say?" → "generic_question"
- "who won the game?" → "generic_question"
- "is this player annoying?" → "generic_question"
- "drag this player" → "generic_question"
- "roast John" → "generic_question"
- "tell me about the game" → "generic_question"`;

    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: INTENT_PROMPT,
          },
          {
            role: 'user',
            content: `Analyze this message and determine the user's intent: "${messageText}"`,
          },
        ],
        model: 'llama-3.1-8b-instant', // Smaller, faster model for simple intent detection
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        // Default to "this_week" if no response
        return 'this_week';
      }

      try {
        const result = JSON.parse(responseText) as IntentDetection;
        // Validate intent value
        if (result.intent === 'last_week' || result.intent === 'this_week' || result.intent === 'generic_question') {
          return result.intent;
        }
        return 'this_week'; // Default fallback
      } catch (parseError) {
        // Try to extract JSON if wrapped in markdown
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]) as IntentDetection;
          if (result.intent === 'last_week' || result.intent === 'this_week' || result.intent === 'generic_question') {
            return result.intent;
          }
        }
        return 'this_week'; // Default fallback
      }
    } catch (error) {
      console.error('Error detecting intent with Groq:', error);
      // Default to "this_week" on error
      return 'this_week';
    }
  }

  /**
   * Answers a generic question or follows an instruction/command based on recent chat history
   */
  async answerQuestion(question: string, messages: GroupMeMessage[]): Promise<string> {
    if (messages.length === 0) {
      return "I don't have any recent messages to reference. Try asking me about something that happened this week!";
    }

    // Format messages for the LLM
    const messagesText = messages
      .map((msg) => {
        const timestamp = new Date(msg.created_at * 1000).toISOString();
        return `[${timestamp}] ${msg.name}: ${msg.text}`;
      })
      .join('\n');

    const QUESTION_PROMPT = `You are paul-ai, a basketball game roster tracker bot with a sense of humor. You're answering questions or following instructions/commands based on recent GroupMe chat messages.

Your personality:
- Funny and lighthearted
- You can make playful jabs at players, but keep it friendly - DO NOT be too mean to any given player
- You're part of the group and have a good rapport with everyone
- You reference specific messages and players when relevant
- Keep responses concise but entertaining
- IMPORTANT: When making jokes or jabs at players, always keep it lighthearted and friendly. Never be too mean or hurtful.

Answer the user's question or follow their instruction/command based on the chat history provided. If the request can't be fulfilled from the messages, say so in a funny way.

Recent chat messages:
${messagesText}

User's request: ${question}

Provide your answer directly (no JSON, no markdown formatting, just plain text):`;

    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: QUESTION_PROMPT,
          },
        ],
        model: 'openai/gpt-oss-120b', // Highest accuracy model
        temperature: 0.7, // Higher temperature for more creative/funny responses
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from Groq API');
      }

      return responseText.trim();
    } catch (error) {
      console.error('Error answering question with Groq:', error);
      throw error;
    }
  }
}
