const fs = require('fs');
const path = require('path');
const nozzle = require('./nozzle.js');
const { keys, filename, outputFile } = require('./config.js');

// Helpers to format keys
function uint8ArrayToHex(obj) {
    return Object.values(obj)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

function convertMapToKeys(map) {
    const formattedKeys = {};
    map.forEach((value, key) => {
        formattedKeys[key.toString()] = uint8ArrayToHex(value);
    });
    return formattedKeys;
}

// Decrypt
(async () => {
    try {
        const filePath = path.resolve(__dirname, filename);
        const encryptedData = fs.readFileSync(filePath);
        let headerLength = nozzle.HaxParser.headerLength(encryptedData);
        let header = new Uint8Array(encryptedData.subarray(0, headerLength));

        let buffer = new nozzle.Ge();
        buffer.append(encryptedData);

        // Convert to the required format
        const formattedKeys = convertMapToKeys(keys);

        // Initialize parser with keys
        let hax = new nozzle.HaxParser(header, formattedKeys);

        // Read header and extra
        buffer.read(hax.headerLength);
        hax.handleExtra(buffer.read(hax.extraLength));

        // Decrypt
        decryptedSegments = [];

        try {
            for (let i = 0; i < hax.meta.segmentCount; i++) {
                let [start, end] = hax.segmentBounds(i);
                let segmentData = buffer.read(end - start);
                let decrypted = hax.decode(i, segmentData);
                decryptedSegments.push(decrypted);
            }
        } catch (y) {
            if (y instanceof nozzle.Ee) // this is where browser fetchkeys happen
            {
                console.error("Insufficient Keys: ", y.message);
            }
            else
                throw y
        }

        decryptedSegments.push(hax.extd);

        // Format
        const mergedAudio = Buffer.concat(decryptedSegments);

        // Write to disk
        const outputFilePath = path.resolve(__dirname, outputFile);
        fs.writeFileSync(outputFilePath, mergedAudio);

        console.log(`Decryption successful. Output written to ${outputFilePath}`);
    } catch (error) {
        console.error('Decryption failed:', error.message);
    }
})();