import { Mouse } from './control'
import gsap from "gsap"

export interface BackgroundElement {
    ctx: CanvasRenderingContext2D,
    drawable: boolean,
    active: boolean,
    update(): void;
    draw(): void;
}

export class Bounds {
    public topLeft:{x:number,y:number};
    public bottomRight:{x:number,y:number};

    constructor(
    public center:{x:number,y:number},
    public width:number,
    public height:number) {
        this.topLeft = {
            x: this.center.x - this.width  * 0.5,
            y: this.center.y - this.height * 0.5
        };
        this.bottomRight = {
            x: this.center.x + this.width  * 0.5,
            y: this.center.y + this.height * 0.5
        }
    }
    public update() {
        this.topLeft = {
            x: this.center.x - this.width  * 0.5,
            y: this.center.y - this.height * 0.5
        };
        this.bottomRight = {
            x: this.center.x + this.width  * 0.5,
            y: this.center.y + this.height * 0.5
        }
    }
}

export class HSLColor {
    constructor(
        public h: number,
        public s: number,
        public l: number) {}
    toCSS(): string {
        return `hsl(${this.h},${this.s}%,${this.l}%)`
    }
    static lerp(a:HSLColor,b:HSLColor,amount=0.5):HSLColor {
        amount = Math.min(Math.max(amount, 0), 1);
        const h: number = Math.round(a.h * amount + b.h * (1-amount));
        const s: number = Math.round(a.s * amount + b.s * (1-amount));
        const l: number = Math.round(a.l * amount + b.l * (1-amount));
        return new HSLColor(h,s,l)
    }
}

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
    ctx:CanvasRenderingContext2D;
    drawable = true;
    active = true;

    private time: number;
    private waves: Wave[];

    public alpha = 1;
    constructor(
        ctx:CanvasRenderingContext2D,
        wave1:Wave,
        wave2:Wave,
        public resolution: number,
        public color:string
    ) {
        this.ctx = ctx;
        this.time = 0;
        this.waves = [wave1,wave2];
    }
    update():void {
        this.time++;
    }
    draw():void {
        this.ctx.beginPath();
        const canvas = this.ctx.canvas;
        this.ctx.moveTo(0,canvas.height*0.5);
        for(let x=0;x<canvas.width+this.resolution;x+=this.resolution) {
            this.ctx.lineTo(x,this.waves[0].getY(x,this.time)+canvas.height/2-this.waves[1].amplitude*2);
        }
        for(let x=canvas.width;x>-this.resolution;x-=this.resolution) {
            this.ctx.lineTo(x,this.waves[1].getY(x,this.time)+canvas.height/2+this.waves[0].amplitude);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = this.color;
        this.ctx.globalAlpha = this.alpha;
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }
}

export class Hex implements BackgroundElement {

    ctx: CanvasRenderingContext2D;
    drawable = true;
    active = true;
    
    private radius: number;
    private color: HSLColor = new HSLColor(0,0,0);

    constructor(
        private pf: Background,
        private x: number,
        private y: number,
        private baseRadius: number,
        private startColor: HSLColor,
        private endColor: HSLColor) 
        { 
            this.ctx = pf.ctx;
            this.radius = this.baseRadius;
        }

    update(): void {
        const distance: number = Math.abs(this.pf.mouse.x-this.x);
        const awayness: number = distance/this.radius*(1/5);

        this.color = HSLColor.lerp(this.startColor,this.endColor,awayness);
        this.radius = this.baseRadius - distance/(this.ctx.canvas.width*0.01);
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
        this.ctx.beginPath();
        this.ctx.moveTo(this.x,this.y-this.radius);
        for(let i = 0;i<6;i++) {
            this.ctx.lineTo(this.x+this.radius*Math.cos(i*angle-rotation),this.y+this.radius*Math.sin(i*angle-rotation));
        }
        this.ctx.fillStyle = this.color.toCSS();
        this.ctx.fill();
    }
}

export class Tri implements BackgroundElement {
    public ctx: CanvasRenderingContext2D;
    public drawable = false;
    public active = false;

    public points:{x:number,y:number}[];

    private opacity = 0;
    public alpha = 0;
    private time = 0;

