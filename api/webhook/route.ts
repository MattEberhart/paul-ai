import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { GroupMeWebhookPayload } from '../../types';
import { GroupMeClient } from '../../lib/groupme';
import { GroqClient } from '../../lib/groq';
import { getThisWeekRange, getLastWeekRange } from '../../lib/dateUtils';
import { formatRosterResponse } from '../../lib/messageParser';

const BOT_NAME = 'paul-ai';

/**
 * Vercel serverless function handler for GroupMe webhooks
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate environment variables
    const requiredEnvVars = [
      'GROQ_API_KEY',
      'GROUPME_BOT_ID',
      'GROUPME_ACCESS_TOKEN',
      'GROUPME_GROUP_ID',
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`Missing environment variable: ${envVar}`);
        return res.status(500).json({ error: 'Server configuration error' });
      }
    }

    const payload = req.body as GroupMeWebhookPayload;

    // Validate payload
    if (!payload || !payload.text) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Check if bot is mentioned
    const isMentioned = GroupMeClient.isBotMentioned(payload.text, BOT_NAME);

    if (!isMentioned) {
      // Bot not mentioned, just acknowledge
      return res.status(200).json({ status: 'ok', action: 'ignored' });
    }

    // Bot is mentioned, process the request
    console.log(`Bot mentioned in message: ${payload.text}`);

    // Initialize clients
    const groupMeClient = new GroupMeClient(
      process.env.GROUPME_ACCESS_TOKEN!,
      process.env.GROUPME_GROUP_ID!,
      process.env.GROUPME_BOT_ID!
    );

    const groqClient = new GroqClient(process.env.GROQ_API_KEY!);

    // Detect user intent (last week vs this week)
    const intent = await groqClient.detectIntent(payload.text);
    console.log(`Detected intent: ${intent}`);

    // Get the appropriate date range based on intent
    const dateRange = intent === 'last_week' ? getLastWeekRange() : getThisWeekRange();
    console.log(`Fetching messages from ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);

    // Fetch messages within the date range
    const messages = await groupMeClient.fetchMessagesInRange(dateRange.start, dateRange.end);
    console.log(`Fetched ${messages.length} messages`);

    // Analyze messages with Groq
    const analysis = await groqClient.analyzeMessages(messages);
    console.log('Analysis complete:', {
      confirmed: analysis.confirmedPlayers.length,
      plusOnes: analysis.plusOnes.length,
      withdrawn: analysis.withdrawnPlayers.length,
      status: analysis.gameStatus,
    });

    // Format the response with the week intent
    const responseText = formatRosterResponse(analysis, intent);

    // Post response to GroupMe
    await groupMeClient.postMessage(responseText);
    console.log('Response posted to GroupMe');

    // Return success
    return res.status(200).json({
      status: 'ok',
      action: 'processed',
      intent: intent,
      messageCount: messages.length,
      playerCount: analysis.totalCount,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Try to post error message to GroupMe if possible
    try {
      const groupMeClient = new GroupMeClient(
        process.env.GROUPME_ACCESS_TOKEN!,
        process.env.GROUPME_GROUP_ID!,
        process.env.GROUPME_BOT_ID!
      );
      await groupMeClient.postMessage(
        'Sorry, I encountered an error processing your request. Please try again later.'
      );
    } catch (postError) {
      console.error('Failed to post error message:', postError);
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
