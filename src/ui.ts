import { vec2, vec3 } from "vmath";
import { Media } from "./main";
import Planet, { TriangleEntry } from "./planet";
import * as Youtube from './integrations/youtube'

const Works = require('./articles/works.json');

const SVG_NS = 'http://www.w3.org/2000/svg';

export class ArticleWindow {
    public container: HTMLDivElement;
    public htmlContainer: HTMLDivElement;
    public content: HTMLDivElement;
    public border: HTMLDivElement;
    public backButton: HTMLButtonElement;

    constructor(public canvas3d:HTMLCanvasElement) {
        this.container = document.createElement("div");
        this.container.id = "article-window";
        this.container.style.display = "none";

        this.htmlContainer = document.createElement("div");
        this.htmlContainer.id = "article-container"
        this.htmlContainer.style.opacity = "0";

        this.content = document.createElement("div");
        this.content.id = "article-content";

        this.border = document.createElement("div");
        this.border.id = "article-window-border";

        this.backButton = document.createElement("button");
        this.backButton.innerHTML = "Go back";
        this.backButton.disabled = true;

        this.htmlContainer.append(this.content);
        this.container.append(this.htmlContainer,this.border);
        this.container.append(this.backButton);
        document.body.append(this.container);
    }
    public update = (): void => {
        this.container.style.top = this.canvas3d.clientHeight*0.5 - this.container.clientHeight*0.5 + "px";
    }
}

export class Logo {
    public container:HTMLDivElement;
    public root:SVGElement;

    public transform = { 
        marginLeft: 0,
        marginTop: 0,
        left: 0,
        top: 0,
        scale: 1
    }

    constructor(public canvas3d:HTMLCanvasElement) {
        const raw: string = require('!!raw-loader!../assets/logo/logo_animated.svg').default;
        this.container = document.createElement("div");
        this.container.id = "logo";
        this.container.innerHTML = raw;

        this.root = this.container.getElementsByTagName("svg")[0];

        this.root.setAttribute("width",canvas3d.clientWidth+"px");
        this.root.setAttribute("height",canvas3d.clientHeight+"px");
        
        document.body.append(this.container);
    }
}

export class GUIContainer {
    public label: Label;
    public planet: Planet;
    public slideshow: SlideshowGrid;
    public articleWindow: ArticleWindow;
    public exploreButton: InteractuableButton;

    constructor(public canvas3d: HTMLCanvasElement,options:{
        tailLength: number,
        planet: Planet,
        textMargin: vec2,
        fontSize: number,
    }) {
        this.slideshow = new SlideshowGrid(this.canvas3d,options.planet);
        this.label = new Label(this.slideshow,options);
        this.articleWindow = new ArticleWindow(this.canvas3d);
        this.exploreButton = new InteractuableButton(this);
        this.planet = options.planet;
        document.addEventListener("triangleChanged",this._loadDataAndUpdate)
    }
    public update = (): void => {
        this.label.update();
        this.slideshow.update();
        this.articleWindow.update();
        this.exploreButton.update();
    }

    private _loadDataAndUpdate = () => {
        const selectedWork: TriangleEntry|undefined = Works.find((work: TriangleEntry) => {
            return work.triangle == this.planet.triangles.indexOf(this.planet.selectedTriangle)+1
        });
        this.exploreButton.button.disabled = selectedWork==null;
    }
}

class InteractuableButton {
    public button:HTMLButtonElement;
    constructor(public gui:GUIContainer) {
        this.button = document.createElement("button");
        this.button.id = "explore-button";

        document.body.append(this.button);
    }
    public update = (): void => {
        this.button.style.top = this.gui.label.end.y + this.gui.label.label.fontSize + (this.gui.label.label.margin.y*2) +"px";
        this.button.style.left = this.gui.label.end.x + this.gui.label.label.margin.x +"px";
    }
}

class Label {
    public active = true;
    public drawable = true;

    public root: SVGElement;

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
    
