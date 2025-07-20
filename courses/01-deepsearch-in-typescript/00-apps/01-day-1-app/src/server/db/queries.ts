import { and, count, eq, gte, desc, asc } from "drizzle-orm";
import { db } from "./index";
import { userRequests, users, chats, messages } from "./schema";
import type { Message } from "ai";

const DAILY_REQUEST_LIMIT = 50;

export async function getUserDailyRequestCount(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: count() })
    .from(userRequests)
    .where(
      and(
        eq(userRequests.userId, userId),
        gte(userRequests.createdAt, today)
      )
    );

  return result[0]?.count || 0;
}

export async function addUserRequest(userId: string): Promise<void> {
  await db.insert(userRequests).values({
    userId,
  });
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const result = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0]?.isAdmin || false;
}

export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const isAdmin = await isUserAdmin(userId);
  
  if (isAdmin) {
    return {
      allowed: true,
      remaining: -1, // Unlimited for admins
      limit: -1,
    };
  }

  const requestCount = await getUserDailyRequestCount(userId);
  const remaining = Math.max(0, DAILY_REQUEST_LIMIT - requestCount);

  return {
    allowed: requestCount < DAILY_REQUEST_LIMIT,
    remaining,
    limit: DAILY_REQUEST_LIMIT,
  };
} 

export async function upsertChat(opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: Message[];
}): Promise<void> {
  const { userId, chatId, title, messages: messageList } = opts;

  // Check if chat exists and belongs to user
  const existingChat = await db
    .select({ id: chats.id })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  if (existingChat.length > 0) {
    // Chat exists - delete all existing messages and replace them
    await db.delete(messages).where(eq(messages.chatId, chatId));
    
    // Update chat title and timestamp
    await db
      .update(chats)
      .set({ 
        title, 
        updatedAt: new Date() 
      })
      .where(eq(chats.id, chatId));
  } else {
    // Chat doesn't exist - create new chat
    await db.insert(chats).values({
      id: chatId,
      userId,
      title,
    });
  }

  // Insert all messages
  if (messageList.length > 0) {
    const messageValues = messageList.map((message, index) => ({
      chatId,
      role: message.role,
      parts: message.parts || [],
      order: index,
    }));

    await db.insert(messages).values(messageValues);
  }
}

export async function getChat(chatId: string, userId: string) {
  const chat = await db
    .select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  if (chat.length === 0) {
    return null;
  }

  const chatMessages = await db
    .select({
      id: messages.id,
      role: messages.role,
      parts: messages.parts,
      order: messages.order,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.order));

  return {
    ...chat[0],
    messages: chatMessages.map(msg => ({
      id: msg.id,
      role: msg.role,
      parts: msg.parts,
    })),
  };
}

export async function getChats(userId: string) {
  return await db
    .select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));
} 