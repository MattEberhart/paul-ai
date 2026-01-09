import Groq from 'groq-sdk';
import type { GroupMeMessage, PlayerAnalysis } from '../types';

const SYSTEM_PROMPT = `You are analyzing GroupMe chat messages for a pickup basketball game roster tracker.

Your task is to analyze messages and extract:
1. Players who said they are "in" or similar confirmations (e.g., "I'm in", "count me in", "yes", "I'll be there")
2. Players who mentioned bringing +1 guests (track the inviter's name and count)
3. Players who initially said "in" but later said "out" or withdrew (e.g., "can't make it", "out", "not coming")
4. Whether the game was cancelled (look for phrases like "game off", "cancelled", "not enough players", "call it off")

IMPORTANT RULES:
- Process messages chronologically - later messages override earlier ones
- If someone says "in" then later says "out", they should be in withdrawnPlayers, NOT confirmedPlayers
- +1 guests should be tracked with the inviter's name (the person who said they're bringing someone)
- Use the actual names from the messages (the "name" field)
- Return valid JSON only, no markdown formatting

Return a JSON object with this exact structure:
{
  "confirmedPlayers": ["Name1", "Name2", ...],
  "plusOnes": [{"inviter": "Name", "guestCount": 1}, ...],
  "withdrawnPlayers": ["Name1", ...],
  "gameStatus": "active" | "cancelled",
  "cancellationReason": "optional reason if cancelled"
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
        model: 'llama-3.1-70b-versatile', // Fast and cost-effective model
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
}
