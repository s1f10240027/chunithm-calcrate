import axios from "axios";
import * as cheerio from "cheerio";

export async function getJacketFromUnirec(id: string) {
  const url = `https://db.chunirec.net/music/${id}`;
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  const div = $("div.unidb-jacket-lg");
  const style = div.attr("style");

  if (style) {
    const match = style.match(/url\('([^']+)'\)/);
    if (match && match[1]) {
      const imageUrl = `https://db.chunirec.net${match[1]}`;
      return imageUrl;
    }
  }

  console.error("画像のURLが取得できませんでした。");
  const imageUrl = "https://ul.h3z.jp/iZzGl7oh.png";
  return imageUrl;
}

getJacketFromUnirec("ff3dd3751bea0ca3");
