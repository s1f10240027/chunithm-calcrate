//import readline from "readline";
//import fs from "fs";
import fetch from 'node-fetch';
import dotenv from "dotenv";
import axios from "axios";
import * as cheerio from "cheerio";
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
        unlock: string;
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
export async function getSongData(id: string): Promise<SongResult | Error> {
    const URL: string = `https://api.chunirec.net/2.0/music/show.json?region=jp2&id=${id}&token=${TOKEN}`;
    try {
        const response = await fetch(URL);
        const data: any = await response.json();
        const fromWikiResult = await getMoreInfoFromWiki(data.meta.title);
        const fromWiki: { unlock: string, bpm: string } = fromWikiResult ?? { unlock: "-", bpm: "0" };
        return {
            meta: {
                ...data.meta,
                unlock: fromWiki.unlock,
                bpm: (fromWiki.bpm !== "0") ? Number(fromWiki.bpm) : data.meta.bpm,
            },
            data: data.data
        } as SongResult;
    } catch (error) {
        console.error('Error:', error);
        return new Error("曲データの取得に失敗しました");
    }
}
async function getMoreInfoFromWiki(songTitle: string): Promise<{ unlock: string, bpm: string } | null> {
    const wikiTitle = songTitle.replace(/:/g, "：");
    const url = `https://wikiwiki.jp/chunithmwiki/${encodeURIComponent(wikiTitle)}`;
    try {
        const res = await axios.get(url);
        const $ = cheerio.load(res.data);

        const unlockTd = $("th")
            .filter((_, el) => $(el).text().trim() === "解禁方法")
            .first()
            .next("td");
        const bpmTd = $("th")
            .filter((_, el) => $(el).text().trim() === "BPM")
            .first()
            .next("td");
        let result: { unlock: string, bpm: string } = { unlock: "-", bpm: "0" };
        if (unlockTd.length > 0) {
            let unlockText = unlockTd.text().trim();
            unlockText = unlockText.replace(/\d{4}\/\d{1,2}\/\d{1,2} /g, "");
            result["unlock"] = unlockText;
        };
        if (bpmTd.length > 0) {
            let bpmText = bpmTd.text().trim();
            result["bpm"] = bpmText;
        }
        return result;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            console.error("Wikiページが見つかりませんでした:", url);
        } else {
            console.error("Wiki取得エラー:", error);
        }
        return { unlock: "-", bpm: "0" };
    };
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