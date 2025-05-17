//import readline from "readline";
//import fs from "fs";
import fetch from 'node-fetch';
import dotenv from "dotenv";
dotenv.config();



type SongDifficulty = {
    level: number;
    const: number;
    maxcombo: number;
    is_const_unknown: boolean;
};

export type SongResult = {
    meta: {
        id: string;
        title: string;
        genre: string;
        artist: string;
        release: string;
        bpm: number;
    };
    data: {
        BAS: SongDifficulty | null;
        ADV: SongDifficulty | null;
        EXP: SongDifficulty | null;
        MAS: SongDifficulty | null;
        ULT: SongDifficulty | null;
    };
};

const TOKEN = process.env.CHUNITHM_API_TOKEN;
export function getSongData(id: string): Promise<SongResult | Error> {
    const URL: string = `https://api.chunirec.net/2.0/music/show.json?region=jp2&id=${id}&token=${TOKEN}`;
    return fetch(URL)
        .then((response) => response.json())
        .then((data: any) => {
            return data as SongResult;
        })
        .catch((error: unknown) => {
            console.error('Error:', error);
            return new Error("曲データの取得に失敗しました");
        });
}



/*
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

const songs = JSON.parse(fs.readFileSync("songs.json", "utf-8"));

function SearchSong() {
    rl.question("曲名を入力: ", (input) => {
        const matched = songs.find((songs: any) => songs.title == input);
        if (matched) {
            console.log(`曲名: ${matched.title}`);
            console.log(`曲ID: ${matched.id}`);
            getSongData(matched.id);
        } else {
            console.log("曲が見つかりませんでした");
        };

        rl.close();
    });
};
SearchSong();
*/