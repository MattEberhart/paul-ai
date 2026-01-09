# Paul AI - GroupMe Basketball Roster Bot

A GroupMe bot that tracks pickup basketball game rosters by analyzing chat messages. When mentioned, it fetches messages from the previous Wednesday, uses Groq LLM to extract player confirmations and +1s, and posts a formatted roster back to the chat.

## Features

- **Automatic Roster Tracking**: Analyzes messages to identify who's "in" for the game
- **+1 Guest Tracking**: Tracks when players bring guests
- **Withdrawal Detection**: Handles players who say "in" then later back out
- **Game Status**: Detects if the game is cancelled
- **Weekly Time Window**: Always checks messages since the previous Wednesday

## Setup

### Prerequisites

- Node.js 18+ and npm
- A Groq API key ([get one here](https://console.groq.com/))
- A GroupMe account and access token ([get one here](https://dev.groupme.com/))
- A GroupMe group where you want to use the bot

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables. Create a `.env` file (or configure in Vercel):

```env
GROQ_API_KEY=your_groq_api_key_here
GROUPME_BOT_ID=your_bot_id_here
GROUPME_ACCESS_TOKEN=your_access_token_here
GROUPME_GROUP_ID=your_group_id_here
```

### GroupMe Bot Setup

1. Go to [GroupMe Developer Portal](https://dev.groupme.com/)
2. Create a new bot:
   - Name: `paul-ai` (or your preferred name)
   - Group: Select your basketball group
   - Callback URL: `https://your-vercel-app.vercel.app/api/webhook` (you'll set this after deployment)
3. Note the Bot ID from the creation response
4. Get your Access Token from the [Applications page](https://dev.groupme.com/applications)
5. Get your Group ID from the group URL or API

### Local Development

1. Install Vercel CLI if you haven't:
```bash
npm i -g vercel
```

2. Run the development server:
```bash
npm run dev
```

3. Use ngrok or similar to expose your local server:
```bash
ngrok http 3000
```

4. Update the GroupMe bot callback URL to your ngrok URL temporarily for testing

### Deployment to Vercel

1. Deploy to Vercel:
```bash
vercel
```

2. Configure environment variables in Vercel dashboard:
   - Go to your project settings
   - Add all environment variables from `.env`

3. Update GroupMe bot callback URL:
   - Go to [GroupMe Developer Portal](https://dev.groupme.com/)
   - Edit your bot
   - Set callback URL to: `https://your-vercel-app.vercel.app/api/webhook`

## Usage

In your GroupMe chat, mention the bot:

```
@paul-ai who's in?
```

or simply:

```
@paul-ai
```

The bot will:
1. Fetch all messages since the previous Wednesday
2. Analyze them using Groq LLM
3. Post a formatted roster back to the chat

## Response Format

The bot responds with a formatted message like:

```
📋 This Week's Roster (since last Wednesday):

✅ Confirmed Players (8):
- John
- Mike
- Sarah
...

👥 +1 Guests (2):
- John's +1
- Mike's +1

❌ Withdrawn:
- Bob (was in, now out)

⚠️ Status: Need 2 more players (currently 10 with +1s)
```

## How It Works

1. **Webhook Handler** (`api/webhook/route.ts`): Receives POST requests from GroupMe when messages are posted
2. **Mention Detection**: Checks if "@paul-ai" is mentioned in the message
3. **Message Fetching**: Uses GroupMe API to fetch messages since previous Wednesday
4. **LLM Analysis**: Sends messages to Groq LLM to extract:
   - Confirmed players
   - +1 guests with inviter names
   - Withdrawn players
   - Game cancellation status
5. **Response Formatting**: Formats the analysis into a readable message
6. **Post Response**: Posts the formatted roster back to the GroupMe chat

## Edge Cases Handled

- **+1s**: Tracked separately with inviter's name
- **Withdrawals**: Chronological processing - later "out" messages override earlier "in"
- **Game Cancellation**: Detects phrases like "game off", "cancelled", "not enough players"
- **Time Window**: Always calculates from previous Wednesday (not current week's Wednesday)

## Project Structure

```
paul-ai/
├── api/
│   └── webhook/
│       └── route.ts          # Vercel serverless function handler
├── lib/
│   ├── groupme.ts            # GroupMe API client
│   ├── groq.ts               # Groq LLM client
│   ├── messageParser.ts      # Message formatter
│   └── dateUtils.ts          # Date calculation utilities
├── types/
│   └── index.ts              # TypeScript type definitions
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

## Environment Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GROQ_API_KEY` | Groq API key for LLM | [Groq Console](https://console.groq.com/) |
| `GROUPME_BOT_ID` | Your GroupMe bot ID | GroupMe bot creation response |
| `GROUPME_ACCESS_TOKEN` | GroupMe API access token | [GroupMe Applications](https://dev.groupme.com/applications) |
| `GROUPME_GROUP_ID` | Target GroupMe group ID | Group URL or API |

## Troubleshooting

- **Bot not responding**: Check that the callback URL is correct and the bot is active
- **Missing players**: Ensure messages contain clear "in" confirmations
- **API errors**: Check Vercel function logs and verify environment variables
- **Rate limiting**: GroupMe and Groq have rate limits - check API status

## License

MIT
