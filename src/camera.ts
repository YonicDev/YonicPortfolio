import { vec2, vec3, quat } from "vmath";
import gsap from "gsap";

import { Control } from "./control";
import { GameState } from "./main";
import Planet, { Triangle, PlanetCardinal } from "./planet";

export default class Camera {
    public camera_parent: any;
    public initial_position: vec3;
    public initial_rotation: vec3;
    public rotation_origin: vec2;
    public control: Control;
    constructor(
        public camera_object: any,
        myou: any,
        public planet: Planet,
        public mouse_rotation_multiplier = 1.5,
        public angle_limit = 60
    ) {
        this.camera_parent = this.camera_object.parent;
        this.initial_position = vec3.clone(this.camera_object.position as vec3);
        this.initial_rotation = vec3.clone(this.camera_parent.rotation as vec3);
        this.rotation_origin = vec2.create();
        this.control = new Control(myou,this);
        let callbacks:Function[] = this.camera_object.scene.post_animation_callbacks || this.camera_object.scene.pre_draw_callbacks;

        Object.defineProperty(this.camera_object, 'world_position_x',{
            get: function(): number { return this.get_world_position().x},
            set: function(v: number) {
                let p: vec3 = this.get_world_position();
                p.x = v;
                this.set_world_position(p);
            }
        });
        Object.defineProperty(this.camera_object, 'world_position_y',{
            get: function(): number { return this.get_world_position().y},
            set: function(v: number) {
                let p: vec3 = this.get_world_position();
                p.y = v;
                this.set_world_position(p);
            }
        });
        Object.defineProperty(this.camera_object, 'world_position_z',{
            get: function(): number { return this.get_world_position().z},
            set: function(v: number) {
                let p: vec3 = this.get_world_position();
                p.z = v;
                this.set_world_position(p);
            }
        })

        // WARNING: This must be the last tick,
        // so make sure others are added before or with unshift
        // NOTE: This is pending an API change in the engine
        callbacks.push((scene: any,frame_duration: number) => {
            this.tick(frame_duration)
        });

        document.addEventListener("TrianglePicked",this.orbitTo)
    }
    tick(fd: number): void {
        let state: GameState = this.camera_object.scene.global_vars.game_state;
        if(state === "orbit") {
            if (this.camera_parent.rotation.y >= this.angle_limit*Math.PI/180)
                this.camera_parent.rotation.y = this.angle_limit*Math.PI/180
            else if (this.camera_parent.rotation.y <= -this.angle_limit*Math.PI/180)
                this.camera_parent.rotation.y = -this.angle_limit*Math.PI/180
            // Trackball Rotation (DO NOT USE)
            // quat.rotateZ @camera_parent.rotation, @camera_parent.rotation,@control.axes.value.x/fd
            // quat.rotateY @camera_parent.rotation, @camera_parent.rotation,@control.axes.value.y/fd
        }
    }
    public orbitTo = (e:CustomEventInit<PlanetCardinal|number>): void => {
        let targetIndex: number;
        if(this.camera_object.scene.global_vars.game_state == "orbit") {
            if(typeof e.detail === "string") {
                targetIndex = this.planet.triangleMap[this.planet.triangles.indexOf(this.planet.selectedTriangle)][e.detail]-1;
            } else if(typeof e.detail === "number") {
                targetIndex = e.detail;
            } else { return; }
            if(targetIndex < 0) { return; }

            this.camera_object.scene.global_vars.game_state = "autoOrbit";
            
            const targetTriangle = this.planet.triangles[targetIndex];
            const targetPoint = this.planet.getTriangleCenter(targetIndex);

            let influence = {x: 0};
            let initialRotation: quat = quat.create();
            quat.copy(initialRotation,this.camera_parent.rotation);

            this.planet.selectedTriangle = targetTriangle;
            document.dispatchEvent(new Event('triangleChanged'));

            gsap.to(influence,{
                x: 1,
                duration:0.5,
                onUpdate: function(camera_parent: any, planet: Planet) {
                    quat.copy(camera_parent.rotation,initialRotation);
                    camera_parent.look_at(targetPoint,{front:"+X",influence:influence.x})
                    camera_parent.set_rotation_order('XYZ'); // Myou converts it into quat, so we turn it back to how it was.
                },
                onUpdateParams: [this.camera_parent, this.planet],
                onComplete: function(camera_parent: any, camera: Camera) {
                    camera_parent.scene.global_vars.game_state = "orbit";
                    camera.initial_rotation = vec3.clone(camera_parent.rotation as vec3); 
                },
                ease:"circ.out",
                onCompleteParams: [this.camera_parent, this]
            })
        }
    }
}