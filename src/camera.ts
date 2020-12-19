import { vec2, vec3 } from "vmath";

import {Control} from "./control"
import { GameState } from "./main"

export default class Camera {
    public camera_parent: any;
    public initial_position: vec3;
    public initial_rotation: vec3;
    public rotation_origin: vec2;
    constructor(
        public camera_object:any,
        public control:Control,
        public mouse_rotation_multiplier = 1.5,
        public angle_limit = 60
    ) {
        this.camera_parent = this.camera_object.parent;
        this.initial_position = vec3.clone(this.camera_object.position as vec3);
        this.initial_rotation = vec3.clone(this.camera_parent.rotation as vec3);
        this.rotation_origin = vec2.create();
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
    }
    tick(fd: number): void {
        let state: GameState = this.camera_object.scene.global_vars.game_state;
        if(state === "orbit") {
            this.camera_parent.rotation_z += this.control.axes.value.x/fd;
            this.camera_parent.rotation.y += this.control.axes.value.y/fd
            if (this.camera_parent.rotation.y >= this.angle_limit*Math.PI/180)
                this.camera_parent.rotation.y = this.angle_limit*Math.PI/180
            else if (this.camera_parent.rotation.y <= -this.angle_limit*Math.PI/180)
                this.camera_parent.rotation.y = -this.angle_limit*Math.PI/180
            // Trackball Rotation (DO NOT USE)
            // quat.rotateZ @camera_parent.rotation, @camera_parent.rotation,@control.axes.value.x/fd
            // quat.rotateY @camera_parent.rotation, @camera_parent.rotation,@control.axes.value.y/fd
        }
    }
}