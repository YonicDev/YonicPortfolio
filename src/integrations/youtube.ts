export async function init() {
    const TOKEN: string = require('./creedentials.json').youtube;
    await gapi.client.init({
        apiKey: TOKEN,
        discoveryDocs: ['https://youtube.googleapis.com/$discovery/rest']
    });
}

export async function getVideoInfo(id: string,part="snippet") {
    let res = await gapi.client.youtube.videos.list({part,id});
    return JSON.parse(res.body).items[0].snippet as gapi.client.youtube.VideoSnippet;
}

export async function getVideoPlayer(id: string, maxWidth: number, maxHeight: number) {
    let res = await gapi.client.youtube.videos.list({part:"player",id,maxWidth});
    return JSON.parse(res.body).items[0].player.embedHtml as string;
}

export function loadIframeAPI() {
    return new Promise<string>((resolve,reject) => {
        let timeout = setTimeout(function() {
            reject("Timeout on loading YouTube Iframe API.");
        },30000);
        let script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = "https://www.youtube.com/iframe_api";
        script.onerror = (ev) => reject(ev);
        document.head.appendChild(script);
        (window as any).onYouTubeIframeAPIReady = function () {
            clearTimeout(timeout);
            resolve("YouTube Iframe API loaded");
        }
    },)
}