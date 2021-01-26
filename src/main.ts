import "./index.scss";

import { Myou, create_full_window_canvas } from "myou-engine"
import gsap from "gsap"
const {DrawSVGPlugin} = require("../lib/DrawSVGPlugin3.min.js");
gsap.registerPlugin(DrawSVGPlugin);

import DOMPurify from "dompurify";

import { vec2 } from "vmath"

import Camera from "./camera"
import Planet, { TriangleEntry } from "./planet"
import Background from "./background"
import { Logo, GUIContainer } from "./ui"
import * as Youtube from './integrations/youtube'

async function main() {

    const works:TriangleEntry[]  = require('./articles/works.json');

    const canvas: HTMLCanvasElement = create_full_window_canvas();

    const options = {
        data_dir: 'data',
        debug: true,
        gl_options: {
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        }
    }
    const myou = new Myou(canvas, options);

    // Convenience variables for console access
    // They have $ in the name to avoid using them by mistake elsewhere
    (window as any).$myou = myou;
    (window as any).$MyouEngine = Myou;
    (window as any).$vmath = require('vmath');

    // YouTube integration
    gapi.load('client',Youtube.init);

    try {
        console.log(await Youtube.loadIframeAPI());
    } catch {
        window.location.reload();
    }
    

    // Document styling
    document.body.style.overflow = "hidden";

    // Background initialization

    const bg = new Background({
        wave1Color: "rgba(5,252,186,0.0125)",
        wave2Color: "rgba(5,252,186,0.05)",
        triMesh: {
            drawable: false,
            active: false,
            triSize: 50,
            colors: ["lightseagreen","rgb(5,252,186)"],
            alpha: 0
        }
    })
    bg.init();
    (window as any).bg = bg;

    // GUI Initialization
    let gui: GUIContainer;

    // Profile logo
    const profLogo = new Logo(canvas);

    function handleLogoResize(e: UIEvent) {
        profLogo.root.setAttribute("width",canvas.clientWidth*profLogo.transform.scale+"px");
        profLogo.root.setAttribute("height",canvas.clientHeight*profLogo.transform.scale+"px");
    }

    // Load the scene called "Scene", its objects and enable it
    let scene: any = await myou.load_scene('Scene');
    // At this point, the scene has loaded but not the meshes, textures, etc.

    function portfolioLogoAnimation(): Promise<void> {
        return new Promise((resolve) => {
            profLogo.root.onanimationend = () => {
                resolve();
            }
        })
    }

    window.addEventListener('resize',handleLogoResize);

    await portfolioLogoAnimation();

    // We must call scene.load to tell which things we want to load.
    scene = await scene.load('visible','physics');

    // This part will only run after objects have loaded.
    // At this point we can enable rendering and physics at the same time.
    // Otherwise we would have a black screen.
    scene.enable('render','physics');

    profLogo.container.classList.add("small");

    let currentDimensions = {
        width: canvas.clientWidth,
        height: canvas.clientHeight
    };

    const logoAnimation = gsap.to(profLogo.transform,{
        scale: 0.15,
        marginLeft: -50,
        marginTop: -100,
        top: 100,
        left: 50,
        duration: 2,
        onUpdate:() => {
            profLogo.root.setAttribute("width",currentDimensions.width*profLogo.transform.scale+"px");
            profLogo.root.setAttribute("height",currentDimensions.height*profLogo.transform.scale+"px");
            profLogo.root.style.top = profLogo.transform.top+"vh";
            profLogo.root.style.left = profLogo.transform.left+"vw";
            profLogo.root.style.transform = `translate(${profLogo.transform.marginLeft}%, ${profLogo.transform.marginTop}%)`;
        },
        ease: "power1.inOut"
    })

    window.removeEventListener('resize',handleLogoResize);
    window.addEventListener('resize',() => {
        currentDimensions = {
            width: canvas.clientWidth,
            height: canvas.clientHeight
        }
        if(!logoAnimation.isActive()) {
            profLogo.root.setAttribute("width",currentDimensions.width*profLogo.transform.scale+"px");
            profLogo.root.setAttribute("height",currentDimensions.height*profLogo.transform.scale+"px");
        }
    })

    scene.global_vars = {
        game_state: "orbit" as GameState
    }
    // If we ran this line before things have loaded, things would pop out
    // and fall unpredictably.
    const planet = new Planet(scene);
    const camera = new Camera(scene.active_camera,myou,planet,3,60);

    // Debug
    (window as any).scene = scene;
    (window as any).camera = camera;
    (window as any).planet = planet;

    camera.orbitTo(new CustomEvent("",{detail:12}));

    function rotateCamera(e:MouseEvent|TouchEvent) {
        if(scene.global_vars.game_state == "orbit") {
            let v = vec2.create();
            e.stopPropagation();
            if( e.type == 'mousemove') {
                let ev = e as MouseEvent;
                vec2.set(v,
                (ev.clientX-camera.rotation_origin.x)/canvas.clientWidth*2,
                (ev.clientY-camera.rotation_origin.y)/canvas.clientHeight*2)
            } else if (e.type == 'touchmove') {
                e.preventDefault();
                let ev = e as TouchEvent;
                vec2.set(v,
                (ev.touches[0].clientX-camera.rotation_origin.x)/canvas.clientWidth*2,
                (ev.touches[0].clientY-camera.rotation_origin.y)/canvas.clientHeight*2)
            }
            camera.camera_parent.rotation.z = camera.initial_rotation.z - v.x * camera.mouse_rotation_multiplier;
            camera.camera_parent.rotation.y = camera.initial_rotation.y - v.y * camera.mouse_rotation_multiplier;
            if(camera.camera_parent.rotation.y >= camera.angle_limit*Math.PI/180)
                camera.camera_parent.rotation.y = camera.angle_limit*Math.PI/180
            else if(camera.camera_parent.rotation.y <= -camera.angle_limit*Math.PI/180)
                camera.camera_parent.rotation.y = -camera.angle_limit*Math.PI/180;
            myou.main_loop.reset_timeout();
        }
    };

    function enableCameraMove(e: Event) {
        if(e.type == 'mousedown') {
            let ev = e as MouseEvent;
            vec2.set(camera.rotation_origin,ev.clientX,ev.clientY);
            document.body.addEventListener('mousemove',rotateCamera);
        } else if (e.type == 'touchstart') {
            let ev = e as TouchEvent;
            vec2.set(camera.rotation_origin,ev.touches[0].clientX,ev.touches[0].clientY);
            e.preventDefault();
            document.body.addEventListener('touchmove',rotateCamera);
        }
    }
    function disableCameraMove(e: Event) {
        Object.assign(camera.initial_rotation,camera.camera_parent.rotation);
        if(e.type == 'mouseup' || e.type == 'mouseleave')
            document.body.removeEventListener('mousemove',rotateCamera);
        else if(e.type == 'touchend' || e.type == 'touchleave') {
            e.preventDefault();
            canvas.removeEventListener('touchmove', rotateCamera);
        }
    }

    function initializeGUI(planet: Planet) {
        gui = new GUIContainer(canvas,{
            tailLength: 100,
            planet,
            textMargin: vec2.new(20,0),
            fontSize: 12
        });
        (window as any).gui = gui;
        gui.exploreButton.button.onclick = () => {
            goToSection(planet.selectedTriangle.index);
        };

        scene.post_draw_callbacks.push(bg.update, gui.update);

        gsap.set(gui.mediaWindow.container,{
            opacity:0,
            display:"none",
            scale:2
        });

        gui.articleWindow.backButton.onclick = (window as any).returnToOrbit = function () {
            scene.global_vars.game_state = "zoomOut";
    
            gui.articleWindow.backButton.disabled = true;
    
            bg.showWaves();
            gsap.to(gui.articleWindow.container,{
                duration: 1,
                opacity: 0,
                ease: "power2.out",
                onComplete: () => {
                    gui.articleWindow.container.style.display = "none";
                }
            })
            gsap.to(".slideshow-button", {
                duration:1,
                top: -gui.slideshow.elements[2].container.clientHeight,
                opacity: 0,
                ease:"power2.In",
                stagger: {
                    each:0.1,
                    grid:[2,5],
                    from:"end",
                    axis:"x"
                },
                onComplete: () => {
                    for(let i=2;i<gui.slideshow.elements.length;i++) {
                        gui.slideshow.elements[i].container.classList.add("invisible");
                    }
                    gui.slideshow.spacer.container.classList.remove("hidden");
                    const selectedWork: TriangleEntry|undefined = works.find((work: TriangleEntry) => {
                        return work.triangle == planet.triangles.indexOf(planet.selectedTriangle)+1
                    });
                    gsap.to(gui.slideshow.categoryWindow.content,{
                        opacity: 0,
                        duration: 0.5,
                        onComplete: function() {
                            gui.slideshow.categoryWindow.destroySlideshow();
                            gui.slideshow.categoryWindow.content.style.backgroundImage = `url(${selectedWork?.image})`;
                        }
                    });
                    gsap.to(gui.slideshow.categoryWindow.overlay,{
                        opacity: 1,
                        duration:0.5,
                    })
                    gsap.to(gui.slideshow.categoryWindow.container,{
                        position:"absolute",
                        left:  canvas.clientWidth - canvas.clientWidth*gui.slideshow.categoryWindow.SIZE_NUM - 75*2,
                        top: canvas.clientHeight*0.5 - (canvas.clientWidth*gui.slideshow.categoryWindow.SIZE_NUM * 9/16)*0.5 - gui.slideshow.container.offsetTop,
                        duration: 4,
                        width: canvas.clientWidth * gui.slideshow.categoryWindow.SIZE_NUM,
                        height: canvas.clientWidth * gui.slideshow.categoryWindow.SIZE_NUM * 9 / 16,
                        ease: "power2.inOut",
                        onComplete: function() {
                            gui.slideshow.categoryWindow.container.style.width = gui.slideshow.categoryWindow.SIZE;
                            gui.slideshow.categoryWindow.container.style.height = `calc(${gui.slideshow.categoryWindow.SIZE} * 9/16)`;
                            gui.exploreButton.button.disabled = false;
                            scene.global_vars.game_state = "orbit";
                        }
                    });
                    gsap.to(gui.exploreButton.button,{
                        opacity:1,
                        duration:0.5,
                        display:"",
                        delay:3,
                    })
                }
            });
            gsap.to(camera.camera_object.position, {
                duration:2,
                x:camera.initial_position.x,
                y:camera.initial_position.y,
                z:camera.initial_position.z,
                ease:"power2.inOut",
                delay: 1
            })
            gsap.to(planet.selectedTriangle, {
                textureOpacity: planet.selectedTriangle.MAX_TEXTURE_OPACITY,
                ease: "power2.inOut",
                delay: 1.5,
                duration: 3.5
            })
            gsap.to(gui.label.line,{
                drawSVG:"100%",
                duration: 1,
                delay: 3,
            })
            gsap.to(gui.label.label.element,{
                opacity:1,
                duration: 0.5,
                delay: 3,
            })
            gsap.to(gui.slideshow.categoryWindow.content,{
                opacity: 1,
                duration: 0.5,
                delay: 5,
            });
        };
    }

    async function displaySection(...params:gsap.CallbackVars[]) {
        const section: number = params[0] as number;
        scene.global_vars.game_state = "section";
        gui.slideshow.categoryWindow.container.style.width = "";
        gui.slideshow.categoryWindow.container.style.height = "";

        const work: TriangleEntry = works.filter((w: TriangleEntry) => {
            return w.triangle == section;
        })[0];

        let md: string = require(`./articles/${work.article}`);
        md = DOMPurify.sanitize(md, {USE_PROFILES:{html: true}});
        gui.articleWindow.content.innerHTML = md;

        gui.slideshow.categoryWindow.content.style.backgroundImage = "";
        gui.slideshow.categoryWindow.buildSlideshow(work.media);
        gui.slideshow.setActiveSlide(0);
        
        await gui.slideshow.buildSlideshowButtons(work.media);

        gui.articleWindow.container.style.display = "";
        gui.articleWindow.htmlContainer.scrollTop = 0;
        gsap.to(gui.articleWindow.container.style,{
            duration: 1,
            opacity: 1,
            ease: "power2.out",
            onComplete: () => {
                gui.articleWindow.backButton.disabled = false;
            }
        })
        gsap.to(".slideshow-button", {
            duration:1,
            top: 0,
            opacity: 1,
            ease:"power2.Out",
            stagger: {
                each:0.1,
                grid:[2,5],
                from:"start",
                axis:"x"
            },
        });
        gsap.to(gui.slideshow.categoryWindow.content,{
            opacity: 1,
            duration:1,
        })
        gsap.to(gui.slideshow.categoryWindow.overlay,{
            opacity: 0,
            duration:1,
        })
    }

    document.body.addEventListener('mousedown',enableCameraMove);
    document.body.addEventListener('touchstart',enableCameraMove);

    document.body.addEventListener('mouseleave', disableCameraMove);
    document.body.addEventListener('mouseup', disableCameraMove);
    document.body.addEventListener('touchend', disableCameraMove);
    document.body.addEventListener('touchleave', disableCameraMove);

    initializeGUI(planet);

    // Go to a section of the webpage.
    function goToSection(section: number) {
        canvas.removeEventListener('mousedown',enableCameraMove);
        canvas.removeEventListener('touchstart',enableCameraMove);

        let target = planet.getTriangleCenter(section-1);
        scene.global_vars.game_state = "zooming";

        gui.exploreButton.button.disabled = true;

        bg.showStars();

        gsap.to(gui.label.line,{
            drawSVG:"0%",
            duration:1,
        });
        gsap.to(gui.label.label.element,{
            opacity:0,
            duration: 0.5,
        })

        gsap.to(gui.slideshow.categoryWindow.container,{
            position:"relative",
            left: "0px",
            top: "0px",
            duration: 4,
            delay: 1,
            width: gui.slideshow.spacer.container.clientWidth,
            height: gui.slideshow.spacer.container.clientHeight,
            ease: "power2.inOut",
            onStart: function() {
                gui.slideshow.spacer.container.classList.add("hidden");
            },
            onComplete: displaySection,
            onCompleteParams: [section]
        })

        gsap.to(gui.slideshow.categoryWindow.content,{
            opacity: 0,
            duration: 0.5,
            delay: 1,
        });

        gsap.to(gui.exploreButton.button,{
            opacity:0,
            duration:0.5,
            onComplete: () => {
                gui.exploreButton.button.style.display = "none";
            }
        })

        gsap.to(camera.camera_object,{
            duration: 2,
            world_position_x: target.x,
            world_position_y: target.y,
            world_position_z: target.z,
            ease:"power2.inOut",
            delay: 1
        });

        gsap.to(planet.selectedTriangle, {
            textureOpacity: 0,
            ease: "power2.inOut",
            delay: 1,
            duration: 1.5
        })
    };

    (window as any).goToSection = goToSection;
}

main();

export interface Media {
    type: "image"|"youtube"|"video",
    content: string[],
    thumbnail?: string
}

export type GameState = "orbit"|"section"|"zooming"|"zoomOut"|"autoOrbit";