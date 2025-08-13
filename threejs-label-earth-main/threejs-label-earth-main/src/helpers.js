import * as three from 'three';

export function latLonToVector3(lat, lon, radius = 1) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;

    const res = new three.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
    return res;
}

export function vector3ToLatLon(vector, radius = 1) {
    const invR = 1 / radius;
    const phi = Math.acos(three.MathUtils.clamp(vector.y * invR, -1, 1));
    const theta = Math.atan2(vector.z, -vector.x);

    const lat = 90 - three.MathUtils.radToDeg(phi);
    let lon = three.MathUtils.radToDeg(theta) - 180;
    lon = ((lon + 540) % 360) - 180;

    return { lat, lon };
}
