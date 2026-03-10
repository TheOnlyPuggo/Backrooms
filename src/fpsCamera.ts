import Alea from 'alea';
import * as THREE from 'three';
import { GenerationParams } from './mapGenerator';
import { createNoise2D } from 'simplex-noise';

export const MovementParams: {
    firstPersonControls: {
        moveSpeed: number,
        collision: boolean,
    },
} = {
    firstPersonControls: {
        moveSpeed: 10.0,
        collision: true
    }
}

const clamp = (num: number, min: number, max: number): number => Math.min(Math.max(num, min), max);

const KEYS = {
    w: 87,
    a: 65,
    s: 83,
    d: 68,
};

let lastTime: number = 0.0;

class InputController {
    pointerLocked: boolean;

    current: {
        leftButton: boolean,
        rightButton: boolean,
        mouseX: number,
        mouseY: number,
        mouseXDelta: number,
        mouseYDelta: number
    };

    previous: {
        leftButton: boolean,
        rightButton: boolean,
        mouseX: number,
        mouseY: number,
        mouseXDelta: number,
        mouseYDelta: number
    };

    keys: Record<number, boolean> = {};
    previousKeys: Record<number, boolean> = {};

    constructor(canvas: HTMLCanvasElement) {
        this.pointerLocked = false;

        canvas.addEventListener('click', () => canvas.requestPointerLock());
        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = (document.pointerLockElement === canvas);
        }, false);

        this.current = {
            leftButton: false,
            rightButton: false,
            mouseX: 0.0,
            mouseY: 0.0,
            mouseXDelta: 0.0,
            mouseYDelta: 0.0
        }
        this.previous = {...this.current};

        document.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
        document.addEventListener('mouseup', (e) => this.onMouseUp(e), false);
        document.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
        document.addEventListener('keydown', (e) => this.onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this.onKeyUp(e), false);
    }

    onMouseDown(e: MouseEvent) {
        switch(e.button) {
            case 0: {
                this.current.leftButton = true;
                break;
            }
            case 2: {
                this.current.rightButton = true;
                break;
            }
        }
    }

    onMouseUp(e: MouseEvent) {
        switch(e.button) {
            case 0: {
                this.current.leftButton = false;
                break;
            }
            case 2: {
                this.current.rightButton = false;
                break;
            }
        }
    }

    onMouseMove(e: MouseEvent) {
        if (this.pointerLocked) {
            this.current.mouseXDelta = e.movementX || 0;
            this.current.mouseYDelta = e.movementY || 0;
        }
    }

    onKeyDown(e: KeyboardEvent) {
        this.keys[e.keyCode] = true;
    }

    onKeyUp(e: KeyboardEvent) {
        this.keys[e.keyCode] = false;
    }

    key(code: number) {
        return this.keys[code];
    }

    update() {
        this.previous = {...this.current};

        this.current.mouseXDelta = 0;
        this.current.mouseYDelta = 0;
    }
}

export class FirstPersonCamera {
    camera: THREE.Camera;
    input: InputController;
    rotation: THREE.Quaternion;
    translation: THREE.Vector3;
    phi: number;
    theta: number;

    gridPosition: {
        x: number,
        z: number
    };

    maxMovement: {
        negativeX: {active: boolean, value: number},
        positiveX: {active: boolean, value: number},
        negativeZ: {active: boolean, value: number},
        positiveZ: {active: boolean, value: number},
        topLeft: {active: boolean, value: number[]},
        topRight: {active: boolean, value: number[]},
        bottomLeft: {active: boolean, value: number[]},
        bottomRight: {active: boolean, value: number[]}
    }

    constructor(camera: THREE.Camera, canvas: HTMLCanvasElement) {
        this.camera = camera;
        this.input = new InputController(canvas);
        this.rotation = new THREE.Quaternion();
        this.translation = new THREE.Vector3();
        this.phi = 0.0;
        this.theta = 0.0;

        this.gridPosition = {
            x: Math.floor(camera.position.x + 0.5),
            z: Math.floor(camera.position.z + 0.5)
        };

        this.maxMovement = {
            negativeX: {active: false, value: 0.0},
            positiveX: {active: false, value: 0.0},
            negativeZ: {active: false, value: 0.0},
            positiveZ: {active: false, value: 0.0},
            topLeft: {active: false, value: [0.0, 0.0]},
            topRight: {active: false, value: [0.0, 0.0]},
            bottomLeft: {active: false, value: [0.0, 0.0]},
            bottomRight: {active: false, value: [0.0, 0.0]}
        }

        this.translation.copy(camera.position);
        this.rotation.copy(camera.quaternion);

        this.collisionCheck();
    }

