import readline from "readline";
import fs from "fs";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});


const songs = JSON.parse(fs.readFileSync("songs.json", "utf-8"));

function getSongsFromDiff(difficulty: number) {
    let matched = songs.filter((song: any) => song.dif_exp == difficulty || song.dif_mas == difficulty || song.dif_ult == difficulty);

    let titles = matched.map((song: any) => song.title);

    let title_genre: { [key: string]: string } = {};
    for (let i = 0; i < matched.length; i++) {
        title_genre[titles[i]] = matched[i].genre;
    }    

    for (let i = 0; i < titles.length; i++) {
        console.log(`${titles[i]}`);
        console.log(`   -${title_genre[titles[i]]}`);
    };
}
rl.question("難易度を入力: ", (input) => {
    getSongsFromDiff(parseFloat(input));
    rl.close();
});