const ws = new WebSocket(
  (location.protocol === "https:" ? "wss" : "ws") +
  "://" + location.host + "/chat"
);

let socketReady = false;
let currentRoom = "lobby";

// ===== LOBBY TIMER STATE =====
let lobbyResetAt = null;
let lobbyInterval = null;

// ===== DOM =====
const loginDiv = document.getElementById("login");
const chatUI = document.getElementById("chatUI");
const loginUser = document.getElementById("loginUser");
const loginError = document.getElementById("loginError");
const chat = document.getElementById("chat");
const room = document.getElementById("room");
const timer = document.getElementById("timer");
const msgInput = document.getElementById("msg");

// ===== ENTER HANDLERS =====
loginUser.addEventListener("keydown", e => {
  if (e.key === "Enter") login();
});

msgInput.addEventListener("keydown", e => {
  if (e.key === "Enter") send();
});

// ===== SOCKET OPEN =====
ws.onopen = () => {
  socketReady = true;

  const saved = localStorage.getItem("chatUser");
  if (saved) {
    loginUser.value = saved;
    ws.send("__login__" + saved);
  }
};

// ===== LOGIN =====
function login() {
  if (!socketReady) {
    loginError.textContent = "Connecting…";
    return;
  }

  const u = loginUser.value.trim();
  if (!u) return;

  ws.send("__login__" + u);
}

// ===== ROOM SWITCH =====
room.addEventListener("change", () => {
  if (room.value === "__add__") {
    room.value = currentRoom;
    openRoomPopup();
    return;
  }

  currentRoom = room.value;
  ws.send("__switch__" + currentRoom);

  // 🔑 timer only visible in lobby
  timer.style.display = currentRoom === "lobby" ? "inline" : "none";
});


// ===== SEND MESSAGE =====
function send() {
  const m = msgInput.value.trim();
  if (!m) return;
  ws.send(m);
  msgInput.value = "";
}

// ===== SOCKET MESSAGES =====
ws.onmessage = e => {
  const d = e.data;

  // ===== LOGIN OK =====
  if (d === "__login_ok__") {
    localStorage.setItem("chatUser", loginUser.value.trim());
    loginDiv.classList.add("hidden");
    chatUI.classList.remove("hidden");
    ws.send("__join__lobby");
    return;
  }

  // ===== ROOM LIST =====
  if (d.startsWith("__rooms__")) {
    room.innerHTML = "";

    d.replace("__rooms__", "").split(",").forEach(r => {
      const o = document.createElement("option");
      o.value = r;
      o.textContent = r;
      room.appendChild(o);
    });

    const add = document.createElement("option");
    add.value = "__add__";
    add.textContent = "➕ Add room";
    room.appendChild(add);

    room.value = currentRoom;
    return;
  }

  // ===== LOBBY TICK (🔥 MUST BE EARLY) =====
  if (d.startsWith("__lobby_tick__")) {
    if (currentRoom !== "lobby") return;

    const seconds = parseInt(d.replace("__lobby_tick__", ""), 10);
    timer.textContent =
      "Reset in " +
      String(Math.floor(seconds / 60)).padStart(2, "0") +
      ":" +
      String(seconds % 60).padStart(2, "0");

    timer.style.display = "inline";
    return;
  }

  // ===== LOBBY RESET =====
  if (d === "__lobby_reset__") {
    if (currentRoom === "lobby") {
      chat.innerHTML = "";
    }
    return;
  }

  // ===== ROOM SWITCH CLEAR =====
  if (d === "__clear__") {
  // clear ONLY for non-lobby rooms
  if (currentRoom !== "lobby") {
    chat.innerHTML = "";
  }
  return;
}


  // ===== NORMAL CHAT MESSAGE =====
  const div = document.createElement("div");
  div.textContent = d;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
};


// ===== LOBBY TIMER UPDATE (ALWAYS TICKS) =====
function updateLobbyTimer() {
  if (!lobbyResetAt) return;

  const seconds = Math.max(
    0,
    Math.floor((lobbyResetAt - Date.now()) / 1000)
  );

  timer.textContent = format(seconds);
}

// ===== FORMAT =====
function format(s) {
  return (
    "Reset in " +
    String(Math.floor(s / 60)).padStart(2, "0") +
    ":" +
    String(s % 60).padStart(2, "0")
  );
}

// ===== ROOM MODAL =====
const modal = document.getElementById("roomModal");
const roomInput = document.getElementById("roomNameInput");

roomInput.addEventListener("keydown", e => {
  if (e.key === "Enter") confirmCreateRoom();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) {
    closeRoomPopup();
  }
});

function openRoomPopup() {
  modal.classList.remove("hidden");
  roomInput.value = "";
  roomInput.focus();
}

function closeRoomPopup() {
  modal.classList.add("hidden");
}

function confirmCreateRoom() {
  const n = roomInput.value.trim();
  if (!n) return;

  ws.send("__create__" + n);

  const opt = document.createElement("option");
  opt.value = n;
  opt.textContent = n;
  room.insertBefore(opt, room.lastElementChild);

  room.value = n;
  currentRoom = n;
  ws.send("__switch__" + n);
  closeRoomPopup();
}

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem("chatUser");
  location.reload();
}
