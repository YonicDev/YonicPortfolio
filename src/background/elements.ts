import * as PIXI from "pixi.js";
import { vec2 } from "vmath";

export class BackgroundLayer {
    public pixi: PIXI.Application;
    public context: PIXI.Graphics;
    public elements: Record<string, BackgroundElement | BackgroundElement[]>;
    public mouse: vec2;
    
    constructor(public name: string, options: {
        backgroundColor?: number,
        transparent: boolean,
    }) {
        this.pixi = new PIXI.Application({
            backgroundColor: options.backgroundColor,
            transparent: options.transparent,
            resizeTo: window,
            antialias: true
        });
        this.context = new PIXI.Graphics();
        this.mouse = vec2.create();
        this.elements = {};

        this.pixi.stage.addChild(this.context);
        this.pixi.ticker.add(this.update)

        this.pixi.view.id = this.name;
        this.pixi.view.classList.add('backgroundLayer');
        document.body.append(this.pixi.view);
    }

    protected update = (frameDuration: number) => {
        for(let name in this.elements) {
            let element = this.elements[name];
            if("length" in element) {
                for(let subElement of element) {
                    if(subElement.active) subElement.update(frameDuration);
                }
            } else {
                if(element.active) element.update(frameDuration);
            }
        }
        this.draw();
    }

    protected draw = () => {
        this.context.clear();
        for(let name in this.elements) {
            let element = this.elements[name];
            if("length" in element) {
                for(let subElement of element) {
                    if(subElement.drawable) subElement.draw();
                }
            } else {
                if(element.drawable) element.draw();
            }
        }
    }
}

export interface BackgroundElement {
    layer: BackgroundLayer,
    active: boolean,
    drawable: boolean,
    alpha: number,
    update(frameDuration: number): void;
    draw(): void;
}