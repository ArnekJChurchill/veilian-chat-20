let CURRENT_USER = null;

const pusher = new Pusher("b7d05dcc13df522efbbc", { cluster: "us2" });
const channel = pusher.subscribe("chat");

channel.bind("message", function(data) {
  addMessage(data);
});

// LOGIN / SIGNUP
function login() {
  const username = document.getElementById("usernameInput").value;
  const password = document.getElementById("passwordInput").value;

  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if(data.success){
      CURRENT_USER = data.user;
      startChat();
    } else {
      document.getElementById("loginError").innerText = data.message;
    }
  });
}

function signup() {
  const username = document.getElementById("usernameInput").value;
  const password = document.getElementById("passwordInput").value;

  fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if(data.success){
      CURRENT_USER = data.user;
      startChat();
    } else {
      document.getElementById("loginError").innerText = data.message;
    }
  });
}

// START CHAT
function startChat(){
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("chatScreen").style.display = "flex";
  document.getElementById("currentAvatar").src = `/uploads/profilePics/${CURRENT_USER.avatar}`;
  document.getElementById("currentUsername").innerText = CURRENT_USER.username;
  if(CURRENT_USER.isModerator) document.getElementById("adminPanel").style.display = "block";
}

// MESSAGES
function sendMessage(){
  const msg = document.getElementById("chatMessage").value;
  if(!msg) return;
  fetch("/sendMessage", {
    method:"POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ message: msg, username: CURRENT_USER.username })
  });
  document.getElementById("chatMessage").value = "";
}

function addMessage(data){
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  msgDiv.innerHTML = `
    <img src="/uploads/profilePics/${data.avatar}" onclick="openProfileOverlay('${data.username}')">
    <span>${data.username}</span>: <p>${data.message}</p>
  `;
  document.getElementById("messages").appendChild(msgDiv);
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
}

// ADMIN PANEL
function banUser(){
  const username = document.getElementById("banUserInput").value;
  fetch("/banUser", {
    method:"POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ username })
  });
}

function unbanUser(){
  const username = document.getElementById("banUserInput").value;
  fetch("/unbanUser", {
    method:"POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ username })
  });
}

// PROFILE OVERLAY
function openProfileOverlay(username){
  fetch(`/profile/${username}`)
  .then(res => res.json())
  .then(data => {
    if(!data.success) return;
    const u = data.user;
    const isCurrentUser = CURRENT_USER.username === u.username;

    const avatarHTML = isCurrentUser
      ? `<img src="/uploads/profilePics/${u.avatar}" class="userAvatar" id="editAvatarPreview" onclick="triggerAvatarUpload()">
         <input type="file" id="editAvatar" style="display:none;" onchange="previewAvatar(this)">`
      : `<img src="/uploads/profilePics/${u.avatar}" class="userAvatar">`;

    const bioHTML = isCurrentUser
      ? `<textarea id="editBio">${u.bio || ""}</textarea>`
      : `<p class="bioText">${u.bio || "No bio yet"}</p>`;

    const saveBtnHTML = isCurrentUser ? `<button onclick="saveProfile()">Save</button>` : "";

    document.getElementById("profilePage").innerHTML = `
      <div class="profileBox">
        <button class="exitBtn" onclick="closeProfile()">X</button>
        ${avatarHTML}
        <h2>${u.username}</h2>
        ${bioHTML}
        <p>Joined: ${new Date(u.joinDate).toLocaleDateString()}</p>
        ${saveBtnHTML}
      </div>
    `;
    document.getElementById("profilePage").style.display = "flex";
  });
}

function triggerAvatarUpload(){ document.getElementById("editAvatar").click(); }
function previewAvatar(input){
  if(input.files && input.files[0]){
    const reader = new FileReader();
    reader.onload = e => document.getElementById("editAvatarPreview").src = e.target.result;
    reader.readAsDataURL(input.files[0]);
  }
}

function closeProfile(){ document.getElementById("profilePage").style.display="none"; }

function saveProfile(){
  const bio = document.getElementById("editBio").value;
  const avatarFile = document.getElementById("editAvatar").files[0];
  const formData = new FormData();
  formData.append("username", CURRENT_USER.username);
  formData.append("bio", bio);
  if(avatarFile) formData.append("avatar", avatarFile);

  fetch("/updateProfile",{ method:"POST", body:formData })
  .then(res=>res.json())
  .then(data=>{
    if(data.success){
      CURRENT_USER.bio = bio;
      if(data.filename) CURRENT_USER.avatar = data.filename;
      document.getElementById("currentAvatar").src = `/uploads/profilePics/${CURRENT_USER.avatar}`;
      closeProfile();
    }
  });
}
