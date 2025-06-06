import { REST, Routes, SlashCommandBuilder, ActivityType, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import dotenv from "dotenv";
dotenv.config();


import { client } from './client.js';
import "./commands.js";
import { update_songs } from './update_songdata.js';


const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;

const rest = new REST({ version: '10' }).setToken(token);


const commandsWithOptions = [
    new SlashCommandBuilder()
        .setName('register')
        .setDescription('Save data to your results.')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Music title')
                .setRequired(true)
                .setAutocomplete(true)
        )   
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('EXPART, MASTER, ULTIMA')
                .setRequired(true)
                .addChoices(
                    { name: 'EXPART', value: 'EXPART' },
                    { name: 'MASTER', value: 'MASTER' },
                    { name: 'ULTIMA', value: 'ULTIMA' }
                )
        )
        .addNumberOption(option =>
            option.setName('score')
                .setDescription('your record')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Delete your results.')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Music title')
                .setRequired(true)
                .setAutocomplete(true)
        )   
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('EXPART, MASTER, ULTIMA')
                .setRequired(true)
                .addChoices(
                    { name: 'EXPART', value: 'EXPART' },
                    { name: 'MASTER', value: 'MASTER' },
                    { name: 'ULTIMA', value: 'ULTIMA' }
                )
        ),

    new SlashCommandBuilder()
        .setName('search')
        .setDescription('Send the details of entered song.') 
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Select the type of search')
                .setRequired(true)
                .addChoices(
                    { name: 'title', value: 'title' },
                    { name: 'artist', value: 'artist' },
                    { name: 'difficulty', value: 'difficulty' }
                )
        )
        .addStringOption(option =>
            option.setName('value')
                .setDescription('Music title or Artist name')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    new SlashCommandBuilder()
        .setName('rating')
        .setDescription('make a rating image.'),
    
    new SlashCommandBuilder()
        .setName('shutdown')
        .setDescription('Botをシャットダウンします。')
            
].map(command => command.toJSON());

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commandsWithOptions },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

(async () => {
    const NewSongs = await update_songs("update");
    console.log(NewSongs);
    if (NewSongs) {
        const channelId = process.env.AlartChannelId;
        if (channelId) {
            const channel = client.channels.cache.get(channelId);
            if (channel && channel.isTextBased() && channel.type === 0) { 
                let desc = NewSongs.join("\n・");
                const embed = new EmbedBuilder()
                    .setTitle(`新曲が登録されました`)
                    .setDescription(`・${desc}`);
                await channel.send({ embeds: [embed] });
            }
        }
    }
})();

client.once('ready', async () => {
    if (client.user) {
        console.log(`Logged in as ${client.user.tag}!`);
        client.user.setActivity({ name: 'CHUNITHM VERSE', type: ActivityType.Playing });
        fs.readdir('./tmp', (err: any, files: string[]) => {
            if (err) {
                console.error('Error reading directory:', err);
                return;
            }
            for (const file of files) {
                fs.unlink(`./tmp/${file}`, (err: any) => {
                    if (err) {
                        console.error('Error deleting file:', err);
                    } else {
                        console.log(`Deleted tmp files`);
                    }
                });
            }
        });
    } else {
        console.log('Logged in, but client.user is null.');
    }
});


client.login(token)

