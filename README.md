# Spring WebSocket Chat App

A real-time messaging application built with **Spring Boot (Java 21)** and **WebSockets**, featuring a responsive HTML/CSS/JavaScript frontend that works seamlessly on desktop and mobile.

---

## ✨ Features

- 🚀 Real-time chat using **Spring WebSocket**
- 🌐 Works on **desktop & mobile**
- 🔐 Secure WebSockets (`wss://`) in production
- 🎨 Responsive, modern UI
- ☁️ Cloud-ready (Render + Docker)
- ⚙️ Java 21 compatible

---

## 🧰 Tech Stack

- **Backend:** Spring Boot 3.x, Java 21
- **Frontend:** HTML, CSS (Flexbox), JavaScript
- **Protocol:** WebSocket
- **Build Tool:** Maven
- **Hosting:** Render (Docker)

---

## 📁 Project Structure

```
src/
 └─ main/
    ├─ java/com/example/socketchat/
    │  ├─ SocketChatApplication.java
    │  ├─ config/WebSocketConfig.java
    │  ├─ ws/ChatHandler.java
    │  └─ controller/HomeController.java
    └─ resources/
       ├─ static/
       │  ├─ index.html
       │  ├─ style.css
       │  └─ script.js
       └─ application.properties
Dockerfile
pom.xml
```

---

## ▶️ Run Locally

### Prerequisites
- Java **21**
- Maven

### Steps
```bash
mvn clean spring-boot:run
```

Open:
```
http://localhost:8080
```

---

## 🌍 Deploy on Render (Docker)

1. Push this repo to GitHub
2. Create **New Web Service** on Render
3. Select **Docker** as runtime
4. Leave Build & Start commands empty
5. Add environment variable:
   - `PORT=8080`
6. Deploy 🎉

> Make sure `application.properties` contains:
```
server.port=${PORT:8080}
```

---

## 🔒 WebSocket Security

- Local: `ws://localhost:8080/chat`
- Production (HTTPS): `wss://<your-app>.onrender.com/chat`

The app auto-detects the protocol.

---

## 🧪 Troubleshooting

- If messages don’t send, ensure WebSocket uses `wss://` on HTTPS
- Check Render logs for the assigned port
- Disable hardcoded `localhost` in JS

---

## 🎓 Viva / Explanation

> This project demonstrates real-time bidirectional communication using Spring WebSocket. The frontend connects via a persistent WebSocket connection, enabling instant message delivery without page refresh.

---

## 📸 Screenshots

Add screenshots here:
- Desktop view
- Mobile view
- Render deployment page

---

## 📄 License

MIT
