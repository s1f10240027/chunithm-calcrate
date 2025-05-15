import fs from "fs";

import { createRateImage } from "./create_image.js";


type ResultTypes = {
  title: string;
  score: number;
  const: number;
  rate: number;
  rank: string;
  verse: boolean;
};


const userdata: any = JSON.parse(fs.readFileSync("userdata/tonton", "utf-8"));
const results: [ResultTypes[], ResultTypes[]] = [[], []];

for (const songsec in userdata["data"]) {
    const songData = userdata["data"][songsec];
    
    if (!songData.verse) {
        results[0].push(songData);
    } else {
        results[1].push(songData);
    };
};

const sorted: [ResultTypes[], ResultTypes[]] = [
    [...results[0]].sort((a, b) => b.rate - a.rate).slice(0, 30),
    [...results[1]].sort((a, b) => b.rate - a.rate).slice(0, 20)
];

console.log("Loading...");
createRateImage(sorted[0], sorted[1], userdata["meta"].name);

