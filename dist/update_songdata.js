import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import dotenv from "dotenv";
dotenv.config();
const TOKEN = process.env.CHUNITHM_API_TOKEN;
const URL = `https://api.chunirec.net/2.0/music/showall.json?region=jp2&token=${TOKEN}`;
fetch(URL)
    .then((response) => response.json())
    .then((data) => {
    const songs = data;
    const result = songs.map(song => ({
        id: song.meta.id,
        title: song.meta.title,
        genre: song.meta.genre,
        artist: song.meta.artist,
        verse: new Date(song.meta.release) >= new Date("2024-12-12") ? true : false,
        dif_exp: song.data.EXP ? song.data.EXP.const : null,
        dif_mas: song.data.MAS ? song.data.MAS.const : null,
        dif_ult: song.data.ULT ? song.data.ULT.const : null
    }));
    writeFileSync("songs.json", JSON.stringify(result, null, 2), "utf-8");
    console.log('✅ songs.json に出力しました');
})
    .catch((error) => {
    console.error('Error fetching data:', error);
});
