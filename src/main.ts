import * as THREE from 'three';
import { CreateMap, GenerationParams, UpdateDynamicMap, UpdateMap } from './mapGenerator';
import { FirstPersonCamera } from './fpsCamera';
import { FlyControls } from 'three/examples/jsm/Addons.js';
import { CreateGUI } from './propUI';

const Game: {
    scene : THREE.Scene | null,
    camera : THREE.Camera | null,
    renderer : THREE.WebGLRenderer | null,
} = {
    scene: null,
    camera: null,
    renderer: null,
};

export const LightingProps: {
    ambientLight : THREE.AmbientLight | null
    ambientLightIntensity : number,
} = {
    ambientLight: null,
    ambientLightIntensity: 0.6,
};

const FogProps: {
    enabled: boolean
} = {
    enabled: true,
}

const GameCamera: {
    currentCameraGridX: number,
    currentCameraGridZ: number,
    enableFlyControls: boolean,
    flySpeed: number,
    cameraControls: FirstPersonCamera | FlyControls | null,
} = {
    currentCameraGridX: 0.0,
    currentCameraGridZ: 0.0,
    enableFlyControls: false,
    flySpeed: 5.0,
    cameraControls: null,
};

init();
animate(0.0);

function init(): void {
    Game.scene = new THREE.Scene();
    Game.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);

    Game.renderer = new THREE.WebGLRenderer();
    Game.renderer.setSize(window.innerWidth, window.innerHeight);
    Game.renderer.shadowMap.enabled = true;
    document.body.appendChild(Game.renderer.domElement);

    LightingProps.ambientLight = new THREE.AmbientLight(0x404040, LightingProps.ambientLightIntensity);
    Game.scene.add(LightingProps.ambientLight);

    Game.scene.background = new THREE.Color(0x1c1b17);

    GameCamera.currentCameraGridX = Math.floor(Game.camera.position.x);
    GameCamera.currentCameraGridZ = Math.floor(Game.camera.position.z);

    window.addEventListener("resize", onWindowResize, false);

    CreateMap(Game.scene, Game.camera.position);

    CreateGUI(Game.scene, Game.camera.position, LightingProps, FogProps, GameCamera, updateCameraCollision);
}

function animate(time: number): void {
    if (!Game.scene || !Game.camera || !Game.renderer) return;

    Game.renderer.render(Game.scene, Game.camera);

    if (GameCamera.enableFlyControls) {
        if (!(GameCamera.cameraControls instanceof FlyControls)) {
            GameCamera.cameraControls = new FlyControls(Game.camera, Game.renderer.domElement);
            GameCamera.cameraControls.movementSpeed = 5;
            GameCamera.cameraControls.rollSpeed = Math.PI / 6;
            GameCamera.cameraControls.autoForward = false;
            GameCamera.cameraControls.dragToLook = true;
        }

        GameCamera.cameraControls.update(0.001 * GameCamera.flySpeed);
    } else {
        if (!(GameCamera.cameraControls instanceof FirstPersonCamera)) {
            GameCamera.cameraControls = new FirstPersonCamera(Game.camera, Game.renderer.domElement);
            GameCamera.cameraControls.translation.x = Game.camera.position.x;
            GameCamera.cameraControls.translation.y = 0.0;
            GameCamera.cameraControls.translation.z = Game.camera.position.z;
        }

        GameCamera.cameraControls.update(time);
    }

    if (Math.floor(Game.camera.position.x) != GameCamera.currentCameraGridX || Math.floor(Game.camera.position.z) != GameCamera.currentCameraGridZ) {
        GameCamera.currentCameraGridX = Math.floor(Game.camera.position.x);
        GameCamera.currentCameraGridZ = Math.floor(Game.camera.position.z);

        UpdateMap(Game.scene, Game.camera.position);
    }

    if (FogProps.enabled && Game.scene.fog == null) {
        Game.scene.fog = new THREE.Fog(0x1c1b17, GenerationParams.radius / 4.0, GenerationParams.radius * 0.8);
    } else if (!FogProps.enabled && Game.scene.fog != null) {
        Game.scene.fog = null;
    }

    UpdateDynamicMap(Game.camera.position);

    requestAnimationFrame(animate);
}

export function updateCameraCollision(): void {
    if (!(GameCamera.cameraControls instanceof FirstPersonCamera)) return;

    GameCamera.cameraControls.collisionCheck();
}

function onWindowResize() {
    Game.renderer?.setSize(window.innerWidth, window.innerHeight);
    Game.camera?.updateMatrix();
}