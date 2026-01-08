import { Platform } from 'react-native';

const API_URL = 'https://toolkit.rork.com/images/edit/';

const USE_MOCK_AI = false; // DISABLED: We want real AI now.

// Helper to fetch external image urls (for wallpapers)
export async function fetchImageAsBase64(imageUrl: string): Promise<string> {
    console.log('[AI] Fetching image:', imageUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
        const cleanUrl = imageUrl.trim();
        // Use a proxy cascade to avoid CORS issues on web/native
        const proxyServices = [
            cleanUrl,
            `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&default=1`,
            `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`,
        ];

        let lastError: Error | null = null;
        for (let i = 0; i < proxyServices.length; i++) {
            try {
                const response = await fetch(proxyServices[i], {
                    signal: controller.signal,
                    method: 'GET',
                    headers: i === 0 ? { 'Accept': 'image/*,*/*', 'Cache-Control': 'no-cache' } : undefined
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                return await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        resolve(result.split(',')[1] || '');
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                lastError = e instanceof Error ? e : new Error(String(e));
            }
        }
        throw lastError || new Error('Failed to fetch image');
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function processImageWithAI(
    imageBase64: string,
    wallpaperBase64: string,
    promptOverride?: string
): Promise<string> {

    if (USE_MOCK_AI) {
        console.log('[AI] MOCK MODE ACTIVE');
        await new Promise(resolve => setTimeout(resolve, 1500));
        return "MOCK_GRADIENT_MASK_ID";
    }

    // Updated Prompt V4 from previous iterations
    const defaultPrompt = `Role: Expert Interior Renovation AI.
Mission: Apply wallpaper to the MAIN WALL of the room.
TARGET IDENTIFICATION:
1. FIND THE MAIN WALL: This is the largest CENTRAL vertical surface visible. It may be any color (white, grey, colored) or material.
2. COLOR BIAS WARNING: Do NOT just pick the brightest or whitest wall. Pick the wall that forms the main structure of the view.
3. TEXTURE OVERRIDE RULES: The main wall might be PAINTED or TILED. You MUST replace the existing texture (e.g., ceramic tiles, old paint) with the new wallpaper.
4. DO NOT PRESERVE TILES: If the main wall is tiled, SMOOTH IT OUT and apply the wallpaper pattern.

STRICT PROTECTION ZONES (DO NOT TOUCH):
- KITCHEN CABINETS & APPLIANCES (Keep 100% original).
- FURNITURE (Tables, chairs, lamps).
- CEILING & FLOORS.
- DOORS & WINDOWS.
- BACKGROUND ROOMS (Hallways, other rooms visible in depth).

OUTPUT: A realistic renovation where the main wall is wallpapered, but the kitchen and furniture are untouched.`;

    const prompt = promptOverride || defaultPrompt;

    // Ensure clean base64
    const cleanImageBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const cleanWallpaperBase64 = wallpaperBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const requestBody = {
        prompt: prompt,
        images: [
            { type: 'image', image: cleanImageBase64 },
            { type: 'image', image: cleanWallpaperBase64 }
        ]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

    try {
        console.log('[AI] Sending request to API...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`AI API Failed: ${response.status} - ${errText}`);
        }

        const result = await response.json();
        if (!result.image?.base64Data) {
            throw new Error('Invalid AI response format');
        }

        return result.image.base64Data;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('[AI] Error:', error);
        throw error;
    }
}


export async function generateWallMask(imageBase64: string): Promise<string> {
    // We send a white square as "wallpaper" to create the mask
    // 1x1 white pixel base64
    const whitePixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGP6DwABBAEKKFE8rwAAAABJRU5ErkJggg==";

    // Strict Mask Prompt
    const maskPrompt = `Role: Precise Architectural Segmentation AI.
TASK: Create a BINARY MASK of the MAIN WALL (largest central vertical surface).
OUTPUT RULES:
1. The Main Wall must be PURE WHITE (#FFFFFF).
2. EVERYTHING ELSE (Background, floor, ceiling, furniture, cabinets, windows) must be PURE BLACK (#000000).
3. EDGES: Crisp and sharp. Use the "Tile Override" logic: if the wall is tiled, mask the whole surface as wall.
4. DO NOT include the kitchen or side walls.
5. RESULT must be a black and white image.`;

    // Process using the existing function but with the mask prompt
    return await processImageWithAI(imageBase64, whitePixel, maskPrompt);
}
