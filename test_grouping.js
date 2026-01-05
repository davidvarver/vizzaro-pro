const { getBaseName } = require('./utils/product');

const testCases = [
    "Dream Garden Off White Peel & Stick Wallpaper",
    "Dream Garden Teal Peel & Stick Wallpaper",
    "Dream Garden Dark Brown Peel & Stick Wallpaper",
    "Retro Esme Navy Peel & Stick Wallpaper",
    "Retro Esme Pink Peel & Stick Wallpaper",
    "Jeani Blue Peel & Stick Wallpaper",
    "Jeani Light Brown Peel & Stick Wallpaper",
    "Talia Green Peel & Stick Wallpaper",
    "Talia Light Blue Peel & Stick Wallpaper",
    "Talia Navy Peel & Stick Wallpaper"
];

console.log("--- Testing Grouping Logic ---");
testCases.forEach(name => {
    console.log(`Original: "${name}" -> Base: "${getBaseName(name)}"`);
});
