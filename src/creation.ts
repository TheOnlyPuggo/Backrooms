import * as THREE from 'three';

export class Cuboid {
    width: number;
    height: number;
    depth: number;
    color: THREE.Color;
    isWireFrame: boolean;
    geometry: THREE.BoxGeometry;
    material: THREE.MeshBasicMaterial;

    constructor(width: number, height: number, depth: number, color: THREE.Color, isWireFrame: boolean) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.color = color;
        this.isWireFrame = isWireFrame;

        this.geometry = new THREE.BoxGeometry(width, height, depth);
        this.material = new THREE.MeshBasicMaterial({color: color});
    }

    Mesh(): THREE.Mesh {
        return new THREE.Mesh(this.geometry, this.material);
    }
}

export class CuboidPBR {
    width: number;
    height: number;
    depth: number;
    colorPath: string;
    normalMapPath: string;
    metalnessMapPath: string;
    geometry: THREE.BoxGeometry;
    material: THREE.MeshStandardMaterial;

    constructor(
        width: number, 
        height: number, 
        depth: number, 
        colorPath: string, 
        normalMapPath: string, 
        metalnessMapPath: string
    ) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.colorPath = colorPath;
        this.normalMapPath = normalMapPath;
        this.metalnessMapPath = metalnessMapPath;

        const loader: THREE.TextureLoader = new THREE.TextureLoader();
        this.geometry = new THREE.BoxGeometry(width, height, depth);
        this.material = new THREE.MeshStandardMaterial();
        this.material.map = loader.load(import.meta.env.BASE_URL + colorPath);
        this.material.normalMap = loader.load(import.meta.env.BASE_URL + normalMapPath);
        this.material.metalnessMap = loader.load(import.meta.env.BASE_URL + metalnessMapPath);
    }

    Mesh(): THREE.Mesh {
        let newMesh: THREE.Mesh = new THREE.Mesh(this.geometry, this.material);
        newMesh.castShadow = true;
        newMesh.receiveShadow = true;
        return newMesh;
    }
}