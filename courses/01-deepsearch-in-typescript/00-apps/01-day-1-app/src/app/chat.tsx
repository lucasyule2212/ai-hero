"use client";

import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { RateLimitDisplay } from "~/components/rate-limit-display";
import { useChat } from "@ai-sdk/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isNewChatCreated } from "~/utils";
import type { Message } from "ai";
import { StickToBottom } from "use-stick-to-bottom";
import type { OurMessageAnnotation } from "~/server/system-context";
import { useAutoResume } from "~/hooks/use-auto-resume";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId: string;
  isNewChat: boolean;
  initialMessages?: Message[];
}

interface RateLimitInfo {
  remaining: number;
  limit: number;
  isExceeded: boolean;
}

export const ChatPage = ({ userName, isAuthenticated, chatId, isNewChat, initialMessages }: ChatProps) => {
  const router = useRouter();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    data,
    experimental_resume,
    setMessages
  } = useChat({
    id: chatId,
    initialMessages,
    body: {
      chatId,
      isNewChat,
    },
    onError: (error) => {
      if (error.message.includes("429")) {
        try {
          const errorData = JSON.parse(error.message);
          setRateLimit({
            remaining: errorData.remaining || 0,
            limit: errorData.limit || 1,
            isExceeded: true
          });
          toast.error("Daily request limit reached! Please try again tomorrow.");
        } catch {
          toast.error("Daily request limit reached! Please try again tomorrow.");
        }
      } else {
        toast.error("An error occurred. Please try again.");
      }
    },
    onFinish: async () => {
      if (isAuthenticated) {
        try {
          const res = await fetch("/api/rate-limit");
          const data = await res.json();
          setRateLimit({
            remaining: data.remaining,
            limit: data.limit,
            isExceeded: data.isExceeded
          });
        } catch (error) {
          console.error("Failed to refresh rate limit:", error);
        }
      }
    }
  });

  // Use auto-resume functionality
  useAutoResume({
    autoResume: true,
    initialMessages: initialMessages ?? [],
    experimental_resume,
    data,
    setMessages,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>({
    remaining: 1,
    limit: 1,
    isExceeded: false
  });

  useEffect(() => {
    if (isAuthenticated) setModalOpen(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/rate-limit")
        .then((res) => res.json())
        .then((data) => {
          setRateLimit({
            remaining: data.remaining,
            limit: data.limit,
            isExceeded: data.isExceeded
          });
        })
        .catch((error) => {
          console.error("Failed to fetch rate limit:", error);
        });
    }
  }, [isAuthenticated]);

  // Handle new chat creation and redirect
  useEffect(() => {
    const lastDataItem = data?.[data.length - 1];

    if (lastDataItem && isNewChatCreated(lastDataItem)) {
      router.push(`?id=${lastDataItem.chatId}`);
    }
  }, [data, router]);

  const handleProtectedSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setModalOpen(true);
      return;
    }

    if (rateLimit.isExceeded) {
      e.preventDefault();
      toast.error("Daily request limit reached! Please try again tomorrow.");
      return;
    }

    handleSubmit(e);
  };

  const isInputDisabled = isLoading || rateLimit.isExceeded || !isAuthenticated;
  const inputPlaceholder = rateLimit.isExceeded
    ? "Daily limit reached. Try again tomorrow."
    : "Say something...";

  return (
    <>
      <div className="flex flex-1 flex-col">
        <StickToBottom
          className="flex-1 overflow-y-auto [&>div]:scrollbar-thin [&>div]:scrollbar-track-gray-800 [&>div]:scrollbar-thumb-gray-600 [&>div]:hover:scrollbar-thumb-gray-500"
          resize="smooth"
          initial="smooth"
        >
          <StickToBottom.Content className="mx-auto w-full max-w-[65ch] p-4">
            {messages.map((message, index) => {
              return (
                <ChatMessage
                  key={index}
                  parts={message.parts || []}
                  role={message.role}
                  userName={userName}
                  annotations={message.annotations as OurMessageAnnotation[]}
                />
              );
            })}
            {isLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="size-6 animate-spin text-gray-400" />
              </div>
            )}
          </StickToBottom.Content>
        </StickToBottom>

        <div className="border-t border-gray-700">
          <form
            onSubmit={handleProtectedSubmit}
            className="mx-auto max-w-[65ch] p-4"
          >
            <div className="mb-2">
              {(rateLimit.limit === -1 || (rateLimit.limit > 0 && (rateLimit.remaining / rateLimit.limit) <= 0.2)) && (
                <RateLimitDisplay
                  remaining={rateLimit.remaining}
                  limit={rateLimit.limit}
                  isExceeded={rateLimit.isExceeded}
                />
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={inputPlaceholder}
                autoFocus
                aria-label="Chat input"
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isInputDisabled}
              />
              <button
                type="submit"
                disabled={isInputDisabled || !input.trim()}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
