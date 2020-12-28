import { MyouEngine } from "myou-engine";
import { vec2, vec3 } from "vmath";
import { GameState } from "./main";
import Planet, { TriangleEntry } from "./planet";
import gsap from "gsap";

const Works = require('./articles/works.json');

const SVG_NS = 'http://www.w3.org/2000/svg';

interface SVGDrawableElement {
    update: (fd: number) => void,
    draw: () => void
    active: boolean
    drawable: boolean
    name: string
    gui: SvgGUI;    
}

export class SvgGUI {
    public svg: SVGElement;
    public width: number;
    public height: number;
    public gameState: GameState|undefined = undefined;
    public elements: SVGDrawableElement[];
    public articleWindow: ArticleWindow;
    constructor(canvas3d:HTMLCanvasElement,options:any) {
        this.svg = document.createElementNS(SVG_NS,'svg');
        this.svg.id = "svg_gui";
        this.width = canvas3d.clientWidth;
        this.height = canvas3d.clientHeight;
        this.layout(canvas3d);
        this.svg.style.pointerEvents = 'none';
        this.elements = [];
        this.articleWindow = new ArticleWindow(this);
        document.body.append(this.svg);
    }
    public layout = (canvas3d:HTMLCanvasElement): void => {
        this.svg.setAttribute('width',canvas3d.width.toString());
        this.svg.setAttribute('height',canvas3d.height.toString());
    }
    public update = (scene:any,fd:number) => {
        this.gameState = scene.global_vars.game_state;
        let canvas3d: HTMLCanvasElement = scene.context.canvas;
        this.width = canvas3d.clientWidth;
        this.height = canvas3d.clientHeight;
        this.layout(canvas3d);
        for(let name in this.elements) {
            let element = this.elements[name];
            if(element.active) {
                element.update(fd);
            }
        }
    }
    public findElement(target: string): SVGDrawableElement {
        return this.findElementMultiple(target)[0];
    }
    public findElementMultiple(target: string): SVGDrawableElement[] {
        let matches: SVGDrawableElement[] = [];
        for(let element of this.elements) {
            if(element.name === target)
                matches.push(element);
        }
        return matches;
    }
}

export class SvgLabel implements SVGDrawableElement {
    public active = true;
    public drawable = true;
    public name: string;

    public root: SVGGElement;

    public line: SVGPathElement;
    public start: vec2;
    public end: vec2;
    public stroke: {
        color?: string,
        length?: number,
        target_length?: number,
        animation_direction?: "forwards"|"backwards"
    };
    public tailLength: number;

    public planet: Planet;

    public label: {
        element: SVGTextElement,
        text: string,
        margin: vec2,
        fontSize: number,
    };
    
