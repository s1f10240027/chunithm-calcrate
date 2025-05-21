import { Events, EmbedBuilder, Interaction, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { update_savedata, SaveResult } from './update_savedata.js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import axios from 'axios';


import { client } from './client.js';
import { getSongData } from './search.js';
import { getJacketFromUnirec } from './get_jacket.js';
import { sortResults } from './show_rating.js';
//import { diff } from 'util';

const ErrorColor: number = 0xd80b0b;
const SuccessColor: number = 0x2ee23d;

const ratingProcessingUsers = new Set<string>();

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

// AutoComplete
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isAutocomplete()) return;

    if (
        (interaction.commandName === 'register' || interaction.commandName === 'delete' || 
        (interaction.commandName === 'search' && interaction.options.getString('type') === 'title'))
    ) {
        const focusedValue = normalize(interaction.options.getFocused());

        const filtered: { name: string; value: string }[] = [];
        for (const song of NormalizedSongs) {
            if (song.normalizedTitle.startsWith(focusedValue)) {
                filtered.push({ name: song.title, value: song.title });
                if (filtered.length >= 10) break;
            }
        }
        await interaction.respond(filtered);
    
    } else if (interaction.commandName === 'search' && interaction.options.getString('type') === 'artist') {
        const filtered: { name: string; value: string }[] = [
            { name: "アーティスト検索では候補の自動補完は利用できません", value: "アーティスト検索では候補の自動補完は利用できません" }
        ];
        await interaction.respond(filtered);
        return;
    } else if (interaction.commandName === 'search' && interaction.options.getString('type') === 'difficulty') {
        const diffs: { name: string; value: string }[] = [];
        for (let i = 15; i >= 7; i--) {
            diffs.push({ name: `${i}+`, value: (i + 0.5).toString() });
            diffs.push({ name: `${i}`, value: i.toString() });
        }
        const filtered: { name: string; value: string }[] = diffs;
        await interaction.respond(filtered);
        return;

    }
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
        const result = await update_savedata(title, difficulty, score, "register", interaction.user.id);
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
        const result = await update_savedata(title, difficulty, 0, "delete", interaction.user.id);
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
    } else if (interaction.commandName === 'search') {

        const type: string = interaction.options.getString('type')!;
        const value: string = interaction.options.getString('value')!;
        if (type == "title") {
            await interaction.deferReply({ ephemeral: false });
            const song = SongsData.find((song: any) => song.title === value);
            if (song) {

                const songDataResult = await getSongData(song.id);
                if (songDataResult instanceof Error) {
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                        .setColor(ErrorColor)
                        .setTitle(`エラーが発生しました`)
                        .setDescription(songDataResult.message)
                    await interaction.editReply({ embeds: [embed] });
                    return;
                } else { 
                    const songData = songDataResult;

                    let image: string = await getJacketFromUnirec(songData.meta.id);
                    if (!image) {
                        image = "https://ul.h3z.jp/iZzGl7oh.png";
                    }     
    
                    const now = Date.now();
                    const resizeImagePath = path.join("tmp", `jacket_resized_${interaction.user.id}_${now}.jpg`);
                    const response = await axios.get(image, {
                        responseType: "arraybuffer",
                        headers: {
                            "User-Agent": "Mozilla/5.0",
                            "Referer": "https://db.chunirec.net/", 
                        },
                    });

                    await sharp(response.data)
                        .resize(300, 300)
                        .toFile(resizeImagePath);
                    const file = new AttachmentBuilder(resizeImagePath, { name: `thumbnail_${interaction.user.id}.jpg` });  
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                        .setColor(SuccessColor)
                        .setTitle(value)
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
                    await interaction.editReply({ 
                        files: [file],
                        embeds: [embed] 
                    });
                    deleteTmpFiles(resizeImagePath);
                    return;
                }
            } else {
                await interaction.reply('曲が見つかりませんでした。');
                return;
            };
        } else if (type == "artist") {
            const artist = SongsData.filter((song: any) => song.artist.toLowerCase().includes(value.toLowerCase()));
            if (artist.length > 0) {
                const embed = new EmbedBuilder()
                    .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                    .setColor(SuccessColor)
                    .setTitle(`${value} を含むアーティストの楽曲`);
                try {
                    const artistMap: { [artist: string]: string[] } = {};
                    artist.forEach((song: any) => {
                        if (!artistMap[song.artist]) {
                            artistMap[song.artist] = [];
                        }
                        artistMap[song.artist].push(` ・${song.title}`);
                    });

                    for (const [artistName, titles] of Object.entries(artistMap)) {
                        embed.addFields({
                            name: artistName,
                            value: titles.join('\n'),
                            inline: false
                        });
                    }
                    await interaction.reply({ embeds: [embed] });
                    return;
                } catch (error) {
                    console.error('Error:', error);
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                        .setColor(ErrorColor)
                        .setTitle(`エラーが発生しました`)
                        .setDescription("候補が多すぎるため、より具体的に入力してください。")
                    await interaction.reply({ embeds: [embed] });
                    return;
                }
            } else {
                await interaction.reply('アーティストが見つかりませんでした。');
                return;
            };
        } else if (type == "difficulty") {
            let minnum = parseFloat(value);
            let maxnum = minnum + 0.4;

            let diffData = SongsData.filter((song: any) => 
                (
                    (minnum <= parseFloat(song.dif_exp) && parseFloat(song.dif_exp) <= maxnum) ||
                    (minnum <= parseFloat(song.dif_mas) && parseFloat(song.dif_mas) <= maxnum) ||
                    (minnum <= parseFloat(song.dif_ult) && parseFloat(song.dif_ult) <= maxnum)
                )
            );
            if (diffData.length > 0) {

                const difficulties = ['dif_exp', 'dif_mas', 'dif_ult'];
                const diffMap_verse: { [key: string]: string[] } = {};
                const diffMap_noverse: { [key: string]: string[] } = {};
                for (let i = minnum; i < maxnum; i += 0.1) {
                    diffMap_verse[i.toFixed(1)] = ["**新曲：**"];
                    diffMap_noverse[i.toFixed(1)] = ["**過去曲：**"];
                }

                diffData.sort((a: any, b: any) => a.title.localeCompare(b.title));
                for (const song of diffData) {
                    for (const diffKey of difficulties) {
                        const diffValue = parseFloat(song[diffKey]);
                        if (diffValue >= minnum && diffValue <= maxnum) {
                            const key = diffValue.toFixed(1);
                            if (song.verse) {
                                diffMap_verse[key].push(` ・${song.title}`);
                            } else {
                                diffMap_noverse[key].push(` ・${song.title}`);
                            }
                        }
                    }
                }

                const embeds: EmbedBuilder[] = [];
                for (const key in diffMap_verse) {
                    let count_verse = diffMap_verse[key].length -1;
                    let count_noverse = diffMap_noverse[key].length -1;
                    console.log(`count_verse: ${count_verse}, count_noverse: ${count_noverse}`);
                    if (count_verse == 0) {
                        diffMap_verse[key].push("\-");
                    }
                    if (count_noverse == 0) {
                        diffMap_noverse[key].push("\-");
                    }
                    if (count_verse + count_noverse != 0){
                        const descriptions = diffMap_verse[key].join('\n') + '\n\n' + diffMap_noverse[key].join('\n');
                        const embed = new EmbedBuilder()
                            .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                            .setColor(SuccessColor)
                            .setTitle(`譜面定数: ${key}  -  ${count_verse + count_noverse}楽曲`)
                            .setDescription(descriptions);
                        embeds.push(embed);
                    }
                }

                let index = 0;
                const localEmbeds = embeds;
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
                    new ButtonBuilder()
                        .setCustomId('first')
                        .setLabel('<<')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index == 0),
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('<')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index == 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('>')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index == localEmbeds.length - 1),
                    new ButtonBuilder()
                        .setCustomId('last')
                        .setLabel('>>')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index == localEmbeds.length - 1)
                ]);
                
                const sentMessage = await interaction.reply({ embeds: [localEmbeds[index]], components: [row.toJSON()], fetchReply: true });

                const col = interaction.channel?.createMessageComponentCollector({
                    filter: (i) => 
                        i.user.id === interaction.user.id &&
                        i.message.id === sentMessage.id,
                    time: 1000 * 600,
                    idle: 1000 * 180
                });
                col?.on('collect', async (i) => {
                    try {
                        if (i.customId === 'next') {
                            index++;
                        } else if (i.customId === 'prev') {
                            index--;
                        } else if (i.customId === 'first') {
                            index = 0;
                        } else if (i.customId === 'last') {
                            index = localEmbeds.length - 1;
                        }
                        if (index < 0) index = 0;
                        if (index >= localEmbeds.length) index = localEmbeds.length - 1;

                        const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId('first')
                                .setLabel('<<')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(index == 0),
                            new ButtonBuilder()
                                .setCustomId('prev')
                                .setLabel('<')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(index == 0),
                            new ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(index == localEmbeds.length - 1),
                            new ButtonBuilder()
                                .setCustomId('last')
                                .setLabel('>>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(index == localEmbeds.length - 1)
                        );

                        await i.update({ embeds: [localEmbeds[index]], components: [newRow.toJSON()] });
                    } catch (error) {}
                });

                col?.on('end', () => {
                    try {
                        interaction.editReply({ components: [] });
                    } catch (error) {}
                });
            }
        } else {
            await interaction.reply('無効な検索タイプです。');
            return;
        }
    } else if (interaction.commandName === 'rating') {
        
        if (ratingProcessingUsers.has(interaction.user.id)) {
            await interaction.reply({
                        content: "既に実行中です。しばらくお待ちください。",
                        ephemeral: true
                    });
                return;
            }
        ratingProcessingUsers.add(interaction.user.id);
        try{
            await interaction.reply({
                content: "画像を生成中です...\nこれには数十秒かかる場合があります。",
                ephemeral: true
            });
            const result = await sortResults(interaction.user.id)
            if (result) { 
                const outputPath = path.join("outputs", `${interaction.user.tag}.png`);
                if (!fs.existsSync(outputPath)) {
                    const embed = new EmbedBuilder()
                        .setColor(ErrorColor)
                        .setTitle("画像生成に失敗しました")
                        .setDescription("画像ファイルが見つかりませんでした。");
                    await interaction.editReply({ embeds: [embed], content: null });
                    return;
                }
                const file = new AttachmentBuilder(outputPath, { name: `${interaction.user.id}.png` });
                if (interaction.channel && interaction.channel.type == 0) {
                    await interaction.channel.send({ files: [file], content: `<@${interaction.user.id}>` });
                } else {
                    const embed = new EmbedBuilder()
                        .setColor(ErrorColor)
                        .setTitle("エラーが発生しました")
                        .setDescription("チャンネルが見つかりませんでした。");
                    await interaction.editReply({ embeds: [embed], content: null });
                }
            } else {
                const embed = new EmbedBuilder()
                    .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                    .setColor(ErrorColor)
                    .setTitle(`エラーが発生しました`)
                await interaction.editReply({ embeds: [embed], content: null })
                return;
            }
        } finally {
            ratingProcessingUsers.delete(interaction.user.id);
        }

    } else if (interaction.commandName === 'shutdown') {
        if (interaction.user.id == process.env.ADMIN_ID) {
            interaction.reply({
                content: "Botをシャットダウンします。",
                ephemeral: true
            });
            
            client.destroy();
        } else {
            interaction.reply({
                content: "このコマンドを実行する権限がありません。",
                ephemeral: true
            });
        }
    }
});