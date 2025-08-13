import * as three from 'three';
import globeTexture from '../data/earth-texture.png';

export class Globe {

    constructor(scene, camera, spherical, requestRender) {
        this.scene = scene;
        this.camera = camera;
        this.cameraSphere = spherical;
        this.requestRender = requestRender;
        this.earthMesh = null;
    }

    createGlobe(container) {
        const earthGeo = new three.SphereGeometry(1, 24, 24);
        this.renderer = new three.WebGLRenderer({ alpha: true });

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        this.camera.position.setFromSpherical(this.cameraSphere);
        this.camera.lookAt(0, 0, 0);

        new three.TextureLoader().load(globeTexture, texture => {
            texture.magFilter = three.NearestFilter;
            const earthMat = new three.MeshBasicMaterial({
                map: texture,
            });
            this.earthMesh = new three.Mesh(earthGeo, earthMat);
            this.scene.add(this.earthMesh);

            const outlineMat = new three.MeshBasicMaterial({
                side: three.BackSide,
            });
            const outline = new three.Mesh(earthGeo, outlineMat);

            outline.scale.set(1.002, 1.002, 1.002);
            this.scene.add(outline);
            this.requestRender();
        });
    }

    resizeCanvas(container) {
        if (!this.renderer) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        this.renderer.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.requestRender();
    }

    rotate(dx, dy, dragSpeed) {
        this.cameraSphere.theta -= dx * dragSpeed;
        this.cameraSphere.phi = Math.max(
            0.05,
            Math.min(Math.PI - 0.1, this.cameraSphere.phi - dy * dragSpeed)
        );
        this.camera.position.setFromSpherical(this.cameraSphere);
        this.camera.lookAt(0, 0, 0);
        this.requestRender();
    }
}