    constructor(public gui: SvgGUI, options:{
        name: string;
        tailLength: number,
        planet: Planet,
        textMargin: vec2,
        fontSize: number,
    }) {
        this.planet = options.planet;

        this.root = document.createElementNS(SVG_NS,'g');
        this.name = this.root.id = options.name;

        this.line = document.createElementNS(SVG_NS,"path");
        this.start = vec2.create();
        this.end = vec2.new(this.gui.width*0.75,this.gui.height*0.75);
        this.stroke = {};
        this.tailLength = options.tailLength;
        
        this.stroke.length = this.line.getTotalLength();
        this.stroke.target_length = 0;
        this.stroke.animation_direction = "backwards";
        // BUG: Dynamically updating the stroke-dasharray will cause the
        // stroke-dashoffset transition to constantly trigger.
        this.line.style.transition = "stroke-dashoffset 1s linear"

        this.label = {
            element: document.createElementNS(SVG_NS,'text'),
            text: "",
            margin: options.textMargin,
            fontSize: options.fontSize,
        }
        let text_node = document.createTextNode("");
        this.label.element.appendChild(text_node);
        this.updateLabelText();

        this.root.append(this.line);
        this.root.append(this.label.element);
        this.gui.svg.append(this.root);

        document.addEventListener("triangleChanged",(e:Event) => {
            this.updateLabelText();
        })
    }
    public update = (fd: number): void => {
        const camera = this.planet.triangles[0].scene.active_camera;
        let space_point = this.planet.getTriangleCenter(this.planet.triangles.indexOf(this.planet.selectedTriangle));
        let screen_point = vec3.create();
        vec3.transformMat4(screen_point,space_point,camera.world_to_screen_matrix);
        this.start = vec2.new(
            (1+screen_point.x) * this.gui.width*0.5,
            (1-screen_point.y) * this.gui.height*0.5
        )
        this.end = vec2.new(this.gui.width*0.75,this.gui.height*0.75);

        // Get pixel color from the selected triangle.
        const gl:WebGLRenderingContext = this.planet.triangles[0].scene.context.render_manager.gl;
        let p = new Uint8Array(4);
        gl.readPixels(this.start.x,this.start.y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);
        this.stroke.color = `rgba(${p[0]+32},${p[1]+32},${p[2]+32},1)`;

        // Update stroke animation limits
        this.stroke.length = this.line.getTotalLength();
        this.stroke.target_length = this.stroke.animation_direction=="forwards"? this.stroke.length : 0;

        if(this.drawable) { this.draw() } ;
    }
    public draw = (): void => {
        let stroke = {
            length: this.stroke.length || 0,
            targetLength: this.stroke.target_length || 0
        }
        this.line.setAttribute('stroke',this.stroke.color as string);
        this.line.setAttribute('d',`M${this.start.x} ${this.start.y} L${this.end.x} ${this.end.y} L${this.end.x+this.tailLength} ${this.end.y}`);
        this.line.setAttribute('stroke-dasharray',stroke.length.toString());
        this.line.setAttribute('stroke-dashoffset',stroke.targetLength.toString());

        this.label.element.setAttribute('x',(this.end.x+this.tailLength+this.label.margin.x).toString());
        this.label.element.setAttribute('y',(this.end.y+this.label.margin.y+this.label.fontSize/3).toString());
        this.label.element.setAttribute('fill',this.stroke.color as string);
        this.label.element.childNodes[0].textContent = this.label.text;
    }

    public updateLabelText = () => {
        let selectedWork: TriangleEntry|undefined = Works.find((work: TriangleEntry) => {
            return work.triangle == this.planet.triangles.indexOf(this.planet.selectedTriangle)+1
        });
        let txt: string = selectedWork? selectedWork.title : "Coming soon...";
        window.requestAnimationFrame(this.animateText(txt,0,20));
    }

    public animateText = (txt: string,count: number,limit: number) => {
        return () => {
            if(count++ > limit) {
                this.label.text = txt;
            } else {
                this.label.text = this.shuffleText(txt,limit - count);
                window.requestAnimationFrame(this.animateText(txt,count,limit));
            }
        }
    }

