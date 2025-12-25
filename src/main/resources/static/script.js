// ---------- Fix mobile viewport ----------
function setVh() {
  document.documentElement.style.setProperty(
    "--vh",
    `${window.innerHeight * 0.01}px`
  );
}
setVh();
window.addEventListener("resize", setVh);

// ---------- WebSocket connection ----------
const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const wsUrl = `${protocol}://${window.location.host}/chat`;

const ws = new WebSocket(wsUrl);

const chatBox = document.getElementById("chat");

// ---------- Receive messages ----------
ws.onmessage = (e) => {
  const msg = e.data;
  const parts = msg.split(":");

  const div = document.createElement("div");
  div.className = "message";

  const user = document.createElement("div");
  user.className = "user";
  user.textContent = parts.shift();

  const text = document.createElement("div");
  text.className = "text";
  text.textContent = parts.join(":");

  div.appendChild(user);
  div.appendChild(text);
  chatBox.appendChild(div);

  chatBox.scrollTop = chatBox.scrollHeight;
};

// ---------- Send message ----------
function send() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert("Connecting to server...");
    return;
  }

  const user = document.getElementById("user").value || "Guest";
  const msg = document.getElementById("msg").value.trim();

  if (!msg) return;

  ws.send(user + ": " + msg);
  document.getElementById("msg").value = "";
}

// ---------- Send on Enter ----------
document.getElementById("msg").addEventListener("keydown", (e) => {
  if (e.key === "Enter") send();
});
