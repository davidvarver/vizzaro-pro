
// Mock of the enrichment logic from store/useWallpapersStore.ts

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
        // NOTE: In the store, there's a check `if (item.group) return item;` 
        // We comment it out here to force basic calculation for testing
        // if (item.group) return item; 

        let name = item.name.toUpperCase();

        // Strip Suffixes
        SUFFIXES.forEach(suffix => {
            if (name.endsWith(suffix)) {
                name = name.substring(0, name.length - suffix.length).trim();
            } else {
                name = name.replace(suffix, '');
            }
        });

        // Strip Colors using Regex Word Boundary
        // This is exactly how it is in the store file (except the store map/forEach might be slightly different in iteration order or regex construction)
        // Store code: COLORS.forEach(color => { const regex = new RegExp(`\\b${color}\\b`, 'g'); name = name.replace(regex, ''); });

        COLORS.forEach(color => {
            const regex = new RegExp(`\\b${color}\\b`, 'g');
            name = name.replace(regex, '');
        });

        const modelName = name.replace(/[^A-Z0-9]/g, ' ').trim().replace(/\s+/g, '-').toLowerCase();

        return {
            name: item.name,
            group: modelName,
            processedName: name
        };
    });
};

const testCases = [
    { name: "Rodney White Tagged Brick Wallpaper" },
    { name: "Rodney Grey Tagged Brick Wallpaper" },
    { name: "Rodney Red Tagged Brick Wallpaper" }
];

const results = enrichWallpaperData(testCases);

console.log("--- Grouping Logic Verification ---");
results.forEach(r => {
    console.log(`Original: "${r.name}"`);
    console.log(`Processed: "${r.processedName}"`);
    console.log(`Group ID: "${r.group}"`);
    console.log("---");
});
