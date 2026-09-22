const $ = id => document.getElementById(id);

const home=$("home"), waiting=$("waiting"), chat=$("chat");
const statusEl=$("status"), inviteLink=$("inviteLink"), messages=$("messages");
const messageInput=$("message"), copyInvite=$("copyInvite"), copyLink=$("copyLink");

let peer=null, connection=null, room=null, reconnectTimer=null;
let role=null;

const PEER_OPTIONS={debug:1, pingInterval:10000};

function setStatus(text){statusEl.textContent=text;}

function randomId(){
  const b=new Uint8Array(16); crypto.getRandomValues(b);
  return [...b].map(x=>x.toString(16).padStart(2,"0")).join("");
}

function roomFromUrl(){return new URLSearchParams(location.search).get("room");}

function makeInvite(r){
  const u=new URL(location.href);
  u.search=""; u.hash=""; u.searchParams.set("room",r); return u.href;
}

function addMessage(text,mine){
  const d=document.createElement("div");
  d.className="msg "+(mine?"mine":"theirs"); d.textContent=text;
  messages.appendChild(d); messages.scrollTop=messages.scrollHeight;
}

function system(text){
  const d=document.createElement("div"); d.className="system"; d.textContent=text;
  messages.appendChild(d); messages.scrollTop=messages.scrollHeight;
}

function showChat(){
  waiting.classList.add("hidden"); home.classList.add("hidden");
  chat.classList.remove("hidden"); copyLink.classList.remove("hidden");
  messageInput.focus();
}

function attachConnection(conn){
  connection=conn;
  conn.on("open",()=>{
    clearTimeout(reconnectTimer);
    setStatus("Online");
    showChat();
    if(!messages.querySelector(".system")) system("Connected. Messages are sent peer-to-peer.");
  });
  conn.on("data",data=>{if(typeof data==="string") addMessage(data,false);});
  conn.on("close",()=>{
    connection=null; setStatus("Reconnecting…");
    system("Connection lost. Trying to reconnect…");
    scheduleReconnect();
  });
  conn.on("error",err=>{
    console.warn("Peer connection error",err);
    setStatus("Reconnecting…");
    scheduleReconnect();
  });
}

function scheduleReconnect(){
  if(reconnectTimer) return;
  reconnectTimer=setTimeout(()=>{
    reconnectTimer=null;
    if(role==="guest") connectGuest();
  },3000);
}

function startCreator(r){
  role="creator"; room=r; setStatus("Starting…");
  waiting.classList.remove("hidden"); home.classList.add("hidden");
  inviteLink.textContent=makeInvite(r);

  peer=new Peer("pc-"+r,PEER_OPTIONS);

  peer.on("open",()=>setStatus("Waiting…"));
  peer.on("connection",conn=>attachConnection(conn));
  peer.on("disconnected",()=>{
    setStatus("Reconnecting service…");
    peer.reconnect();
  });
  peer.on("close",()=>setStatus("Offline"));
  peer.on("error",err=>{
    console.error(err);
    if(err.type==="unavailable-id") {
      setStatus("Room unavailable");
      system("This room ID is already in use. Create a new chat.");
    } else {
      setStatus("Connection error");
    }
  });
}

function connectGuest(){
  if(!peer || peer.destroyed) return;
  setStatus("Connecting…");
  const conn=peer.connect("pc-"+room,{reliable:true,serialization:"json"});
  attachConnection(conn);
}

function startGuest(r){
  role="guest"; room=r; home.classList.add("hidden"); waiting.classList.add("hidden");
  setStatus("Connecting…");

  peer=new Peer(undefined,PEER_OPTIONS);

  peer.on("open",connectGuest);
  peer.on("disconnected",()=>{
    setStatus("Reconnecting service…");
    peer.reconnect();
  });
  peer.on("close",()=>setStatus("Offline"));
  peer.on("error",err=>{
    console.warn(err);
    setStatus("Waiting for chat…");
    scheduleReconnect();
  });
}

$("create").addEventListener("click",()=>{
  room=randomId();
  history.replaceState({}, "", makeInvite(room));
  startCreator(room);
});

copyInvite.addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(inviteLink.textContent);}
  catch{prompt("Copy this link:",inviteLink.textContent);}
  copyInvite.textContent="Copied";
  setTimeout(()=>copyInvite.textContent="Copy link",1200);
});

copyLink.addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(location.href);}
  catch{prompt("Copy this link:",location.href);}
  copyLink.textContent="Copied";
  setTimeout(()=>copyLink.textContent="Copy link",1200);
});

$("composer").addEventListener("submit",e=>{
  e.preventDefault();
  const text=messageInput.value.trim();
  if(!text||!connection||!connection.open)return;
  connection.send(text); addMessage(text,true); messageInput.value=""; messageInput.focus();
});

room=roomFromUrl();
if(room) startGuest(room);
else setStatus("Offline");

window.addEventListener("beforeunload",()=>{
  if(peer) peer.destroy();
});