    update(time: number): void {
        this.updateRotation(time);
        this.updateCamera(time);
        this.updateTranslation(time);
        this.input.update();
    }

    updateCamera(_: number): void {
        this.camera.quaternion.copy(this.rotation)
        this.camera.position.copy(this.translation);
    }

    updateTranslation(time: number = 0.0): void {
        if (Math.floor(this.camera.position.x + 0.5) != this.gridPosition.x || Math.floor(this.camera.position.z + 0.5) != this.gridPosition.z) {
            this.gridPosition.x = Math.floor(this.camera.position.x + 0.5);
            this.gridPosition.z = Math.floor(this.camera.position.z + 0.5);
            this.collisionCheck();
        }

        let deltaTime = time - lastTime;
        lastTime = time;

        const forwardVelocity = (this.input.key(KEYS.w) ? 1 : 0) + (this.input.key(KEYS.s) ? -1 : 0);
        const strafeVelocity = (this.input.key(KEYS.a) ? 1 : 0) + (this.input.key(KEYS.d) ? -1 : 0);

        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi);

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(qx);
        forward.multiplyScalar(forwardVelocity * deltaTime * 0.0001 * MovementParams.firstPersonControls.moveSpeed);

        const left = new THREE.Vector3(-1, 0, 0);
        left.applyQuaternion(qx);
        left.multiplyScalar(strafeVelocity * deltaTime * 0.0001 * MovementParams.firstPersonControls.moveSpeed);

        if (!MovementParams.firstPersonControls.collision) {
            this.translation.add(forward);
            this.translation.add(left);
            return;
        }

        let testTranslation = this.translation.clone();
        testTranslation.add(forward);
        testTranslation.add(left);

        let buffer = 0.1;

        // console.log(this.maxMovement.negativeX.active + ", " + this.camera_.position.x + ", " + this.maxMovement.negativeX.value);
        if (this.maxMovement.negativeX.active && testTranslation.x < this.maxMovement.negativeX.value + buffer) {
            testTranslation.set(this.maxMovement.negativeX.value + buffer, testTranslation.y, testTranslation.z);
        }
        if (this.maxMovement.positiveX.active && testTranslation.x > this.maxMovement.positiveX.value - buffer) {
            testTranslation.set(this.maxMovement.positiveX.value - buffer, testTranslation.y, testTranslation.z);
        }
        if (this.maxMovement.negativeZ.active && testTranslation.z < this.maxMovement.negativeZ.value + buffer) {
            testTranslation.set(testTranslation.x, testTranslation.y, this.maxMovement.negativeZ.value + buffer);
        }
        if (this.maxMovement.positiveZ.active && testTranslation.z > this.maxMovement.positiveZ.value - buffer) {
            testTranslation.set(testTranslation.x, testTranslation.y, this.maxMovement.positiveZ.value - buffer);
        }

        let trigVal = Math.sqrt((buffer * buffer) / 2);

