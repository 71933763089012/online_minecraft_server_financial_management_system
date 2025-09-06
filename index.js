// app.js
import crypto from 'crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import fs, { mkdir } from 'fs/promises'; // use promises API for better async/await support
import path from 'path';
import { hashPassword, verifyPassword } from "./crypto-scrypt.js";

const app = express();
const PORT = 3000;
const ACCOUNTS_FILE = path.join(import.meta.dirname, '/data/accounts.json');
const ADMIN_FILE = path.join(import.meta.dirname, '/data/admintools.json');

app.use(cookieParser())
app.use(express.json())

async function getAdmin() {
  try {
    const txt = await fs.readFile(ADMIN_FILE, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    if (err.code === 'ENOENT') return []; // file not found -> start empty list
    throw err;
  }
}

async function updateAdmin(tools) {
  // overwrite file with formatted JSON
  await fs.writeFile(ADMIN_FILE, JSON.stringify(tools, null, 2), 'utf8');
}

async function readAccounts() {
  try {
    const txt = await fs.readFile(ACCOUNTS_FILE, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    if (err.code === 'ENOENT') return []; // file not found -> start empty list
    throw err;
  }
}

async function writeAccounts(accounts) {
  // overwrite file with formatted JSON
  await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

const availableProfiles = ['Vanilla', 'Lighly modded', 'Modded']
app.post('/minecraft/availableProfiles', async (req, res) => { return res.json(availableProfiles); })

async function readProfile(profileName) {
  try {
    const filePath = path.join(import.meta.dirname, `data/profiles/${profileName}.json`);
    const txt = await fs.readFile(filePath, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    if (err.code === 'ENOENT' && availableProfiles.includes(profileName)) return []; // file not found -> start empty list
    throw err;
  }
}

async function writeProfile(profileName, profileData) {
  await mkdir(path.join(import.meta.dirname, 'data/profiles'), { recursive: true });
  const filePath = path.join(import.meta.dirname, `data/profiles/${profileName}.json`);
  await fs.writeFile(filePath, JSON.stringify(profileData, null, 2), 'utf8');
}

async function addProfile(mcusername, profileName) {
  try {
    const baseProfile = { mcusername, max_cost: 10, min_players: 3, status: 'inactive', auto: false };
    const profile = await readProfile(profileName);
    profile.push(baseProfile);
    await writeProfile(profileName, profile);
    return baseProfile;
  } catch (err) {
    console.error('Error adding profi:', err);
    throw err;
  }
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
        additionalusers: [],
        password: passwordHash,
        phone,
        owe: 0,
        activeProfiles: ["Modded"]
      });
      await writeAccounts(accounts);

      updateUserID(res, mcusername);
      res.cookie('selectedProfile', "Modded", { secure: true, sameSite: 'Strict' });
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

app.post("/minecraft/logout", (req, res) => {
  if (req.cookies) {
    Object.keys(req.cookies).forEach(name => {
      res.clearCookie(name, { path: "/" });
    });
  }
  res.redirect("/minecraft/login");
});


app.get('/minecraft/me', async (req, res) => {
  const mcusername = req.cookies.mcusername;
  if (!mcusername) return res.status(401).send('Unauthorized');

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
  const profileName = req.cookies.selectedProfile;
  if (!mcusername) return res.status(401).send('Unauthorized');
  if (req.cookies.user_id !== hash(mcusername)) return res.status(403).send('Invalid User ID');
  if (!availableProfiles.includes(profileName)) return res.status(403).send('Profile not available');

  const profile = await readProfile(profileName);
  const account = profile.find(acc => acc.mcusername === mcusername);
  if (!account) return res.json(await addProfile(mcusername, profileName));

  return res.json(account);
});

const illigalKeys = ['owe', 'admin', 'free', 'additionalusers']
app.post('/minecraft/saveSettings', async (req, res) => {
  try {
    const mcusername = req.cookies.mcusername;
    if (!mcusername) {
      return res.status(401).send("Unauthorized");
    }

    const profileName = req.cookies.selectedProfile;
    if (!availableProfiles.includes(profileName)) return res.status(403).send('Profile not available');
    const profile = await readProfile(profileName);
    const accountIndex = profile.findIndex(acc => acc.mcusername === mcusername);
    if (accountIndex === -1) return res.status(404).send('Account not found');
    const account = profile[accountIndex];
    if (req.cookies.user_id !== hash(account.mcusername)) return res.status(403).send("Forbidden");

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

app.post('/minecraft/saveActiveProfiles', async (req, res) => {
  try {
    const mcusername = req.cookies.mcusername;
    if (!mcusername) {
      return res.status(401).send("Unauthorized");
    }
    const accounts = await readAccounts();
    const accountIndex = accounts.findIndex(acc => acc.mcusername === mcusername);
    if (accountIndex === -1) return res.status(404).send("Account not found");

    const account = accounts[accountIndex];
    if (req.cookies.user_id !== hash(account.mcusername)) return res.status(403).send("Forbidden");

    const activeProfiles = req.body;
    for (const profileName of activeProfiles) {
      if (!availableProfiles.includes(profileName)) return res.status(403).send(`${profileName} not available`);
    }
    account.activeProfiles = activeProfiles;
    accounts[accountIndex] = account;
    await writeAccounts(accounts);

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
    if (accountIndex === -1) return res.status(404).send("Account not found");

    const account = accounts[accountIndex];
    if (req.cookies.user_id !== hash(account.mcusername)) return res.status(403).send("Forbidden");

    const { password, settings } = req.body;
    if (!password) return res.status(400).send("Password is required");

    if (!await verifyPassword(password, account.password)) return res.status(403).send("Incorrect password");

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
            if (key == 'mcusername') {
              updateUserID(res, value);
              // Update mcusername in all profiles
              for (const profileName of availableProfiles) {
                const profile = await readProfile(profileName);
                const accountIndex = profile.findIndex(acc => acc.mcusername === mcusername);
                if (accountIndex !== -1) profile[accountIndex].mcusername = value;
                await writeProfile(profileName, profile);
              }
            }
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

app.get('/minecraft/avatar', (req, res) => {
  const username = req.query.u || req.cookies.mcusername; // allow both
  if (!username) return res.status(400).send("No username provided");

  const url = `https://minotar.net/avatar/${encodeURIComponent(username)}/8`;

  res.set('Cache-Control', 'public, max-age=300');
  return res.redirect(302, url);
});


let validMcusernames = []
let invalidMcusernames = []
async function validateAccountSetting(key, value) {
  if (value === '') return 'This should be filled out';

  if (key == 'mcusername') {
    if (!/^[A-Za-z0-9_]{1,16}$/.test(value)) return 'Invalid Minecraft username';
    if (invalidMcusernames.includes(value)) return 'This Minecraft username does not exist';

    const accounts = await readAccounts();
    if (accounts.some(account => account.mcusername === value)) return 'This account already exists';

    if (!validMcusernames.includes(value)) {
      const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${value}`);
      if (!res.ok) {
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
  console.log(`Server running on port: ${PORT}`);
});

let hashkey;
try {
  hashkey = await fs.readFile('./data/hashkey');
} catch (error) {
  await randomizeHash();
}

async function randomizeHash(size = 32) {
  const randomKey = crypto.randomBytes(size);
  await fs.writeFile('./data/hashkey', randomKey);
  hashkey = randomKey;
}

function hash(input) {
  return crypto.createHmac('sha256', hashkey).update(input).digest('hex');
}

//Admin Tools functions
const adminUsers = ['5hk_'];
app.get('/minecraft/AdminTools', async (req, res) => {
  const mcusername = req.cookies.mcusername;
  if (!mcusername) return res.status(401).send('Unauthorized');
  if (!adminUsers.includes(mcusername)) return res.status(403).send('Forbidden');
  if (req.cookies.user_id !== hash(mcusername)) return res.status(403).send('Forbidden');

  res.status(200);
  return res.json(await getAdmin());
});

app.post('/minecraft/admin/addTool', async (req, res) => {
  try {
    const mcusername = req.cookies.mcusername;

    if (!mcusername) return res.status(401).send('Unauthorized');
    if (!adminUsers.includes(mcusername)) return res.status(403).send('Forbidden');
    if (req.cookies.user_id !== hash(mcusername)) return res.status(403).send('Forbidden');

    const tool = req.body;
    const tools = await getAdmin();
    tools.push(tool);
    updateAdmin(tools);

    return res.status(200).send("Added Tool")
  } catch (err) {
    console.error("Error adding admin tool:", err);
    res.status(500).send("Internal server error");
  }
});

app.post('/minecraft/admin/removeTool', async (req, res) => {
  try {
    const mcusername = req.cookies.mcusername;

    if (!mcusername) return res.status(401).send('Unauthorized');
    if (!adminUsers.includes(mcusername)) return res.status(403).send('Forbidden');
    if (req.cookies.user_id !== hash(mcusername)) return res.status(403).send('Forbidden');

    const tool = req.body;
    const tools = await getAdmin();
    const toolIndex = tools.findIndex(t => deepEqual(t, tool));
    if (toolIndex == -1) return res.status(404).send("Missing Admin Tool");
    tools.splice(toolIndex, 1)
    updateAdmin(tools);

    return res.status(200).send("Added Tool")
  } catch (err) {
    console.error("Error removing admin tool:", err);
    res.status(500).send("Internal server error");
  }
});

app.post('/minecraft/admin/changeTool', async (req, res) => {
  try {
    const mcusername = req.cookies.mcusername;

    if (!mcusername) return res.status(401).send('Unauthorized');
    if (!adminUsers.includes(mcusername)) return res.status(403).send('Forbidden');
    if (req.cookies.user_id !== hash(mcusername)) return res.status(403).send('Forbidden');

    const { old, fresh } = req.body;
    const tools = await getAdmin();
    const toolIndex = tools.findIndex(t => deepEqual(t, old));
    if (toolIndex == -1) return res.status(404).send("Missing Admin Tool");
    tools[toolIndex] = fresh;
    updateAdmin(tools);

    return res.status(200).send("Changed Tool")
  } catch (err) {
    console.error("Error updating admin tool:", err);
    res.status(500).send("Internal server error");
  }
});

app.post('/minecraft/admin/importTools', async (req, res) => {
  try {
    const mcusername = req.cookies.mcusername;

    if (!mcusername) return res.status(401).send('Unauthorized');
    if (!adminUsers.includes(mcusername)) return res.status(403).send('Forbidden');
    if (req.cookies.user_id !== hash(mcusername)) return res.status(403).send('Forbidden');

    var tools = req.body;
    const current = await getAdmin();
    if (!Array.isArray(tools)) return res.status(400).send("Invalid Input");
    tools.forEach(tool => {
      if (!(typeof tool === 'object' && 'name' in tool && 'inputs' in tool && Array.isArray(tool.inputs) && 'action' in tool))
        return res.status(400).send("Invalid Input:", tool);
    });

    tools = mergeArrays(current, tools);
    updateAdmin(tools);

    return res.status(200).json(tools);
  } catch (err) {
    console.error("Error importing admin tools:", err);
    res.status(500).send("Internal server error");
  }
});

app.post('/minecraft/admin/reorderTools', async (req, res) => {
  try {
    const mcusername = req.cookies.mcusername;

    if (!mcusername) return res.status(401).send('Unauthorized');
    if (!adminUsers.includes(mcusername)) return res.status(403).send('Forbidden');
    if (req.cookies.user_id !== hash(mcusername)) return res.status(403).send('Forbidden');

    var { newIndex, oldIndex } = req.body;
    const tools = await getAdmin();
    if ((newIndex < 0 || newIndex >= tools.length) || (oldIndex < 0 || oldIndex >= tools.length) || (newIndex === oldIndex)) return res.status(400).send("Invalid Index");

    tools.splice(newIndex, 0, tools.splice(oldIndex, 1)[0]);
    updateAdmin(tools);

    return res.status(200).send("Succesfully reordered tools");
  } catch (err) {
    console.error("Error reordering admin tools:", err);
    res.status(500).send("Internal server error");
  }
});

function mergeArrays(arrayA, arrayB) {
  const result = [...arrayA];

  for (const elementB of arrayB) {
    const isDuplicate = arrayA.some(elementA => {
      // Deep comparison for objects/arrays
      return deepEqual(elementA, elementB);
    });

    if (!isDuplicate) {
      result.push(elementB);
    }
  }

  return result;
}

function deepEqual(obj1, obj2) {
  // Check if both are the same reference
  if (obj1 === obj2) return true;
  // Check if either is null/undefined
  if (obj1 == null || obj2 == null) return false;
  // Check if types are different
  if (typeof obj1 !== typeof obj2) return false;
  // Handle primitive types
  if (typeof obj1 !== 'object') return obj1 == obj2;

  // Handle arrays
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }

  // Handle objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  // Check if they have the same number of properties
  if (keys1.length !== keys2.length) return false;

  // Check if all keys and values match
  for (let key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

app.post('/minecraft/admin/resetPassword', async (req, res) => {
  try {
    const mcusername = req.cookies.mcusername;
    const password = req.body.newPassword;
    let account = req.body.mcusername;

    if (!mcusername) return res.status(401).send('Unauthorized');
    if (!adminUsers.includes(mcusername)) return res.status(403).send('Forbidden');
    if (req.cookies.user_id !== hash(mcusername)) return res.status(403).send('Forbidden');

    const accounts = await readAccounts();
    const accountIndex = accounts.findIndex(acc => acc.mcusername === account);
    if (accountIndex === -1) return res.status(404).send("Account not found");
    account = accounts[accountIndex];

    const validation = await validateAccountSetting("password", password);
    if (validation !== true) return res.status(400).send(validation);
    account.password = await hashPassword(password);

    accounts[accountIndex] = account;
    await writeAccounts(accounts);
    return res.status(200).send("Success");
  } catch (err) {
    console.error("Error updating Account:", err);
    res.status(500).send("Internal server error");
  }
});

app.post('/minecraft/admin/regenerateHashkey', async (req, res) => {
  try {
    const mcusername = req.cookies.mcusername;
    if (!mcusername) return res.status(401).send('Unauthorized');
    if (!adminUsers.includes(mcusername)) return res.status(403).send('Forbidden');
    if (req.cookies.user_id !== hash(mcusername)) return res.status(403).send('Forbidden');

    await randomizeHash();

    return res.status(200).send("Success");
  } catch (err) {
    console.error("Error resetting hash:", err);
    res.status(500).send("Internal server error");
  }
});