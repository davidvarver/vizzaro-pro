
require('dotenv').config();
const { createClient } = require('@vercel/kv');
const fs = require('fs');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

// COPY OF CURRENT LOGIC FROM store/useWallpapersStore.ts
const enrichWallpaperData = (data) => {
    // 1. Common suffixes to strip
    const SUFFIXES = [
        'PEEL & STICK WALLPAPER', 'PEEL AND STICK WALLPAPER', 'WALLPAPER', 'PAPEL TAPIZ', 'WALL MURAL', 'SELF ADHESIVE MURAL',
        'FLOOR TILES', 'WALL DECALS', 'MOULDING', 'WALL PANELS', 'PEEL & STICK'
    ];

    // 2. Common colors and descriptors to strip
    const COLORS = [
        'OFF WHITE', 'OFF-WHITE', 'WHITE', 'BLANCO', 'TEAL', 'TURQUESA', 'DARK BROWN', 'LIGHT BROWN', 'BROWN', 'CAFE', 'MARRON',
        'MOCHA', 'MOCA', 'WHEAT', 'TRIGO', 'CHAI', 'PEBBLE', 'STONE', 'AQUA', 'NAVY', 'AZUL MARINO', 'SKY BLUE', 'POWDERED BLUE',
        'LIGHT BLUE', 'BLUE', 'AZUL', 'COBALT', 'COBALTO', 'INDIGO', 'MOODY', 'DUSTY', 'COAST', 'PINK', 'ROSA', 'ROSE', 'BLUSH',
        'RUBOR', 'MAGENTA', 'FLAMINGO', 'BLACK & WHITE', 'BLACK AND WHITE', 'BLACK', 'NEGRO', 'CHARCOAL', 'CARBON', 'ONYX',
        'PEPPERCORN', 'CAVIAR', 'GRAPHITE', 'GRAFITO', 'CHALKBOARD', 'PIZARRON', 'GREY', 'GRAY', 'GRIS', 'SILVER', 'PLATA',
        'SLATE', 'PIZARRA', 'GOLD', 'DORADO', 'METALLIC', 'METALICO', 'COPPER', 'COBRE', 'GREEN', 'VERDE', 'EMERALD', 'ESMERALDA',
        'SAGE', 'OLIVE', 'OLIVA', 'MINT', 'MENTA', 'MOSS', 'MUSGO', 'CHARTREUSE', 'FOREST', 'PISTACHIO', 'PISTACHE', 'IVY',
        'HIEDRA', 'BEIGE', 'CREAM', 'CREMA', 'TAN', 'TOSTADO', 'TAUPE', 'OATMEAL', 'AVENA', 'NEUTRAL', 'NEUTRO', 'NATURAL',
        'SAND', 'ARENA', 'PARCHMENT', 'CASHMERE', 'LINEN', 'LINO', 'JUTE', 'YUTE', 'YELLOW', 'AMARILLO', 'MUSTARD', 'MOSTAZA',
        'PALE', 'PALIDO', 'OCHRE', 'OCRE', 'SUNSHINE', 'RED', 'ROJO', 'RUST', 'OXIDO', 'BURGUNDY', 'VIOLET', 'VIOLETA', 'VINO',
        'MAROON', 'BRICK', 'LADRILLO', 'APPLE', 'MANZANA', 'ORANGE', 'NARANJA', 'PEACH', 'DURAZNO', 'CORAL', 'TERRACOTTA',
        'TERRACOTA', 'APRICOT', 'ALBARICOQUE', 'CARAMEL', 'CARAMELO', 'SPICE', 'ESPECIA', 'CITRUS', 'CITRICO', 'PURPLE',
        'MORADO', 'LILAC', 'LILA', 'MAUVE', 'LAVENDER', 'LAVANDA', 'PLUM', 'CIRUELA', 'DUSK', 'ATARDECER', 'MULTI', 'MULTICOLOR',
        'RAINBOW', 'ARCOIRIS', 'PASTEL', 'BREEZY', 'MIX', 'TWIST', 'SUMMER', 'VERANO', 'SHOWER'
    ];

    return data.map(item => {
        let name = item.name.toUpperCase();
        SUFFIXES.forEach(suffix => { name = name.replace(suffix, ''); });
        COLORS.forEach(color => { const regex = new RegExp(`\\b${color}\\b`, 'g'); name = name.replace(regex, ''); });
        const modelName = name.replace(/[^A-Z0-9]/g, ' ').trim().replace(/\s+/g, '-').toLowerCase();
        return {
            name: item.name,
            calculatedGroup: modelName
        };
    });
};

async function main() {
    console.log('Fetching catalog...');
    const catalog = await kv.get('wallpapers_catalog') || [];
    console.log(`Analyzing ${catalog.length} items...`);

    const enriched = enrichWallpaperData(catalog);
    enriched.sort((a, b) => a.calculatedGroup.localeCompare(b.calculatedGroup));

    const suspects = [];

    for (let i = 0; i < enriched.length - 1; i++) {
        const curr = enriched[i];
        const next = enriched[i + 1];

        if (curr.calculatedGroup !== next.calculatedGroup) {
            // Check for potential duplicates that were missed
            if (next.calculatedGroup.startsWith(curr.calculatedGroup) ||
                curr.calculatedGroup.startsWith(next.calculatedGroup) ||
                (levenshtein(curr.calculatedGroup, next.calculatedGroup) < 4)) {

                suspects.push({
                    group1: curr.calculatedGroup,
                    name1: curr.name,
                    group2: next.calculatedGroup,
                    name2: next.name
                });
            }
        }
    }

    fs.writeFileSync('audit.json', JSON.stringify(suspects, null, 2));
    console.log(`Saved ${suspects.length} suspects to audit.json`);
}

function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}

main();
