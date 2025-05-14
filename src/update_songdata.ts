import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import dotenv from "dotenv";
dotenv.config();

const TOKEN = process.env.CHUNITHM_API_TOKEN;
const URL: string = `https://api.chunirec.net/2.0/music/showall.json?region=jp2&token=${TOKEN}`;

interface Song {
    meta: {
        id: string;
        title: string;
        genre: string;
    };
    data: {
        EXP?: {
            const: number;
        };
        MAS?: {
            const: number;
        };
        ULT?: {
            const: number;
        };
    }
}


fetch(URL)
    .then((response) => response.json())
    .then((data: unknown) => {
        const songs = data as Song[];

        const result = songs.map(song => ({
            id: song.meta.id,
            title: song.meta.title,
            genre: song.meta.genre,
            dif_exp: song.data.EXP ? song.data.EXP.const : null,
            dif_mas: song.data.MAS ? song.data.MAS.const : null,
            dif_ult: song.data.ULT ? song.data.ULT.const : null
        }));
        
        writeFileSync("songs.json", JSON.stringify(result, null, 2), "utf-8");
        console.log('✅ songs.json に出力しました');
    })
    .catch((error: unknown) => {
        console.error('Error fetching data:', error);
    });
