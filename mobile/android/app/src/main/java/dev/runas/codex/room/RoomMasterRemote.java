package dev.runas.codex.room;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import java.util.concurrent.*;

/** Transporte do mestre; documentos e comandos continuam na autoridade TypeScript. */
final class RoomMasterRemote implements AutoCloseable {
  private static final int MAX_RPC = 8 * 1024 * 1024, MAX_ASSET = 50 * 1024 * 1024;
  private final RoomHttpServer.Authority authority;
  private final RoomHttpServer.Files files;
  private final Set<String> channels, events;
  private final ArrayDeque<Long> requests = new ArrayDeque<>();
  private String key = secret();
  private Session session;

  private static final class Session {
    final String id = secret();
    final Socket socket;
    final BlockingQueue<String> queue = new ArrayBlockingQueue<>(128);
    volatile boolean closed;

    Session(Socket socket) {
      this.socket = socket;
    }

    void close() {
      closed = true;
      queue.clear();
      queue.offer("");
      try {
        socket.close();
      } catch (IOException ignored) {
      }
    }
  }

  RoomMasterRemote(
      RoomHttpServer.Authority authority,
      RoomHttpServer.Files files,
      Collection<String> channels,
      Collection<String> events) {
    this.authority = authority;
    this.files = files;
    this.channels = Collections.unmodifiableSet(new HashSet<>(channels));
    this.events = Collections.unmodifiableSet(new HashSet<>(events));
  }

  private static String secret() {
    byte[] bytes = new byte[16];
    new SecureRandom().nextBytes(bytes);
    StringBuilder value = new StringBuilder();
    for (byte b : bytes) value.append(String.format(Locale.ROOT, "%02x", b & 255));
    return value.toString();
  }

  private static boolean same(String given, String expected) {
    return given != null
        && expected != null
        && given.length() == expected.length()
        && MessageDigest.isEqual(
            given.getBytes(StandardCharsets.US_ASCII),
            expected.getBytes(StandardCharsets.US_ASCII));
  }

  synchronized boolean authorized(String given) {
    return same(given, key);
  }

  synchronized String key() {
    return key;
  }

  synchronized boolean connected() {
    return session != null;
  }

  synchronized void rotate() throws IOException {
    if (key == null) throw new IOException("Ligue a transmissão primeiro.");
    disconnect();
    key = secret();
    changed();
  }

  synchronized void disconnect() {
    Session old = session;
    session = null;
    if (old != null) old.close();
    changed();
  }

  private void changed() {
    authority.masterState(key, session != null);
  }

  @Override
  public synchronized void close() {
    key = null;
    disconnect();
  }

  synchronized void emit(String channel, String payload) {
    if (session == null || !events.contains(channel)) return;
    // O WebView nunca espera um cliente lento. A fila limitada preserva a ordem dos eventos.
    if (!session.queue.offer("event: " + channel + "\ndata: " + payload + "\n\n")) disconnect();
  }

  private synchronized boolean limited() {
    long now = System.currentTimeMillis();
    while (!requests.isEmpty() && now - requests.peekFirst() >= 1000) requests.removeFirst();
    if (requests.size() >= 120) return true;
    requests.addLast(now);
    return false;
  }

  private synchronized boolean sessionOk(Map<String, String> headers, String givenKey) {
    return authorized(givenKey)
        && session != null
        && same(headers.get("x-runas-session"), session.id);
  }

