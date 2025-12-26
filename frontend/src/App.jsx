import { useState, useEffect, useRef } from 'react';

function App() {
  // --- STATE ---
  const [socketReady, setSocketReady] = useState(false);
  const [user, setUser] = useState(localStorage.getItem("chatUser") || "");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [room, setRoom] = useState("lobby");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [lobbyTimer, setLobbyTimer] = useState(null);
  const [inputMsg, setInputMsg] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [showModal, setShowModal] = useState(false);

  const ws = useRef(null);
  const chatEndRef = useRef(null);

  // --- WEBSOCKET ---
  useEffect(() => {
    // Dynamic protocol for Mobile/Localhost support
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    ws.current = new WebSocket(`${protocol}://${window.location.host}/chat`);

    ws.current.onopen = () => {
      setSocketReady(true);
      const savedUser = localStorage.getItem("chatUser");
      if (savedUser) {
        ws.current.send("__login__" + savedUser);
      }
    };

    ws.current.onmessage = (event) => {
      const d = event.data;
      if (d === "__login_ok__") {
        setIsLoggedIn(true);
        ws.current.send("__join__lobby");
      } else if (d.startsWith("__rooms__")) {
        const raw = d.replace("__rooms__", "");
        setAvailableRooms(raw ? raw.split(",") : []);
      } else if (d.startsWith("__lobby_tick__")) {
        setLobbyTimer(d.replace("__lobby_tick__", ""));
      } else if (d === "__lobby_reset__") {
        setMessages([]);
      } else {
        setMessages((prev) => [...prev, d]);
      }
    };

    ws.current.onclose = () => setSocketReady(false);
    return () => ws.current.close();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- ACTIONS ---
  const handleLogin = () => {
    if (!user.trim() || !socketReady) return;
    localStorage.setItem("chatUser", user);
    ws.current.send("__login__" + user);
  };

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    ws.current.send(inputMsg);
    setInputMsg("");
  };

  const handleRoomChange = (e) => {
    const selected = e.target.value;
    if (selected === "__add__") setShowModal(true);
    else {
      setMessages([]);
      setRoom(selected);
      setLobbyTimer(null);
      ws.current.send("__switch__" + selected);
    }
  };

  const createRoom = () => {
    if (!newRoomName.trim() || newRoomName === "lobby") return;
    ws.current.send("__create__" + newRoomName);
    
    // Switch immediately
    setMessages([]);
    setRoom(newRoomName);
    setLobbyTimer(null);
    ws.current.send("__switch__" + newRoomName);
    
    setShowModal(false);
    setNewRoomName("");
  };

  const handleLogout = () => {
    localStorage.removeItem("chatUser");
    window.location.reload();
  };

  // --- RENDER ---
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-sm space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Welcome</h1>
            <p className="text-gray-500 text-sm">Join the chat room</p>
          </div>
          <div className="space-y-4">
            <input 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Username" 
              value={user} 
              onChange={(e) => setUser(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button 
              className={`w-full py-3 rounded-xl text-white font-semibold transition shadow-lg ${socketReady ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5' : 'bg-gray-400 cursor-not-allowed'}`}
              onClick={handleLogin} 
              disabled={!socketReady}
            >
              {socketReady ? "Enter Chat" : "Connecting..."}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-2 md:p-6">
      <div className="bg-white flex flex-col w-full max-w-4xl h-full md:h-[85vh] rounded-xl md:rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        
        {/* HEADER */}
        <div className="bg-indigo-600 p-3 md:p-4 text-white flex justify-between items-center shadow-md z-20">
          <div className="flex items-center space-x-3">
             <div className="relative">
               <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
               <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
             </div>
             <span className="font-bold text-lg tracking-wide capitalize truncate max-w-[150px]">{room}</span>
          </div>
          <div className="flex items-center space-x-3">
            {room === "lobby" && lobbyTimer && (
              <div className="bg-indigo-800/60 backdrop-blur px-3 py-1 rounded-full text-xs font-mono border border-indigo-400/30">
                 {Math.floor(lobbyTimer / 60).toString().padStart(2, "0")}:{(lobbyTimer % 60).toString().padStart(2, "0")}
              </div>
            )}
            <button 
              className="text-indigo-100 hover:text-white hover:bg-white/10 px-3 py-1 rounded transition text-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-gray-50 space-y-3 scroll-smooth">
          {messages.map((msg, index) => {
            const isSystem = msg.startsWith("__");
            if(isSystem) return null;

            const parts = msg.split(':');
            const sender = parts[0];
            const text = parts.slice(1).join(':');
            const isMe = sender === user;

            return (
              <div key={index} className={`w-full flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                 <span className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 mx-1 font-semibold">{sender}</span>
                 <div className={`px-4 py-2.5 rounded-2xl shadow-sm max-w-[85%] md:max-w-[70%] break-words text-sm md:text-base ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'}`}>
                   {text}
                 </div>
              </div>
            )
          })}
          <div ref={chatEndRef} />
        </div>

        {/* FOOTER */}
        <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center z-10">
          
          {/* CUSTOM DROPDOWN WITH ARROW */}
          <div className="relative group">
            <select 
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-3 pl-4 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer font-medium hover:border-indigo-300 max-w-[140px] truncate"
              value={room} 
              onChange={handleRoomChange}
            >
              <option value="lobby">Lobby</option>
              {availableRooms.map(r => r !== "lobby" && <option key={r} value={r}>{r}</option>)}
              <option disabled>────────</option>
              <option value="__add__" className="text-indigo-600 font-bold">+ New Room</option>
            </select>
            {/* Custom Arrow Icon */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 group-hover:text-indigo-600 transition-colors">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>

          <input 
            className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm"
            placeholder="Type a message..." 
            value={inputMsg} 
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
          />
          <button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl w-12 h-12 flex items-center justify-center shadow-lg hover:shadow-indigo-200 transition-all active:scale-95"
            onClick={handleSend}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.519 60.519 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Create New Room</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <input 
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="Enter room name..." 
                  value={newRoomName} 
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createRoom()}
                  autoFocus
                />

              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  className="px-5 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition" 
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md hover:shadow-lg transition active:scale-95" 
                  onClick={createRoom}
                >
                  Create Room
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;