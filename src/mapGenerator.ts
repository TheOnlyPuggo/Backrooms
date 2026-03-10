import * as THREE from 'three';
import { CuboidPBR } from './creation';
import Alea from 'alea';
import { createNoise2D } from 'simplex-noise';

export const GenerationParams: {
    radius: number,
    seed: number,
    wallNoiseValue: number,
    
    activeGeneration: {
        wallGeneration: boolean,
        floorGeneration: boolean,
        ceilingGeneration: boolean,
        lightGeneration: boolean,
    },

    maxLightsInScene: number
} = {
    radius: 8.0,
    seed: 420,
    wallNoiseValue: 0.4,

    activeGeneration: {
        wallGeneration: true,
        floorGeneration: true,
        ceilingGeneration: true,
        lightGeneration: true
    },

    maxLightsInScene: 8
};

const wallCubesMap: Map<string, THREE.Mesh> = new Map();
const floorCubesMap: Map<string, THREE.Mesh> = new Map();
const ceilingCubesMap: Map<string, THREE.Mesh> = new Map();

const lightsMap: Map<string, THREE.Light> = new Map();
let usedLightsNum: number = 0;
let notActiveLights: THREE.Light[] = [];

const wallCube: CuboidPBR = new CuboidPBR(1, 1, 1, 
    'wallpaper_color.png',
    'wallpaper_normal.png',
    'wallpaper_rough.png'
);

const floorCube: CuboidPBR = new CuboidPBR(1, 1, 1, 
    'carpet_color.png',
    'carpet_normal.png',
    'carpet_rough.png'
);

const ceilingCube: CuboidPBR = new CuboidPBR(1, 1, 1, 
    'ceiling_tiles_2_color.png',
    'ceiling_tiles_2_normal.png',
    'ceiling_tiles_2_rough.png'
);

function clearGeometry(map: Map<string, THREE.Mesh>, scene: THREE.Scene): void {
    for (const mesh of map.values()) {
        scene.remove(mesh);
        mesh.geometry.dispose();
    }
    map.clear();
}

export function RegenerateMap(scene: THREE.Scene, cameraPosition: THREE.Vector3): void {
    clearGeometry(wallCubesMap, scene);
    clearGeometry(floorCubesMap, scene);
    clearGeometry(ceilingCubesMap, scene);

    for (const light of lightsMap.values()) {
        scene.remove(light);
    }
    lightsMap.clear();
    usedLightsNum = 0;

    UpdateMap(scene, cameraPosition);
}

export function CreateMap(scene: THREE.Scene, cameraPosition: THREE.Vector3): void {
    const prng = Alea(GenerationParams.seed);
    const noise2D = createNoise2D(prng);

    while (usedLightsNum + notActiveLights.length < GenerationParams.maxLightsInScene) {
        let newLight: THREE.PointLight = new THREE.PointLight(0xffffff, 0.0, 100.0, 2.0);
        newLight.castShadow = true;
        notActiveLights.push(newLight);
    }

    for (let x = Math.floor(cameraPosition.x) - GenerationParams.radius; x < Math.floor(cameraPosition.x) + GenerationParams.radius; ++x) {
        for (let z = Math.floor(cameraPosition.z) - GenerationParams.radius; z < Math.floor(cameraPosition.z) + GenerationParams.radius; ++z) {
            let key: string = `${x},${z}`;

            if (GenerationParams.activeGeneration.wallGeneration && noise2D(x, z) >= GenerationParams.wallNoiseValue && !wallCubesMap.has(key)) {
                let newWallCubeMesh: THREE.Mesh = wallCube.Mesh();
                newWallCubeMesh.position.set(x, 0, z);
                wallCubesMap.set(key, newWallCubeMesh);
                scene.add(newWallCubeMesh);
            }

            if (GenerationParams.activeGeneration.floorGeneration && noise2D(x, z) < GenerationParams.wallNoiseValue && !floorCubesMap.has(key)) {
                var newFloorCubeMesh: THREE.Mesh = floorCube.Mesh();
                newFloorCubeMesh.position.set(x, -1, z);
                floorCubesMap.set(key, newFloorCubeMesh);
                scene.add(newFloorCubeMesh);
            }

            if (GenerationParams.activeGeneration.ceilingGeneration && noise2D(x, z) < GenerationParams.wallNoiseValue && !ceilingCubesMap.has(key)) {
                var newCeilingCubeMesh: THREE.Mesh = ceilingCube.Mesh();
                newCeilingCubeMesh.position.set(x, 1, z);
                ceilingCubesMap.set(key, newCeilingCubeMesh);
                scene.add(newCeilingCubeMesh);
            }

            if (GenerationParams.activeGeneration.lightGeneration && noise2D(x, z) < -0.9) {
                let lightKey: string = `${x},${z}`;
                if (lightsMap.has(lightKey) || notActiveLights.length == 0) continue;

                let newLight: THREE.Light = notActiveLights[notActiveLights.length - 1];
                notActiveLights.pop();
                usedLightsNum += 1;

                newLight.intensity = 1.0;
                newLight.position.set(x, 0.4, z);

                lightsMap.set(lightKey, newLight);
                scene.add(newLight);
            }
        }
    }
}

export function UpdateMap(scene: THREE.Scene, cameraPosition: THREE.Vector3): void {
    for (const [key, value] of wallCubesMap) {
        let [kx, kz] = key.split(',').map(Number);
        if (Math.abs(kx - cameraPosition.x) > GenerationParams.radius || Math.abs(kz - cameraPosition.z) > GenerationParams.radius) {
            value.geometry.dispose();
            scene.remove(value);
            wallCubesMap.delete(key);
        }
    }

    for (const [key, value] of floorCubesMap) {
        let [kx, kz] = key.split(',').map(Number);
        if (Math.abs(kx - cameraPosition.x) > GenerationParams.radius || Math.abs(kz - cameraPosition.z) > GenerationParams.radius) {
            value.geometry.dispose();
            scene.remove(value);
            floorCubesMap.delete(key);
        }
    }

    for (const [key, value] of ceilingCubesMap) {
        let [kx, kz] = key.split(',').map(Number);
        if (Math.abs(kx - cameraPosition.x) > GenerationParams.radius || Math.abs(kz - cameraPosition.z) > GenerationParams.radius) {
            value.geometry.dispose();
            scene.remove(value);
            ceilingCubesMap.delete(key);
        }
    }

    for (const [key, value] of lightsMap) {
        let [kx, kz] = key.split(',').map(Number);
        if (Math.abs(kx - cameraPosition.x) > GenerationParams.radius || Math.abs(kz - cameraPosition.z) > GenerationParams.radius) {
            value.intensity = 0.0;
            notActiveLights.push(value);

            usedLightsNum -= 1;
            lightsMap.delete(key);
        }
    }

    CreateMap(scene, cameraPosition);
}