    constructor(
        private pf: Background,
        public baseCorner:{x:number,y:number},
        public length:number,
        public flipped:boolean,
        public phase:number,
        public color:string
        ) {
            this.ctx = this.pf.ctx;
            this.points = []
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

    update(): void {
        let center = this.getCenter();
        let mouseDistance = Math.sqrt( Math.pow((this.pf.mouse.x - center.x),2) + Math.pow((this.pf.mouse.y - center.y),2));
        let mouseBonus = this.length/(mouseDistance/3+this.length*32);
        let mouseBonus2 = this.length/(mouseDistance*2+this.length*4);
        let mouseBonus3 = this.length/(mouseDistance*4+this.length*2.5);
        this.time++;
        this.opacity = ((Math.cos(this.time/24+this.phase)+1)/12+mouseBonus+mouseBonus2+mouseBonus3)*this.alpha;
    }
    draw(): void {
        this.ctx.beginPath();
        this.ctx.moveTo(this.points[0].x,this.points[0].y);
        this.ctx.lineTo(this.points[1].x,this.points[1].y);
        this.ctx.lineTo(this.points[2].x,this.points[2].y);
        this.ctx.closePath();
        this.ctx.fillStyle = this.color;
        this.ctx.globalAlpha = this.opacity;
        this.ctx.globalCompositeOperation = "lighter"
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        this.ctx.globalCompositeOperation = "source-over"
    }
    
}

export class TriMesh {
    public tris:Tri[];
    public active:boolean;
    public drawable:boolean;

    public globalAlpha:number;