  void handle(
      Socket socket,
      InputStream in,
      OutputStream out,
      String method,
      URI uri,
      Map<String, String> headers)
      throws Exception {
    String path = uri.getPath(), givenKey = RoomHttpServer.query(uri, "m");
    boolean head = method.equals("HEAD");
    if (limited()) {
      error(out, 429);
      return;
    }
    if ((method.equals("GET") || head) && path.equals("/master")) {
      RoomHttpServer.serve(out, bundle(), headers, head);
    } else if ((method.equals("GET") || head) && path.equals("/master/")) {
      RoomHttpServer.respond(
          out,
          302,
          "text/plain",
          new byte[0],
          head,
          RoomHttpServer.headers("Location", "/master?m=" + givenKey));
    } else if (method.equals("GET") && path.equals("/master/events")) {
      eventStream(socket, in, out, givenKey);
    } else if ((method.equals("GET") || head) && path.startsWith("/master/asset/")) {
      String asset = path.substring("/master/asset/".length());
      if (!RoomHttpServer.validAsset(asset)) {
        error(out, 404);
        return;
      }
      // O mestre lê qualquer asset da mesa; jogadores passam pela lista pública em outro endpoint.
      RoomHttpServer.serve(out, asset(asset), headers, head);
    } else if (method.equals("POST")
        && (path.equals("/master/rpc")
            || path.startsWith("/master/call/")
            || path.equals("/master/asset"))) {
      if (!sessionOk(headers, givenKey)) {
        error(out, 403);
        return;
      }
      boolean asset = path.equals("/master/asset");
      long length;
      try {
        length = Long.parseLong(headers.getOrDefault("content-length", "0"));
      } catch (NumberFormatException e) {
        error(out, 400);
        return;
      }
      if (length < 1
          || length > (asset ? MAX_ASSET : MAX_RPC)
          || headers.containsKey("transfer-encoding")) {
        error(out, 413);
        return;
      }
      byte[] body = RoomHttpServer.readExactly(in, (int) length);
      // Revogar enquanto um upload está chegando também invalida o pedido.
      if (!sessionOk(headers, givenKey)) {
        error(out, 403);
        return;
      }
      try {
        String result;
        if (asset)
          result =
              authority.masterImport(
                  RoomHttpServer.query(uri, "kind"), RoomHttpServer.query(uri, "name"), body);
        else {
          String channel =
              path.startsWith("/master/call/") ? path.substring("/master/call/".length()) : null;
          if (channel != null && !channels.contains(channel)) {
            error(out, 403);
            return;
          }
          result =
              authority.masterCall(channel, new String(body, StandardCharsets.UTF_8), channels);
        }
        RoomHttpServer.respond(
            out,
            200,
            "application/json",
            result.getBytes(StandardCharsets.UTF_8),
            false,
            RoomHttpServer.headers());
      } catch (SecurityException e) {
        error(out, 403);
      } catch (Exception e) {
        error(out, 400);
      }
    } else error(out, 404);
  }

  private RoomHttpServer.Resource bundle() {
    try {
      return files.bundle("master.html");
    } catch (IOException e) {
      return null;
    }
  }

  private RoomHttpServer.Resource asset(String path) {
    try {
      return files.asset(path);
    } catch (IOException e) {
      return null;
    }
  }

  private void eventStream(Socket socket, InputStream in, OutputStream out, String givenKey)
      throws Exception {
    final Session opened;
    synchronized (this) {
      if (!authorized(givenKey)) {
        error(out, 404);
        return;
      }
      if (session != null) {
        error(out, 409);
        return;
      }
      opened = new Session(socket);
      session = opened;
    }
    try {
      String world = authority.masterWorld();
      synchronized (this) {
        if (session != opened || !authorized(givenKey)) return;
        out.write(
            ("HTTP/1.1 200 OK\r\n"
                    + "Content-Type: text/event-stream; charset=utf-8\r\n"
                    + "Cache-Control: no-store\r\n"
                    + "X-Content-Type-Options: nosniff\r\n"
                    + "Referrer-Policy: no-referrer\r\n"
                    + "X-Accel-Buffering: no\r\n"
                    + "Connection: keep-alive\r\n\r\n"
                    + "event: hello\n"
                    + "data: {\"session\":\""
                    + opened.id
                    + "\",\"world\":"
                    + world
                    + "}\n\n")
                .getBytes(StandardCharsets.UTF_8));
        out.flush();
        changed();
      }
      // Ler em paralelo detecta o navegador fechado mesmo sem mudanças na mesa.
      Thread reader =
          new Thread(
              () -> {
                try {
                  while (in.read() != -1) {}
                } catch (IOException ignored) {
                }
                opened.close();
              },
              "runas-master-close");
      reader.setDaemon(true);
      socket.setSoTimeout(0);
      reader.start();
      while (!opened.closed) {
        String value = opened.queue.poll(15, TimeUnit.SECONDS);
        if (!opened.closed) {
          out.write((value == null ? ": ping\n\n" : value).getBytes(StandardCharsets.UTF_8));
          out.flush();
        }
      }
    } finally {
      opened.close();
      synchronized (this) {
        if (session == opened) {
          session = null;
          changed();
        }
      }
    }
  }

  private static void error(OutputStream out, int code) throws IOException {
    String reason =
        code == 403
            ? "Comando ou sessão do mestre recusado."
            : code == 409
                ? "Outro aparelho já controla a mesa."
                : code == 429
                    ? "Tente novamente em instantes."
                    : code == 413
                        ? "Pedido grande demais."
                        : "Pedido do mestre indisponível ou inválido.";
    RoomHttpServer.respond(
        out,
        code,
        "application/json",
        ("{\"error\":\"" + reason + "\"}").getBytes(StandardCharsets.UTF_8),
        false,
        RoomHttpServer.headers());
  }
}
