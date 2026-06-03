export const ROUTES = {
  auth: {
    index: '/',
    code: '/code',
    setup: '/setup',
  },
  admin: {
    users: '/admin/users',
    user: (id: string) => `/admin/users/${id}`,
    roles: '/admin/roles',
    bots: '/admin/bots',
    services: '/admin/services',
  },
  chats: '/chats',
  chat: (id: string) => `/chats/${id}`,
  navigator: '/navigator',
  chronicles: '/chronicles',
  materials: '/materials',
  video: '/video',
} as const;
