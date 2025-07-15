"use client";

import { signIn, signOut } from "next-auth/react";
import { siDiscord } from "simple-icons/icons";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { LogOut } from 'lucide-react';

interface AuthButtonProps {
  isAuthenticated: boolean;
  userImage: string | null | undefined;
  userName?: string | null | undefined;
}

export function AuthButton({ isAuthenticated, userImage, userName }: AuthButtonProps) {
  const router = useRouter();

  return isAuthenticated ? (
    <div className="hover:bg-gray-750 flex items-center gap-2 rounded-lg bg-gray-800 p-2 text-gray-300">
      {userImage && (
        <Image
          src={userImage}
          alt="User avatar"
          width={32}
          height={32}
          className="rounded-full"
        />
      )}
      <span className="ml-2 text-sm font-medium flex-1 text-gray-200">{userName}</span>
      <button
        onClick={async () => {
          await signOut({
            redirect: false,
          }).then(() => {
            toast.info("Signing out");
          }).catch((error) => {
            toast.error("Failed to sign out");
          })
          router.refresh();
        }}
        className="flex w-fit items-center justify-center p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  ) : (
    <button
      onClick={async () => {
        await signIn("discord", {
          redirect: false,
        }).then(() => {
          toast.loading("Signing in");
        }).catch((error) => {
          toast.error("Failed to sign in");
        });
      }}
      className="hover:bg-gray-750 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 p-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
        <path d={siDiscord.path} />
      </svg>
      Sign in
    </button>
  );
}
