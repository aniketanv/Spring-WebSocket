const ws = new WebSocket(
  (location.protocol === "https:" ? "wss" : "ws") +
  "://" + location.host + "/chat"
);

// ================= STATE =================
let socketReady = false;
let currentRoom = "lobby";

// ================= DOM =================
const loginDiv = document.getElementById("login");
const chatUI = document.getElementById("chatUI");
const loginUser = document.getElementById("loginUser");
const loginError = document.getElementById("loginError");

const chat = document.getElementById("chat");
const room = document.getElementById("room");
const timer = document.getElementById("timer");
const msgInput = document.getElementById("msg");

// ================= BOOTSTRAP MODAL SETUP =================
// We need to control the modal via JS code
const roomModalElement = document.getElementById("roomModal");
const roomModal = new bootstrap.Modal(roomModalElement);
const roomInput = document.getElementById("roomNameInput");

// ================= ENTER HANDLERS =================
loginUser.addEventListener("keydown", e => {
  if (e.key === "Enter") login();
});

msgInput.addEventListener("keydown", e => {
  if (e.key === "Enter") send();
});

roomInput.addEventListener("keydown", e => {
  if (e.key === "Enter") confirmCreateRoom();
});

// ================= SOCKET OPEN =================
ws.onopen = () => {
  socketReady = true;
  const saved = localStorage.getItem("chatUser");
  if (saved) {
    loginUser.value = saved;
    ws.send("__login__" + saved);
  }
};

// ================= LOGIN =================
function login() {
  if (!socketReady) {
    loginError.textContent = "Connecting…";
    return;
  }

  const user = loginUser.value.trim();
  if (!user) return;

  ws.send("__login__" + user);
}

// ================= ROOM SWITCH =================
room.addEventListener("change", () => {
  if (room.value === "__add__") {
    // Reset selection back to current room until new one is created
    room.value = currentRoom; 
    openRoomPopup();
    return;
  }

  // 🔑 clear UI ONLY locally
  chat.innerHTML = "";

  currentRoom = room.value;
  ws.send("__switch__" + currentRoom);

  // Show timer only in lobby
  timer.style.display = currentRoom === "lobby" ? "inline" : "none";
});

// ================= SEND MESSAGE =================
function send() {
  const msg = msgInput.value.trim();
  if (!msg) return;

  ws.send(msg);
  msgInput.value = "";
}

// ================= SOCKET MESSAGES =================
ws.onmessage = e => {
  const d = e.data;

  // ---------- LOGIN OK ----------
  if (d === "__login_ok__") {
    localStorage.setItem("chatUser", loginUser.value.trim());

    // FIX: Use 'd-none' for Bootstrap 5 visibility
    loginDiv.classList.add("d-none");
    chatUI.classList.remove("d-none");

    timer.style.display = "inline";
    ws.send("__join__lobby");
    return;
  }

  // ---------- ROOM LIST ----------
  if (d.startsWith("__rooms__")) {
    const rooms = d.replace("__rooms__", "").split(",");

    room.innerHTML = "";
    rooms.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      room.appendChild(opt);
    });

    const add = document.createElement("option");
    add.value = "__add__";
    add.textContent = "➕ Add room";
    room.appendChild(add);

    room.value = currentRoom;
    return;
  }

  // ---------- LOBBY TIMER ----------
  if (d.startsWith("__lobby_tick__")) {
    if (currentRoom !== "lobby") return;

    const sec = parseInt(d.replace("__lobby_tick__", ""), 10);
    timer.textContent = format(sec);
    timer.style.display = "inline";
    return;
  }

  // ---------- LOBBY RESET ----------
  if (d === "__lobby_reset__") {
    if (currentRoom === "lobby") {
      chat.innerHTML = "";
    }
    return;
  }

  // ---------- NORMAL MESSAGE ----------
  const div = document.createElement("div");
  div.textContent = d;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
};

// ================= TIMER FORMAT =================
function format(s) {
  return (
    "Reset in " +
    String(Math.floor(s / 60)).padStart(2, "0") +
    ":" +
    String(s % 60).padStart(2, "0")
  );
}

// ================= ROOM MODAL =================
function openRoomPopup() {
  roomInput.value = "";
  roomModal.show(); // FIX: Use Bootstrap API
  
  // Wait for modal to animate in before focusing
  setTimeout(() => roomInput.focus(), 500);
}

function closeRoomPopup() {
  roomModal.hide(); // FIX: Use Bootstrap API
}

function confirmCreateRoom() {
  const name = roomInput.value.trim();
  if (!name || name === "lobby") return;

  ws.send("__create__" + name);

  // Optimistically add to list (server will confirm via broadcast)
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  // Insert before the "Add room" button
  room.insertBefore(opt, room.lastElementChild);

  chat.innerHTML = "";
  currentRoom = name;
  room.value = name;

  ws.send("__switch__" + name);
  closeRoomPopup();
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("chatUser");
  location.reload();
}