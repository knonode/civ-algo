declare module 'three' {
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(v: Vector3): this;
    clone(): Vector3;
    normalize(): Vector3;
    dot(v: Vector3): number;
    setFromSpherical(s: Spherical): Vector3;
  }

  export class Color {
    constructor(hex?: number | string);
  }

  export class Object3D {
    position: Vector3;
  }

  export class Camera extends Object3D {}

  export class Scene extends Object3D {
    background: Color | null;
    add(...objs: Object3D[]): void;
  }

  export class PerspectiveCamera extends Camera {
    constructor(fov: number, aspect: number);
    aspect: number;
    updateProjectionMatrix(): void;
  }

  export class Spherical {
    constructor(radius?: number, phi?: number, theta?: number);
    radius: number; phi: number; theta: number;
  }

  export class Texture {}

  export class TextureLoader {
    load(
      url: string,
      onLoad?: (texture: Texture) => void,
      onProgress?: ((event: unknown) => void) | undefined,
      onError?: ((event: unknown) => void) | undefined
    ): Texture;
  }

  export class Material {
    dispose(): void;
  }

  export class MeshPhongMaterial extends Material {
    map?: Texture;
    needsUpdate: boolean;
    constructor(params?: { map?: Texture; specular?: number; shininess?: number; color?: number });
  }

  export class Geometry {
    dispose(): void;
  }

  export class SphereGeometry extends Geometry {
    constructor(radius: number, widthSegments?: number, heightSegments?: number);
  }

  export class Mesh extends Object3D {
    constructor(geometry: Geometry, material: Material);
  }

  export class Group extends Object3D {
    children: Object3D[];
    add(...objs: Object3D[]): void;
    remove(obj: Object3D): void;
  }

  export class AmbientLight extends Object3D {
    constructor(color?: number, intensity?: number);
  }

  export class DirectionalLight extends Object3D {
    constructor(color?: number, intensity?: number);
    position: Vector3;
  }

  export class WebGLRenderer {
    constructor(params?: { antialias?: boolean; alpha?: boolean });
    domElement: HTMLCanvasElement;
    setSize(width: number, height: number): void;
    setPixelRatio(ratio: number): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }
}

