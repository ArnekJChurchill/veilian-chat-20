let CUR_USER = null;

// ---------- Pusher Setup ----------
const PUSHER_KEY = "b7d05dcc13df522efbbc";
const PUSHER_CLUSTER = "us2";
const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER, forceTLS: true });
const channel = pusher.subscribe("private-veilian-chat");

// ---------- DOM Elements ----------
const loginScreen = document.getElementById('loginScreen');
const appRoot = document.getElementById('appRoot');
const loginMsg = document.getElementById('loginMsg');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

const leftAvatar = document.getElementById('leftAvatar');
const leftUsername = document.getElementById('leftUsername');
const leftJoinDate = document.getElementById('leftJoinDate');
const profileBongle = document.getElementById('profileBongle');

const chatDisplay = document.getElementById('chatDisplay');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');

const userList = document.getElementById('userList');

const adminPanel = document.getElementById('adminPanel');
const adminUserInput = document.getElementById('adminUserInput');
const banBtn = document.getElementById('banBtn');
const unbanBtn = document.getElementById('unbanBtn');
const modUserInput = document.getElementById('modUserInput');
const toggleModBtn = document.getElementById('toggleModBtn');

const profileModal = document.getElementById('profileModal');
const profileAvatarLarge = document.getElementById('profileAvatarLarge');
const profileNameLarge = document.getElementById('profileNameLarge');
const profileJoinLarge = document.getElementById('profileJoinLarge');
const bioTextarea = document.getElementById('bio');
const saveBioBtn = document.getElementById('saveBioBtn');
const cancelBioBtn = document.getElementById('cancelBioBtn');
const avatarFileInput = document.getElementById('avatarFileInput');
const closeProfile = document.getElementById('closeProfile');

const otherProfileModal = document.getElementById('otherProfileModal');
const closeOtherProfile = document.getElementById('closeOtherProfile');
const otherAvatarLarge = document.getElementById('otherAvatarLarge');
const otherNameLarge = document.getElementById('otherNameLarge');
const otherJoinLarge = document.getElementById('otherJoinLarge');
const otherBioTextarea = document.getElementById('otherBio');

// ---------- LocalStorage Helpers ----------
const DB_USERS_KEY = 'veilian_users_v2';
const DB_MESSAGES_KEY = 'veilian_messages_v2';
const DB_BANNED_KEY = 'veilian_banned_v2';

function loadUsers(){try{return JSON.parse(localStorage.getItem(DB_USERS_KEY)||'{}')}catch(e){return {}}}
function saveUsers(u){localStorage.setItem(DB_USERS_KEY, JSON.stringify(u))}
function loadMessages(){try{return JSON.parse(localStorage.getItem(DB_MESSAGES_KEY)||'[]')}catch(e){return []}}
function saveMessages(m){localStorage.setItem(DB_MESSAGES_KEY, JSON.stringify(m))}
function loadBanned(){try{return JSON.parse(localStorage.getItem(DB_BANNED_KEY)||'[]')}catch(e){return []}}
function saveBanned(b){localStorage.setItem(DB_BANNED_KEY, JSON.stringify(b))}

