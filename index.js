// app.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const ACCOUNTS_FILE = path.join(__dirname, 'public/minecraft/data/accounts.json');

// parse form bodies
// app.use(express.urlencoded({ extended: false }));
app.use(express.json())

async function readAccounts() {
  try {
    const txt = await fs.readFile(ACCOUNTS_FILE, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    if (err.code === 'ENOENT') return []; // file not found -> start empty list
    throw err; // other error -> crash so we notice
  }
}

async function writeAccounts(accounts) {
  // overwrite file with formatted JSON
  await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

app.post('/minecraft/signup', async (req, res) => {
  try {
    const { realname = '', mcusername = '', password = '', phone = '' } = req.body;

    // push array-of-strings as you requested
    const accounts = await readAccounts();
    accounts.push({ realname, mcusername, password, phone });
    await writeAccounts(accounts);

    res.send('Account created (very simple demo).');
  } catch (err) {
    console.error('Error saving account:', err);
    res.status(500).send('Server error');
  }
});

// Optional: serve your static HTML from the same server
app.use('/', express.static(path.join(__dirname, 'public'))); // put your HTML in ./public

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
