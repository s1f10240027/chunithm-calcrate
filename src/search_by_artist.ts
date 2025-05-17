import readline from "readline";
import fs from "fs";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});


const songs = JSON.parse(fs.readFileSync("songs.json", "utf-8"));

rl.question("アーティスト名を入力: ", (input) => {
    const matched = songs.filter((songs: any) => songs.artist == input);
    if (matched.length > 0) {
        matched.forEach((song: any) => {
            console.log(`曲名: ${song.title}`);
            console.log(`ジャンル: ${song.genre}`);
            console.log(``);
        });
    } else {
        console.log("曲が見つかりませんでした");
    };

    rl.close();
});