    public shuffleText = (source: string, amount: number): string => {
        const alpha = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
        'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
        const bet = alpha.join("");
        let arr: string[] = [];
        for(let char of source) {
            if (!/[A-z '.]/.test(char)) { continue; }
            if(/[ '.]/.test(char)) { arr.push(char); }
            else {
                let offset = amount;
                if(bet.indexOf(char)+offset < 0) {
                    while(bet.indexOf(char)+offset < 0) {
                        offset = (alpha.length) + (offset-1) - (bet.indexOf(char)-1);
                    }
                } else if(bet.indexOf(char)+offset >= alpha.length) {
                    while(bet.indexOf(char)+offset >= alpha.length) {
                        offset = (offset-1) - bet.indexOf(char);
                    }
                }
                arr.push(alpha[bet.indexOf(char)+offset]);
            }
        }
        return arr.join("");
    }
}

export class CategoryWindow implements SVGDrawableElement {
    public active = true;
    public drawable = true;
    public name: string;

    public position: vec2;

    public repositionTween: gsap.core.Tween|undefined;
    public rescaleTween: gsap.core.Tween|undefined;

    public dimensions: {
        width: number,
        height: number,
        maxWidth: number,
        maxHeight: number
    };

    public planet: Planet;

    public root: SVGGElement;
    public overlay: SVGPolygonElement;
    public path: SVGPolygonElement;
    public image: SVGImageElement;
    public imageSrc: string;
    public radius: number;
    public mask: {
        element: SVGClipPathElement,
        path: SVGPolygonElement
    }

    private _lastCanvasDimensions: vec2;

    constructor(public gui:SvgGUI,options: {
        name: string,
        width: number,
        height: number,
        radius: number,
        planet: Planet
    }) {
        this.name = options.name;

        this.position = vec2.new(this.gui.width*0.75,this.gui.height*0.4);

        this.dimensions = {
            width: options.width,
            height: options.height,
            maxWidth: options.width,
            maxHeight: options.height
        }

        this.root = document.createElementNS(SVG_NS,'g');
        this.root.id = options.name;
        this.planet = options.planet;

        this.radius = options.radius;
        
        this.path = document.createElementNS(SVG_NS,'polygon');
        this.path.id = options.name+"-border";

        this.overlay = document.createElementNS(SVG_NS,'polygon');
        this.overlay.id = options.name+"-overlay";

        this.image = document.createElementNS(SVG_NS,'image');
        this.imageSrc = "/assets/gui/static.gif";
        let img = new Image();
        img.onload = this.updateWindow;
        img.src = this.imageSrc;

        this.mask = {
            element: document.createElementNS(SVG_NS,'clipPath'),
            path: document.createElementNS(SVG_NS,'polygon')
        }
        this.mask.element.id = this.root.id+"-mask";

        this.mask.element.append(this.mask.path);
        this.root.append(this.mask.element);
        this.root.append(this.image);
        this.root.append(this.path);
        this.root.append(this.overlay);
        this.gui.svg.append(this.root);

        this._lastCanvasDimensions = vec2.new(gui.width,gui.height);

        document.addEventListener("triangleChanged",this.updateWindow);
        gsap.ticker.add(this._updateWindowDimensions);
    }

    public updateWindow = (e: Event) => {
        let selectedWork: TriangleEntry|undefined = Works.find((work: TriangleEntry) => {
            return work.triangle == this.planet.triangles.indexOf(this.planet.selectedTriangle)+1
        });
        this.imageSrc = "/assets/gui/static.gif";
        if(selectedWork!=null && selectedWork.image != "") {
            let preloadImage = selectedWork.image;
            this.root.classList.remove('disabled');
            let img = new Image();
            img.onload = (e) => {
                this.imageSrc = preloadImage;
            }
            img.src = preloadImage;
        } else if(selectedWork==null) {
            this.root.classList.add('disabled');
        }
    }

    private _updateWindowDimensions = () => {
        if(this._lastCanvasDimensions.x != this.gui.width || this._lastCanvasDimensions.y != this.gui.height) {
            vec2.set(this._lastCanvasDimensions,this.gui.width,this.gui.height);
            if(this.repositionTween!=null && this.repositionTween.isActive()) {
                let to = {x: 0, y: 0, width: 0, height: 0};
                let position = this.repositionTween.time();
                if(this.gui.gameState == "zooming") {
                    to.width = this.gui.width/3;
                    to.height = this.gui.height*0.5;
                    to.x = this._lastCanvasDimensions.x * 0.25 - to.width * 0.5;
                    to.y = this._lastCanvasDimensions.y *0.5 - to.height * 0.75;
                } else if (this.gui.gameState == "zoomOut") {
                    to.width = this.gui.width/3;
                    to.height = this.gui.height*0.5;
                    to.x = this.gui.width*0.75;
                    to.y = this.gui.height*0.4;
                } else {
                    return;
                }
                
                this.repositionTween.vars.x = to.x;
                this.repositionTween.vars.y = to.y;
                this.repositionTween = gsap.to(this.position,{
                    duration: 4,
                    x: to.x,
                    y: to.y,
                    ease: "power2.inOut",
                    overwrite: true
                });
                this.repositionTween.play(position)
            }
            if(this.rescaleTween!=null && this.rescaleTween.isActive()) {
                let to = {width: 0, height: 0};
                let position = this.rescaleTween.time();
                if(this.gui.gameState == "zooming") {
                    to.width = this.gui.width/3;
                    to.height = this.gui.height*0.5;
                } else if(this.gui.gameState == "zoomOut") {
                    to.width = 320;
                    to.height = 180;
                } else {
                    return;
                }
                this.rescaleTween = gsap.to(this.dimensions, {
                    duration: 4,
                    maxWidth: to.width,
                    maxHeight: to.height,
                    ease: "power2.inOut",
                    overwrite: true
                });
                this.rescaleTween.play(position)
            }
        }
    }

    public update = (fd: number): void => {
        if(this.gui.gameState == "orbit") {
            vec2.set(this.position,this.gui.width*0.75,this.gui.height*0.4);
        } else if (this.gui.gameState == "section") {
            this.dimensions.maxWidth = this.gui.width/3;
            this.dimensions.maxHeight = this.gui.height*0.5;
            vec2.set(this.position,
                this.gui.width*0.25-this.dimensions.width*0.5,
                this.gui.height*0.5-this.dimensions.height*0.75
            );
        }
        this.dimensions.width = this.dimensions.maxWidth;
        this.dimensions.height = this.dimensions.maxHeight;

        this.draw();
    }

    public draw = (): void => {
        const points = `${this.position.x+this.radius},${this.position.y}
        ${this.position.x+this.dimensions.width-this.radius},${this.position.y}
        ${this.position.x+this.dimensions.width},${this.position.y+this.radius}
        ${this.position.x+this.dimensions.width},${this.position.y+this.dimensions.height-this.radius}
        ${this.position.x+this.dimensions.width-this.radius},${this.position.y+this.dimensions.height}
        ${this.position.x+this.radius},${this.position.y+this.dimensions.height}
        ${this.position.x},${this.position.y+this.dimensions.height-this.radius}
        ${this.position.x},${this.position.y+this.radius}`;

        this.path.setAttribute('points',points);
        this.mask.path.setAttribute('points',points);
        this.overlay.setAttribute ('points',points);
        this.image.setAttribute ('x',this.position.x.toString());
        this.image.setAttribute ('y',this.position.y.toString());
        this.image.setAttribute ('href',this.imageSrc);
        this.image.setAttribute ('width',this.dimensions.width.toString());
    }
}

export class SlideshowControls implements SVGDrawableElement {
    public active = true;
    public drawable = true;
    public name: string;

    public root: SVGGElement;
    public position: vec2;

    public buttons: SlideshowButton[];
    public clientRect: DOMRect;
    public buttonsOptions: {
        width: number,
        height: number,
        padding: number,
        radius: number
    }

    constructor(public gui:SvgGUI,options: {
        name: string,
        buttonsOptions: {
            width: number,
            height: number,
            padding: number,
            radius: number
        }
    }) {
        this.root = document.createElementNS(SVG_NS,'g');
        this.root.id = this.name = options.name;

        this.buttonsOptions = options.buttonsOptions;
        this.position = vec2.new(this.gui.width*0.25,this.gui.height*0.75);
        this.buttons = [];
        for(let i=0;i<8;i++) {
            this.buttons.push(new SlideshowButton(this.gui,{index: i,controls:this,radius:this.buttonsOptions.radius}));
        }

        this.clientRect = this.root.getClientRects()[0];

        this.gui.svg.append(this.root);
    }

    public update = (fd: number): void => {
        this.clientRect = this.root.getClientRects()[0];
        vec2.set(this.position,this.gui.width*0.25-this.clientRect.width*0.5,
            this.gui.height*0.75-this.clientRect.height*0.75);
        for(let button of this.buttons) {
            button.update(fd);
        }
        this.draw();
    }
    public draw = (): void => {
        for(let button of this.buttons) {
            button.draw();
        }
    }
}

export class SlideshowButton implements SVGDrawableElement {
    public active = false;
    public drawable = false;
    public name: string;
    public index: number;
    public radius: number;
    public root: SVGGElement;
    public path: SVGPolygonElement;
    public mask: {
        element: SVGClipPathElement,
        path: SVGPolygonElement
    };
    public image: SVGImageElement;
    public imageSrc: string;
    public row: number;
    public controls: SlideshowControls;
    public dimensions: {
        width: number,
        height: number
    }
    public position: vec2;
    public offset: number;
    public opacity: number;

    constructor(public gui: SvgGUI, options: {
        index: number,
        controls: SlideshowControls,
        radius: number
    }) {
        this.root = document.createElementNS(SVG_NS,'g');
        this.root.classList.add("slideshowButton");

        this.name = "slideshow-button-"+options.index;
        this.path = document.createElementNS(SVG_NS,'polygon');

        this.mask = {
            element: document.createElementNS(SVG_NS,"clipPath"),
            path: document.createElementNS(SVG_NS,'polygon')
        };
        this.mask.element.id = `slideshow-button-mask-${options.index}`;

        this.image = document.createElementNS(SVG_NS,'image');
        this.image.style.clipPath = `url(#slideshow-button-mask-${options.index})`;
        this.imageSrc = "";

        this.index = options.index;
        this.controls = options.controls;
        this.radius = options.radius;

        this.dimensions = {
            width: this.controls.buttonsOptions.width,
            height: this.controls.buttonsOptions.height
        }

        this.row = this.index>3?1:0;
        this.position = vec2.create();
        this.offset = -this.controls.buttonsOptions.height;

        this.opacity = 0;

        this.mask.element.append(this.mask.path);
        this.root.append(this.mask.element);
        this.root.append(this.image);
        this.root.append(this.path);
        this.controls.root.append(this.root);
    }
    public update = (fd: number): void => {
        vec2.set(this.position,
            this.controls.position.x + (this.dimensions.width+this.controls.buttonsOptions.padding)*(this.index%4),
            this.offset+this.controls.position.y+(this.controls.buttonsOptions.height+this.controls.buttonsOptions.padding)*this.row);
    }
    public draw = (): void => {
        const points = `${this.position.x+this.radius},${this.position.y}
        ${this.position.x+this.dimensions.width-this.radius},${this.position.y}
        ${this.position.x+this.dimensions.width},${this.position.y+this.radius}
        ${this.position.x+this.dimensions.width},${this.position.y+this.dimensions.height-this.radius}
        ${this.position.x+this.dimensions.width-this.radius},${this.position.y+this.dimensions.height}
        ${this.position.x+this.radius},${this.position.y+this.dimensions.height}
        ${this.position.x},${this.position.y+this.dimensions.height-this.radius}
        ${this.position.x},${this.position.y+this.radius}`;

        this.path.setAttribute('points',points);
        this.path.setAttribute('stroke-opacity',this.opacity.toString());
        this.path.setAttribute('opacity',this.opacity.toString());

        this.mask.path.setAttribute('points',points);

        this.image.setAttribute('href',this.imageSrc);
        this.image.setAttribute('x',this.position.x.toString());
        this.image.setAttribute('y',this.position.y.toString());
        this.image.setAttribute('width',this.dimensions.width.toString());
        this.image.setAttribute('opacity',this.opacity.toString());
    }
}

export class ArticleWindow {
    public container: HTMLDivElement;
    public htmlContainer: HTMLDivElement;
    public backButton: HTMLButtonElement;

    constructor(public gui: SvgGUI) {
        this.container = document.createElement("div");
        this.container.id = "article-window";
        this.container.style.display = "none";

        this.htmlContainer = document.createElement("div");
        this.htmlContainer.id = "article-window-html-container"
        this.htmlContainer.style.opacity = "0";

        this.backButton = document.createElement("button");
        this.backButton.innerHTML = "Go back";
        this.backButton.disabled = true;

        this.container.appendChild(this.htmlContainer);
        this.container.appendChild(this.backButton);
        document.body.appendChild(this.container);
    }
}