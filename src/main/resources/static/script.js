function setVh() {
  document.documentElement.style.setProperty(
    "--vh",
    `${window.innerHeight * 0.01}px`
  );
}

setVh();
window.addEventListener("resize", setVh);


let ws = new WebSocket(
  `ws://${window.location.hostname}:${window.location.port}/chat`
);

const chatBox = document.getElementById("chat");

ws.onmessage = e => {
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

function send() {
  const user = document.getElementById("user").value || "Guest";
  const msg = document.getElementById("msg").value.trim();

  if (!msg) return;

  ws.send(user + ": " + msg);
  document.getElementById("msg").value = "";
}

// Send on Enter key
document.getElementById("msg").addEventListener("keydown", e => {
  if (e.key === "Enter") send();
});
