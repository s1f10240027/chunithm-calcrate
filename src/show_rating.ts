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
export async function sortResults(userId: string): Promise<boolean> {
    const userdata = JSON.parse(fs.readFileSync(`userdata/${userId}.json`, "utf-8"));
    const NonverseData: ResultTypes[] = [];
    const verseData: ResultTypes[] = [];

    for (const songsec in userdata.data) {
        const songData = userdata.data[songsec];
        if (!songData.verse) {
            NonverseData.push(songData);
        } else {
            verseData.push(songData);
        }verseData
    }

    NonverseData.sort((a, b) => b.rate - a.rate);
    verseData.sort((a, b) => b.rate - a.rate);

    const sorted0 = NonverseData.length > 30 ? NonverseData.slice(0, 30) : NonverseData;
    const sorted1 = verseData.length > 20 ? verseData.slice(0, 20) : verseData;

    return await createRateImage(sorted0, sorted1, userdata.meta.name);
}
