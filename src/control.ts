import { Myou } from "myou-engine";

import Planet, { PlanetCardinal } from "./planet";
import Camera from "./camera";

interface ButtonAxes {
    up: Myou.Button;
    right: Myou.Button;
    left: Myou.Button;
    down: Myou.Button;
}

export class Control {
    public wasd: ButtonAxes;
    public arrows: ButtonAxes;
    constructor(public myou: Myou,public camera: Camera) {
        const Button = this.myou.Button;
        this.wasd = {
            up: new Button('Key:KeyW'),
            right: new Button('Key:KeyD'),
            left: new Button('Key:KeyA'),
            down: new Button('Key:KeyS')
        };
        this.arrows = {
            up: new Button('Key:ArrowUp'),
            right: new Button('Key:ArrowRight'),
            left: new Button('Key:ArrowLeft'),
            down: new Button('Key:ArrowDown')
        };
        this.wasd.up.on_press = this.arrows.up.on_press = this._emitDirectionRequest("North");
        this.wasd.right.on_press = this.arrows.right.on_press = this._emitDirectionRequest("East");
        this.wasd.left.on_press = this.arrows.left.on_press = this._emitDirectionRequest("West");
        this.wasd.down.on_press = this.arrows.down.on_press = this._emitDirectionRequest("South");
        this.enable();
    }
    public enable(): void {
        document.addEventListener("KeyboardOrbit",this.camera.orbitTo);
    }
    public disable(): void {
        document.removeEventListener("KeyboardOrbit",this.camera.orbitTo);
    }
    private _emitDirectionRequest(direction: PlanetCardinal) {
        return () => { document.dispatchEvent(new CustomEvent("KeyboardOrbit",{ detail: direction })); }
    }
}

export interface Mouse {
    x: number,
    y: number
}