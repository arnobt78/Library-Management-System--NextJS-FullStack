import { Ratelimit } from "@upstash/ratelimit";
import redis from "@/database/redis";

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(200, "1m"), // 200 requests per minute per IP
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export default ratelimit;
