import { vec3 } from 'vmath'
import { Myou, Behaviour } from 'myou-engine'
import { GameState, Media } from './main';
const work_data: TriangleEntry[] = require('./articles/works.json');

export interface TriangleEntry {
    triangle: number,
    title: string,
    image: string,
    description: string,
    media: Media[],
    article: string
}

export type TrianglePoint = {
    [key in PlanetCardinal]: number;
};

export type PlanetCardinal = "North"|"South"|"East"|"West";

export default class Planet {
    public triangles: Triangle[];
    public selectedTriangle: Triangle;
    public gameState: GameState;
    public readonly triangleMap: TrianglePoint[] = require('./triangle_map.json');
    
    private _prevTriangle: Triangle;
    constructor(public scene: Myou.Scene) {
        this.triangles = [];
        for(let i = 1;i<=20;i++) {
            let triString = i<10?'Icosphere.00'+i:'Icosphere.0'+i;
            this.triangles.push(new Triangle(scene.objects[triString],{index:i,planet:this}));
        }
        this._prevTriangle = this.selectedTriangle = this.getClosestTriangle();
        this.gameState = scene.global_vars.game_state;
        this.scene.pre_draw_callbacks.unshift((scene,frameDuration) => {
            this.tick(frameDuration);
        })
    }
    public tick(fd: number): void {
        this.gameState = this.scene.global_vars.game_state;
        if(this.gameState == "orbit") {
            this._prevTriangle = this.selectedTriangle;
            this.selectedTriangle = this.getClosestTriangle();
            if(this._prevTriangle != this.selectedTriangle)
                document.dispatchEvent(new Event('triangleChanged'));
            for(const triangle of this.triangles) {
                if(triangle.ob.materials!=null)
                    vec3.set(triangle.ob.materials[0]?.inputs.selected.value as vec3,0,0,0);
            }
            if(this.selectedTriangle.ob.materials!=null)
                vec3.set(this.selectedTriangle.ob.materials[0].inputs.selected.value as vec3,10,0,0);
        } else if(this.gameState == "autoOrbit") {
            for(const triangle of this.triangles) {
                if(triangle.ob.materials!=null)
                    vec3.set(triangle.ob.materials[0].inputs.selected.value as vec3,0,0,0);
            }
            if(this.selectedTriangle.ob.materials!=null)
                vec3.set(this.selectedTriangle.ob.materials[0].inputs.selected.value as vec3,10,0,0);
        }
    }
    public getVertexCoordinates(triangle: Triangle, vertex: number): vec3 {
        if(triangle.ob.data?.varray != null) {
            let index: number = vertex * triangle.ob.data.stride / 4;
            return vec3.new(
                triangle.ob.data.varray[index],
                triangle.ob.data.varray[index+1],
                triangle.ob.data.varray[index+2]
            )
        } else {
            return vec3.new(-1,-1,-1);
        }
    };
    public getTriangleCenter = (triangle: number): vec3 => {
        let vertices: vec3[] = [];
        for(let vtx=0;vtx<=2;vtx++) {
            vertices.push(this.getVertexCoordinates(this.triangles[triangle],vtx));
        }
        return vec3.new(
            (vertices[0].x + vertices[1].x + vertices[2].x)/3,
            (vertices[0].y + vertices[1].y + vertices[2].y)/3,
            (vertices[0].z + vertices[1].z + vertices[2].z)/3
        )
    }
    public getClosestTriangle = (): Triangle => {
        let camera: Myou.Camera = this.scene.active_camera;
        let distances: number[] = [];
        for(let face=0;face<20;face++) {
            distances.push(vec3.dist(camera.get_world_position(),this.getTriangleCenter(face)));
        }
        return this.triangles[distances.indexOf(Math.min.apply(null,distances))];
    }
}

interface TriangleOptions extends Myou.BehaviourOptions {
    index: number,
    planet: Planet
}

export class Triangle extends Behaviour {
    public index: number;
    public planet: Planet;
    public textureOpacity: number;

    public readonly MAX_TEXTURE_OPACITY = 1;

    constructor(public ob: Myou.GameObject,options: TriangleOptions) {
        super(ob.scene,options);
        this.index = options.index;
        this.planet = options.planet;
        this.textureOpacity = this.MAX_TEXTURE_OPACITY;
        this.enable_object_picking();

        if(this.ob.materials!=null) {
            this.ob.materials[0].get_texture_list()[0].value.unbind();
            this.ob.materials[0].get_texture_list()[0].value.use_mipmap = false;
            this.ob.materials[0].get_texture_list()[0].value.bind();
            for(let work of work_data) {
                if(work.triangle == this.index) {
                    vec3.set(this.ob.materials[0].inputs.has_content.value as vec3,10,0,0);
                    break;
                }
            }
        }
    }
    public on_tick = (fd: number) => {
        if(this.ob.materials!=null && this.ob.materials[0].inputs.texture_opacity!=null) {
            vec3.set(this.ob.materials[0].inputs.texture_opacity.value as vec3,this.textureOpacity,0,0);
        }
    }

    public on_object_pointer_down = (e: Myou.Behaviour.ObjectPointerEvent): void => {
        if(e.object != this.ob || e.button != 0) { return; }
        document.dispatchEvent(new CustomEvent("TrianglePicked",{detail:this.index}))
    }
}