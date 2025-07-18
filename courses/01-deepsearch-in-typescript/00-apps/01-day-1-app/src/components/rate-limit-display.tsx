import { AlertCircle, Infinity } from "lucide-react";

interface RateLimitDisplayProps {
  remaining: number;
  limit: number;
  isExceeded: boolean;
}

export function RateLimitDisplay({ remaining, limit, isExceeded }: RateLimitDisplayProps) {
  if (limit === -1) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-xs">
        <Infinity className="size-4" />
        <span>Unlimited requests</span>
      </div>
    );
  }

  const percentage = Math.max(0, (remaining / limit) * 100);

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1 text-xs">
        {isExceeded && (
          <AlertCircle className="size-4 text-red-400" />
        )}
        <span className={isExceeded ? "text-red-400" : "text-gray-400"}>
          {remaining} / {limit} requests remaining
        </span>
      </div>

      {!isExceeded && (
        <div className="h-1 w-16 rounded-full bg-gray-700">
          <div
            className={`h-full rounded-full transition-all ${percentage > 50 ? "bg-green-500" :
              percentage > 25 ? "bg-yellow-500" : "bg-red-500"
              }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
} 