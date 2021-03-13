import { vec2 } from "vmath";
import * as Color from "color";

import { BackgroundElement, BackgroundLayer } from "./elements";

export class Hex implements BackgroundElement {
    public active = true;
    public drawable = true;

    public radius: number;
    public color: Color;
    public alpha = 1;
    constructor(
        public layer: BackgroundLayer,
        public position: vec2,
        public baseRadius: number,
        public startColor: Color,
        public endColor: Color
    ) {
        this.radius = baseRadius;
        this.color = startColor;
    }

    update(): void {
        const distance: number = Math.abs(this.layer.mouse.x-this.position.x);
        const awayness: number = distance/this.baseRadius*(1/5);

        this.color = this.endColor.mix(this.startColor,Math.min(Math.max(awayness,0),1));
        this.radius = this.baseRadius - distance/(this.layer.pixi.view.width*0.01);
        if(this.radius>=this.baseRadius) {
            this.radius = this.baseRadius;
        } else if(this.radius<=0) {
            this.radius = 0;
        }
        this.drawable = this.radius>0;
    }
    draw(): void {
        const angle = 2*Math.PI/6;
        const rotation = Math.PI/6;
        this.layer.context.beginFill(this.color.rgbNumber());
        this.layer.context.moveTo(this.position.x,this.position.y-this.radius);
        for(let i = 0;i<6;i++) {
            this.layer.context.lineTo(this.position.x+this.radius*Math.cos(i*angle-rotation),this.position.y+this.radius*Math.sin(i*angle-rotation));
        }
        this.layer.context.closePath();
    }

    static createHexWall(layer: BackgroundLayer, side: "left"|"right", radius = 15, padding = 6.5): Hex[] {
        let x:number = 0;
        let hexes: Hex[] = [];
    
        let beginColor = Color.rgb(24,27,45);
        let endColor = Color.rgb(17,141,65);
    
        for(let row=1;row<6;row++) {
            x = side=="left"?radius*row*Math.sin(Math.PI/6)+padding:layer.pixi.view.width-radius*row*Math.sin(Math.PI/6)-padding;
            for(let y=padding+radius; y<=layer.pixi.view.height-radius-padding - layer.pixi.view.height * 0.125; y+=radius+padding) {
                let vec = vec2.new(x,y+(radius+padding)*Math.cos(Math.PI/3)*(1-row%2))
                hexes.push(new Hex(layer,vec,radius-padding*1.25,beginColor,endColor));
            }
        }
        return hexes;
    }
}