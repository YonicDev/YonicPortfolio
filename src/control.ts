export class Control {
    public axes: any;
    constructor(public myou:any) {
        const Axes2:any = this.myou.Axes2;
        this.axes = new Axes2('Key:KeyA','Key:KeyD','Key:KeyW','Key:KeyS');
    }
    get_current(): {x: number, y: number} {
        let x: number = this.axes.value.x;
        let y: number = this.axes.value.y;
        return {x,y}
    }
}

export interface Mouse {
    x: number,
    y: number
}