    constructor(public slideshowControls: SlideshowGrid, options:{
        tailLength: number,
        planet: Planet,
        textMargin: vec2,
        fontSize: number,
    }) {
        this.planet = options.planet;

        this.root = document.createElementNS(SVG_NS,'svg');
        this.root.id = "label";

        this.line = document.createElementNS(SVG_NS,"path");
        this.start = vec2.create();
        this.end = vec2.new(
            this.slideshowControls.categoryWindow.container.offsetLeft,
            this.slideshowControls.categoryWindow.container.offsetTop+this.slideshowControls.categoryWindow.container.clientHeight+32);
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
        this._updateLabelText();

        this.root.append(this.line);
        this.root.append(this.label.element);
        document.body.append(this.root);

        document.addEventListener("triangleChanged",(e:Event) => {
            this._updateLabelText();
        })
        
    }
    private _layout = (): void => {
        this.root.setAttribute('width',this.slideshowControls.canvas3d.width.toString());
        this.root.setAttribute('height',this.slideshowControls.canvas3d.height.toString());
    }
    public update = (): void => {
        this._layout();
        const camera = this.planet.triangles[0].scene.active_camera;
        let space_point = this.planet.getTriangleCenter(this.planet.triangles.indexOf(this.planet.selectedTriangle));
        let screen_point = vec3.create();
        vec3.transformMat4(screen_point,space_point,camera.world_to_screen_matrix);
        this.start = vec2.new(
            (1+screen_point.x) * this.slideshowControls.canvas3d.clientWidth*0.5,
            (1-screen_point.y) * this.slideshowControls.canvas3d.clientHeight*0.5
        );
        this.end = vec2.new(
            this.slideshowControls.categoryWindow.container.offsetLeft+this.slideshowControls.container.offsetLeft,
            this.slideshowControls.categoryWindow.container.offsetTop+this.slideshowControls.categoryWindow.container.clientHeight+this.slideshowControls.container.offsetTop+32
        );

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
        this.line.setAttribute('d',`M${this.start.x} ${this.start.y} L${this.end.x-this.tailLength} ${this.end.y} L${this.end.x} ${this.end.y}`);
        this.line.setAttribute('stroke-dasharray',stroke.length.toString());
        this.line.setAttribute('stroke-dashoffset',stroke.targetLength.toString());

        this.label.element.setAttribute('x',(this.end.x+this.label.margin.x).toString());
        this.label.element.setAttribute('y',(this.end.y+this.label.margin.y+this.label.fontSize/3).toString());
        this.label.element.setAttribute('fill',this.stroke.color as string);
        this.label.element.childNodes[0].textContent = this.label.text;
    }

    private _updateLabelText = () => {
        let selectedWork: TriangleEntry|undefined = Works.find((work: TriangleEntry) => {
            return work.triangle == this.planet.triangles.indexOf(this.planet.selectedTriangle)+1
        });
        let txt: string = selectedWork? selectedWork.title : "Coming soon...";
        window.requestAnimationFrame(this._animateText(txt,0,20));
    }

    private _animateText = (txt: string,count: number,limit: number) => {
        return () => {
            if(count++ > limit) {
                this.label.text = txt;
            } else {
                this.label.text = this._shuffleText(txt,limit - count);
                window.requestAnimationFrame(this._animateText(txt,count,limit));
            }
        }
    }

