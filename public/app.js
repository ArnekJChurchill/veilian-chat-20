let currentUser = null;

// ---------- Pusher Setup ----------
const pusher = new Pusher("b7d05dcc13df522efbbc", {
  cluster: "us2",
});

const channel = pusher.subscribe("chat");
channel.bind("message", function(data) {
  addMessageToUI(data);
});

// ---------- LOGIN/SIGNUP ----------
async function signup() {
  const username = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value;

  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    alert("Username must contain only letters and numbers.");
    return;
  }

  const res = await fetch("/signup", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({username,password})
  });
  const data = await res.json();
  if (data.success) loginUser(data.user);
  else alert(data.message);
}

async function login() {
  const username = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value;

  const res = await fetch("/login", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({username,password})
  });
  const data = await res.json();
  if (data.success) loginUser(data.user);
  else alert(data.message);
}

function loginUser(user) {
  currentUser = user;
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("chatScreen").style.display = "flex";
  document.getElementById("userDisplay").innerText = user.username;
  document.getElementById("userAvatar").src = "/uploads/profilePics/" + user.avatar;

  if (user.isModerator) document.getElementById("adminPanel").style.display = "flex";
}

// ---------- CHAT ----------
async function sendMessage() {
  const message = document.getElementById("chatMessage").value;
  if (!message) return;
  const res = await fetch("/send-message", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({username: currentUser.username, message})
  });
  const data = await res.json();
  if (data.success) document.getElementById("chatMessage").value = "";
}

function addMessageToUI({username,message,avatar}) {
  const messages = document.getElementById("messages");
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  msgDiv.innerHTML = `
    <img src="/uploads/profilePics/${avatar}" />
    <span class="username" onclick="openProfile('${username}')">${username}</span>: 
    <span class="msg-text">${message}</span>
  `;
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
}

// ---------- PROFILE ----------
async function openProfile(username) {
  const res = await fetch(`/get-user?username=${username}`);
  const data = await res.json();
  if (!data.success) return;

  const profile = data.user;
  document.getElementById("profileUsername").innerText = profile.username;
  document.getElementById("profileAvatar").src = "/uploads/profilePics/" + profile.avatar;
  document.getElementById("profileBio").value = profile.bio || "";
  document.getElementById("profileJoinDate").innerText = "Joined: " + new Date(profile.joinDate).toLocaleDateString();
  
  // Edit buttons only if currentUser viewing own profile
  if (currentUser.username === username) {
    document.getElementById("profileBio").readOnly = true;
    document.getElementById("editButtons").style.display = "block";
  } else {
    document.getElementById("editButtons").style.display = "none";
    document.getElementById("profileBio").readOnly = true;
  }

  document.getElementById("profilePage").style.display = "flex";
}

function closeProfile() {
  document.getElementById("profilePage").style.display = "none";
}

// ---------- EDIT BIO ----------
function editBio() {
  document.getElementById("profileBio").readOnly = false;
  document.getElementById("saveBioBtn").style.display = "inline";
}

async function saveBio() {
  const bio = document.getElementById("profileBio").value;
  const res = await fetch("/update-bio", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({username: currentUser.username,bio})
  });
  const data = await res.json();
  if (data.success) {
    document.getElementById("profileBio").readOnly = true;
    document.getElementById("saveBioBtn").style.display = "none";
  }
}

// ---------- AVATAR UPLOAD ----------
function uploadAvatar() {
  document.getElementById("avatarInput").click();
}

async function submitAvatar(event) {
  const file = event.target.files[0];
  const formData = new FormData();
  formData.append("avatar", file);
  formData.append("username", currentUser.username);

  const res = await fetch("/update-avatar", {
    method:"POST",
    body: formData
  });
  const data = await res.json();
  if (data.success) {
    document.getElementById("profileAvatar").src = "/uploads/profilePics/" + data.filename;
    document.getElementById("userAvatar").src = "/uploads/profilePics/" + data.filename;
  }
}

// ---------- ADMIN PANEL ----------
async function banUser() {
  const username = document.getElementById("banUserInput").value.trim();
  if (!username) return;
  const res = await fetch("/ban-user", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({username})
  });
  const data = await res.json();
  if (data.success) alert(username + " banned!");
}

async function unbanUser() {
  const username = document.getElementById("banUserInput").value.trim();
  if (!username) return;
  const res = await fetch("/unban-user", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({username})
  });
  const data = await res.json();
  if (data.success) alert(username + " unbanned!");
}
