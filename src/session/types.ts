export interface SessionEntry {
  prompt: string;
  output: string;
  timestamp: string;
  image_data?: string; // base64 encoded image for continuing edits
}

export interface Session {
  id: string;
  created_at: string;
  updated_at: string;
  model: string;
  input_image?: string; // original input image path or base64
  history: SessionEntry[];
}

export interface SessionSummary {
  id: string;
  created_at: string;
  updated_at: string;
  model: string;
  history_count: number;
  last_prompt?: string;
}
