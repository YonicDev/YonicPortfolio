import { Myou, create_full_window_canvas } from "myou-engine"
import gsap from "gsap"

import { vec2 } from "vmath"

import Camera from "./camera"
import { Control } from "./control"
import Planet from "./planet"
import Background from "./background"
import { CategoryWindow, SlideshowControls, SvgGUI, SvgLabel } from "./ui"

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
(window as any).myou = myou;

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

// SVG GUI Initialization
const gui = new SvgGUI(canvas,{});
(window as any).gui = gui;

// Load the scene called "Scene", its objects and enable it
myou.load_scene('Scene').then(function (scene: any): Promise<any> {
    // At this point, the scene has loaded but not the meshes, textures, etc.
    // We must call scene.load to tell which things we want to load.
    return scene.load('visible','physics') as Promise<any>;
}).then(function (scene: any) {
    // This part will only run after objects have loaded.
    // At this point we can enable rendering and physics at the same time.
    // Otherwise we would have a black screen.
    scene.enable('render','physics');

    scene.global_vars = {
        game_state: "orbit" as GameState
    }
    // If we ran this line before things have loaded, things would pop out
    // and fall unpredictably.
    const camera = new Camera(scene.active_camera,new Control(myou),3,60)
    const planet = new Planet(scene);

    // Debug
    (window as any).scene = scene;
    (window as any).camera = camera;
    (window as any).planet = planet;

    function rotateCamera(e:MouseEvent|TouchEvent) {
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
    };

    function enableCameraMove(e: Event) {
        if(e.type == 'mousedown') {
            let ev = e as MouseEvent;
            vec2.set(camera.rotation_origin,ev.clientX,ev.clientY);
            canvas.addEventListener('mousemove',rotateCamera);
        } else if (e.type == 'touchstart') {
            let ev = e as TouchEvent;
            vec2.set(camera.rotation_origin,ev.touches[0].clientX,ev.touches[0].clientY);
            e.preventDefault();
            canvas.addEventListener('touchmove',rotateCamera);
        }
    }
    function disableCameraMove(e: Event) {
        Object.assign(camera.initial_rotation,camera.camera_parent.rotation);
        if(e.type == 'mouseup' || e.type == 'mouseout')
            canvas.removeEventListener('mousemove',rotateCamera);
        else if(e.type == 'touchend' || e.type == 'touchleave') {
            e.preventDefault();
            canvas.removeEventListener('touchmove', rotateCamera);
        }
    }

    canvas.addEventListener('mousedown',enableCameraMove);
    canvas.addEventListener('touchstart',enableCameraMove);

    canvas.addEventListener('mouseout', disableCameraMove);
    canvas.addEventListener('mouseup', disableCameraMove);
    canvas.addEventListener('touchend', disableCameraMove);
    canvas.addEventListener('touchleave', disableCameraMove);

    initializeGUI(scene,planet);

    // Go to a section of the webpage.
    (window as any).goToSection = function (section: number) {
        let label = gui.findElement('label') as SvgLabel;
        let catWindow = gui.findElement('category-window') as CategoryWindow;

        canvas.removeEventListener('mousedown',enableCameraMove);
        canvas.removeEventListener('touchstart',enableCameraMove);

        let target = planet.getTriangleCenter(section-1);
        scene.global_vars.game_state = "zooming";

        bg.showStars();

        gsap.set(label.stroke,{animation_direction:"forwards"});
        gsap.to(label.label.element,{duration:0.5,opacity:0});

        let toWidth = gui.width/3;
        let toHeight = gui.height*0.5;

        gsap.to(catWindow,{
            duration: 4,
            onComplete: displaySection,
            onCompleteParams: [scene,section],
            delay: 1
        })
        catWindow.rescaleTween = gsap.to(catWindow.dimensions, {
            duration: 4,
            maxWidth: toWidth,
            maxHeight: toHeight,
            ease: "power2.inOut",
            delay: 1,
            overwrite: true
        });
        catWindow.repositionTween = gsap.to(catWindow.position,{
            duration: 4,
            x: catWindow.gui.width*0.25-toWidth*0.5,
            y: catWindow.gui.height*0.5-toHeight*0.75,
            ease: "power2.inOut",
            delay: 1,
            overwrite: true
        });
        gsap.to(catWindow.image,{
            duration: 0.5,
            opacity: 0,
            delay: 1
        })
        gsap.to(camera.camera_object,{
            duration: 2,
            world_position_x: target.x,
            world_position_y: target.y,
            world_position_z: target.z,
            ease:"power2.inOut",
            delay: 1
        });
    };
    (window as any).returnToOrbit = function () {
        scene.global_vars.game_state = "zoomOut";

        let label = gui.findElement("label") as SvgLabel;
        let catWindow = gui.findElement("category-window") as CategoryWindow;
        let slideshowControls = gui.findElement("slideshow-controls") as SlideshowControls;

        bg.showWaves();
        gsap.to(slideshowControls.buttons,{
            duration:1,
            offset: -slideshowControls.buttonsOptions.height,
            opacity: 0,
            ease:"power2.In",
            stagger: {
                each:0.1,
                grid:[2,4],
                from:"end",
                axis:"x"
            }
        })
        gsap.to(camera.camera_object.position, {
            duration:2,
            x:camera.initial_position.x,
            y:camera.initial_position.y,
            z:camera.initial_position.z,
            ease:"power2.inOut",
            delay: 1
        })
        gsap.set(label.stroke, {
            animation_direction:"backwards",
            delay: 3
        })
        gsap.to(label.label.element, {
            duration:0.5,
            opacity:1,
            delay: 3
        })
        gsap.to(catWindow,{
            duration: 4,
            delay: 1,
            onComplete:function(...args:any[]) {
                let scene = args[0];
                canvas.addEventListener('mousedown', enableCameraMove)
                canvas.addEventListener('touchstart', enableCameraMove)

                scene.global_vars.game_state = "orbit";
            },
            onCompleteParams: [scene]
        })
        catWindow.rescaleTween = gsap.to(catWindow.dimensions, {
            duration:4,
            maxWidth:320,
            maxHeight:180,
            ease:"power2.inOut",
            delay: 1,
            overwrite: true
        })
        catWindow.repositionTween = gsap.to(catWindow.position, {
            duration:4,
            x:catWindow.gui.width*0.75,
            y:catWindow.gui.height*0.4,
            ease:"power2.inOut",
            delay: 1
        })
        gsap.to(catWindow.image, {
            duration:0.5,
            opacity:1,
            delay: 5
        });
    };
});

