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