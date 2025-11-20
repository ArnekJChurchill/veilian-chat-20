const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const Pusher = require("pusher");
const fileUpload = require("express-fileupload");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

const usersFile = path.join(__dirname, "data/users.json");
const bannedFile = path.join(__dirname, "data/banned.json");

// Pusher setup
const pusher = new Pusher({
  appId: "2080160",
  key: "b7d05dcc13df522efbbc",
  secret: "4064ce2fc0ac5596d506",
  cluster: "us2",
  useTLS: true
});

// ----------------- Helper functions -----------------
function readUsers() {
  return JSON.parse(fs.readFileSync(usersFile));
}

function writeUsers(data) {
  fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
}

function readBanned() {
  return JSON.parse(fs.readFileSync(bannedFile));
}

function writeBanned(data) {
  fs.writeFileSync(bannedFile, JSON.stringify(data, null, 2));
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9]+$/.test(username); // Only letters & numbers
}

// ----------------- Authentication -----------------
app.post("/signup", (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password) return res.json({ success: false, message: "Missing username or password." });
  if (!isValidUsername(username)) return res.json({ success: false, message: "Username invalid. Only letters & numbers allowed." });

  const usersData = readUsers();
  if (usersData.users.find(u => u.username === username)) return res.json({ success: false, message: "Username already exists." });

  const newUser = {
    username,
    password,
    displayName: displayName || username,
    isModerator: false,
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
  const usersData = readUsers();
  const bannedUsers = readBanned().banned;

  const user = usersData.users.find(u => u.username === username && u.password === password);
  if (!user) return res.json({ success: false, message: "Invalid username or password." });
  if (bannedUsers.includes(username)) return res.json({ success: false, message: "You are banned and cannot log in." });

  res.json({ success: true, user });
});

// ----------------- Chat -----------------
app.post("/send-message", (req, res) => {
  const { username, message } = req.body;
  const usersData = readUsers();
  const bannedUsers = readBanned().banned;

  const user = usersData.users.find(u => u.username === username);
  if (!user) return res.json({ success: false, message: "User not found." });
  if (bannedUsers.includes(username)) return res.json({ success: false, message: "You are banned and cannot send messages." });

  pusher.trigger("chat", "message", { username: user.username, avatar: user.avatar, message });
  res.json({ success: true });
});

// ----------------- Ban / Unban -----------------
app.post("/ban-user", (req, res) => {
  const { username, moderatorUsername, moderatorPassword } = req.body;
  const usersData = readUsers();
  const mod = usersData.users.find(u => u.username === moderatorUsername && u.password === moderatorPassword && u.isModerator);
  if (!mod) return res.json({ success: false, message: "Unauthorized." });

  const bannedData = readBanned();
  if (!bannedData.banned.includes(username)) bannedData.banned.push(username);
  writeBanned(bannedData);

  res.json({ success: true, message: `${username} banned.` });
});

app.post("/unban-user", (req, res) => {
  const { username, moderatorUsername, moderatorPassword } = req.body;
  const usersData = readUsers();
  const mod = usersData.users.find(u => u.username === moderatorUsername && u.password === moderatorPassword && u.isModerator);
  if (!mod) return res.json({ success: false, message: "Unauthorized." });

  const bannedData = readBanned();
  bannedData.banned = bannedData.banned.filter(u => u !== username);
  writeBanned(bannedData);

  res.json({ success: true, message: `${username} unbanned.` });
});

// ----------------- Avatar Upload -----------------
app.post("/upload-avatar", (req, res) => {
  const { username } = req.body;
  if (!req.files || !req.files.avatar) return res.json({ success: false, message: "No file uploaded." });

  const file = req.files.avatar;
  const ext = path.extname(file.name);
  const newFilename = `${username}${ext}`;
  const uploadPath = path.join(__dirname, "uploads/profilePics", newFilename);

  file.mv(uploadPath, err => {
    if (err) return res.status(500).json({ success: false, message: err });
    const usersData = readUsers();
    const user = usersData.users.find(u => u.username === username);
    if (user) {
      user.avatar = newFilename;
      writeUsers(usersData);
    }
    res.json({ success: true, avatar: newFilename });
  });
});

app.listen(10000, () => console.log("Veilian-Chat-Nue running on port 10000"));
