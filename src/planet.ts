import { vec3 } from 'vmath'
import { Behaviour } from 'myou-engine'
import { GameState } from './main';
const work_data: TriangleEntry[] = require('../works.json');

export interface TriangleEntry {
    triangle: number,
    title: string,
    image: string,
    description: string,
    media: any[]
}

export default class Planet {
    public triangles: Triangle[];
    public selectedTriangle: Triangle;
    public gameState: GameState;
    
    private _prevTriangle: Triangle;
    constructor(public scene: any) {
        this.triangles = [];
        for(let i = 1;i<=20;i++) {
            let triString = i<10?'Icosphere.00'+i:'Icosphere.0'+i;
            this.triangles.push(new Triangle(scene.objects[triString],{index:i,planet:this}));
        }
        this._prevTriangle = this.selectedTriangle = this.getClosestTriangle();
        this.gameState = scene.global_vars.game_state;
        this.scene.pre_draw_callbacks.unshift((scene: any, frameDuration: number) => {
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
                vec3.set(triangle.ob.materials[0].inputs.selected.value,0,0,0);
            }
            vec3.set(this.selectedTriangle.ob.materials[0].inputs.selected.value,10,0,0);
        }
    }
    public getVertexCoordinates(triangle: Triangle, vertex: number): vec3 {
        let index: number = vertex * triangle.ob.data.stride / 4;
        return vec3.new(
            triangle.ob.data.varray[index],
            triangle.ob.data.varray[index+1],
            triangle.ob.data.varray[index+2]
        )
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
        let camera: any = this.scene.active_camera;
        let distances: number[] = [];
        for(let face=0;face<20;face++) {
            distances.push(vec3.dist(camera.get_world_position(),this.getTriangleCenter(face)));
        }
        return this.triangles[distances.indexOf(Math.min.apply(null,distances))];
    }
}

export class Triangle extends Behaviour {
    public index: number;
    public planet: Planet;
    constructor(public ob: any,options: any) {
        super(ob.scene,options);
        this.index = options.index;
        this.planet = options.planet;
        this.enable_object_picking();
        for(let work of work_data) {
            if(work.triangle == this.index) {
                vec3.set(this.ob.materials[0].inputs.has_content.value,10,0,0);
                break;
            }
        }
    }
    public on_object_pointer_down = (e:any): void => {
        if(e.object != this.ob) { return; }
        console.log(this.ob.name);
    }
}