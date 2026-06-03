import { apiRequest } from './client';
import { Chat, Message } from '@ark/shared-types';

export interface ChatCreateData {
  name?: string;
  is_group: boolean;
  members: string[]; // User IDs
}

export interface MessageCreateData {
  chat_id: string;
  content: string;
  parent_id?: string | null;
}

export const chatsApi = {
  list: async (): Promise<Chat[]> => {
    return apiRequest<Chat[]>('/messaging/chats');
  },

  create: async (data: ChatCreateData): Promise<Chat> => {
    return apiRequest<Chat>('/messaging/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listMessages: async (chatId: string): Promise<Message[]> => {
    return apiRequest<Message[]>(`/messaging/chats/${chatId}/messages`);
  },

  sendMessage: async (data: MessageCreateData): Promise<Message> => {
    return apiRequest<Message>('/messaging/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
