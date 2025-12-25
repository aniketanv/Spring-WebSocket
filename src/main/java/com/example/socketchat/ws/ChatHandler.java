
package com.example.socketchat.ws;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.*;

@Component
public class ChatHandler extends TextWebSocketHandler {

    private final Set<WebSocketSession> sessions = new HashSet<>();
    private final List<String> history = new ArrayList<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.add(session);
        for (String msg : history) {
            session.sendMessage(new TextMessage(msg));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        history.add(payload);
        for (WebSocketSession s : sessions) {
            s.sendMessage(new TextMessage(payload));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
    }
}
