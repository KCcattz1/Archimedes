// deploy-commands.js

require('dotenv').config(); // Load environment variables from .env file

const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env; // Use environment variables

// Log environment variables to verify they are being read correctly
console.log('DISCORD_TOKEN:', DISCORD_TOKEN);
console.log('CLIENT_ID:', CLIENT_ID);
console.log('GUILD_ID:', GUILD_ID);

const commands = [
    {
        name: 'archimedes',
        description: 'Various Archimedes commands',
        options: [
            {
                name: 'rep',
                description: 'Check reputation with a faction',
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: 'role',
                        description: 'Select your role',
                        type: ApplicationCommandOptionType.String,
                        required: true,
                        autocomplete: true
                    },
                    {
                        name: 'faction',
                        description: 'Select a faction',
                        type: ApplicationCommandOptionType.String,
                        required: true,
                        autocomplete: true
                    }
                ]
            },
            {
                name: 'nextrep',
                description: 'Check next reputation tier',
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: 'role',
                        description: 'Select your role',
                        type: ApplicationCommandOptionType.String,
                        required: true,
                        autocomplete: true
                    },
                    {
                        name: 'faction',
                        description: 'Select a faction',
                        type: ApplicationCommandOptionType.String,
                        required: true,
                        autocomplete: true
                    },
                    {
                        name: 'direction',
                        description: 'Select direction',
                        type: ApplicationCommandOptionType.String,
                        required: true,
                        choices: [
                            { name: 'up', value: 'up' },
                            { name: 'down', value: 'down' }
                        ]
                    }
                ]
            },
            {
                name: 'durendalrep',
                description: 'Check combined reputation for a faction',
                type: ApplicationCommandOptionType.Subcommand,
                options: []
            },
            {
                name: 'repupdate',
                description: 'Update reputation value',
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: 'role',
                        description: 'Select the role to update',
                        type: ApplicationCommandOptionType.String,
                        required: true,
                        autocomplete: true
                    },
                    {
                        name: 'faction',
                        description: 'Select the faction',
                        type: ApplicationCommandOptionType.String,
                        required: true,
                        autocomplete: true
                    },
                    {
                        name: 'value',
                        description: 'New reputation value',
                        type: ApplicationCommandOptionType.Integer,
                        required: true
                    }
                ]
            }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error reloading application (/) commands:', error);
    }
})();
