import * as Color from "color";
import { BackgroundElement, BackgroundLayer } from "./elements";

export class Wave {
    constructor(
        public amplitude: number,
        public length: number,
        public frequency: number,
        public phase: number
    ) {}

    getY(x: number,time:number): number {
        return this.amplitude * Math.sin(x*this.length + this.frequency*time + this.phase);
    }
}

export class WaveOverlap implements BackgroundElement {
    public drawable = true;
    public active = true;

    public time: number;
    public waves: Wave[];

    public alpha = 1;
    constructor(public layer: BackgroundLayer, public color: Color, public transparency: number, public resolution: number, ...waves: Wave[]) {
        if(waves.length!=2)
            throw new RangeError();
        this.time = 0;
        this.waves = waves;
    }
    update(frameDuration: number): void {
        this.time+= frameDuration;
    }
    draw(): void {
        const canvas = this.layer.pixi.view;
        this.layer.context.beginFill(this.color.rgbNumber(),this.transparency * this.alpha);
        this.layer.context.moveTo(0, canvas.height*0.5);
        for(let x=0;x<canvas.width+this.resolution;x+=this.resolution) {
            this.layer.context.lineTo(x,this.waves[0].getY(x,this.time)+canvas.height/2-this.waves[1].amplitude*2);
        }
        for(let x=canvas.width;x>-this.resolution;x-=this.resolution) {
            this.layer.context.lineTo(x,this.waves[1].getY(x,this.time)+canvas.height/2+this.waves[0].amplitude);
        }
        this.layer.context.endFill();
    }
}