function initializeGUI(scene: any,planet: Planet) {
    gui.elements.push(new SvgLabel(gui,{
        name:"label",
        stroke:{width:2,color:'cyan'},
        tailLength:40,
        textMargin:vec2.new(20,0),
        fontSize: 24,
        planet
    }),new CategoryWindow(gui,{
        name:"category-window",
        width:320,
        height:180,
        radius:15,
        stroke:{color:"cyan",width:4},
        planet
    }),new SlideshowControls(gui,{
        name:"slideshow-controls",
        buttonsOptions:{
            width:160,
            height:90,
            padding:5,
            radius: 15
        }
    }));
    scene.post_draw_callbacks.push(gui.update, bg.update);
}

function displaySection(...params:gsap.CallbackVars[]) {
    const scene: any = params[0]
    const section: number = params[1] as number;
    scene.global_vars.game_state = "section";
    const tl = gsap.timeline({repeat:0});
    
    const slideshowControls = gui.findElement('slideshow-controls') as SlideshowControls;

    tl.to(slideshowControls.buttons,{
        duration: 1,
        offset: 0,
        opacity: 1,
        ease: "power2.out",
        stagger: {
            each: 0.1,
            grid: [2,4],
            from: "start",
            axis: "x"
        }
    })
}

// Convenience variables for console access
// They have $ in the name to avoid using them by mistake elsewhere
(window as any).$myou = myou;
(window as any).$MyouEngine = Myou;
(window as any).$vmath = require('vmath');

export type GameState = "orbit"|"section"|"zooming"|"zoomOut";