    private _shuffleText = (source: string, amount: number): string => {
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

class SlideshowBox {
    public container: HTMLDivElement;
    public content: HTMLDivElement;
    public border: HTMLDivElement;
    public overlay: HTMLDivElement;

    constructor(public grid: SlideshowGrid) {
        this.container = document.createElement("div");
        this.container.classList.add("box");
        this.content = document.createElement("div");
        this.content.classList.add("content");
        this.border = document.createElement("div");
        this.border.classList.add("border");
        this.overlay = document.createElement("div");
        this.overlay.classList.add("overlay");

        this.container.append(this.content,this.overlay,this.border);
    }
}

class SlideshowSlide {
    public type: "image"|"youtube"|"video";
    public content: string;
    public thumbnail: string;
    public element: HTMLDivElement;
    constructor(media: Media,public index: number) {
        this.type = media.type;
        this.content = media.content;
        this.thumbnail = media.thumbnail!=null? media.thumbnail : media.content;

        this.element = document.createElement("div");
        this.element.id = "slide-"+index;
        this.element.classList.add("slideshow-slide");
        this.element.style.backgroundImage = `url(${this.thumbnail})`;
    }
}

class SlideshowCategoryWindow extends SlideshowBox {
    public readonly SIZE_NUM = 0.15;
    public readonly SIZE = this.SIZE_NUM*100 + "vw";
    public slideshow: SlideshowSlide[];
    constructor(public grid: SlideshowGrid,public planet:Planet) {
        super(grid);

        this.container.classList.add("header");
        this.container.style.position = "absolute";
        this.container.style.width = this.SIZE;
        this.container.style.height = `calc(${this.SIZE} * 9/16)`

        this.slideshow = [];

        const debounceScroll = debounce(grid.autoActiveSlide,100);
        this.content.addEventListener('scroll',debounceScroll);

        document.addEventListener("triangleChanged",this._updateWindow);
        this._updateWindow();
    }
    public update() {
        if(this.container.style.position == "absolute") {
            this.container.style.left = this.grid.canvas3d.clientWidth -this.container.clientWidth - 75*2 + "px";
            this.container.style.top = this.grid.canvas3d.clientHeight*0.5 -this.container.clientHeight*0.5 - this.grid.container.offsetTop + "px";
        }
    }
    public buildSlideshow(media: Media[]) {
        this.destroySlideshow();
        for(let m of media) {
            let index = media.indexOf(m);
            let slide = new SlideshowSlide(m,index);
            this.content.append(slide.element);
            this.slideshow.push(slide);
        }
    }
    public destroySlideshow() {
        this.slideshow = [];
        this.content.innerHTML = "";
    }
    private _updateWindow = (e?: Event) => {
        let selectedWork: TriangleEntry|undefined = Works.find((work: TriangleEntry) => {
            return work.triangle == this.planet.triangles.indexOf(this.planet.selectedTriangle)+1
        });
        this.content.style.backgroundImage = "url('/assets/gui/static.gif')";
        if(selectedWork!=null && selectedWork.image != "") {
            let preloadImage = selectedWork.image;
            this.container.classList.remove('unavailable');
            let img = new Image();
            img.onload = (e) => {
                this.content.style.backgroundImage = `url(${preloadImage})`;
            }
            img.src = preloadImage;
        } else if(selectedWork==null) {
            this.container.classList.add('unavailable');
        }
    }
}

class SlideshowGrid {
    public elements: SlideshowBox[];
    public container: HTMLDivElement;
    public spacer: SlideshowBox;
    public categoryWindow: SlideshowCategoryWindow;
    public activeSlide: number;

    constructor(public canvas3d:HTMLCanvasElement,planet: Planet) {
        this.container = document.createElement("div");
        this.container.id = "slideshow-grid";
        this.container.style.left = "75px";

        this.elements = [];
        this.elements[0] = this.categoryWindow = new SlideshowCategoryWindow(this,planet);
        this.elements[1] = this.spacer = new SlideshowBox(this);
        this.spacer.container.classList.add("header","invisible");
        this.activeSlide = 0;

        for(let i=2;i<=11;i++) {
            this.elements[i] = new SlideshowBox(this);
            this.elements[i].container.classList.add("slideshow-button","invisible");
        }

        for(const element of this.elements) {
            this.container.append(element.container);
        }
        document.body.append(this.container);
    }
    public update = (): void => {
        this.container.style.top = this.canvas3d.clientHeight*0.5 - this.container.clientHeight*0.5 + "px";
        this.categoryWindow.update();
    }
    public setActiveSlide(value: number) {
        this.activeSlide = value;
        for(let i=2;i<this.elements.length;i++) {
            if(i == value+2) {
                this.elements[i].container.classList.add("active");
            } else {
                this.elements[i].container.classList.remove("active");
            }
        }
    }
    public autoActiveSlide = (ev:Event) => {
        const scroller = ev.target as HTMLDivElement;
        const index = Math.round((scroller.scrollLeft / scroller.scrollWidth) * this.categoryWindow.slideshow.length );
        if(index != this.activeSlide) {
            this.setActiveSlide(index);
        }
    }
    public async buildSlideshowButtons(mediaArray: Media[]) {
        for(let i=2;i<this.elements.length;i++) {
            this.elements[i].container.classList.remove("invisible");
            this.elements[i].container.classList.add("unavailable");
            this.elements[i].content.style.backgroundImage = "";
            this.elements[i].container.onclick = null;
        }
        for(let i=0;i<mediaArray.length;i++) {
            let media = mediaArray[i];
            this.elements[i+2].container.classList.remove("unavailable");
            this.elements[i+2].container.onclick = () => {
                document.querySelector("#slide-"+i)?.scrollIntoView();
                this.setActiveSlide(i);
            }
            if(media.type == "image") {
                this.elements[i+2].content.style.backgroundImage = `url("${media.thumbnail!=null ? media.thumbnail : media.content}")`;
            } else if(media.type == "youtube") {
                let video = await Youtube.getVideoInfo(media.content);
                if(video.thumbnails != null && video.thumbnails.medium != null) {
                    if(i==0 && video.thumbnails.maxres != null) {
                        this.categoryWindow.content.style.backgroundImage = `url("${video.thumbnails.maxres.url as string}")`;
                    }
                    this.elements[i+2].content.style.backgroundImage = `url("${video.thumbnails.medium.url as string}")`;
                }
            }
        }
    }
}

function debounce(func: (...args: any[]) => any, timeout: number) {
    let timer: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        func(...args)
      }, timeout)
    }
  }