declare module 'three/examples/jsm/renderers/CSS2DRenderer.js' {
  import { Object3D, Camera, Scene, Vector3 } from 'three';
  export class CSS2DRenderer {
    domElement: HTMLDivElement;
    setSize(width: number, height: number): void;
    render(scene: Scene, camera: Camera): void;
  }
  export class CSS2DObject extends Object3D {
    position: Vector3;
    constructor(element?: HTMLElement);
  }
}
declare module 'three/examples/jsm/controls/OrbitControls.js' {
  import { Camera } from 'three';
  export class OrbitControls {
    constructor(object: Camera, domElement?: HTMLElement);
    enableDamping: boolean;
    minDistance: number;
    maxDistance: number;
    update(): void;
  }
}

