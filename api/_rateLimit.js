const rateLimitStore = new Map();

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = {
  auth: 5,
  email: 3,
  default: 30,
};

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.resetTime > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupOldEntries, RATE_LIMIT_WINDOW);

export function rateLimit(req, res, options = {}) {
  const { 
    maxRequests = MAX_REQUESTS_PER_WINDOW.default,
    windowMs = RATE_LIMIT_WINDOW,
    keyGenerator = (req) => {
      const forwarded = req.headers['x-forwarded-for'];
      const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || 'unknown';
      return `${ip}:${req.url}`;
    }
  } = options;

  const key = keyGenerator(req);
  const now = Date.now();

  let rateLimitData = rateLimitStore.get(key);

  if (!rateLimitData || now - rateLimitData.resetTime > windowMs) {
    rateLimitData = {
      count: 0,
      resetTime: now,
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
    console.warn(`[RateLimit] Rate limit exceeded for ${key}`);
    res.status(429).json({
      error: 'Demasiadas solicitudes. Por favor intenta más tarde.',
      retryAfter: resetIn,
    });
    return true;
  }

  return false;
}
