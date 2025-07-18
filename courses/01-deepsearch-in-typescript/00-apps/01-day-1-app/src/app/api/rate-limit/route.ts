import { auth } from "~/server/auth/index";
import { checkRateLimit } from "~/server/db/queries";

export async function GET() {
  const session = await auth();
  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const rateLimit = await checkRateLimit(session.user.id);
    
    return new Response(
      JSON.stringify({
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
        isExceeded: !rateLimit.allowed,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Limit": rateLimit.limit.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Error fetching rate limit:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch rate limit" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 