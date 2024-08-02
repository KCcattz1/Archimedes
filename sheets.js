// sheets.js

const { google } = require('googleapis');
const keys = require('./credentials.json');

// Initialize Google Sheets API client
const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
);

// Initialize Sheets API
const sheets = google.sheets({ version: 'v4', auth: client });

// Function to get reputation value for a character and faction
async function getRepValue(sheetId, character, faction) {
    const range = 'REP!A:Z'; // Define the range to fetch data
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values; // Get the data rows
    const characterIndex = rows[0].indexOf(character); // Find the column index for the character

    if (characterIndex === -1) return null; // Character not found

    // Iterate through the rows to find the faction
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === faction) {
            return rows[i][characterIndex];
        }
    }
    return null; // Faction not found
}

// Function to get all reputation values for a character
async function getAllRepValues(sheetId, character) {
    const range = 'REP!A:Z'; // Define the range to fetch data
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values; // Get the data rows
    const characterIndex = rows[0].indexOf(character); // Find the column index for the character

    if (characterIndex === -1) return null; // Character not found

    const repValues = {};
    for (let i = 1; i < rows.length; i++) {
        const faction = rows[i][0];
        const repValue = rows[i][characterIndex];
        repValues[faction] = repValue;
    }
    return repValues;
}

// Function to get faction data
async function getFactionData(sheetId, faction) {
    const range = `${faction}!A:D`; // Define the range to fetch faction data
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values.slice(1); // Exclude the header row
    return rows.map(row => ({
        minRep: parseInt(row[0], 10),
        maxRep: parseInt(row[1], 10),
        title: row[2],
        rewards: row[3],
    }));
}

// Function to get all factions
async function getAllFactions(sheetId) {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'REP!A2:A', // Define the range to fetch faction names
    });
    return response.data.values.flat(); // Return flattened array of faction names
}

// Function to get combined reputation value for a faction
async function getCombinedRepValue(sheetId, faction) {
    const range = 'REP!A:Z'; // Define the range to fetch data
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values; // Get the data rows
    const factionRow = rows.find(row => row[0] === faction); // Find the row for the faction

    if (!factionRow) return null; // Faction not found

    let combinedRepValue = 0;
    for (let i = 1; i < factionRow.length; i++) {
        const repValue = parseInt(factionRow[i], 10);
        if (!isNaN(repValue)) {
            combinedRepValue += repValue;
        }
    }
    return combinedRepValue;
}

// Function to get filtered factions based on combined reputation
async function getFilteredFactions(sheetId) {
    const allFactions = await getAllFactions(sheetId);
    const filteredFactions = [];

    for (const faction of allFactions) {
        const combinedRep = await getCombinedRepValue(sheetId, faction);
        if (combinedRep < -500 || combinedRep > 500) {
            filteredFactions.push(faction);
        }
    }
    return filteredFactions;
}

// Function to update data in a Google Sheet by adding/subtracting the value
async function updateData(sheetId, character, faction, deltaValue) {
    const range = 'REP!A:Z'; // Define the range to fetch data
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values; // Get the data rows
    const characterIndex = rows[0].indexOf(character); // Find the column index for the character
    const factionRow = rows.findIndex(row => row[0] === faction); // Find the row index for the faction

    if (characterIndex === -1 || factionRow === -1) {
        throw new Error('Character or Faction not found in the sheet');
    }

    const currentValue = parseInt(rows[factionRow][characterIndex], 10) || 0;
    const newValue = currentValue + deltaValue;

    const cellRange = `REP!${String.fromCharCode(65 + characterIndex)}${factionRow + 1}`; // Convert column index to letter and construct the range

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
