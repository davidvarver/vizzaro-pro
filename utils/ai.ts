const API_URL = 'https://toolkit.rork.com/images/edit/';

export interface AiProcessResult {
    processedBase64: string;
    maskBase64?: string;
}

// Helper to resize image
async function resizeImage(base64: string, label: string): Promise<string> {
    try {
        // Skip check for very small strings to be safe (e.g. valid small patterns), avoiding codec issues
        if (base64.length < 10000) return base64;

        // Dynamic import to prevent crash on web initial load
        const ImageManipulator = await import('expo-image-manipulator');

        const uri = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;

        // Log original size
        console.log(`AI Processing [${label}]: Original Length:`, base64.length);

        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 512 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (result.base64) {
            console.log(`AI Processing [${label}]: Resized Length:`, result.base64.length);
            return result.base64;
        }
    } catch (error) {
        console.warn(`Failed to resize ${label}, using original:`, error);
    }
    return base64;
}

export async function processImageWithAI(
    imageBase64: string,
    wallpaperBase64: string,
    promptOverride?: string
): Promise<string> {

    // Default prompt if not provided
    const defaultPrompt = `You are an expert at applying wallpaper patterns to walls in photos with advanced wall detection capabilities.
    TASK: Apply the wallpaper pattern from the SECOND IMAGE onto the walls in the FIRST IMAGE.
    CRITICAL WALL DETECTION RULES:
    1. PRIMARY WALL IDENTIFICATION: Identify the largest continuous flat surface in the center (background).
    2. DISTINGUISH WALLS FROM NON-WALLS: Ignore furniture, people, objects.
    3. PATTERN EXTRACTION: Use pattern from second image.
    4. APPLICATION STRATEGY: Apply ONLY to the primary wall. Respect perspective and lighting.
    5. REALISM: Maintain shadows and depth.
    PRIORITY: Identify the PRIMARY WALL correctly and apply wallpaper ONLY to that wall surface.`;

    const prompt = promptOverride || defaultPrompt;

    // Resize input images
    const processedImageBase64 = await resizeImage(imageBase64, 'Source');

    // For mask generation, we use source as pattern, so we can reuse the resized image
    let processedWallpaperBase64 = wallpaperBase64;

    if (wallpaperBase64 === imageBase64) {
        processedWallpaperBase64 = processedImageBase64;
    } else {
        processedWallpaperBase64 = await resizeImage(wallpaperBase64, 'Pattern');
    }

    const cleanImageBase64 = processedImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const cleanWallpaperBase64 = processedWallpaperBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const requestBody = {
        prompt: prompt,
        images: [
            { type: 'image' as const, image: cleanImageBase64 },
            { type: 'image' as const, image: cleanWallpaperBase64 }
        ]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI Service Error (${response.status}): ${errorText}`);
        }

        const result = await response.json();
        if (!result.image || !result.image.base64Data) {
            throw new Error('Invalid AI response format');
        }

        return result.image.base64Data;
    } catch (error) {
        clearTimeout(timeoutId);
        // Enhance error message for known issues
        if (error instanceof Error && error.message.includes('INVALID_ARGUMENT')) {
            console.error('AI Input Error: Check image size/format.');
        }
        throw error;
    }
}

export async function generateWallMask(imageBase64: string): Promise<string> {
    // Strategy: Use a SOLID WHITE pattern.
    // CRITICAL: We start with a tiny 1x1 pixel, BUT we must resize it to 512x512 
    // using our resizeImage helper to ensure the AI service accepts it (avoiding 500 errors).

    // 1x1 white pixel base64 (Valid PNG)
    const tinyWhiteBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGP6DwABBAEKKFE8rwAAAABJRU5ErkJggg==";

    // Resize to 512x512 to satisfy "valid image" requirements of the AI
    const validWhitePattern = await resizeImage(tinyWhiteBase64, 'WhitePattern');

    const maskPrompt = `TASK: Create a BINARY MASK of the main wall in the image.
    1. Identify the PRIMARY WALL (largest central vertical surface).
    2. Apply the provided WHITE pattern to the entire wall surface.
    3. Make everything else (furniture, floor, ceiling, people, windows) BLACK.
    4. The output must be a black and white image only. White = Wall, Black = Not Wall.
    5. No shadows, no lighting, just flat white on the wall area.`;

    return await processImageWithAI(imageBase64, validWhitePattern, maskPrompt);
}
