import * as THREE from 'three';
import { GUI } from 'dat.gui';
import { GenerationParams, RegenerateMap } from './mapGenerator';
import { MovementParams } from './fpsCamera';

export const GenerationParamsUI: {
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
    enableMovingScene: boolean,

    movingFallInStrength: number,
} = {
    ...GenerationParams,
};

type GameCameraLike = {
    enableFlyControls: boolean;
    flySpeed: number;
}

type FogPropsLike = {
    enabled: boolean,
}

type LightingPropsLike = {
    ambientLight: THREE.AmbientLight | null;
    ambientLightIntensity: number;
}

export function CreateGUI
(
    scene: THREE.Scene, 
    cameraPosition: THREE.Vector3,
    lightingProps: LightingPropsLike,
    fogProps: FogPropsLike,
    gameCamera: GameCameraLike,
    updateCameraCollision: () => void
) {
    let regenerate = function(): void {
        updateCameraCollision();
        RegenerateMap(scene, cameraPosition);
    };

    const gui: GUI = new GUI();


    const generationFolder: GUI = gui.addFolder("Generation");
    generationFolder.add(GenerationParamsUI, "seed").onChange((value: number) => {
        GenerationParams.seed = value;
        regenerate();
    });
    generationFolder.add(GenerationParamsUI, "radius").min(0).max(128).step(1).onChange((value: number) => {
        GenerationParams.radius = value;
        regenerate();
    });
    generationFolder.add(GenerationParamsUI, "wallNoiseValue").min(0.0).max(1.0).onChange((value: number) => {
        GenerationParams.wallNoiseValue = value;
        regenerate();
    });
    generationFolder.add(GenerationParamsUI, "maxLightsInScene").onChange((value: number) => {
        GenerationParams.maxLightsInScene = value;
        regenerate();
    });
    generationFolder.add(GenerationParamsUI.activeGeneration, "wallGeneration").onChange(() => {
        regenerate();
    });
    generationFolder.add(GenerationParamsUI.activeGeneration, "floorGeneration").onChange(() => {
        regenerate();
    });
    generationFolder.add(GenerationParamsUI.activeGeneration, "ceilingGeneration").onChange(() => {
        regenerate();
    });
    generationFolder.add(GenerationParamsUI.activeGeneration, "lightGeneration").onChange(() => {
        regenerate();
    });
    generationFolder.add(GenerationParamsUI, "enableMovingScene").onChange((value: boolean) => {
        GenerationParams.enableMovingScene = value;
        regenerate();
    });
    generationFolder.add(GenerationParamsUI, "movingFallInStrength", 0.0, 1.0).onChange((value: number) => {
        GenerationParams.movingFallInStrength = value;
    });


    const movementFolder: GUI = gui.addFolder("Movement");

    const fpsFolder: GUI = movementFolder.addFolder("FirstPersonControls");
    fpsFolder.add(MovementParams.firstPersonControls, "moveSpeed").min(0.0);
    fpsFolder.add(MovementParams.firstPersonControls, "collision");

    const flyMovementFolder: GUI = movementFolder.addFolder("FlyControls");
    flyMovementFolder.add(gameCamera, "enableFlyControls");
    flyMovementFolder.add(gameCamera, "flySpeed").min(0.0);


    const environmentFolder: GUI = gui.addFolder("Environment");

    const lightingFolder: GUI = environmentFolder.addFolder("Lighting");
    lightingFolder.add(lightingProps, "ambientLightIntensity").min(0.0).onChange((value: number) => {
        if (lightingProps.ambientLight) {
            lightingProps.ambientLight.intensity = value;
        }
    });

    const fogFolder: GUI = environmentFolder.addFolder("Fog");
    fogFolder.add(fogProps, "enabled");
}