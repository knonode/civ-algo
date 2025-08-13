import { latLonToVector3 } from './helpers.js';
import labels from '../data/labels.json';

export class Labels {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.camera = camera;
        this.canvasLabels = [];
    }

    setupLabelCanvas(container) {
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    draw() {
        const ctx = this.canvas.getContext('2d');
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.clearRect(0, 0, cw, ch);
        this.canvasLabels = [];

        labels.forEach(label => {

            const position = latLonToVector3(label.lat, label.lon);
            const cameraToPlane = position.clone().sub(this.camera.position);
            const angle = position.angleTo(cameraToPlane);

            if (angle < Math.PI / 2) return;

            const ndc = position.clone().project(this.camera);
            const px = (ndc.x + 1) / 2 * cw;
            const py = (1 - ndc.y) / 2 * ch;
            const text = label.name;

            if (!text) {
                console.warn(`Label for ${label.name} has no text, skipping.`);
                return;
            }

            const fontSize = 14;
            const padX = 3, padTop = 5, padBottom = 4;

            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = 'center';

            const m = ctx.measureText(text);
            const ascent = (m.actualBoundingBoxAscent ?? Math.ceil(fontSize * 0.8));
            const descent = (m.actualBoundingBoxDescent ?? Math.ceil(fontSize * 0.2));

            const textW = m.width;
            const boxW = textW + padX * 2;
            const boxH = ascent + descent + padTop + padBottom;
            const bx = px - boxW / 2;
            const by = py - boxH;
            const rect = { x: bx, y: by, width: boxW, height: boxH };

            ctx.fillStyle = 'black';
            ctx.fillRect(bx, by, boxW, boxH);

            ctx.fillStyle = 'white';
            ctx.strokeStyle = '#ff4d00';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, boxW, boxH);

            const textY = by + padTop + ascent;
            ctx.fillText(text, px, textY);

            this.canvasLabels.push({
                lat: label.lat,
                lon: label.lon,
                name: label.name,
                description: label.description,
                rect: rect,
                plane: { position, ndc, text, fontSize }
            });
        });
    }

    getLabelAtMousePos(e, boundaries) {
        const x = e.x - boundaries.left;
        const y = e.y - boundaries.top;

        for (const label of this.canvasLabels) {
            const r = label.rect;
            if (x >= r.x &&
                x <= r.x + r.width &&
                y >= r.y &&
                y <= r.y + r.height) {
                return label;
            }
        }
    }
}