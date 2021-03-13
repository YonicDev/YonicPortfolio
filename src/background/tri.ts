import * as PIXI from "pixi.js";

import { BackgroundElement, BackgroundLayer } from "./elements";

export class TriMesh implements BackgroundElement {
    public drawable: boolean
    public active: boolean
    public alpha: number;

    public tris: Tri[];
    constructor(public layer: BackgroundLayer, length=50) {
        this.drawable = this.active = false;
        this.tris = [];
        this.alpha = 0;

        const margin = -length*0.5;
        const triHeight = length*Math.sin(Math.PI/6);
        const triOffset = length*Math.sin(Math.PI/3);
        const color = 0x00ffff;
        let tri = 0;
        let row = 0;
        let phaseScale = 150;
        
        for(let y=triHeight*2;y<this.layer.pixi.view.height;y+=triOffset) {
            for(let x=margin+(row%2)*triHeight;x<this.layer.pixi.view.width-margin;) {
                if(tri%2==0) {
                    this.tris.push(new Tri(this.layer,
                        {x,y},
                        length,
                        false,
                        Math.random()*Math.PI*phaseScale,
                        color)
                    )
                    x+=length;
                } else {
                    this.tris.push(new Tri(this.layer,
                        {x:x-triHeight,y},
                        length,
                        true,
                        Math.random()*Math.PI*phaseScale,
                        color)
                    )
                }
                tri++;
            }
            row++;
            tri = row;
        }
    }
    update(frameDuration: number) {
        for(let tri of this.tris) {
            tri.active = this.active;
            tri.drawable = this.drawable;
            if(tri.active) {
                tri.alpha = this.alpha;
                tri.update(frameDuration);
            }
        }
    }
    draw() {
        for(let tri of this.tris) {
            if(tri.drawable) {
                tri.draw();
            }
        }
    };
}

class Tri implements BackgroundElement {
    public drawable = true;
    public active = true;

    public points: {x: number, y: number}[];

    public opacity = 0;
    public alpha = 1;
    public time = 0;

    constructor(
        public layer: BackgroundLayer,
        public baseCorner:{x: number, y: number},
        public length: number,
        public flipped: boolean,
        public phase: number,
        public color: number
    ) {
        this.points = [];
        let height = length*Math.sin(Math.PI/3);
        if(!flipped) {
            this.points[0] = baseCorner;
            this.points[1] = {x:baseCorner.x+length,y:baseCorner.y}
            this.points[2] = {x:baseCorner.x+length*0.5,y:baseCorner.y-height}
        } else {
            this.points[0] = {x:baseCorner.x,y:baseCorner.y-height};
            this.points[1] = {x:baseCorner.x+length,y:baseCorner.y-height}
            this.points[2] = {x:baseCorner.x+length*0.5,y:baseCorner.y}
        }
    }

    public getCenter():{x:number,y:number} {
        let center = {x:0,y:0};
        for(const point of this.points) {
            center.x += point.x;
            center.y += point.y;
        }
        return {
            x:center.x/this.points.length,
            y:center.y/this.points.length
        }
    }

    public update(frameDuration: number): void {
        let center = this.getCenter();
        let mouseDistance = Math.sqrt( Math.pow((this.layer.mouse.x - center.x),2) + Math.pow((this.layer.mouse.y - center.y),2));
        let mouseBonus = this.length/(mouseDistance/3+this.length*32);
        let mouseBonus2 = this.length/(mouseDistance*2+this.length*4);
        let mouseBonus3 = this.length/(mouseDistance*4+this.length*2.5);
        this.time+=frameDuration/24;
        this.opacity = ((Math.cos(this.time+this.phase)+1)/12+mouseBonus+mouseBonus2+mouseBonus3)*this.alpha;
    }

    public draw(): void {
        this.layer.context.blendMode = PIXI.BLEND_MODES.SCREEN;
        this.layer.context.beginFill(this.color, this.opacity);
        this.layer.context.moveTo(this.points[0].x,this.points[0].y);
        this.layer.context.lineTo(this.points[1].x,this.points[1].y);
        this.layer.context.lineTo(this.points[2].x,this.points[2].y);
        this.layer.context.closePath();
        this.layer.context.endFill();
        this.layer.context.blendMode = PIXI.BLEND_MODES.NORMAL;
    }
}