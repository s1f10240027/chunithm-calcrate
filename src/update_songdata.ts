import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import * as fs from 'fs';
import dotenv from "dotenv";
dotenv.config();

const TOKEN = process.env.CHUNITHM_API_TOKEN;
const URL_ALL: string = `https://api.chunirec.net/2.0/music/showall.json?region=jp2&token=${TOKEN}`;

interface Song {
    meta: {
        id: string;
        title: string;
        genre: string;
        artist: string;
        release: string;
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

function getSingleData(id: string) {
    const URL_ID: string = `https://api.chunirec.net/2.0/music/show.json?region=jp2&id=${id}&token=${TOKEN}`;
    let result: { [key: string]: number | null } = {};
    fetch(URL_ID)
        .then((response) => response.json())
        .then((data: any) => {
            result["esp"] = data.data.EXP ? data.data.EXP.const : null;
            result["mas"] = data.data.MAS ? data.data.MAS.const : null;
            result["ult"] = data.data.ULT ? data.data.ULT.const : null;
        })
    return result;
}

const OldData = JSON.parse(fs.readFileSync("songs.json", "utf-8"));
fetch(URL_ALL)
    .then((response) => response.json())
    .then((data: unknown) => {
        const songs = data as Song[];

        const result = songs.map(song => {
            let dif_exp: number | null = null;
            let dif_mas: number | null = null;
            let dif_ult: number | null = null;

            const { EXP, MAS, ULT } = song.data;

            const isMissingConst = EXP?.const === 0 || MAS?.const === 0 || ULT?.const === 0;

            if (isMissingConst) {
                const old = OldData.find((old: any) => old.id === song.meta.id);

                if (old && (old.dif_exp !== 0 && old.dif_mas !== 0 && old.dif_ult !== 0)) {
                    dif_exp = old.dif_exp;
                    dif_mas = old.dif_mas;
                    dif_ult = old.dif_ult;
                } else {
                    const single = getSingleData(song.meta.id);
                    dif_exp = single["esp"] ?? null;
                    dif_mas = single["mas"] ?? null;
                    dif_ult = single["ult"] ?? null;
                }
            } else {
                dif_exp = EXP?.const ?? null;
                dif_mas = MAS?.const ?? null;
                dif_ult = ULT?.const ?? null;
            }

            return {
                id: song.meta.id,
                title: song.meta.title,
                genre: song.meta.genre,
                artist: song.meta.artist,
                verse: new Date(song.meta.release) >= new Date("2024-12-12"),
                dif_exp,
                dif_mas,
                dif_ult
            };
        });
        
        writeFileSync("songs.json", JSON.stringify(result, null, 2), "utf-8");
        console.log('✅ songs.json に出力しました');
    })
    .catch((error: unknown) => {
        console.error('Error fetching data:', error);
    });
