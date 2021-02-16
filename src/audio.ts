import gsap from "gsap";

export class AudioEngine {
    public BGMList: Record<string, HTMLAudioElement>;
    constructor() {
        this.BGMList = {};
    }
    public importAll(req: __WebpackModuleApi.RequireContext): Promise<string[]> {
        let promises: Promise<string>[] = [];
        promises.push(new Promise((resolve) => {
            req.keys().forEach(key => {
                let audio = new Audio(req(key).default);
                this.BGMList[key] = audio;
                this.BGMList[key].loop = true;
                this.BGMList[key].load();
                resolve(key);
            });
        }))
        return Promise.all(promises);
    }
    public fadeAll(type: "in"|"out"): void {
        let value = type=="in"? 1 : 0
        for(let key in this.BGMList) {
            let bgm = this.BGMList[key];
            if(type == "in") bgm.play();
            gsap.to(bgm,{
                volume: value,
                duration: 1,
                onComplete: () => {
                    if(type == "out") bgm.pause();
                }
            });
        }
    }
}