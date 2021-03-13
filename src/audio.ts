import gsap from "gsap";

export class AudioEngine {
    public BGMList: Record<string, HTMLAudioElement>;
    constructor() {
        this.BGMList = {};
    }
    public importBGMTracks(...tracks: string[]): Promise<string[]> {
        let promises: Promise<string>[] = [];
        for(let track of tracks) {
            promises.push(new Promise((resolve) => {
                let url = require("../assets/audio/" + track + ".mp3").default;
                this.BGMList[track] = new Audio(url);
                this.BGMList[track].loop = true;
                this.BGMList[track].load();
                resolve(url);
            }));
        }
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