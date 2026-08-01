import { Ratelimit } from "@upstash/ratelimit";
import redis from "@/database/redis";

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(200, "1m"), // 200 requests per minute per IP
  analytics: true,
  prefix: "@upstash/ratelimit",
});

// Parent: REQ-0026
// Pre-auth upload signatures need a substantially tighter abuse boundary than read APIs.
export const uploadAuthorizationRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10m"),
  analytics: true,
  prefix: "@upstash/ratelimit/upload-authorization",
});

export default ratelimit;
