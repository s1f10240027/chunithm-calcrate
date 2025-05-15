import readline from "readline";
import fs from "fs";
import fetch from 'node-fetch';
import dotenv from "dotenv";
dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

const TOKEN = process.env.CHUNITHM_API_TOKEN;
function getSongData(id: string) {
    const URL: string = `https://api.chunirec.net/2.0/music/show.json?region=jp2&id=${id}&token=${TOKEN}`;
    fetch(URL)
        .then((response) => response.json())
        .then((data: any) => {
            console.log(data)
            console.log("=====")
            console.log(data.meta.title);
            console.log(`ジャンル: ${data.meta.genre}`);
            console.log(`アーティスト: ${data.meta.artist}`);
            console.log(``);
            console.log('Expart:')
            console.log(`難易度: ${data.data.EXP.level}`);
            console.log(`内部: ${data.data.EXP.const}`);
            console.log(`ノーツ数: ${data.data.EXP.maxcombo}`);
            if (data.data.MAS) {
                console.log(``);
                console.log('Master:')
                console.log(`難易度: ${data.data.MAS.level}`);
                console.log(`内部: ${data.data.MAS.const}`);
                console.log(`ノーツ数: ${data.data.MAS.maxcombo}`);
            };
            if (data.data.ULT) {
                console.log(``);
                console.log('Ultima:')
                console.log(`難易度: ${data.data.ULT.level}`);
                console.log(`内部: ${data.data.ULT.const}`);
                console.log(`ノーツ数: ${data.data.ULT.maxcombo}`);
            }
        })

        .catch((error: unknown) => {
            console.error('Error:', error);
        });
    return;
}

const songs = JSON.parse(fs.readFileSync("songs.json", "utf-8"));

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