// index.js

const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRepValue, getFactionData, getAllFactions, getAllRepValues, getCombinedRepValue, getFilteredFactions, updateData } = require('./sheets');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

const REQUIRED_ROLE_NAME = 'Dungeon Master'; // Define the required role name here

// Define message templates for various responses
const templates = {
    noRole: roleName => `Ah, it seems you lack the necessary authority, dear adventurer. Only those bestowed with the title of **${roleName}** may use this command.`,
    repStatus: (roleName, faction, repValue, rewards, title) => `Ah, council member **${roleName}**, your reputation with **${faction}** as it currently stands is **${repValue}**, awarding you the title of **${title}**. The benefits or drawbacks that you may garner are as follows: **${rewards}**.`,
    noRewards: (roleName, faction, repValue) => `Alas, no rewards are available for **${roleName}** with **${faction}** at the reputation value of **${repValue}**.`,
    noRepValue: (roleName, faction) => `I regret to inform you, **${roleName}**, that no reputation value was found for you with **${faction}**.`,
    nextTier: (roleName, faction, direction, title, requiredRep) => `Noble **${roleName}**, the next tier and title for **${faction}** in the **${direction}wards** is **${title}**. You require **${requiredRep}** more reputation points to transcend this tier.`,
    noMoreTiers: (roleName, faction, direction) => `There are no further tiers in the **${direction}** direction for **${roleName}** with **${faction}**. You have reached the pinnacle, or the nadir.`,
    noCurrentTier: (roleName, faction) => `I could not find the current tier of repute with **${faction}** for you, **${roleName}**. This is most peculiar.`,
    repUpdateSuccess: (roleName, faction, deltaValue) => `Reputation for **${roleName}** with the **${faction}** faction has been successfully adjusted by **${deltaValue}**. The records are now up to date.`,
    repUpdateFailure: (roleName, faction) => `I regret to inform you that the attempt to adjust reputation for **${roleName}** with **${faction}** has failed. Please try again.`,
    combinedRep: (faction, combinedRepValue, rewards, title) => `Durendal's diplomatic relationship with **${faction}** sits at **${combinedRepValue}**. This garners the following benefits or drawbacks: **${rewards}**, and our current standing with them is as follows: **${title}**.`,
    noCombinedRewards: (faction, combinedRepValue) => `No rewards are found for **${faction}** at the combined reputation value of **${combinedRepValue}**.`,
    noCombinedRepValue: faction => `There appears to be no reputation value found for the faction **${faction}**. This is quite unusual.`
};

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isCommand() && !interaction.isButton() && !interaction.isAutocomplete()) return;

    const { commandName, options, member } = interaction;

    // Function to check if the user has the required role
    const hasRequiredRole = member.roles.cache.some(role => role.name === REQUIRED_ROLE_NAME);

    if (interaction.isAutocomplete()) {
        const focusedOption = interaction.options.getFocused(true);
        try {
            if (focusedOption.name === 'role') {
                const isDungeonMaster = hasRequiredRole;

                let roles;
                // If the user is a Dungeon Master, show all roles
                if (isDungeonMaster) {
                    roles = member.guild.roles.cache
                        .filter(role => role.name !== '@everyone') // Exclude @everyone role
                        .map(role => ({ name: role.name, value: role.name }));
                } else {
                    // Otherwise, show only the user's roles
                    roles = member.roles.cache
                        .filter(role => role.name !== '@everyone') // Exclude @everyone role
                        .map(role => ({ name: role.name, value: role.name }));
                }

                // Filter roles based on user's input
                const filteredRoles = roles.filter(role =>
                    role.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                );
                await interaction.respond(
                    filteredRoles.map(role => ({ name: role.name, value: role.value }))
                );
            } else if (focusedOption.name === 'faction') {
                const roleName = options.getString('role');
                const allRepValues = await getAllRepValues(config.SPREADSHEET_ID, roleName);

                // Filter factions based on reputation values (non-zero and non-blank)
                const filteredFactions = Object.keys(allRepValues).filter(faction => {
                    const repValue = allRepValues[faction];
                    return repValue && repValue !== '0';
                });

                await interaction.respond(
                    filteredFactions.map(faction => ({ name: faction, value: faction }))
                );
            }
        } catch (error) {
            console.error('Error in faction autocomplete:', error);
        }
        return;
    }

    if (interaction.isCommand()) {
        if (commandName === 'archimedes' && options.getSubcommand() === 'rep') {
            const roleName = options.getString('role');
            const faction = options.getString('faction');
            const repValue = await getRepValue(config.SPREADSHEET_ID, roleName, faction);

            if (repValue !== null) {
                const factionData = await getFactionData(config.SPREADSHEET_ID, faction);
                const currentTier = factionData.find(tier => repValue >= tier.minRep && repValue <= tier.maxRep);
                if (currentTier) {
                    const { title, rewards } = currentTier;
                    await interaction.reply({
                        content: templates.repStatus(roleName, faction, repValue, rewards, title),
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: templates.noRewards(roleName, faction, repValue),
                        ephemeral: true
                    });
                }
            } else {
                await interaction.reply({
                    content: templates.noRepValue(roleName, faction),
                    ephemeral: true
                });
            }
        }

        if (commandName === 'archimedes' && options.getSubcommand() === 'nextrep') {
            const roleName = options.getString('role');
            const faction = options.getString('faction');
            const direction = options.getString('direction');

            const repValue = await getRepValue(config.SPREADSHEET_ID, roleName, faction);

            if (repValue !== null) {
                const factionData = await getFactionData(config.SPREADSHEET_ID, faction);
                let nextTier;

                const currentTierIndex = factionData.findIndex(tier => repValue >= tier.minRep && repValue <= tier.maxRep);

                if (currentTierIndex >= 0) {
                    if (direction === 'up') {
                        nextTier = factionData[currentTierIndex + 1];
                        if (nextTier) {
                            const requiredRep = nextTier.minRep - repValue;
                            await interaction.reply({
                                content: templates.nextTier(roleName, faction, direction, nextTier.title, requiredRep),
                                ephemeral: true
                            });
                        } else {
                            await interaction.reply({
                                content: templates.noMoreTiers(roleName, faction, direction),
                                ephemeral: true
                            });
                        }
                    } else if (direction === 'down') {
                        nextTier = factionData[currentTierIndex - 1];
                        if (nextTier) {
                            const requiredRep = repValue - nextTier.maxRep;
                            await interaction.reply({
                                content: templates.nextTier(roleName, faction, direction, nextTier.title, requiredRep),
                                ephemeral: true
                            });
                        } else {
                            await interaction.reply({
                                content: templates.noMoreTiers(roleName, faction, direction),
                                ephemeral: true
                            });
                        }
                    }
                } else {
                    await interaction.reply({
                        content: templates.noCurrentTier(roleName, faction),
                        ephemeral: true
                    });
                }
            } else {
                await interaction.reply({
                    content: templates.noRepValue(roleName, faction),
                    ephemeral: true
                });
            }
        }

        if (commandName === 'archimedes' && options.getSubcommand() === 'durendalrep') {
            await interaction.deferReply({ ephemeral: true });

            const filteredFactions = await getFilteredFactions(config.SPREADSHEET_ID);
            const buttons = filteredFactions.map(faction =>
                new ButtonBuilder()
                    .setCustomId(faction)
                    .setLabel(faction)
                    .setStyle(ButtonStyle.Primary)
            );

            const rows = [];
            for (let i = 0; i < buttons.length; i += 5) {
                rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
            }

            await interaction.editReply({
                content: 'Please select a political faction to receive tidings of Durendal\'s current combined diplomatic relationship.:',
                components: rows
            });
        }

        if (commandName === 'archimedes' && options.getSubcommand() === 'repupdate') {
            if (!hasRequiredRole) {
                await interaction.reply({
                    content: templates.noRole(REQUIRED_ROLE_NAME),
                    ephemeral: true
                });
                return;
            }

            const roleName = options.getString('role');
            const faction = options.getString('faction');
            const deltaValue = options.getInteger('value');

            try {
                const response = await updateData(config.SPREADSHEET_ID, roleName, faction, deltaValue);
                await interaction.reply({
                    content: templates.repUpdateSuccess(roleName, faction, deltaValue),
                    ephemeral: true
                });
            } catch (error) {
                await interaction.reply({
                    content: templates.repUpdateFailure(roleName, faction),
                    ephemeral: true
                });
            }
        }
    }

    if (interaction.isButton()) {
        const faction = interaction.customId;
        await interaction.deferUpdate();

        const combinedRepValue = await getCombinedRepValue(config.SPREADSHEET_ID, faction);
        if (combinedRepValue !== null) {
            const diplomacyData = await getFactionData(config.SPREADSHEET_ID, 'DIPLOMACY');
            const currentTier = diplomacyData.find(tier => combinedRepValue >= tier.minRep && combinedRepValue <= tier.maxRep);
            if (currentTier) {
                const { title, rewards } = currentTier;
                await interaction.followUp({
                    content: templates.combinedRep(faction, combinedRepValue, rewards, title),
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: templates.noCombinedRewards(faction, combinedRepValue),
                    ephemeral: true
                });
            }
        } else {
            await interaction.followUp({
                content: templates.noCombinedRepValue(faction),
                ephemeral: true
            });
        }
    }
});

client.login(config.token);