function validUsername(u){return /^[A-Za-z0-9-]{3,32}$/.test(u)}
function escapeHtml(text){return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

// ---------- Account Actions ----------
signupBtn.addEventListener('click',()=>{
    const u=usernameInput.value.trim(); const p=passwordInput.value;
    if(!validUsername(u)){loginMsg.textContent='Invalid username'; return;}
    if(!p||p.length<4){loginMsg.textContent='Password must be at least 4 chars'; return;}
    const users=loadUsers();
    if(users[u]){loginMsg.textContent='Username exists'; return;}
    const now = new Date().toISOString();
    users[u]={username:u,password:p,avatar:'',bio:'',joined:now,isMod:false};
    saveUsers(users);
    loginMsg.style.color='green';
    loginMsg.textContent='Account created, you can login';
});

loginBtn.addEventListener('click',()=>{
    const u=usernameInput.value.trim(); const p=passwordInput.value;
    const users=loadUsers(); const user=users[u];
    if(!user||user.password!==p){loginMsg.textContent='Wrong username/password'; return;}
    if(loadBanned().includes(u)){loginMsg.textContent='This account is banned'; return;}
    CUR_USER=user; onLogin();
});

function onLogin(){
    loginScreen.style.display='none';
    appRoot.style.display='flex';
    leftUsername.textContent=CUR_USER.username;
    leftJoinDate.textContent='Joined: '+(new Date(CUR_USER.joined)).toLocaleDateString();
    if(CUR_USER.avatar) leftAvatar.src=CUR_USER.avatar;
    adminPanel.style.display=CUR_USER.isMod?'block':'none';
    profileBongle.addEventListener('click',()=>openProfileModal(CUR_USER.username));
    renderMessages(); renderUserList();
}

// ---------- Messages ----------
function renderMessages(){
    const msgs=loadMessages(); chatDisplay.innerHTML='';
    msgs.forEach(m=>{
        const wrap=document.createElement('div'); wrap.className='message'+(m.user===CUR_USER.username?' me':'');
        const img=document.createElement('img'); img.src=m.avatar||'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"></svg>';
        img.style.width='36px'; img.style.height='36px'; img.style.borderRadius='50%'; img.style.objectFit='cover'; img.style.cursor='pointer';
        img.dataset.user=m.user;
        img.addEventListener('click',()=>openOtherProfile(m.user));
        const bubble=document.createElement('div'); bubble.className='bubble';
        bubble.innerHTML='<div style="font-weight:700">'+escapeHtml(m.user)+'</div><div class="meta">'+new Date(m.t).toLocaleTimeString()+'</div><div style="margin-top:6px">'+escapeHtml(m.text)+'</div>';
        wrap.appendChild(img); wrap.appendChild(bubble); chatDisplay.appendChild(wrap);
    });
    chatDisplay.scrollTop=chatDisplay.scrollHeight;
}

sendBtn.addEventListener('click',sendMessage);
msgInput.addEventListener('keydown',(e)=>{if(e.key==='Enter') sendMessage();});

function sendMessage(){
    const text=msgInput.value.trim(); if(!text) return;
    if(loadBanned().includes(CUR_USER.username)){alert('You are banned'); return;}
    const m={user:CUR_USER.username,text:text,t:new Date().toISOString(),avatar:CUR_USER.avatar||''};
    const msgs=loadMessages(); msgs.push(m); saveMessages(msgs);
    addMessageToUI(m);
    msgInput.value='';
    channel.trigger('client-new-message', m);
}

channel.bind('client-new-message', function(m){
    if(m.user===CUR_USER.username) return; // skip self
    const msgs=loadMessages(); msgs.push(m); saveMessages(msgs); renderMessages();
});

// ---------- User List ----------
function renderUserList(){
    const users=loadUsers(); userList.innerHTML='';
    Object.values(users).forEach(u=>{
        const el=document.createElement('div'); el.style.display='flex'; el.style.alignItems='center'; el.style.justifyContent='space-between'; el.style.gap='8px'; el.style.padding='6px 8px'; el.style.borderRadius='8px'; el.style.background='#fff';
        const left=document.createElement('div'); left.style.display='flex'; left.style.alignItems='center'; left.style.gap='8px';
        const av=document.createElement('img'); av.src=u.avatar||'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"></svg>';
        av.style.width='32px'; av.style.height='32px'; av.style.borderRadius='50%'; av.style.objectFit='cover'; av.dataset.user=u.username;
        av.addEventListener('click',()=>openOtherProfile(u.username));
        const name=document.createElement('span'); name.textContent=u.username+(u.isMod?' (mod)':'');
        left.appendChild(av); left.appendChild(name); el.appendChild(left); userList.appendChild(el);
    });
}

// ---------- Profile Modals ----------
function openProfileModal(username){
    profileModal.style.display='flex';
    profileNameLarge.textContent=username;
    profileJoinLarge.textContent=new Date(CUR_USER.joined).toLocaleDateString();
    profileAvatarLarge.src=CUR_USER.avatar||'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"></svg>';
    bioTextarea.value=CUR_USER.bio||'';
}
closeProfile.addEventListener('click',()=>profileModal.style.display='none');
cancelBioBtn.addEventListener('click',()=>profileModal.style.display='none');

profileAvatarLarge.addEventListener('click',()=>avatarFileInput.click());
avatarFileInput.addEventListener('change',()=>{
    const f=avatarFileInput.files[0]; if(!f) return;
    const reader=new FileReader();
    reader.onload=()=>{
        profileAvatarLarge.src=reader.result; CUR_USER.avatar=reader.result; commitUserChange();
        channel.trigger('client-update-avatar',{user:CUR_USER.username,avatar:CUR_USER.avatar}); renderUserList();
    }
    reader.readAsDataURL(f);
});

saveBioBtn.addEventListener('click',()=>{
    CUR_USER.bio=bioTextarea.value; commitUserChange(); profileModal.style.display='none';
    channel.trigger('client-update-bio',{user:CUR_USER.username,bio:CUR_USER.bio});
});

function commitUserChange(){const users=loadUsers(); users[CUR_USER.username]=CUR_USER; saveUsers(users);}

// Other profile modal
function openOtherProfile(username){
    if(username===CUR_USER.username){openProfileModal(username); return;}
    const users=loadUsers(); const u=users[username]; if(!u) return alert('User not found');
    otherProfileModal.style.display='flex';
    otherNameLarge.textContent=u.username;
    otherJoinLarge.textContent=new Date(u.joined).toLocaleDateString();
    otherAvatarLarge.src=u.avatar||'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"></svg>';
    otherBioTextarea.value=u.bio||'';
}
closeOtherProfile.addEventListener('click',()=>otherProfileModal.style.display='none');

// ---------- Moderation ----------
banBtn.addEventListener('click',()=>{
    const name=adminUserInput.value.trim(); if(!name) return alert('Enter username');
    const users=loadUsers(); if(!users[name]) return alert('User not found');
    let banned=loadBanned(); if(!banned.includes(name)){banned.push(name); saveBanned(banned); channel.trigger('client-ban-user',{username:name}); alert(name+' banned');}
});
unbanBtn.addEventListener('click',()=>{
    const name=adminUserInput.value.trim(); if(!name) return alert('Enter username');
    let banned=loadBanned(); if(banned.includes(name)){banned=banned.filter(x=>x!==name); saveBanned(banned); channel.trigger('client-unban-user',{username:name}); alert(name+' unbanned');}
});
toggleModBtn.addEventListener('click',()=>{
    const name=modUserInput.value.trim(); if(!name) return alert('Enter username');
    const users=loadUsers(); if(!users[name]) return alert('User not found');
    users[name].isMod=!users[name].isMod; saveUsers(users); channel.trigger('client-toggle-mod',{username:name,isMod:users[name].isMod}); renderUserList(); alert(name+' mod toggled to '+users[name].isMod);
});

// Pusher bindings for moderation
channel.bind('client-ban-user', data=>{
    let banned=loadBanned(); if(!banned.includes(data.username)){banned.push(data.username); saveBanned(banned);}
});
channel.bind('client-unban-user', data=>{
    let banned=loadBanned(); banned=banned.filter(x=>x!==data.username); saveBanned(banned);
});
channel.bind('client-toggle-mod', data=>{
    const users=loadUsers(); if(users[data.username]){users[data.username].isMod=data.isMod; saveUsers(users); renderUserList();}
});
channel.bind('client-update-bio', data=>{
    const users=loadUsers(); if(users[data.user]){users[data.user].bio=data.bio; saveUsers(users);}
});
channel.bind('client-update-avatar', data=>{
    const users=loadUsers(); if(users[data.user]){users[data.user].avatar=data.avatar; saveUsers(users); renderUserList(); if(CUR_USER.username===data.user) leftAvatar.src=data.avatar;}
});
