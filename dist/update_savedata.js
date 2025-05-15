import readline from "readline";
import fs from "fs";
import { CHUNITHMRating } from "rg-stats";
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});
const songs = JSON.parse(fs.readFileSync("songs.json", "utf-8"));
function update_savedata(title, diff, score) {
    const savedata = JSON.parse(fs.readFileSync("userdata/tonton", "utf-8"));
    const song = songs.find((song) => song.title == title);
    if (song) {
        /*
        SSS+	1,009,000	譜面定数＋2.15	0
        SSS	1,007,500	譜面定数＋2.0	100点毎に+0.01
        SS+	1,005,000	譜面定数＋1.5	50点毎に+0.01
        SS	1,000,000	譜面定数＋1.0	100点毎に+0.01
        S+	990,000	譜面定数＋0.6	250点毎に+0.01
        S	975,000	譜面定数	250点毎に+0.01
        AAA	950,000	譜面定数－1.5   166.666..点毎に+0.01?
        AA925,000	譜面定数－3.0
        A	900,000	譜面定数－5.0
        BBB	800,000	(譜面定数－5.0)/2
        C	500,000	0
        */
        let chart;
        if (diff == "exp") {
            chart = song.dif_exp;
        }
        else if (diff == "mas") {
            chart = song.dif_mas;
        }
        else if (diff == "ult") {
            chart = song.dif_ult;
        }
        let rate = CHUNITHMRating.calculate(score, chart);
        const ranksList = [
            { score: 1009000, rank: "SSS+" },
            { score: 1007500, rank: "SSS" },
            { score: 1005000, rank: "SS+" },
            { score: 1000000, rank: "SS" },
            { score: 990000, rank: "S+" },
            { score: 975000, rank: "S" },
            { score: 950000, rank: "AAA" },
            { score: 925000, rank: "AA" },
            { score: 900000, rank: "A" },
            { score: 800000, rank: "BBB" },
        ];
        const rank = ranksList.find(r => score >= r.score)?.rank ?? "C";
        const songData = {
            title: title,
            score: score,
            const: chart,
            rate: rate,
            rank: rank
        };
        savedata[0].data[`${song.id}_${diff}`] = songData;
        fs.writeFileSync("userdata/tonton", JSON.stringify(savedata, null, 2), "utf-8");
        console.log('✅ スコアを更新しました');
    }
    else {
        console.error("⚠️ 曲が見つかりませんでした");
    }
}
function isExistSong(title) {
    const song = songs.find((song) => song.title == title);
    if (song) {
        return true;
    }
    else {
        return false;
    }
}
function EnterSongData() {
    rl.question("曲名を入力: ", (title) => {
        if (title === "exitloop") {
            rl.close();
            return;
        }
        if (!isExistSong(title)) {
            console.error("⚠️ 曲が見つかりませんでした");
            return EnterSongData();
        }
        rl.question("難易度を入力: ", (difficulty) => {
            if (difficulty !== "exp" && difficulty !== "mas" && difficulty !== "ult") {
                console.error("⚠️ 難易度は exp, mas, ult のいずれかで入力してください。");
                return EnterSongData();
            }
            rl.question("スコアを入力: ", (scoreStr) => {
                const score = parseInt(scoreStr);
                if (!isNaN(score)) {
                    update_savedata(title, difficulty, score);
                }
                else {
                    console.error("⚠️ スコアは数字で入力してください。");
                }
                return EnterSongData();
            });
        });
    });
}
EnterSongData();
