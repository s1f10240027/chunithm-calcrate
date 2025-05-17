import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import readline from "readline";
import * as fs from 'fs';
import dotenv from "dotenv";
dotenv.config();

const TOKEN = process.env.CHUNITHM_API_TOKEN;
//const TOKEN2 = process.env.CHUNITHM_API_TOKEN2;
//const TOKEN3 = process.env.CHUNITHM_API_TOKEN3;
//const TOKEN4 = process.env.CHUNITHM_API_TOKEN4;
//const TOKEN5 = process.env.CHUNITHM_API_TOKEN5;
const URL_ALL: string = `https://api.chunirec.net/2.0/music/showall.json?region=jp2&token=${TOKEN}`;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

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
            result["MASTER"] = data.data.MAS ? data.data.MAS.const : null;
            result["ULTIMA"] = data.data.ULT ? data.data.ULT.const : null;
        })
    return result;
}



function update_songs(type: string) {
    if (type == "all") {
        fetch(URL_ALL)
            .then((response) => response.json())
            .then((data: unknown) => {
                const songs = data as Song[];

                const result = songs.map(song => ({
                    id: song.meta.id,
                    title: song.meta.title,
                    genre: song.meta.genre,
                    artist: song.meta.artist,
                    verse: new Date(song.meta.release) >= new Date("2024-12-12"),
                    dif_exp: song.data.EXP ? song.data.EXP.const : null,
                    dif_mas: song.data.MAS ? song.data.MAS.const : null,
                    dif_ult: song.data.ULT ? song.data.ULT.const : null,
                }));
                
                writeFileSync("songs.json", JSON.stringify(result, null, 2), "utf-8");
                console.log('✅ songs.json に出力しました');
            })
            .catch((error: unknown) => {
                console.error('Error fetching data:', error);
            });
    } else if (type == "single") {
        (async () => {
            const OldData = JSON.parse(fs.readFileSync("songs.json", "utf-8"));

            let nums = 0;
            let Nodata_num = 0;
            let correct_num = 0;

            for (const old of OldData) {
                if (old.dif_exp === 0 || old.dif_mas === 0 || old.dif_ult === 0) {
                    const URL_ID = `https://api.chunirec.net/2.0/music/show.json?region=jp2&id=${old.id}&token=${TOKEN}`;
                    console.log(`曲データを更新中: ${old.title} (${old.id})`);
                    nums++;

                    try {
                        const res = await fetch(URL_ID);
                        const text = await res.text();
                        const data = JSON.parse(text);
                        if (!data) {
                            Nodata_num++;
                            continue;
                        }

                        const updatedSong = {
                            id: old.id,
                            title: data.meta.title,
                            genre: data.meta.genre,
                            artist: data.meta.artist,
                            verse: data.meta.release >= "2024-12-12",
                            dif_exp: data.data.EXP ? data.data.EXP.const : null,
                            dif_mas: data.data.MAS ? data.data.MAS.const : null,
                            dif_ult: data.data.ULT ? data.data.ULT.const : null
                        };

                        const index = OldData.findIndex((song: any) => song.id === old.id);
                        if (index !== -1) {
                            OldData[index] = updatedSong;
                            correct_num++;
                            console.log(`✅ 曲データを更新しました: ${updatedSong.title}`);
                        }

                    } catch (err) {
                        console.error(`エラー: id=${old.id}`, err);
                        break;
                    }

                    await new Promise((r) => setTimeout(r, 100));
                }
            }

            fs.writeFileSync("songs.json", JSON.stringify(OldData, null, 2), "utf-8");
            console.log("✅ songs.json を更新しました。");
            console.log(`処理完了件数: ${correct_num}`);
            console.log(`不明件数: ${Nodata_num}`);
        })();
    } else if (type == "fix") {
        //titleがない曲を修正するための処理
        const URL_ALL: string = `https://api.chunirec.net/2.0/music/showall.json?region=jp2&token=${TOKEN}`;
        const OldData = JSON.parse(fs.readFileSync("songs.json", "utf-8"));
        const needFixSongs = OldData.filter((song: any) => !song.title);
        fetch(URL_ALL)
            .then((response) => response.json())
            .then((data: unknown) => {
                const songs = data as Song[];
                needFixSongs.forEach((fixSong: any) => {
                    const found = songs.find(song => song.meta.id === fixSong.id);
                    if (found) {
                        const fixedSong = {
                            id: found.meta.id,
                            title: found.meta.title,
                            genre: found.meta.genre,
                            artist: found.meta.artist,
                            verse: fixSong.verse,
                            dif_exp: fixSong.dif_exp,
                            dif_mas: fixSong.dif_mas,
                            dif_ult: fixSong.dif_ult
                        };

                        const index = OldData.findIndex((db_song: any) => db_song.id === found.meta.id);
                        if (index !== -1) {
                            OldData[index] = fixedSong;
                        };
                        console.log(fixedSong);
                    };
                });
                fs.writeFileSync("songs.json", JSON.stringify(OldData, null, 2), "utf-8");
            });
    }
}

rl.question("update typeを入力してください (all, single, fix): ", (input) => {
    if (input == "all") {
        update_songs("all");
    } else if (input == "single") {
        update_songs("single");
    } else if (input == "fix") {
        update_songs("fix");
    } else {
        getSingleData("aa");
        console.error("⚠️ update typeはallかsingleで入力してください。");
    }
    rl.close();
    return;
})