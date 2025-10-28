const rateLimitStore = new Map();
const blockedIps = new Map();

const RATE_LIMIT_WINDOW = 60 * 1000;
const BLOCK_DURATION = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = {
  auth: 5,
  email: 3,
  default: 30,
};
const BLOCK_THRESHOLD_MULTIPLIER = 3;

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.resetTime > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(key);
    }
  }
  for (const [ip, blockTime] of blockedIps.entries()) {
    if (now - blockTime > BLOCK_DURATION) {
      blockedIps.delete(ip);
      console.log('[RateLimit] Unblocked IP:', ip);
    }
  }
}

setInterval(cleanupOldEntries, RATE_LIMIT_WINDOW);

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const ip = forwarded 
    ? forwarded.split(',')[0].trim() 
    : realIp || req.socket?.remoteAddress || 'unknown';
  return ip;
}

export function rateLimit(req, res, options = {}) {
  const { 
    maxRequests = MAX_REQUESTS_PER_WINDOW.default,
    windowMs = RATE_LIMIT_WINDOW,
    blockOnExcess = true,
    keyGenerator = (req) => {
      const ip = getClientIp(req);
      return `${ip}:${req.url}`;
    }
  } = options;

  const key = keyGenerator(req);
  const ip = getClientIp(req);
  const now = Date.now();

  if (blockedIps.has(ip)) {
    const blockTime = blockedIps.get(ip);
    const remainingBlockTime = Math.ceil((blockTime + BLOCK_DURATION - now) / 1000);
    
    if (now - blockTime < BLOCK_DURATION) {
      console.warn(`[RateLimit] Blocked IP attempted request: ${ip}`);
      res.status(429).json({
        error: 'Tu IP ha sido bloqueada temporalmente por exceder límites de solicitudes.',
        retryAfter: remainingBlockTime,
        blockedUntil: new Date(blockTime + BLOCK_DURATION).toISOString(),
      });
      return true;
    } else {
      blockedIps.delete(ip);
    }
  }

  let rateLimitData = rateLimitStore.get(key);

  if (!rateLimitData || now - rateLimitData.resetTime > windowMs) {
    rateLimitData = {
      count: 0,
      resetTime: now,
      violations: rateLimitData?.violations || 0,
    };
    rateLimitStore.set(key, rateLimitData);
  }

  rateLimitData.count++;

  const remaining = Math.max(0, maxRequests - rateLimitData.count);
  const resetIn = Math.ceil((rateLimitData.resetTime + windowMs - now) / 1000);

  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetIn);

  if (rateLimitData.count > maxRequests) {
    rateLimitData.violations++;
    console.warn(`[RateLimit] Rate limit exceeded for ${key} (violations: ${rateLimitData.violations})`);

    if (blockOnExcess && rateLimitData.violations >= BLOCK_THRESHOLD_MULTIPLIER) {
      blockedIps.set(ip, now);
      console.error(`[RateLimit] IP blocked for ${BLOCK_DURATION / 60000} minutes: ${ip}`);
      res.status(429).json({
        error: 'Tu IP ha sido bloqueada temporalmente por exceder límites de solicitudes.',
        retryAfter: BLOCK_DURATION / 1000,
        blockedUntil: new Date(now + BLOCK_DURATION).toISOString(),
      });
    } else {
      res.status(429).json({
        error: 'Demasiadas solicitudes. Por favor intenta más tarde.',
        retryAfter: resetIn,
      });
    }
    return true;
  }

  return false;
}
