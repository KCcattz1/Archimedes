// deploy-commands.js

const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

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

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error reloading application (/) commands:', error);
    }
})();
