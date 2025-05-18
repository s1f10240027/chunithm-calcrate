import { Events, EmbedBuilder, Interaction, AttachmentBuilder } from 'discord.js';
import { update_savedata, SaveResult } from './update_savedata.js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import axios from 'axios';


import { client } from './client.js';
import { getSongData } from './search.js';
import { getJacketFromUnirec } from './get_jacket.js';


const ErrorColor = 0xd80b0b;
const SuccessColor = 0x2ee23d;

function normalize(str: string): string {
    return str
        .replace(/[\u30a1-\u30f6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60)) // カタカナ→ひらがな
        .replace(/[Ａ-Ｚａ-ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))    // 全角英字→半角
        .toLowerCase();
}

const SongsData = JSON.parse(fs.readFileSync("songs.json", "utf-8"));

const NormalizedSongs = SongsData.map((song: any) => ({
    title: song.title,
    normalizedTitle: normalize(song.title)
}));

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
	if (!interaction.isAutocomplete()) return;

    if (interaction.commandName === 'register' || interaction.commandName === 'delete' || interaction.commandName === 'detail') {
        const focusedValue = normalize(interaction.options.getFocused());

        const filtered = NormalizedSongs
            .filter((song: { title: string; normalizedTitle: string }) => song.normalizedTitle.startsWith(focusedValue))
            .slice(0, 10)
            .map((song: { title: string; normalizedTitle: string }) => ({
                name: song.title,
                value: song.title
            }));
            
        await interaction.respond(filtered);
    };

});
function deleteTmpFiles(filePath: string) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return;
        } else {
            console.log(`File not found: ${filePath}`);
            return;
        }
    } catch (error) {
        console.error(`Error deleting file: ${error}`);
        return;
    }
}
client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'register') {
        
        const title: string = interaction.options.getString('title')!;
        const difficulty: string = interaction.options.getString('difficulty')!;
        const score: number = interaction.options.getNumber('score')!;
        const result = update_savedata(title, difficulty, score, "register");
        if (!result) {
            await interaction.reply('エラー: 結果が取得できませんでした。');
            return;
        }
        if (result instanceof Error) {
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setColor(ErrorColor)
                .setTitle(`エラーが発生しました`)
                .setDescription(result.message)
            await interaction.reply({ embeds: [embed] });
            return;
        } else {
            const saveResult = result as SaveResult;
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setColor(SuccessColor)
                .setTitle(`登録が正常に完了しました`)
                .addFields(
                    { name: '曲名', value: saveResult.title, inline: true },
                    { name: '難易度', value: saveResult.difficulty, inline: true },
                    { name: '\u200B', value: '\u200B', inline: true }
                )
                .addFields(
                    { name: 'スコア', value: saveResult.score != null ? saveResult.score.toLocaleString() : 'N/A', inline: true },
                    { name: 'レート', value: `${saveResult.const} → ${saveResult.rate}`, inline: true },
                    { name: '\u200B', value: '\u200B', inline: true }
                );
            await interaction.reply({ embeds: [embed] });
            return;
        }
    } else if (interaction.commandName === 'delete') {
        
        const title: string = interaction.options.getString('title')!;
        const difficulty: string = interaction.options.getString('difficulty')!;
        const result = update_savedata(title, difficulty, 0, "delete");
        if (!result) {
            await interaction.reply('エラー: 結果が取得できませんでした。');
            return;
        }
        if (result instanceof Error) {
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setColor(ErrorColor)
                .setTitle(`エラーが発生しました`)
                .setDescription(result.message)
            await interaction.reply({ embeds: [embed] });
            return;
        } else {
            const saveResult = result as SaveResult;
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setColor(SuccessColor)
                .setTitle(`データの削除が正常に完了しました`)
                .addFields(
                    { name: '曲名', value: saveResult.title, inline: true },
                    { name: '難易度', value: saveResult.difficulty, inline: true },
                )
            await interaction.reply({ embeds: [embed] });
            return;
        }
    } else if (interaction.commandName === 'detail') {
        const title: string = interaction.options.getString('title')!;
        const song = SongsData.find((song: any) => song.title === title);
        if (song) {
            const songDataResult = await getSongData(song.id);
            if (songDataResult instanceof Error) {
                const embed = new EmbedBuilder()
                    .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                    .setColor(ErrorColor)
                    .setTitle(`エラーが発生しました`)
                    .setDescription(songDataResult.message)
                await interaction.reply({ embeds: [embed] });
                return;
            } else { 
                const songData = songDataResult;

                let image: string = await getJacketFromUnirec(songData.meta.id);
                if (!image) {
                    image = "https://ul.h3z.jp/iZzGl7oh.png";
                }     
                const tempImagePath = path.join("tmp", `jacket_original_${interaction.user.id}_${Date.now()}.jpg`);
                const resizeImagePath = path.join("tmp", `jacket_resized_${interaction.user.id}__${Date.now()}.jpg`);
                const response = await axios.get(image, {
                    responseType: "arraybuffer",
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        "Referer": "https://db.chunirec.net/", 
                    },
                });

                if (!fs.existsSync('./tmp')) {
                    console.log('tmpフォルダが存在しません');
                }
                fs.writeFileSync(tempImagePath, response.data);    
                const buffer = fs.readFileSync(tempImagePath);
                await sharp(buffer)
                    .resize(300, 300)
                    .toFile(resizeImagePath);

                const file = new AttachmentBuilder(resizeImagePath, { name: `thumbnail_${interaction.user.id}.jpg` });  
                const embed = new EmbedBuilder()
                    .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                    .setColor(SuccessColor)
                    .setTitle(title)
                    .setImage(`attachment://thumbnail_${interaction.user.id}.jpg`)
                    .addFields(
                        { name: 'ジャンル', value: String(songData.meta.genre), inline: true },
                        { name: 'アーティスト', value: String(songData.meta.artist), inline: true },
                        { name: '\u200B', value: '\u200B', inline: true },
                        
                    )
                    .addFields(
                        { name: 'リリース日', value: String(songData.meta.release), inline: true },
                        { name: '解禁方法', value: String(songData.meta.unlock), inline: true },
                        { name: 'BPM', value: String(songData.meta.bpm ? songData.meta.bpm : "-"), inline: true },
                    )
                    .addFields(
                        {
                            name: '譜面定数:',
                            value:
                                `**Basic**: ${songData.data.BAS ? `${songData.data.BAS.const}` : '-'}\n` +
                                `**Advanced**: ${songData.data.ADV ? `${songData.data.ADV.const}` : '-'}\n` +
                                `**Expert**: ${songData.data.EXP ? `${songData.data.EXP.const}` : '-'}\n` +
                                `**Master**: ${songData.data.MAS ? `${songData.data.MAS.const}` : '-'}\n` +
                                `**Ultima**: ${songData.data.ULT ? `${songData.data.ULT.const}` : '-'}`,
                            inline: false
                        }
                    );

                await interaction.reply({ 
                    files: [file],
                    embeds: [embed] 
                });
                deleteTmpFiles(tempImagePath);
                deleteTmpFiles(resizeImagePath);
                return;
            }
        } else {
            await interaction.reply('曲が見つかりませんでした。');
            return;
        };

    } else if (interaction.commandName === 'shutdown') {
        interaction.reply('Botをシャットダウンします。');
        client.destroy();
    }
});