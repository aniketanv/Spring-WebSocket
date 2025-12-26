package com.example.socketchat.ws;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.*;
import java.util.concurrent.*;

@Component
public class ChatHandler extends TextWebSocketHandler {

    private static final int LOBBY_DURATION = 300;
    private volatile int lobbySeconds = LOBBY_DURATION;

    // State Maps
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();
    private final Map<String, List<String>> roomMessages = new ConcurrentHashMap<>();
    private final Map<String, String> users = new ConcurrentHashMap<>();
    private final Map<String, String> userRooms = new ConcurrentHashMap<>();
    
    // Deletion tracking
    private final Map<String, ScheduledFuture<?>> pendingDeletions = new ConcurrentHashMap<>();

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    @PostConstruct
    public void init() {
        rooms.put("lobby", ConcurrentHashMap.newKeySet());
        roomMessages.put("lobby", new CopyOnWriteArrayList<>());

        scheduler.scheduleAtFixedRate(() -> {
            lobbySeconds--;
            broadcastSafe("lobby", "__lobby_tick__" + lobbySeconds);

            if (lobbySeconds <= 0) {
                lobbySeconds = LOBBY_DURATION;
                if(roomMessages.containsKey("lobby")) roomMessages.get("lobby").clear();
                broadcastSafe("lobby", "__lobby_reset__");
            }
        }, 1, 1, TimeUnit.SECONDS);
    }

    @Override
    protected void handleTextMessage(WebSocketSession s, TextMessage msg) throws Exception {
        String p = msg.getPayload();

        if (p.startsWith("__login__")) {
            users.put(s.getId(), p.substring(9).trim());
            s.sendMessage(new TextMessage("__login_ok__"));
            sendRoomList(s);
            return;
        }

        if (p.startsWith("__create__")) {
            String room = p.substring(10).trim();
            if (!room.isEmpty() && !room.equalsIgnoreCase("lobby")) {
                cancelDeletion(room); // Revive if pending delete
                rooms.putIfAbsent(room, ConcurrentHashMap.newKeySet());
                roomMessages.putIfAbsent(room, new CopyOnWriteArrayList<>());
                broadcastRoomList();
            }
            return;
        }

        if (p.startsWith("__join__")) {
            joinRoom(s, p.substring(8));
            return;
        }

        if (p.startsWith("__switch__")) {
            String newRoom = p.substring(10);
            leaveRoom(s);
            joinRoom(s, newRoom);
            return;
        }

        String room = userRooms.get(s.getId());
        String user = users.get(s.getId());
        if (room == null || user == null) return;

        String full = user + ": " + p;
        if (roomMessages.containsKey(room)) {
            roomMessages.get(room).add(full);
            broadcast(room, full);
        }
    }

    private void joinRoom(WebSocketSession s, String room) throws Exception {
        cancelDeletion(room); // Stop deletion timer immediately

        rooms.computeIfAbsent(room, r -> ConcurrentHashMap.newKeySet());
        roomMessages.computeIfAbsent(room, r -> new CopyOnWriteArrayList<>());

        userRooms.put(s.getId(), room);
        rooms.get(room).add(s);

        if (room.equals("lobby")) {
            s.sendMessage(new TextMessage("__lobby_tick__" + lobbySeconds));
        }

        if (roomMessages.containsKey(room)) {
            for (String m : roomMessages.get(room)) {
                s.sendMessage(new TextMessage(m));
            }
        }
    }

    private void leaveRoom(WebSocketSession s) {
        String room = userRooms.remove(s.getId());
        
        if (room != null && rooms.containsKey(room)) {
            Set<WebSocketSession> sessions = rooms.get(room);
            sessions.remove(s);

            // If room is empty and NOT lobby, schedule it for death
            if (!room.equals("lobby") && sessions.isEmpty()) {
                scheduleDeletion(room);
            }
        }
    }

    private void scheduleDeletion(String room) {
        if (pendingDeletions.containsKey(room)) return;

        ScheduledFuture<?> task = scheduler.schedule(() -> {
            // STRICT CHECK: Is it still empty?
            Set<WebSocketSession> set = rooms.get(room);
            if (set == null || set.isEmpty()) {
                rooms.remove(room);
                roomMessages.remove(room);
                pendingDeletions.remove(room);
                broadcastRoomList(); // Notify everyone
            }
        }, 10, TimeUnit.SECONDS);

        pendingDeletions.put(room, task);
    }

    private void cancelDeletion(String room) {
        ScheduledFuture<?> task = pendingDeletions.remove(room);
        if (task != null) {
            task.cancel(false);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession s, CloseStatus status) {
        leaveRoom(s);
        users.remove(s.getId());
    }

    private void sendRoomList(WebSocketSession s) throws Exception {
        s.sendMessage(new TextMessage("__rooms__" + String.join(",", rooms.keySet())));
    }

    private void broadcastRoomList() {
        new ArrayList<>(rooms.values()).forEach(set ->
            set.forEach(s -> {
                try { if (s.isOpen()) sendRoomList(s); } catch (Exception ignored) {}
            })
        );
    }

    private void broadcast(String room, String msg) throws Exception {
        if (rooms.containsKey(room)) {
            for (WebSocketSession s : rooms.get(room)) {
                if (s.isOpen()) s.sendMessage(new TextMessage(msg));
            }
        }
    }

    private void broadcastSafe(String room, String msg) {
        Set<WebSocketSession> set = rooms.get(room);
        if (set == null) return;
        for (WebSocketSession s : set) {
            try { if (s.isOpen()) s.sendMessage(new TextMessage(msg)); } catch (Exception ignored) {}
        }
    }
}