        if (this.maxMovement.topLeft.active && testTranslation.x < this.maxMovement.topLeft.value[0] + trigVal && testTranslation.z < this.maxMovement.topLeft.value[1] + trigVal) {
            if (Math.abs(this.maxMovement.topLeft.value[0] + trigVal - testTranslation.x) > Math.abs(this.maxMovement.topLeft.value[1] + trigVal - testTranslation.z)) {
                testTranslation.set(testTranslation.x, testTranslation.y, this.maxMovement.topLeft.value[1] + trigVal);
            } else {
                testTranslation.set(this.maxMovement.topLeft.value[0] + trigVal, testTranslation.y, testTranslation.z);
            }
        }
        if (this.maxMovement.topRight.active && testTranslation.x > this.maxMovement.topRight.value[0] - trigVal && testTranslation.z < this.maxMovement.topRight.value[1] + trigVal) {
            if (Math.abs(this.maxMovement.topRight.value[0] - trigVal + testTranslation.x) > Math.abs(this.maxMovement.topRight.value[1] + trigVal - testTranslation.z)) {
                testTranslation.set(testTranslation.x, testTranslation.y, this.maxMovement.topRight.value[1] + trigVal);
            } else {
                testTranslation.set(this.maxMovement.topRight.value[0] - trigVal, testTranslation.y, testTranslation.z);
            }
        }
        if (this.maxMovement.bottomLeft.active && testTranslation.x < this.maxMovement.bottomLeft.value[0] + trigVal && testTranslation.z > this.maxMovement.bottomLeft.value[1] - trigVal) {
            if (Math.abs(this.maxMovement.bottomLeft.value[0] + trigVal - testTranslation.x) > Math.abs(this.maxMovement.bottomLeft.value[1] - trigVal + testTranslation.z)) {
                testTranslation.set(testTranslation.x, testTranslation.y, this.maxMovement.bottomLeft.value[1] - trigVal);
            } else {
                testTranslation.set(this.maxMovement.bottomLeft.value[0] + trigVal, testTranslation.y, testTranslation.z);
            }
        }
        if (this.maxMovement.bottomRight.active && testTranslation.x > this.maxMovement.bottomRight.value[0] - trigVal && testTranslation.z > this.maxMovement.bottomRight.value[1] - trigVal) {
            if (Math.abs(this.maxMovement.bottomRight.value[0] - trigVal + testTranslation.x) > Math.abs(this.maxMovement.bottomRight.value[1] - trigVal + testTranslation.z)) {
                testTranslation.set(testTranslation.x, testTranslation.y, this.maxMovement.bottomRight.value[1] - trigVal);
            } else {
                testTranslation.set(this.maxMovement.bottomRight.value[0] - trigVal, testTranslation.y, testTranslation.z);
            }
        }

        this.translation = testTranslation;
    }

    collisionCheck(): void {
        this.maxMovement.positiveX.active = false;
        this.maxMovement.negativeX.active = false;
        this.maxMovement.positiveZ.active = false;
        this.maxMovement.negativeZ.active = false;
        this.maxMovement.topLeft.active = false;
        this.maxMovement.topRight.active = false;
        this.maxMovement.bottomLeft.active = false;
        this.maxMovement.bottomRight.active = false;

        let gridCheck: number[][] = [[0, 1], [1, 0], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
        const prng = Alea(GenerationParams.seed)
        const noise2D = createNoise2D(prng);

        let check: number = 0;
        gridCheck.forEach((gridPos, i) => {
            let posToCheck = [this.gridPosition.x + gridPos[0], this.gridPosition.z + gridPos[1]];
            
            if (noise2D(posToCheck[0], posToCheck[1]) >= GenerationParams.wallNoiseValue) {
                ++check;
                switch(i) {
                    case 0:
                        this.maxMovement.positiveZ.active = true;
                        this.maxMovement.positiveZ.value = posToCheck[1] - 0.5;
                        break;
                    case 1:
                        this.maxMovement.positiveX.active = true;
                        this.maxMovement.positiveX.value = posToCheck[0] - 0.5;
                        break;
                    case 2:
                        this.maxMovement.negativeZ.active = true;
                        this.maxMovement.negativeZ.value = posToCheck[1] + 0.5;
                        break;
                    case 3:
                        this.maxMovement.negativeX.active = true;
                        this.maxMovement.negativeX.value = posToCheck[0] + 0.5;
                        break;
                    case 4:
                        this.maxMovement.topLeft.active = true;
                        this.maxMovement.topLeft.value = [posToCheck[0] + 0.5, posToCheck[1] + 0.5];
                        break;
                    case 5:
                        this.maxMovement.topRight.active = true;
                        this.maxMovement.topRight.value = [posToCheck[0] - 0.5, posToCheck[1] + 0.5];
                        break;
                    case 6:
                        this.maxMovement.bottomLeft.active = true;
                        this.maxMovement.bottomLeft.value = [posToCheck[0] + 0.5, posToCheck[1] - 0.5];
                        break;
                    case 7:
                        this.maxMovement.bottomRight.active = true;
                        this.maxMovement.bottomRight.value = [posToCheck[0] - 0.5, posToCheck[1] - 0.5];
                        break;
                }
            }
        });
    }

    updateRotation(time: number): void {
        const xh = this.input.current.mouseXDelta / window.innerWidth;
        const yh = this.input.current.mouseYDelta / window.innerHeight;

        this.phi += -xh * 5;
        this.theta = clamp(this.theta + -yh * 5, -Math.PI / 3, Math.PI / 3);

        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi);
        const qz = new THREE.Quaternion();
        qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta);

        const q = new THREE.Quaternion();
        q.multiply(qx);
        q.multiply(qz);

        this.rotation.copy(q);
    }
}