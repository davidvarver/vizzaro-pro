export function getBaseName(name: string): string {
    // Remove color variations like " - Blue", " (Red)" etc.
    return name.replace(/ - .*/, '').replace(/ \(.*/, '').trim();
}

export function formatDimensionsImperial(widthM: number, heightM: number): string {
    const widthInches = (widthM * 39.3701).toFixed(1);
    const heightFeet = (heightM * 3.28084).toFixed(1);
    return `${widthInches} in x ${heightFeet} ft`;
}

export function m2ToSqFt(m2: number): number {
    return m2 * 10.7639;
}

export function sqFtToM2(sqFt: number): number {
    return sqFt / 10.7639;
}
