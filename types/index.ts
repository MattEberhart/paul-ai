// GroupMe API Types
export interface GroupMeMessage {
  id: string;
  group_id: string;
  user_id: string;
  name: string;
  text: string;
  created_at: number;
  avatar_url?: string;
  system?: boolean;
  attachments?: Array<{
    type: string;
    url?: string;
  }>;
}

export interface GroupMeWebhookPayload {
  attachments: any[];
  avatar_url: string;
  created_at: number;
  group_id: string;
  id: string;
  name: string;
  sender_type: string;
  source_guid: string;
  system: boolean;
  text: string;
  user_id: string;
}

// LLM Analysis Types
export interface PlayerAnalysis {
  confirmedPlayers: string[];
  plusOnes: Array<{
    inviter: string;
    guestCount: number;
  }>;
  withdrawnPlayers: string[];
  gameStatus: 'active' | 'cancelled';
  cancellationReason?: string;
  totalCount: number;
}

export type WeekIntent = 'this_week' | 'last_week';

export interface IntentDetection {
  intent: WeekIntent;
}

// Environment Variables
export interface EnvVars {
  GROQ_API_KEY: string;
  GROUPME_BOT_ID: string;
  GROUPME_ACCESS_TOKEN: string;
  GROUPME_GROUP_ID: string;
}
