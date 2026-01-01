const { getDefaultConfig } = require("expo/metro-config");
let withNativeWind;

console.log("Loading Metro Config...");

try {
    const nativeWind = require("nativewind/metro");
    withNativeWind = nativeWind.withNativeWind;
    console.log("Successfully loaded nativewind/metro");
} catch (e) {
    console.error("CRITICAL ERROR: Failed to load nativewind/metro:", e);
}

if (withNativeWind) {
    module.exports = withNativeWind(config, { input: "./global.css" });
} else {
    module.exports = config;
}
// module.exports = config;
