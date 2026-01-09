import type { GroupMeMessage } from '../types';

const GROUPME_API_BASE = 'https://api.groupme.com/v3';

/**
 * GroupMe API client
 */
export class GroupMeClient {
  private accessToken: string;
  private groupId: string;
  private botId: string;

  constructor(accessToken: string, groupId: string, botId: string) {
    this.accessToken = accessToken;
    this.groupId = groupId;
    this.botId = botId;
  }

  /**
   * Fetches messages from a group since a specific date
   * GroupMe API returns messages in reverse chronological order (newest first)
   */
  async fetchMessagesSince(sinceDate: Date): Promise<GroupMeMessage[]> {
    const sinceTimestamp = Math.floor(sinceDate.getTime() / 1000);
    const allMessages: GroupMeMessage[] = [];
    let beforeId: string | undefined;

    // GroupMe API pagination: fetch in batches of 100
    while (true) {
      const url = new URL(`${GROUPME_API_BASE}/groups/${this.groupId}/messages`);
      url.searchParams.append('token', this.accessToken);
      url.searchParams.append('limit', '100');
      
      if (beforeId) {
        url.searchParams.append('before_id', beforeId);
      }

      try {
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`GroupMe API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json() as { response?: { messages?: GroupMeMessage[] } };
        const messages: GroupMeMessage[] = data.response?.messages || [];

        if (messages.length === 0) {
          break;
        }

        // Filter messages that are after sinceDate
        const relevantMessages = messages.filter(msg => {
          const msgDate = new Date(msg.created_at * 1000);
          return msgDate >= sinceDate;
        });

        allMessages.push(...relevantMessages);

        // If we got messages older than sinceDate, we can stop
        const oldestMessage = messages[messages.length - 1];
        const oldestDate = new Date(oldestMessage.created_at * 1000);
        if (oldestDate < sinceDate) {
          break;
        }

        // Continue pagination
        beforeId = oldestMessage.id;

        // Safety check: if we have too many messages, break
        if (allMessages.length > 1000) {
          console.warn('Reached message limit of 1000, stopping pagination');
          break;
        }
      } catch (error) {
        console.error('Error fetching messages from GroupMe:', error);
        throw error;
      }
    }

    // Reverse to get chronological order (oldest first)
    return allMessages.reverse();
  }

  /**
   * Posts a message to the group using the bot
   */
  async postMessage(text: string): Promise<void> {
    const url = `${GROUPME_API_BASE}/bots/post`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bot_id: this.botId,
          text: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GroupMe API error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error posting message to GroupMe:', error);
      throw error;
    }
  }

  /**
   * Checks if a message text mentions the bot (case-insensitive)
   */
  static isBotMentioned(text: string, botName: string = 'paul-ai'): boolean {
    const lowerText = text.toLowerCase();
    const lowerBotName = botName.toLowerCase();
    
    // Check for @mention or just the name
    return lowerText.includes(`@${lowerBotName}`) || 
           lowerText.includes(botName.toLowerCase());
  }
}
