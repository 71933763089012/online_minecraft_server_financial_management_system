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

    let hasError = false;
    let errorMessages = { realname: '', mcusername: '', password: '', phone: '' };

    if (realname === '') {
      errorMessages.realname = 'This should be filled out';
      hasError = true;
    }
    if (mcusername === '') {
      errorMessages.mcusername = 'This should be filled out';
      hasError = true;
    } else {
      const accounts = await readAccounts();
      if (accounts.some(account => account.mcusername === mcusername)) {
        errorMessages.mcusername = 'This account already exists';
        hasError = true;
      }
    }
    if (password === '') {
      errorMessages.password = 'This should be filled out';
      hasError = true;
    } else if (password.length < 8) {
      errorMessages.password = 'Must be at least 8 charectors'
      hasError = true;
    } else if (password === password.toLowerCase()) {
      errorMessages.password = 'Must contain at least 1 uppercase letter'
      hasError = true;
    } else if (password === password.toUpperCase()) {
      errorMessages.password = 'Must contain at least 1 lowercase letter'
      hasError = true;
    } else if (!/\d/.test(password)) {
      errorMessages.password = 'Must contain at least 1 number'
      hasError = true;
    }
    if (phone === '') {
      errorMessages.phone = 'This should be filled out';
      hasError = true;
    } else if (!/^\d{8}$/.test(phone)) {
      errorMessages.phone = "This doesn't look like a phone number";
      hasError = true;
    }

    if (hasError) {
      res.status(400).json(errorMessages);
    } else {
      // push array-of-strings as you requested
      const accounts = await readAccounts();
      accounts.push({ realname, mcusername, password, phone });
      await writeAccounts(accounts);

      res.send('Account created (very simple demo).');
    }
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
