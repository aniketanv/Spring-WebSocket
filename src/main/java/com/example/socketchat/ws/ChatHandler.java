package com.example.socketchat.ws;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.*;
import java.util.concurrent.*;

@Component
public class ChatHandler extends TextWebSocketHandler {

    // ================= CONFIG =================
    private static final int LOBBY_DURATION = 300; // seconds (5 min)

    // ================= STATE =================
    private volatile int lobbySeconds = LOBBY_DURATION;

    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();
    private final Map<String, List<String>> roomMessages = new ConcurrentHashMap<>();
    private final Map<String, String> users = new ConcurrentHashMap<>();
    private final Map<String, String> userRooms = new ConcurrentHashMap<>();

    private final ScheduledExecutorService scheduler =
            Executors.newSingleThreadScheduledExecutor();

    // ================= INIT =================
    @PostConstruct
    public void init() {
        rooms.put("lobby", ConcurrentHashMap.newKeySet());
        roomMessages.put("lobby", new CopyOnWriteArrayList<>());

        // 🔑 SERVER-DRIVEN TIMER (ONE SOURCE OF TRUTH)
        scheduler.scheduleAtFixedRate(() -> {

            lobbySeconds--;

            broadcastSafe("lobby", "__lobby_tick__" + lobbySeconds);

            if (lobbySeconds <= 0) {
                lobbySeconds = LOBBY_DURATION;
                roomMessages.get("lobby").clear();
                broadcastSafe("lobby", "__lobby_reset__");
            }

        }, 1, 1, TimeUnit.SECONDS);
    }

    // ================= MESSAGE HANDLER =================
    @Override
    protected void handleTextMessage(WebSocketSession s, TextMessage msg) throws Exception {
        String p = msg.getPayload();

        // ---------- LOGIN ----------
        if (p.startsWith("__login__")) {
            users.put(s.getId(), p.substring(9).trim());
            s.sendMessage(new TextMessage("__login_ok__"));
            sendRoomList(s);
            return;
        }

        // ---------- CREATE ROOM ----------
        if (p.startsWith("__create__")) {
            String room = p.substring(10).trim();
            if (room.isEmpty() || room.equals("lobby")) return;

            rooms.putIfAbsent(room, ConcurrentHashMap.newKeySet());
            roomMessages.putIfAbsent(room, new CopyOnWriteArrayList<>());

            broadcastRoomList();
            return;
        }

        // ---------- JOIN ----------
        if (p.startsWith("__join__")) {
            joinRoom(s, p.substring(8));
            return;
        }

        // ---------- SWITCH ----------
        if (p.startsWith("__switch__")) {
            leaveRoom(s);
            joinRoom(s, p.substring(10));
            s.sendMessage(new TextMessage("__clear__"));
            return;
        }

        // ---------- CHAT MESSAGE ----------
        String room = userRooms.get(s.getId());
        String user = users.get(s.getId());
        if (room == null || user == null) return;

        String full = user + ": " + p;
        roomMessages.get(room).add(full);
        broadcast(room, full);
    }

    // ================= ROOM OPS =================
    private void joinRoom(WebSocketSession s, String room) throws Exception {
        userRooms.put(s.getId(), room);
        rooms.computeIfAbsent(room, r -> ConcurrentHashMap.newKeySet()).add(s);
        roomMessages.computeIfAbsent(room, r -> new CopyOnWriteArrayList<>());

        // 🔑 Send CURRENT lobby seconds immediately
        if (room.equals("lobby")) {
            s.sendMessage(new TextMessage("__lobby_tick__" + lobbySeconds));
        }

        for (String m : roomMessages.get(room)) {
            s.sendMessage(new TextMessage(m));
        }
    }

    private void leaveRoom(WebSocketSession s) {
        String room = userRooms.remove(s.getId());
        if (room == null) return;

        Set<WebSocketSession> set = rooms.get(room);
        if (set != null) {
            set.remove(s);

            // auto-delete non-lobby rooms
            if (set.isEmpty() && !room.equals("lobby")) {
                rooms.remove(room);
                roomMessages.remove(room);
                broadcastRoomList();
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession s, CloseStatus status) {
        leaveRoom(s);
        users.remove(s.getId());
    }

    // ================= HELPERS =================
    private void sendRoomList(WebSocketSession s) throws Exception {
        s.sendMessage(new TextMessage("__rooms__" + String.join(",", rooms.keySet())));
    }

    private void broadcastRoomList() {
        for (Set<WebSocketSession> set : rooms.values()) {
            for (WebSocketSession s : set) {
                try {
                    sendRoomList(s);
                } catch (Exception ignored) {}
            }
        }
    }

    private void broadcast(String room, String msg) throws Exception {
        for (WebSocketSession s : rooms.get(room)) {
            s.sendMessage(new TextMessage(msg));
        }
    }

    private void broadcastSafe(String room, String msg) {
        Set<WebSocketSession> set = rooms.get(room);
        if (set == null) return;

        for (WebSocketSession s : set) {
            try {
                s.sendMessage(new TextMessage(msg));
            } catch (Exception ignored) {}
        }
    }
}
