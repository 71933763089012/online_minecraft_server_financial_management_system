// app.js
import crypto from 'crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs/promises'; // use promises API for better async/await support
import path from 'path';
import { hashPassword, verifyPassword } from "./crypto-scrypt.js";

const app = express();
const PORT = 3000;
const ACCOUNTS_FILE = path.join(import.meta.dirname, 'public/minecraft/data/accounts.json');

app.use(cookieParser())
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
      const passwordHash = await hashPassword(password)
      accounts.push({ realname, mcusername, password: passwordHash, phone, owe: 0, max_cost: 10, min_players: 2, status: 'inactive' });
      await writeAccounts(accounts);

      res.cookie('user_id', hash(mcusername), { secure: true, sameSite: 'Strict' });
      res.cookie('mcusername', mcusername, { secure: true, sameSite: 'Strict' });
      res.status(200).send('Account created successfully');
    }
  } catch (err) {
    console.error('Error saving account:', err);
    res.status(500).send('Server error');
  }
});

app.post('/minecraft/login', async (req, res) => {
  try {
    const { mcusername = '', password = '' } = req.body;

    let errorMessages = { mcusername: '', password: '' };

    if (mcusername === '') {
      errorMessages.mcusername = 'This should be filled out';
    } else {
      const account = (await readAccounts()).find(account => account.mcusername === mcusername);
      if (account && await verifyPassword(password, account.password)) {
        res.cookie('user_id', hash(mcusername), { secure: true, sameSite: 'Strict' });
        res.cookie('mcusername', mcusername, { secure: true, sameSite: 'Strict' });
        res.status(200).send('Login successful');
        return;
      } else {
        errorMessages.mcusername = 'Username or password is incorrect';
        errorMessages.password = 'Username or password is incorrect';
      }
    }

    if (password === '') {
      errorMessages.password = 'This should be filled out';

      if (mcusername !== '') {
        errorMessages.mcusername = 'Please enter your password';
      }
    }

    res.status(400).json(errorMessages);
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).send('Server error');
  }
})

app.get('/minecraft/me', async (req, res) => {
  const mcusername = req.cookies.mcusername;
  if (!mcusername) {
    return res.status(401).send('Unauthorized');
  }

  const accounts = await readAccounts();
  const account = accounts.find(acc => acc.mcusername === mcusername);
  if (!account) {
    return res.status(404).send('Account not found');
  }
  if (req.cookies.user_id !== hash(account.mcusername)) {
    return res.status(403).send('Forbidden');
  }

  res.json(account);
});

const illigalKeys = ['owe', 'admin', 'free', 'additionalusers']
app.post('/minecraft/saveSettings', async (req, res) => {
  try {
    const mcusername = req.cookies.mcusername;
    if (!mcusername) {
      return res.status(401).send("Unauthorized");
    }

    const accounts = await readAccounts();
    const accountIndex = accounts.findIndex(acc => acc.mcusername === mcusername);
    if (accountIndex === -1) {
      return res.status(404).send("Account not found");
    }

    const account = accounts[accountIndex];
    if (req.cookies.user_id !== hash(account.mcusername)) {
      return res.status(403).send("Forbidden");
    }

    // Only update keys that exist on the account object
    for (const [key, value] of Object.entries(req.body)) {
      if (key in account) {
        if (key in illigalKeys) return res.status(403).send("Forbidden");
        account[key] = value;
      } else {
        return res.status(400).send(`Invalid setting: ${key}`);
      }
    }

    accounts[accountIndex] = account;
    await writeAccounts(accounts);
    res.status(200).send("Settings updated successfully");
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).send("Internal server error");
  }
});

// Optional: serve your static HTML from the same server
app.use('/', express.static(path.join(import.meta.dirname, 'public'))); // put your HTML in ./public

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const hashkey = await fs.readFile('./hashkey')

function hash(input) {
  return crypto.createHmac('sha256', hashkey).update(input).digest('hex');
}