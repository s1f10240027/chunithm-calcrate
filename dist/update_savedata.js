import readline from "readline";
import fs from "fs";
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
        AAA	950,000	譜面定数－1.5
        AA	925,000	譜面定数－3.0
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
        let rate = 0;
        let rank = "";
        if (score >= 1009000) {
            rate = chart + 2.15;
            rank = "SSS+";
        }
        else if (score >= 1007500) {
            rate = chart + 2.0 + (Math.floor((score - 1007500) / 100) * 0.01);
            rank = "SSS";
        }
        else if (score >= 1005000) {
            rate = chart + 1.5 + (Math.floor((score - 1005000) / 50) * 0.01);
            rank = "SS+";
        }
        else if (score >= 1000000) {
            rate = chart + 1.0 + (Math.floor((score - 1000000) / 100) * 0.01);
            rank = "SS";
        }
        else if (score >= 990000) {
            rate = chart + 0.6 + (Math.floor((score - 990000) / 250) * 0.01);
            rank = "S+";
        }
        else if (score >= 975000) {
            rate = chart + (Math.floor((score - 975000) / 250) * 0.01);
            rank = "S";
        }
        else if (score >= 950000) {
            rate = chart - 1.5 + (Math.floor((score - 950000) / 165) * 0.01);
            rank = "AAA";
        }
        else if (score >= 925000) {
            rate = chart - 3.0;
            rank = "AA";
        }
        else if (score >= 900000) {
            rate = chart - 5.0;
            rank = "A";
        }
        else if (score >= 800000) {
            rate = (chart - 5.0) / 2;
            rank = "BBB";
        }
        else if (score >= 500000) {
            rate = 0;
            rank = "C";
        }
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
rl.question("曲名を入力: ", (title) => {
    if (!isExistSong(title)) {
        console.error("⚠️ 曲が見つかりませんでした");
        rl.close();
        return;
    }
    rl.question("難易度を入力: ", (difficulty) => {
        if (difficulty !== "exp" && difficulty !== "mas" && difficulty !== "ult") {
            console.error("⚠️ 難易度は exp, mas, ult のいずれかで入力してください。");
            rl.close();
            return;
        }
        rl.question("スコアを入力: ", (scoreStr) => {
            const score = parseInt(scoreStr);
            if (!isNaN(score)) {
                update_savedata(title, difficulty, score);
            }
            else {
                console.error("⚠️ スコアは数字で入力してください。");
            }
            ;
            rl.close();
            return;
        });
    });
});
