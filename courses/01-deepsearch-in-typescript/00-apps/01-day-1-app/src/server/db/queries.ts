import { and, count, eq, gte, desc, asc } from "drizzle-orm";
import { db } from "./index";
import { userRequests, users, chats, messages } from "./schema";
import type { Message } from "ai";
import type { OurMessageAnnotation } from "~/server/system-context";
import { generateText } from "ai";
import { model } from "~/models";
import { chatStreams } from "./schema";

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
  title?: string;
  messages: (Message & { annotations?: OurMessageAnnotation[] })[];
}): Promise<void> {
  const { userId, chatId, title, messages: messageList } = opts;

  // Check if chat exists and belongs to user
  const existingChat = await db
    .select({ id: chats.id, title: chats.title })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  if (existingChat.length > 0) {
    // Chat exists - delete all existing messages and replace them
    await db.delete(messages).where(eq(messages.chatId, chatId));
    
    // Only update title if it's provided and different from the existing title
    const updateData: { updatedAt: Date; title?: string } = { 
      updatedAt: new Date() 
    };
    
    if (title && existingChat[0]?.title !== title) {
      updateData.title = title;
    }
    
    await db
      .update(chats)
      .set(updateData)
      .where(eq(chats.id, chatId));
  } else {
    // Chat doesn't exist - create new chat
    await db.insert(chats).values({
      id: chatId,
      userId,
      title: title || "New Chat",
    });
  }

  // Insert all messages
  if (messageList.length > 0) {
    const messageValues = messageList.map((message, index) => ({
      chatId,
      role: message.role,
      parts: message.parts || [],
      annotations: message.annotations || null,
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
      annotations: messages.annotations,
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
      annotations: msg.annotations,
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

export const generateChatTitle = async (
  messages: Message[],
): Promise<string> => {
  try {
    const { text } = await generateText({
      model,
      system: `You are a chat title generator.
        You will be given a chat history, and you will need to generate a title for the chat.
        The title should be a single sentence that captures the essence of the chat.
        The title should be no more than 50 characters.
        The title should be in the same language as the chat history.
        Do not include quotes, ellipsis, or any punctuation at the end.
        `,
      prompt: `Here is the chat history:

        ${messages.map((m) => m.content).join("\n")}
      `,
    });

    return text.trim();
  } catch (error) {
    console.error("Failed to generate chat title:", error);
    // Fallback to a simple title based on the first user message
    const firstUserMessage = messages.find(msg => msg.role === "user");
    if (firstUserMessage?.content) {
      return firstUserMessage.content.slice(0, 50);
    }
    return "New Chat";
  }
}; 

// Stream management functions for resumable streams
export async function appendStreamId({ 
  chatId, 
  streamId 
}: { 
  chatId: string; 
  streamId: string; 
}): Promise<void> {
  await db.insert(chatStreams).values({
    chatId,
    streamId,
  });
}

export async function loadStreams(chatId: string): Promise<string[]> {
  const streams = await db
    .select({ streamId: chatStreams.streamId })
    .from(chatStreams)
    .where(eq(chatStreams.chatId, chatId))
    .orderBy(desc(chatStreams.createdAt));

  return streams.map(stream => stream.streamId);
}

export async function getMessagesByChatId({ 
  id 
}: { 
  id: string; 
}): Promise<Message[]> {
  const dbMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, id))
    .orderBy(asc(messages.order));

  return dbMessages.map(msg => ({
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    content: Array.isArray(msg.parts) && msg.parts[0] && typeof msg.parts[0] === 'object' && 'text' in msg.parts[0] 
      ? (msg.parts[0] as { text: string }).text 
      : "",
    parts: msg.parts as any,
    annotations: msg.annotations as any,
    createdAt: msg.createdAt,
  }));
} 