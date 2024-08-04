// sheets.js

const { google } = require('googleapis');
const keys = require('./credentials.json');

const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth: client });

async function getRepValue(sheetId, character, faction) {
    const range = 'REP!A:Z';
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values;
    const characterIndex = rows[0].indexOf(character);

    if (characterIndex === -1) return null;

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === faction) {
            return rows[i][characterIndex];
        }
    }
    return null;
}

async function getAllRepValues(sheetId, character) {
    const range = 'REP!A:Z';
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values;
    const characterIndex = rows[0].indexOf(character);

    if (characterIndex === -1) return null;

    const repValues = {};
    for (let i = 1; i < rows.length; i++) {
        const faction = rows[i][0];
        const repValue = rows[i][characterIndex];
        repValues[faction] = repValue;
    }
    return repValues;
}

async function getFactionData(sheetId, faction) {
    const range = `${faction}!A:D`;
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values.slice(1);
    return rows.map(row => ({
        minRep: parseInt(row[0], 10),
        maxRep: parseInt(row[1], 10),
        title: row[2],
        rewards: row[3],
    }));
}

async function getAllFactions(sheetId) {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'REP!A2:A',
    });
    return response.data.values.flat();
}

async function getCombinedRepValue(sheetId, faction) {
    const range = 'REP!A:Z';
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values;
    const factionRow = rows.find(row => row[0] === faction);

    if (!factionRow) return null;

    let combinedRepValue = 0;
    for (let i = 1; i < factionRow.length; i++) {
        const repValue = parseInt(factionRow[i], 10);
        if (!isNaN(repValue)) {
            combinedRepValue += repValue;
        }
    }
    return combinedRepValue;
}

async function getFilteredFactions(sheetId) {
    const allFactions = await getAllFactions(sheetId);
    const filteredFactions = [];

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'REP!A:Z',
    });

    const rows = response.data.values;

    for (const faction of allFactions) {
        const combinedRep = await getCombinedRepValue(sheetId, faction);

        if (combinedRep < -500 || combinedRep > 500) {
            const factionRow = rows.find(row => row[0] === faction);

            if (factionRow) {
                let playerCount = 0;

                for (let i = 1; i < factionRow.length; i++) {
                    const repValue = parseInt(factionRow[i], 10);
                    if (!isNaN(repValue) && repValue !== 0) {
                        playerCount++;
                    }
                }

                if (playerCount > 4) {
                    filteredFactions.push(faction);
                }
            }
        }
    }
    return filteredFactions;
}

async function updateData(sheetId, character, faction, deltaValue) {
    const rows = await getCachedRepData(sheetId);
    const characterIndex = rows[0].indexOf(character);
    const factionRow = rows.findIndex(row => row[0] === faction);

    if (characterIndex === -1 || factionRow === -1) {
        throw new Error('Character or Faction not found in the sheet');
    }

    const currentValue = parseInt(rows[factionRow][characterIndex], 10) || 0;
    const newValue = currentValue + deltaValue;

    const cellRange = `REP!${String.fromCharCode(65 + characterIndex)}${factionRow + 1}`;

    try {
        const result = await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: cellRange,
            valueInputOption: 'RAW',
            resource: {
                values: [[newValue]]
            }
        });
        console.log('Data updated successfully:', result.data);
        return result.data;
    } catch (error) {
        console.error('Error updating data:', error);
        throw error;
    }
}

module.exports = {
    getRepValue,
    getAllRepValues,
    getFactionData,
    getAllFactions,
    getCombinedRepValue,
    getFilteredFactions,
    updateData
};
