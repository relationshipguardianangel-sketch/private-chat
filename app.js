const $ = id => document.getElementById(id);

const home = $("home");
const waiting = $("waiting");
const chat = $("chat");
const statusEl = $("status");
const inviteLink = $("inviteLink");
const messages = $("messages");
const messageInput = $("message");
const copyInvite = $("copyInvite");
const copyLink = $("copyLink");

let peer = null;
let connection = null;
let isCreator = false;

function setStatus(text) {
  statusEl.textContent = text;
}

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

function roomFromUrl() {
  return new URLSearchParams(location.search).get("room");
}

function makeInvite(room) {
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", room);
  return url.href;
}

function addMessage(text, mine) {
  const div = document.createElement("div");
  div.className = "msg " + (mine ? "mine" : "theirs");
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function system(text) {
  const div = document.createElement("div");
  div.className = "system";
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function openChat(conn) {
  connection = conn;

  conn.on("open", () => {
    setStatus("Online");
    waiting.classList.add("hidden");
    home.classList.add("hidden");
    chat.classList.remove("hidden");
    copyLink.classList.remove("hidden");
    system("Connected. Messages are sent peer-to-peer.");
    messageInput.focus();
  });

  conn.on("data", data => {
    if (typeof data === "string") addMessage(data, false);
  });

  conn.on("close", () => {
    setStatus("Disconnected");
    system("The other person disconnected.");
  });

  conn.on("error", err => {
    console.error(err);
    setStatus("Connection error");
  });
}

function startCreator(room) {
  isCreator = true;
  setStatus("Waiting…");
  waiting.classList.remove("hidden");
  home.classList.add("hidden");

  const link = makeInvite(room);
  inviteLink.textContent = link;

  peer = new Peer("pc-" + room, {
    debug: 1
  });

  peer.on("open", () => {
    setStatus("Waiting…");
  });

  peer.on("connection", conn => {
    openChat(conn);
  });

  peer.on("error", err => {
    console.error(err);
    setStatus(err.type === "unavailable-id" ? "Please create again" : "Connection error");
  });
}

function startGuest(room) {
  isCreator = false;
  home.classList.add("hidden");
  waiting.classList.add("hidden");
  setStatus("Connecting…");

  peer = new Peer(undefined, { debug: 1 });

  peer.on("open", () => {
    const conn = peer.connect("pc-" + room, { reliable: true });
    openChat(conn);
  });

  peer.on("error", err => {
    console.error(err);
    setStatus("Could not connect");
    system("The chat owner may not be online yet. Refresh the page after they open the chat.");
  });
}

$("create").addEventListener("click", () => {
  const room = randomId();
  history.replaceState({}, "", makeInvite(room));
  startCreator(room);
});

copyInvite.addEventListener("click", async () => {
  const text = inviteLink.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyInvite.textContent = "Copied";
    setTimeout(() => copyInvite.textContent = "Copy link", 1200);
  } catch {
    prompt("Copy this link:", text);
  }
});

copyLink.addEventListener("click", async () => {
  const text = location.href;
  try {
    await navigator.clipboard.writeText(text);
    copyLink.textContent = "Copied";
    setTimeout(() => copyLink.textContent = "Copy link", 1200);
  } catch {
    prompt("Copy this link:", text);
  }
});

$("composer").addEventListener("submit", event => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !connection || !connection.open) return;
  connection.send(text);
  addMessage(text, true);
  messageInput.value = "";
});

const existingRoom = roomFromUrl();
if (existingRoom) {
  startGuest(existingRoom);
} else {
  setStatus("Offline");
}
