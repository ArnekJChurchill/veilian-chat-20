const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs-extra");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const Pusher = require("pusher");

// === Pusher Setup ===
const pusher = new Pusher({
  appId: "2080160",
  key: "b7d05dcc13df522efbbc",
  secret: "4064ce2fc0ac5596d506",
  cluster: "us2",
  useTLS: true,
});

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// === Ensure folders exist ===
fs.ensureDirSync("uploads/profilePics");
fs.ensureDirSync("data");

// === Load database ===
const USERS_FILE = path.join(__dirname, "data/users.json");
const BANNED_FILE = path.join(__dirname, "data/banned.json");

// Initialize JSON files if not exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeJSONSync(USERS_FILE, {
    users: [
      {
        username: "arnekChurchill",
        password: "988585aw",
        isModerator: true,
        displayName: "Arnek Churchill",
        avatar: "default.png",
        bio: "Moderator of Veilian Chat",
        joinDate: new Date().toISOString()
      },
      {
        username: "god",
        password: "988585aw",
        isModerator: true,
        displayName: "God",
        avatar: "default.png",
        bio: "Moderator account.",
        joinDate: new Date().toISOString()
      }
    ]
  });
}

if (!fs.existsSync(BANNED_FILE)) fs.writeJSONSync(BANNED_FILE, { banned: [] });

// === Multer Upload Setup ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/profilePics"),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// ================================
// AUTH: SIGNUP
// ================================
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: "Enter both fields" });

  const usersData = fs.readJSONSync(USERS_FILE);
  if (usersData.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.json({ success: false, message: "Username already taken" });
  }

  usersData.users.push({
    username,
    password,
    isModerator: false,
    displayName: username,
    avatar: "default.png",
    bio: "",
    joinDate: new Date().toISOString()
  });

  fs.writeJSONSync(USERS_FILE, usersData);
  res.json({ success: true });
});

// ================================
// AUTH: LOGIN
// ================================
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const usersData = fs.readJSONSync(USERS_FILE);
  const bannedData = fs.readJSONSync(BANNED_FILE);

  if (bannedData.banned.includes(username)) return res.json({ success: false, message: "User is banned" });

  const user = usersData.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) return res.json({ success: false, message: "Invalid login" });

  res.json({ success: true, user });
});

// ================================
// UPDATE PROFILE
// ================================
app.post("/updateProfile", upload.single("avatar"), (req, res) => {
  const { username, displayName, bio } = req.body;
  const usersData = fs.readJSONSync(USERS_FILE);

  const user = usersData.users.find(u => u.username === username);
  if (!user) return res.json({ success: false });

  if (displayName) user.displayName = displayName;
  if (bio) user.bio = bio;
  if (req.file) user.avatar = req.file.filename;

  fs.writeJSONSync(USERS_FILE, usersData);
  res.json({ success: true, filename: req.file ? req.file.filename : null });
});

// ================================
// GET PROFILE BY USERNAME
// ================================
app.get("/profile/:username", (req, res) => {
  const username = req.params.username;
  const usersData = fs.readJSONSync(USERS_FILE);
  const user = usersData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return res.json({ success: false });
  res.json({ success: true, user });
});

// ================================
// ADMIN: BAN / UNBAN
// ================================
app.post("/ban", (req, res) => {
  const { username } = req.body;
  const bannedData = fs.readJSONSync(BANNED_FILE);
  if (!bannedData.banned.includes(username)) bannedData.banned.push(username);
  fs.writeJSONSync(BANNED_FILE, bannedData);
  res.json({ success: true });
});

app.post("/unban", (req, res) => {
  const { username } = req.body;
  const bannedData = fs.readJSONSync(BANNED_FILE);
  bannedData.banned = bannedData.banned.filter(u => u !== username);
  fs.writeJSONSync(BANNED_FILE, bannedData);
  res.json({ success: true });
});

// ================================
// CHAT
// ================================
app.post("/send-message", (req, res) => {
  const { username, message } = req.body;
  pusher.trigger("chat", "message", { username, message });
  res.json({ success: true });
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Veilian-Chat-20 running on http://localhost:${PORT}`));

