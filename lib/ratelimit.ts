import { Ratelimit } from "@upstash/ratelimit";
import redis from "@/database/redis";

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(30, "1m"), // 30 requests per minute per IP
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export default ratelimit;
