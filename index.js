// app.js
import crypto from 'crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs/promises'; // use promises API for better async/await support
import path from 'path';
import { hashPassword, verifyPassword } from "./crypto-scrypt.js";

const app = express();
const PORT = 3000;
const ACCOUNTS_FILE = path.join(import.meta.dirname, 'accounts.json');

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

async function readProfile(profileName) {
  try {
    const filePath = path.join(import.meta.dirname, `profiles/${profileName}.json`);
    const txt = await fs.readFile(filePath, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    return
  }
}

async function writeProfile(profileName, profileData) {
  const filePath = path.join(import.meta.dirname, `profiles/${profileName}.json`);
  await fs.writeFile(filePath, JSON.stringify(profileData, null, 2), 'utf8');
}

app.post('/minecraft/signup', async (req, res) => {
  try {
    let hasError = false;
    let errorMessages = { realname: '', mcusername: '', password: '', phone: '' };
    let body = { realname: req.body.realname || '', mcusername: req.body.mcusername || '', password: req.body.password || '', phone: req.body.phone || '' }
    for (const [key, value] of Object.entries(body)) {
      if (illigalKeys.includes(key)) return res.status(403).send("Forbidden");
      const validation = await validateAccountSetting(key, value);
      if (validation !== true) {
        hasError = true;
        errorMessages[key] = validation;
      } else if (key == 'mcusername') updateUserID(res, value);
    }

    const { realname = '', mcusername = '', password = '', phone = '' } = body;
    if (hasError) {
      res.status(400).json(errorMessages);
    } else {
      const accounts = await readAccounts();
      const passwordHash = await hashPassword(password);
      accounts.push({
        realname,
        mcusername,
        additionalusers: {},
        password: passwordHash,
        phone,
        owe: 0
      });
      await writeAccounts(accounts);

      updateUserID(res, mcusername);
      res.status(200).send('Account created successfully');
    }
  } catch (err) {
    console.error('Error saving account:', err);
    res.status(500).send('Server error');
  }
});

async function addProfile(account, profileName) {
  try {
    const profilePath = path.join(import.meta.dirname, `profiles/${profileName}.json`);
    const txt = await fs.readFile(profilePath, 'utf8');
    const profile = JSON.parse(txt);

    profile.push({ mcusername: account.mcusername, max_cost: 10, min_players: 3, status: 'inactive', auto: false });
    await writeProfile(file.substring(0, file.length - 5), profile);

    // res.cookie('profile', profileName, { secure: true, sameSite: 'Strict', httpOnly: true });
  } catch (err) {

  }
}

app.post('/minecraft/login', async (req, res) => {
  try {
    const { mcusername = '', password = '' } = req.body;

    let errorMessages = { mcusername: '', password: '' };

    if (mcusername === '') {
      errorMessages.mcusername = 'This should be filled out';
    } else {
      const account = (await readAccounts()).find(account => account.mcusername === mcusername);
      if (account && await verifyPassword(password, account.password)) {
        updateUserID(res, mcusername);
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

  delete account['password'];
  res.json(account);
});

app.get('/minecraft/profile', async (req, res) => {
  const mcusername = req.cookies.mcusername;
  if (!mcusername) {
    return res.status(401).send('Unauthorized');
  }

  const profileName = req.cookies.selectedProfile;
  const profile = await readProfile(profileName);
  const account = profile.find(acc => acc.mcusername === mcusername);
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

    const profileName = req.cookies.selectedProfile;
    const profile = await readProfile(profileName);
    const accountIndex = profile.findIndex(acc => acc.mcusername === mcusername);
    if (accountIndex === -1) {
      return res.status(404).send('Account not found');
    }
    const account = profile[accountIndex];
    if (req.cookies.user_id !== hash(account.mcusername)) {
      return res.status(403).send("Forbidden");
    }

    // Only update keys that exist on the account object
    for (const [key, value] of Object.entries(req.body)) {
      if (key in profile[accountIndex]) {
        if (illigalKeys.includes(key)) return res.status(403).send("Forbidden");
        profile[accountIndex][key] = value;
      } else {
        return res.status(400).send(`Invalid setting: ${key}`);
      }
    }

    await writeProfile(profileName, profile);
    res.status(200).send("Settings updated successfully");
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).send("Internal server error");
  }
});

app.post('/minecraft/account', async (req, res) => {
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
    const { password, settings } = req.body;
    if (!password) {
      return res.status(400).send("Password is required");
    }
    if (await verifyPassword(account.password, password)) {
      return res.status(403).send("Forbidden");
    }

    if (settings) {
      // Only update keys that exist on the account object
      for (const [key, value] of Object.entries(settings)) {
        if (key in account) {
          if (illigalKeys.includes(key)) return res.status(403).send("Forbidden");
          const validation = await validateAccountSetting(key, value);
          if (validation !== true) return res.status(400).send(validation);
          if (key == 'password') {
            account.password = await hashPassword(value);
          } else {
            account[key] = value;
            if (key == 'mcusername') updateUserID(res, value);
          }
        } else {
          return res.status(400).send(`Invalid setting: ${key}`);
        }
      }
    }

    accounts[accountIndex] = account;
    await writeAccounts(accounts);
    res.status(200).send("Account updated successfully");
  } catch (err) {
    console.error("Error updating Account:", err);
    res.status(500).send("Internal server error");
  }
});

let validMcusernames = []
let invalidMcusernames = []
async function validateAccountSetting(key, value) {
  if (value === '') return 'This should be filled out';

  if (key == 'mcusername') {
    if (invalidMcusernames.includes(value)) return 'This Minecraft username does not exist';

    const accounts = await readAccounts();
    if (accounts.some(account => account.mcusername === value)) return 'This account already exists';

    if (!validMcusernames.includes(value)) {
      const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${value}`);
      if (res.status === 404) {
        invalidMcusernames.push(value);
        return 'This Minecraft username does not exist'
      }
      validMcusernames.push(value);
    }
  }

  if (key == 'password') {
    if (value.length < 8) return 'Must be at least 8 charectors';
    if (value === value.toLowerCase()) return 'Must contain at least 1 uppercase letter';
    if (value === value.toUpperCase()) return 'Must contain at least 1 lowercase letter';
    if (!/\d/.test(value)) return 'Must contain at least 1 number';
  }

  if (key == 'phone') {
    if (!/^\d{8}$/.test(value)) return "This doesn't look like a phone number";
  }

  return true;
}

function updateUserID(res, mcusername) {
  res.cookie('user_id', hash(mcusername), { secure: true, sameSite: 'Strict', httpOnly: true });
  res.cookie('mcusername', mcusername, { secure: true, sameSite: 'Strict', httpOnly: true });
}

// Optional: serve your static HTML from the same server
app.use('/', express.static(path.join(import.meta.dirname, 'public'))); // put your HTML in ./public

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const hashkey = await fs.readFile('./hashkey')

function hash(input) {
  return crypto.createHmac('sha256', hashkey).update(input).digest('hex');
}