    constructor(
        private pf: Background,
        length=50,
        margin=20,
        color="cyan"
    ) {
        this.tris = [];

        this.active = pf.options.triMesh.active;
        this.drawable = pf.options.triMesh.drawable;
        this.globalAlpha = pf.options.triMesh.alpha;

        let triHeight = length*Math.sin(Math.PI/6);
        let triOffset = length*Math.sin(Math.PI/3);
        let tri = 0;
        let row = 0;
        let phaseScale = 150;
        
        for(let y=triHeight*2;y<this.pf.canvas.height;y+=triOffset) {
            for(let x=margin+(row%2)*triHeight;x<this.pf.canvas.width-margin;) {
                if(tri%2==0) {
                    this.tris.push(new Tri(this.pf,
                        {x:x,y:y},
                        length,
                        false,
                        Math.random()*Math.PI*phaseScale,
                        color)
                    )
                    x+=length;
                } else {
                    this.tris.push(new Tri(this.pf,
                        {x:x-triHeight,y:y},
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
    public update():void {
        this.active = this.pf.options.triMesh.active;
        this.drawable = this.pf.options.triMesh.drawable;
        this.globalAlpha = this.pf.options.triMesh.alpha;
        for(let tri of this.tris) {
            tri.active = this.active;
            tri.drawable = this.drawable;
            tri.alpha = this.globalAlpha;
            if(tri.active) {
                tri.update();
            }
        }
    }
    public draw():void {
        for(let tri of this.tris) {
            if(tri.drawable) {
                tri.draw();
            }
        }
    }
}

export class Star implements BackgroundElement {
    drawable = false;
    active = false;

    public position:{x:number,y:number};

    public alpha = 0;

    constructor(
        public ctx:CanvasRenderingContext2D,
        public bounds:Bounds,
        private relativePosition:{x:number,y:number},
        private speed:{x:number,y:number},
        private radius=Math.random()*3+5,
        private color="white"
    ) {
        this.position = {
            x:this.bounds.topLeft.x + this.bounds.width  * this.relativePosition.x,
            y:this.bounds.topLeft.y + this.bounds.height * this.relativePosition.y
        }
     }
    update(): void {
        this.relativePosition.x += this.speed.x;
        this.relativePosition.y += this.speed.y;
        if(this.relativePosition.x <= 0) {
            this.relativePosition.x = 0;
            this.speed.x *= -1;
        } else if(this.relativePosition.x >= 1) {
            this.relativePosition.x = 1;
            this.speed.x *= -1;
        }
        if(this.relativePosition.y <= 0) {
            this.relativePosition.y = 0;
            this.speed.y *= -1;
        } else if(this.relativePosition.y >= 1) {
            this.relativePosition.y = 1;
            this.speed.y *= -1;
        }
        this.position = {
            x:this.bounds.topLeft.x + this.bounds.width  * this.relativePosition.x,
            y:this.bounds.topLeft.y + this.bounds.height * this.relativePosition.y
        }
    }
    draw(): void {
        this.ctx.beginPath();
        this.ctx.arc(this.position.x,this.position.y,this.radius,0,2*Math.PI);
        this.ctx.fillStyle = this.color;
        this.ctx.globalAlpha = this.alpha;
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }

}

export class Constellation implements BackgroundElement {
    drawable = false;
    active = false;

    public stars:Star[];
    public alpha = 0;

    constructor(
        public ctx:CanvasRenderingContext2D,
        numStars:number,
        starSize:number,
        public bounds:Bounds,
        private color="white"
    ) {
        this.stars = [];
        for(let i=0;i<numStars;i++) {
            this.stars.push(new Star(
                this.ctx,
                this.bounds,
                {x:Math.random(),y:Math.random()},
                {x:(Math.random()-0.5)*0.0025,y:(Math.random()-0.5)*0.0025},
                starSize,
                this.color
            ))
        }
    }
    update():void {
        this.bounds.update();
        for(const star of this.stars) {
            star.bounds = this.bounds;
            star.active = this.active;
            star.drawable = this.drawable;
            star.alpha = this.alpha;
            if(star.active) {
                star.update();
            }
        }
    }
    draw():void {
        for (let i=0;i<this.stars.length-1;i++) {
            const s1 = this.stars[i];
            const s2 = this.stars[i+1];

            const distance = Math.sqrt(Math.pow(s2.position.x-s1.position.x,2)+Math.pow(s2.position.y-s2.position.y,2));
            const opacity = 1-distance/(this.bounds.width*0.5)
            if(opacity>0) {
                this.ctx.beginPath();
                this.ctx.moveTo(s1.position.x,s1.position.y)
                this.ctx.lineTo(s2.position.x,s2.position.y);
                this.ctx.strokeStyle = this.color;
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = opacity*this.alpha;
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
        }
        for (const star of this.stars) {
            if(star.drawable)
                star.draw();
        }
    }
}

export default class Background {
    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;

    private _mouse: Mouse;

    private bgElements: BackgroundElement[];

    private hexes: {left:Hex[],right:Hex[]};
    private triMesh:TriMesh;
    private constellations:Constellation[];

    constructor(public options = {
        wave1Color:"rgba(5,252,186,0.0125)",
        wave2Color:"rgba(5,252,186,0.05)",
        triMesh: {
            drawable:false,
            active:false,
            triSize:50,
            colors:["lightseagreen","rgb(5,252,186)"],
            alpha:0
        }
    }) {
        this._canvas = document.createElement("canvas");
        this._canvas.id = "canvas2d";
        this._canvas.style.position = "absolute";
        this._canvas.style.top = "0";
        this._canvas.style.left = "0";
        this._canvas.style.zIndex = "-1";
        this._canvas.width = window.innerWidth;
        this._canvas.height = window.innerHeight;
        this._ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this._mouse = {x:this.canvas.width*0.5,y:this.canvas.height*0.5};

        this.bgElements = []; 
        this.constellations = [];
        this.hexes = {left:[],right:[]};

        this.triMesh = new TriMesh(this,this.options.triMesh.triSize,-this.options.triMesh.triSize,this.options.triMesh.colors[0]);

        document.body.append(this._canvas);

        (window as any).bg = this; // For debugging purposes
    }

    public get canvas(): HTMLCanvasElement {
        return this._canvas;
    }

    public get ctx(): CanvasRenderingContext2D {
        return this._ctx;
    }

    public get mouse(): Mouse {
        return this._mouse;
    }

    public hideMesh(): void {
        for(let tri of this.triMesh.tris) {
            tri.drawable = false;
            tri.active = false;
        }
    }

    private buildHexWall(side:"left"|"right",radius=15,padding=6.5):void {
        this.hexes[side] = [];
        let x:number = 0;

        let beginColor = new HSLColor(230,20,12);
        let endColor = new HSLColor(140,80,32);
        for(let row=1;row<6;row++) {
            x = side=="left"?radius*row*Math.sin(Math.PI/6)+padding:this.canvas.width-radius*row*Math.sin(Math.PI/6)-padding;
            for(let y=padding+radius;y<=this.canvas.height-radius-padding;y+=radius+padding) {
                this.hexes[side].push(new Hex(this,x,y+(radius+padding)*Math.cos(Math.PI/3)*(1-row%2),radius-padding*1.25,beginColor,endColor));
            }
        }
    }

    private onResize(ev:UIEvent) {
        this._canvas.width = window.innerWidth;
        this._canvas.height = window.innerHeight;
        this.buildHexWall("left");
        this.buildHexWall("right");
        this.triMesh = new TriMesh(this,this.options.triMesh.triSize,-this.options.triMesh.triSize,this.options.triMesh.colors[0])
        for(let constellation of this.constellations) {
            constellation.bounds.center = {x:this.canvas.width*0.5,y:this.canvas.height*0.25};
            constellation.bounds.width = this.canvas.width*0.25;
            constellation.bounds.height = this.canvas.height/4;
        }
    }

    public init(): void {
        this.hexes = {left:[],right:[]};
        this.triMesh = new TriMesh(this,this.options.triMesh.triSize,-this.options.triMesh.triSize,this.options.triMesh.colors[0]);
        this.buildHexWall("left");
        this.buildHexWall("right");

        //Waves
        let wave1 = new Wave(40,0.006,0.02,0);
        let wave2 = new Wave(20,0.006,0.023,Math.PI/4);
        let wave3 = new Wave(40,0.006,0.021,Math.PI/6);
        let wave4 = new Wave(20,0.006,0.024,Math.PI/2);
        let waveResolution = 16;
        this.bgElements.push(new WaveOverlap(this._ctx,wave3,wave4,waveResolution,this.options.wave1Color));
        this.bgElements.push(new WaveOverlap(this._ctx,wave1,wave2,waveResolution,this.options.wave2Color));

        //Constellations
        let constellationBounds = new Bounds({x:this.canvas.width*0.5,y:this.canvas.height*0.25},this.canvas.width*0.25,this.canvas.height/4);

        this.constellations.push(new Constellation(this.ctx,15,3,constellationBounds,"azure"));
        
        window.addEventListener("resize",this.onResize.bind(this));
        window.addEventListener("mousemove",(ev: MouseEvent) => {
            this.mouse.x = ev.x;
            this.mouse.y = ev.y;
        });
    }

    public showStars = (): void => {
        gsap.to(this.bgElements[0],{alpha:0,duration:2});
        gsap.to(this.bgElements[1],{alpha:0,duration:2});
        gsap.set(this.bgElements[0],{active:false,drawable:false,delay:2});
        gsap.set(this.bgElements[1],{active:false,drawable:false,delay:2});
        gsap.set(this.options.triMesh,{active:true,drawable:true,delay:2});
        gsap.to(this.options.triMesh,{alpha:1,duration:2,delay:2});
        for(let constellation of this.constellations) {
            gsap.set(constellation,{active:true,drawable:true,delay:2})
            gsap.to(constellation,{alpha:1,duration:2,delay:2});
        }
    }

    public showWaves = (): void => {
        for(let constellation of this.constellations) {
            gsap.set(constellation,{active:false,drawable:false,delay:2})
            gsap.to(constellation,{alpha:0,duration:2});
        }
        gsap.to(this.options.triMesh,{alpha:0,duration:2});
        gsap.set(this.options.triMesh,{active:false,drawable:false,delay:2});
        gsap.set(this.bgElements[0],{active:true,drawable:true,delay:2});
        gsap.set(this.bgElements[1],{active:true,drawable:true,delay:2});
        gsap.to(this.bgElements[0],{alpha:1,duration:2,delay:2});
        gsap.to(this.bgElements[1],{alpha:1,duration:2,delay:2});

    }

    public update = (): void => {
        for(const element of this.bgElements) {
            if(element.active) {
                element.update();
            }
        }
        this.triMesh.update();
        for(const constellation of this.constellations) {
            if(constellation.active) {
                constellation.update();
            }
        }
        for(let i=0;i<this.hexes.left.length;i++) {
            const hexLeft: Hex = this.hexes.left[i];
            const hexRight: Hex = this.hexes.right[i];
            if(hexLeft.active) {
                hexLeft.update();
            }
            if(hexRight.active) {
                hexRight.update();
            }
        }
        this.render();
    }

    public render(): void {
        this.ctx.fillStyle = "#05160f";
        this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        for(const element of this.bgElements) {
            if(element.drawable) {
                element.draw();
            }
        }
        if(this.triMesh.drawable) { this.triMesh.draw();}
        for(const constellation of this.constellations) {
            if(constellation.drawable) {
                constellation.draw();
            }
        }
        for(let i=0;i<this.hexes.left.length;i++) {
            const hexLeft: Hex = this.hexes.left[i];
            const hexRight: Hex = this.hexes.right[i];
            if(hexLeft.drawable) {
                hexLeft.draw();
            }
            if(hexRight.drawable) {
                hexRight.draw();
            }
        }
    }
}