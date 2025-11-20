const express = require("express");
const fs = require("fs");
const path = require("path");
const Pusher = require("pusher");
const multer = require("multer");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 10000;

// ---------- Pusher ----------
const pusher = new Pusher({
  appId: "2080160",
  key: "b7d05dcc13df522efbbc",
  secret: "4064ce2fc0ac5596d506",
  cluster: "us2",
  useTLS: true
});

// ---------- Middleware ----------
app.use(bodyParser.json());
app.use(express.static("public"));
app.use("/uploads/profilePics", express.static("uploads/profilePics"));

// ---------- Multer Setup for Avatars ----------
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "uploads/profilePics");
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.body.username + ext);
  }
});
const upload = multer({ storage });

// ---------- Data Helpers ----------
const USERS_FILE = "./data/users.json";
const BANNED_FILE = "./data/banned.json";

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

// ---------- SIGNUP ----------
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || !/^[a-zA-Z0-9]+$/.test(username)) {
    return res.json({ success: false, message: "Invalid username or password." });
  }

  const usersData = readUsers();
  if (usersData.users.find(u => u.username === username)) {
    return res.json({ success: false, message: "Username already exists." });
  }

  const newUser = {
    username,
    password,
    isModerator: false,
    avatar: "default.png",
    bio: "",
    joinDate: new Date().toISOString()
  };
  usersData.users.push(newUser);
  writeUsers(usersData);
  res.json({ success: true, user: newUser });
});

// ---------- LOGIN ----------
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const usersData = readUsers();
  const banned = readBanned().banned;

  const user = usersData.users.find(u => u.username === username);
  if (!user) return res.json({ success: false, message: "User not found." });
  if (user.password !== password) return res.json({ success: false, message: "Incorrect password." });
  if (banned.includes(username)) return res.json({ success: false, message: "You are banned." });

  res.json({ success: true, user });
});

// ---------- SEND MESSAGE ----------
app.post("/send-message", (req, res) => {
  const { username, message } = req.body;
  const usersData = readUsers();
  const user = usersData.users.find(u => u.username === username);

  if (!user) return res.json({ success: false, message: "User not found." });

  const banned = readBanned().banned;
  if (banned.includes(username)) {
    return res.json({ success: false, message: "You are banned and cannot send messages." });
  }

  pusher.trigger("chat", "message", {
    username: user.username,
    message,
    avatar: user.avatar
  });

  res.json({ success: true });
});

// ---------- GET USER ----------
app.get("/get-user", (req, res) => {
  const username = req.query.username;
  const usersData = readUsers();
  const user = usersData.users.find(u => u.username === username);
  if (!user) return res.json({ success: false });
  res.json({ success: true, user });
});

// ---------- UPDATE BIO ----------
app.post("/update-bio", (req, res) => {
  const { username, bio } = req.body;
  const usersData = readUsers();
  const user = usersData.users.find(u => u.username === username);
  if (!user) return res.json({ success: false });

  user.bio = bio;
  writeUsers(usersData);
  res.json({ success: true });
});

// ---------- UPDATE AVATAR ----------
app.post("/update-avatar", upload.single("avatar"), (req, res) => {
  const username = req.body.username;
  const usersData = readUsers();
  const user = usersData.users.find(u => u.username === username);
  if (!user) return res.json({ success: false });

  user.avatar = req.file.filename;
  writeUsers(usersData);
  res.json({ success: true, filename: req.file.filename });
});

// ---------- BAN USER ----------
app.post("/ban-user", (req, res) => {
  const { username } = req.body;
  const bannedData = readBanned();
  if (!bannedData.banned.includes(username)) bannedData.banned.push(username);
  writeBanned(bannedData);
  res.json({ success: true });
});

// ---------- UNBAN USER ----------
app.post("/unban-user", (req, res) => {
  const { username } = req.body;
  let bannedData = readBanned();
  bannedData.banned = bannedData.banned.filter(u => u !== username);
  writeBanned(bannedData);
  res.json({ success: true });
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`Veilian-Chat-Nue running on http://localhost:${PORT}`);
});
