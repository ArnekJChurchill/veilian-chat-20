const express = require("express");
const app = express();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Pusher = require("pusher");

const USERS_FILE = path.join(__dirname, "data/users.json");
const BANNED_FILE = path.join(__dirname, "data/banned.json");
const UPLOADS_DIR = path.join(__dirname, "uploads/profilePics");

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: UPLOADS_DIR });

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

const pusher = new Pusher({
  appId: "2080160",
  key: "b7d05dcc13df522efbbc",
  secret: "4064ce2fc0ac5596d506",
  cluster: "us2",
  useTLS: true
});

// ----------------- UTILITY FUNCTIONS -----------------
function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function writeUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

function readBanned() {
  return JSON.parse(fs.readFileSync(BANNED_FILE));
}

function writeBanned(data) {
  fs.writeFileSync(BANNED_FILE, JSON.stringify(data, null, 2));
}

// ----------------- AUTH ROUTES -----------------
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  const usersData = readUsers();
  if (usersData.users.find(u => u.username === username)) {
    return res.json({ success: false, message: "Username already exists" });
  }

  const newUser = {
    username,
    password,
    isModerator: false,
    displayName: username,
    avatar: "default.png",
    bio: "",
    joinDate: new Date().toISOString()
  };
  usersData.users.push(newUser);
  writeUsers(usersData);

  res.json({ success: true, user: newUser });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const bannedData = readBanned();
  if (bannedData.banned.includes(username)) {
    return res.json({ success: false, message: "You are banned." });
  }

  const usersData = readUsers();
  const user = usersData.users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.json({ success: false, message: "Invalid username or password." });
  }

  res.json({ success: true, user });
});

// ----------------- CHAT ROUTE -----------------
app.post("/send-message", (req, res) => {
  const { username, message } = req.body;
  const usersData = readUsers();
  const user = usersData.users.find(u => u.username === username);

  if (!user) {
    return res.json({ success: false, message: "User not found." });
  }

  // Check if user is banned
  const banned = require("./data/banned.json").banned;
  if (banned.includes(username)) {
    return res.json({ success: false, message: "You are banned and cannot send messages." });
  }

  // Otherwise, send message via Pusher
  pusher.trigger("chat", "message", {
    username: user.username,
    message,
    avatar: user.avatar
  });

  res.json({ success: true });
});


// ----------------- ADMIN PANEL ROUTES -----------------
app.post("/banUser", (req, res) => {
  const { username } = req.body;
  const bannedData = readBanned();
  if (!bannedData.banned.includes(username)) {
    bannedData.banned.push(username);
    writeBanned(bannedData);
  }
  res.json({ success: true });
});

app.post("/unbanUser", (req, res) => {
  const { username } = req.body;
  const bannedData = readBanned();
  bannedData.banned = bannedData.banned.filter(u => u !== username);
  writeBanned(bannedData);
  res.json({ success: true });
});

// ----------------- PROFILE ROUTES -----------------
app.get("/profile/:username", (req, res) => {
  const { username } = req.params;
  const usersData = readUsers();
  const user = usersData.users.find(u => u.username === username);
  if (!user) return res.json({ success: false });

  res.json({ success: true, user });
});

app.post("/updateProfile", upload.single("avatar"), (req, res) => {
  const { username, bio } = req.body;
  const usersData = readUsers();
  const user = usersData.users.find(u => u.username === username);
  if (!user) return res.json({ success: false });

  user.bio = bio;

  let filename = null;
  if (req.file) {
    const ext = path.extname(req.file.originalname);
    const newFileName = `${username}${ext}`;
    fs.renameSync(req.file.path, path.join(UPLOADS_DIR, newFileName));
    user.avatar = newFileName;
    filename = newFileName;
  }

  writeUsers(usersData);
  res.json({ success: true, filename });
});

// ----------------- START SERVER -----------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Veilian-Chat-Nue running on http://localhost:${PORT}`);
});
