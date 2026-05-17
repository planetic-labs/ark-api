// Shared types for Ark Messenger

export type UserRole = 'MASTER' | 'WARRIOR' | 'STUDENT' | 'ADMIN';

export interface User {
  id: string; // ULID
  email: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_approved: boolean;
  created_at: string; // ISO Date
}

export interface Chat {
  id: string; // ULID
  name: string | null;
  is_group: boolean;
  created_at: string; // ISO Date
}

export interface Message {
  id: string; // ULID
  chat_id: string;
  sender_id: string;
  content: string;
  parent_id: string | null;
  created_at: string; // ISO Date
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MsgResponse {
  message: string;
}
