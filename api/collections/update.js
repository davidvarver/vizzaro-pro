import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { rateLimit } from '../_rateLimit.js';
import { requireAdmin } from '../_authMiddleware.js';

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

const isKVConfigured = KV_REST_API_URL && 
                       KV_REST_API_TOKEN && 
                       !KV_REST_API_URL.includes('your-') && 
                       !KV_REST_API_TOKEN.includes('your-');

export default async function handler(req, res) {
  console.log('[collections/update] Request received');
  
  setCorsHeaders(req, res);
  
  if (handleCorsOptions(req, res)) {
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (rateLimit(req, res, { maxRequests: 20 })) {
    return;
  }

  try {
    const adminUser = requireAdmin(req, res);
    if (!adminUser) {
      return;
    }

    const { collections } = req.body;

    if (!collections || !Array.isArray(collections)) {
      console.error('[collections/update] Invalid collections data');
      return res.status(400).json({ error: 'Collections data is required' });
    }

    if (!isKVConfigured) {
      console.log('[collections/update] KV not configured');
      return res.status(503).json({
        error: 'Database not configured',
        needsConfig: true,
      });
    }

    console.log('[collections/update] Saving to KV:', collections.length, 'items');
    
    const saveResponse = await fetch(
      `${KV_REST_API_URL}/set/collections`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        },
        body: JSON.stringify(collections),
      }
    );

    if (!saveResponse.ok) {
      console.error('[collections/update] KV save failed:', saveResponse.status);
      const errorText = await saveResponse.text();
      console.error('[collections/update] Error details:', errorText);
      throw new Error('Failed to save to KV');
    }

    console.log('[collections/update] Saved successfully');

    return res.status(200).json({
      success: true,
      message: 'Collections updated successfully',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('[collections/update] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}
