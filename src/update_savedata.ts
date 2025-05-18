import readline from "readline";
import fs from "fs";
import { CHUNITHMRating } from "rg-stats"
import { parse } from 'csv-parse/sync';
import { client } from './client.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

export type SaveResult = {
    id: string | null;
    title: string;
    difficulty: string;
    score: number | null;
    const: number | null;
    rate: number | null;
    rank: string | null;
    verse: boolean | null;
};


const songs = JSON.parse(fs.readFileSync("songs.json", "utf-8"));

export async function update_savedata(title: string, diff: string, score: number, action: string, userId: string): Promise<SaveResult | Error> {
    const path: string =  `userdata/${userId}.json`;

    if (!fs.existsSync(path)) {
        const user = await client.users.fetch(userId);
        fs.writeFileSync(path, JSON.stringify(
            { 
                "meta": {
                    id: userId,
                    name: user.tag,
                    created_at: new Date().toISOString(),
                    updated_at: ""
                }, 
                "data": {} 
            }, 
            null, 2), "utf-8");
    };

    const savedata = JSON.parse(fs.readFileSync(path, "utf-8"));
    const song = songs.find((song: any) => song.title == title);
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
        //更新チェック

        let chart;
        let difname = ""
        if (diff.toLowerCase() == "expart" || diff == "exp") {
            chart = song.dif_exp;
            difname = "EXPART"
        } else if (diff.toLowerCase() == "master" || diff == "mas") {
            chart = song.dif_mas;
            difname = "MASTER"
        } else if (diff.toLowerCase() == "ultima" || diff == "ult") {
            chart = song.dif_ult;
            difname = "ULTIMA"
        }
        if (!chart) {
            console.error("⚠️ 指定した難易度が見つかりませんでした");
            return new Error("指定した難易度が見つかりません");
        }


        if (action === "register") {
            if (score > 1010000 || score < 0) {
                console.error("⚠️ スコアは0以上1010000以下で入力してください");
                return new Error("スコアは0 - 1010000の範囲で入力してください");
            }
        
            if (savedata.data[`${song.id}_${difname}`]) {
                const oldScore: number = savedata.data[`${song.id}_${difname}`].score;
                if (oldScore >= score) {
                    console.log(`${title}のスコアの更新は不要です。`);
                    return new Error("既存のスコアの方が高いため、更新は行われませんでした");
                }
            }

            let rate: number = CHUNITHMRating.calculate(score, chart);
            const ranksList = [
                { score: 1009000, rank: "SSS+" },
                { score: 1007500, rank: "SSS" },
                { score: 1005000, rank: "SS+" },
                { score: 1000000, rank: "SS" },
                { score: 990000,  rank: "S+" },
                { score: 975000,  rank: "S" },
                { score: 950000,  rank: "AAA" },
                { score: 925000,  rank: "AA" },
                { score: 900000,  rank: "A" },
                { score: 800000,  rank: "BBB" },
            ];

            const rank = ranksList.find(r => score >= r.score)?.rank ?? "C";

            const songData = {
                id: song.id,
                title: title,
                difficulty: difname,
                score: score,
                const: chart,
                rate: rate,
                rank: rank,
                verse: song.verse            
            };

            savedata.data[`${song.id}_${difname}`] = songData;
            savedata.meta["updated_at"] = new Date().toISOString();
            fs.writeFileSync(path, JSON.stringify(savedata, null, 2), "utf-8");
            console.log(`✅ スコアを更新しました : ${title} - ${difname}: ${score}`);
            return songData;
        } else if (action === "delete") {
            if (savedata.data[`${song.id}_${difname}`]) {

                const songData = {
                    id: null,
                    title: title,
                    difficulty: difname,
                    score: score,
                    const: null,
                    rate: null,
                    rank: null,
                    verse: null            
                };

                delete savedata.data[`${song.id}_${difname}`];
                fs.writeFileSync(path, JSON.stringify(savedata, null, 2), "utf-8");
                return songData
            } else {
                console.error("⚠️ 曲が見つかりませんでした");
                return new Error("データが見つかりませんでした");
            }

        }
        return new Error("不明なエラーが発生しました");
    } else {
        console.error("⚠️ 曲が見つかりませんでした");
        return new Error("曲が見つかりませんでした");
    }
}

function isExistSong(title: string) {
    const song = songs.find((song: any) => song.title == title);
    if (song) {
        return true;
    } else {
        return false;
    }
}

function UploadCSVdata() {
    rl.question("csvのパスを入力: ", (path) => {
        if (fs.existsSync(path)) {
            const csv = fs.readFileSync(path, {encoding: "utf8"});
            const records = parse(csv, {
                columns: true,
                skip_empty_lines: true,
                quote: false
            });
            for (const record of records) {
                const title = record["title"];
                const difficulty = record["difficulty"].toLowerCase();
                const score = parseInt(record["score"]);
                const result = update_savedata(title, difficulty, score, "register", "tonton");
                console.log(result);
            }
        } else {
            console.error("⚠️ CSVファイルが見つかりませんでした");
            return UploadCSVdata();
        }
    })
}


function EnterSongData() {
    rl.question("曲名を入力: ", (title) => {
        if (title === "exitloop") {
            rl.close();
            return;
        }
        if (title === "read_csv") {
            UploadCSVdata();
            return;
        }

        if (!isExistSong(title)) {
            console.error("⚠️ 曲が見つかりませんでした");
            return EnterSongData();
        }

        rl.question("難易度を入力: ", (difficulty) => {
            const validDifficulties = ["exp", "expart", "mas", "master", "ult", "ultima"];
            if (!validDifficulties.includes(difficulty.toLowerCase())) {
                console.error("⚠️ 難易度は exp, mas, ult のいずれかで入力してください。");
                return EnterSongData();
            }

            rl.question("スコアを入力: ", (scoreStr) => {
                const score = parseInt(scoreStr);
                if (!isNaN(score)) {
                    const result = update_savedata(title, difficulty, score, "register", "tonton");
                    console.log(result);
                } else {
                    console.error("⚠️ スコアは数字で入力してください。");
                }
                return EnterSongData(); 
            });
        });
    });
}


if (import.meta.url === `file://${process.argv[1]}`) {
    EnterSongData();
}
