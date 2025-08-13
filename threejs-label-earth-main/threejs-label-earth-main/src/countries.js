import * as three from 'three';
import { latLonToVector3, vector3ToLatLon } from './helpers.js';
import countries from '../data/worldgeo.json';

export class Countries {
    constructor(scene, camera, requestRender) {
        this.scene = scene;
        this.camera = camera;
        this.requestRender = requestRender;
        this.countryGrid = []
        this.geoJson = [];
        this.countryGrid = null;
        this.countryLinesCache = {};
        this.currentCountryLine = null;
        this.lastMousePos = { x: 0, y: 0 };
        this.outlineMaterial = new three.LineBasicMaterial({ color: 0x39FF14 });
    }

    fetchGeoJson() {
        try {
            this.geoJson = countries;
            this.createCountryLookupGrid();
            console.log('Country grid built successfully');
        } catch (err) {
            console.error('Failed to load local country borders:', err);
        }
    }

    createCountryLookupGrid() {
        const grid = Array(360).fill(null).map(() => Array(180).fill(null));

        for (const feature of this.geoJson.features) {
            const geom = feature.geometry;

            if (!["Polygon", "MultiPolygon"].includes(geom.type)) {
                console.error(`Unsupported geometry for ${feature.properties.admin}`);
                continue;
            }

            let [minX, minY, maxX, maxY] = [180, 90, -180, -90];

            for (const poly of geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates) {
                for (const ring of poly) {
                    for (const [x, y] of ring) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            const gridMinX = Math.max(0, Math.floor(minX + 180));
            const gridMaxX = Math.min(359, Math.floor(maxX + 180));
            const gridMinY = Math.max(0, Math.floor(90 - maxY));
            const gridMaxY = Math.min(179, Math.floor(90 - minY));

            for (let x = gridMinX; x <= gridMaxX; x++) {
                for (let y = gridMinY; y <= gridMaxY; y++) {
                    const lonCenter = (x + 0.5) - 180;
                    const latCenter = 90 - (y + 0.5);
                    if (grid[x][y] === null &&
                        this._isPointInFeature(lonCenter, latCenter, feature)) {
                        grid[x][y] = feature.properties.admin;
                    }
                }
            }
        }

        this.countryGrid = grid;
    }

    getCountryAtMousePos(e, bounding, earthMesh) {
        const ndc = new three.Vector2(
            ((e.x - bounding.left) / bounding.width) * 2 - 1,
            -((e.y - bounding.top) / bounding.height) * 2 + 1
        );

        const raycaster = new three.Raycaster();
        raycaster.setFromCamera(ndc, this.camera);
        const hit = raycaster.intersectObject(earthMesh, false)[0];

        if (!hit) {
            console.info('Clicked outside globe');
            return;
        }

        const { lat, lon } = vector3ToLatLon(hit.point, 1);
        return this.getCountryAt(lat, lon);
    }

    getCountryAt(lat, lon) {
        if (!this.countryGrid) {
            console.error('Country grid not ready');
            return null;
        }
        if (!lat || !lon) {
            console.error('Lat Lon error');
        }
        const x = Math.max(0, Math.min(359, Math.round(lon + 180)));
        const y = Math.max(0, Math.min(179, Math.round(90 - lat)));
        return this.countryGrid[x][y];
    }

    drawCountryAt(lat, lon) {
        const country = this.getCountryAt(lat, lon);
        if (!country) {
            if (this.currentCountryLine) {
                this.scene.remove(this.currentCountryLine);
                this.currentCountryLine = null;
            }
            return;
        }
        this.drawCountry(country);
    }

    drawCountry(countryName) {
        if (this.currentCountryLine) {
            this.scene.remove(this.currentCountryLine);
            this.currentCountryLine = null;
        }

        let lineGroup = this.countryLinesCache[countryName];

        if (!lineGroup) {
            lineGroup = new three.Group();

            const feature = this.geoJson.features.find(f =>
                f.properties.admin === countryName
            );

            if (feature) {
                const material = this.outlineMaterial;
                const geom = feature.geometry;

                if (geom.type === "Polygon") {
                    this._addRingToGroup(lineGroup, geom.coordinates[0], material);
                }
                else if (geom.type === "MultiPolygon") {
                    geom.coordinates.forEach(poly => {
                        this._addRingToGroup(lineGroup, poly[0], material);
                    });
                }
            }
            this.countryLinesCache[countryName] = lineGroup;
        }

        this.scene.add(lineGroup);
        this.currentCountryLine = lineGroup;
        this.requestRender();
    }

    removeCurrentCountry() {
        if (this.currentCountryLine) {
            this.scene.remove(this.currentCountryLine);
            this.currentCountryLine = null;
            this.requestRender();
        }
    }

    _isPointInFeature(lon, lat, feature) {
        const geom = feature.geometry;
        if (geom.type === "Polygon") {
            return this._isPointInPolygon(lon, lat, geom.coordinates);
        } else if (geom.type === "MultiPolygon") {
            for (const poly of geom.coordinates) {
                if (this._isPointInPolygon(lon, lat, poly))
                    return true;
            }
        }
        return false;
    }

    _isPointInPolygon(lon, lat, polygon) {
        const [outerRing, ...holes] = polygon;
        if (!this._isPointInRing(lon, lat, outerRing)) return false;
        for (const hole of holes) {
            if (this._isPointInRing(lon, lat, hole)) return false;
        }
        return true;
    }

    _isPointInRing(lon, lat, ring) {
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0], yi = ring[i][1];
            const xj = ring[j][0], yj = ring[j][1];

            const slope = (xj - xi) / (yj - yi);
            const intersect = yi !== yj &&
                (lat > yi) !== (lat > yj) &&
                lon < xi + slope * (lat - yi);

            if (intersect) inside = !inside;
        }
        return inside;
    }

    _addRingToGroup(group, ring, material) {
        const points = ring.map(p => latLonToVector3(p[1], p[0], this.earthRadius));
        const geometry = new three.BufferGeometry().setFromPoints(points);
        const line = new three.Line(geometry, material);
        line.raycast = () => { };
        group.add(line);
    }
}
