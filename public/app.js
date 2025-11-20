let CURRENT_USER = null;

// ================================
// LOGIN
// ================================
function login() {
  const username = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value;
  if (!username || !password) return alert("Enter both username and password.");

  fetch("/login", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ username, password })
  }).then(res=>res.json()).then(data=>{
    if (!data.success) return alert(data.message);
    CURRENT_USER = data.user;
    document.getElementById("loginScreen").style.display="none";
    document.getElementById("chatScreen").style.display="block";
    if (CURRENT_USER.isModerator) document.getElementById("adminPanel").style.display="block";
  });
}

// ================================
// SIGNUP
// ================================
function signup() {
  const username = document.getElementById("usernameInput").value.trim();
  const password = document.getElementById("passwordInput").value;
  if (!username || !password) return alert("Enter both username and password.");

  fetch("/signup", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ username, password })
  }).then(res=>res.json()).then(data=>{
    if (!data.success) return alert(data.message);
    alert("Account created! Login now.");
  });
}

// ================================
// CHAT
// ================================
const pusher = new Pusher("b7d05dcc13df522efbbc", { cluster: "us2" });
const channel = pusher.subscribe("chat");
channel.bind("message", data => addMessage(data.username, data.message));

function sendMessage() {
  const message = document.getElementById("chatMessage").value.trim();
  if (!message) return;
  fetch("/send-message",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:CURRENT_USER.username, message})});
  document.getElementById("chatMessage").value="";
}

function addMessage(username, message) {
  fetch(`/profile/${username}`).then(res=>res.json()).then(data=>{
    const avatar = data.success ? data.user.avatar : "default.png";
    const msgBox = document.getElementById("messages");
    const div = document.createElement("div");
    div.className="messageRow";
    div.innerHTML = `<img src='/uploads/profilePics/${avatar}' class='userAvatar' onclick='openProfile("${username}")'> <b style='cursor:pointer;color:cyan;' onclick='openProfile("${username}")'>@${username}</b>: ${message}`;
    msgBox.appendChild(div);
    msgBox.scrollTop = msgBox.scrollHeight;
  });
}

// ================================
// PROFILE VIEW & EDIT
// ================================
function openProfile(username){
  fetch(`/profile/${username}`).then(res=>res.json()).then(data=>{
    if(!data.success)return;
    const u=data.user;
    document.getElementById("profilePage").style.display="block";
    document.getElementById("profilePage").innerHTML=`<div class='profileBox'>
      <img src='/uploads/profilePics/${u.avatar}' class='userAvatar'>
      <h2>${u.displayName}</h2>
      <p><b>@${u.username}</b></p>
      <p>${u.bio}</p>
      <p><i>Joined: ${new Date(u.joinDate).toLocaleDateString()}</i></p>
      <button onclick='closeProfile()'>X</button>
    </div>`;
  });
}
function closeProfile(){document.getElementById("profilePage").style.display="none";}

function openProfileEditor(){
  document.getElementById("profilePage").style.display="block";
  document.getElementById("profilePage").innerHTML=`<div class='profileBox'>
    <h2>Edit Profile</h2>
    <input type='text' id='editDisplayName' placeholder='Display Name' value='${CURRENT_USER.displayName}'>
    <input type='text' id='editBio' placeholder='Bio' value='${CURRENT_USER.bio}'>
    <input type='file' id='editAvatar'>
    <button onclick='saveProfile()'>Save</button>
    <button onclick='closeProfile()'>Cancel</button>
  </div>`;
}

function saveProfile(){
  const displayName=document.getElementById("editDisplayName").value;
  const bio=document.getElementById("editBio").value;
  const avatarFile=document.getElementById("editAvatar").files[0];
  const formData=new FormData();
  formData.append("username",CURRENT_USER.username);
  formData.append("displayName",displayName);
  formData.append("bio",bio);
  if(avatarFile) formData.append("avatar",avatarFile);

  fetch("/updateProfile",{method:"POST", body:formData})
    .then(res=>res.json())
    .then(data=>{
      if(data.success){
        CURRENT_USER.displayName=displayName;
        CURRENT_USER.bio=bio;
        if(avatarFile) CURRENT_USER.avatar=data.filename||CURRENT_USER.avatar;
        closeProfile();
      }
    });
}

// ================================
// ADMIN
// ================================
function banUser(){
  const username=document.getElementById("banUserInput").value.trim();
  if(!username)return alert("Enter a username to ban.");
  fetch("/ban",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username})})
    .then(res=>res.json())
    .then(data=>{ if(data.success)alert(`User @${username} banned.`); document.getElementById("banUserInput").value=""; });
}
function unbanUser(){
  const username=document.getElementById("unbanUserInput").value.trim();
  if(!username)return alert("Enter a username to unban.");
  fetch("/unban",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username})})
    .then(res=>res.json())
    .then(data=>{ if(data.success)alert(`User @${username} unbanned.`); document.getElementById("unbanUserInput").value=""; });
}

