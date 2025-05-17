import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from "dotenv";
dotenv.config();


import { client } from './client.js';
import "./commands.js";

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
        .setName('detail')
        .setDescription('Send the details of entered song.') 
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Music title')
                .setRequired(true)
                .setAutocomplete(true)
        ),
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


client.once('ready', async () => {
    if (client.user) {
        console.log(`Logged in as ${client.user.tag}!`);
    } else {
        console.log('Logged in, but client.user is null.');
    }
});


client.login(token)

