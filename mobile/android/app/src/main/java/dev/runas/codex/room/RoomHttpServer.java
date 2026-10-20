package dev.runas.codex.room;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;

/** Transporte LAN limitado: não conhece documentos, assentos nem regras da mesa. */
public final class RoomHttpServer implements AutoCloseable {
  public interface Authority {
    Joined join(String body) throws Exception;

    String authenticate(String token) throws Exception;

    String snapshot(String seat) throws Exception;

    String message(String seat, String body) throws Exception;

    void counts(int players, int spectators);

    default String slotId(String seat) {
      return seat;
    }
  }

  public interface Files {
    Resource bundle(String path) throws IOException;

    Resource asset(String path) throws IOException;
  }

  public static final class Resource {
    public final InputStream stream;
    public final long size;
    public final String mime;

    public Resource(InputStream stream, long size, String mime) {
      this.stream = stream;
      this.size = size;
      this.mime = mime;
    }
  }

  public static final class Joined {
    public final String seat, token;

    public Joined(String seat, String token) {
      this.seat = seat;
      this.token = token;
    }
  }

  private static final int MAX_BODY = 2048, MAX_FRAME = 16384, MAX_CLIENTS = 24;
  private final Authority authority;
  private final Files files;
  private final String key;
  private final ServerSocket listener;
  private final Set<Socket> sockets = ConcurrentHashMap.newKeySet();
  private final Set<Client> clients = ConcurrentHashMap.newKeySet();
  private final Set<String> assets = ConcurrentHashMap.newKeySet();
  private final Map<String, List<Long>> failures = new HashMap<>();
  private final ThreadPoolExecutor workers =
      new ThreadPoolExecutor(
          0,
          48,
          30,
          TimeUnit.SECONDS,
          new SynchronousQueue<>(),
          runnable -> {
            Thread t = new Thread(runnable, "runas-room-io");
            t.setDaemon(true);
            return t;
          });
  private final ScheduledExecutorService clock =
      Executors.newSingleThreadScheduledExecutor(
          runnable -> {
            Thread t = new Thread(runnable, "runas-room-ping");
            t.setDaemon(true);
            return t;
          });
  private volatile boolean closed;

  private static final class Client {
    final Socket socket;
    final OutputStream output;
    final String seat, token;
    long lastSeen = System.currentTimeMillis();
    final ArrayDeque<Long> recent = new ArrayDeque<>();

    Client(Socket socket, String seat, String token) throws IOException {
      this.socket = socket;
      this.output = socket.getOutputStream();
      this.seat = seat;
      this.token = token;
    }

    synchronized void send(int opcode, byte[] payload) throws IOException {
      output.write(frame(opcode, payload));
      output.flush();
    }
  }

  public RoomHttpServer(int port, String key, Authority authority, Files files) throws IOException {
    if (port < 1 || port > 65535 || key == null || !key.matches("[a-f0-9]{32}"))
      throw new IOException("Porta ou chave inválida.");
    this.key = key;
    this.authority = authority;
    this.files = files;
    listener = new ServerSocket();
    listener.setReuseAddress(true);
    listener.bind(new InetSocketAddress("0.0.0.0", port), 24);
    workers.execute(this::accept);
    clock.scheduleAtFixedRate(this::heartbeat, 25, 25, TimeUnit.SECONDS);
  }

  public int port() {
    return listener.getLocalPort();
  }

  public void allowedAssets(Collection<String> paths) {
    assets.clear();
    for (String path : paths) if (validAsset(path)) assets.add(path);
  }

  public static boolean validAsset(String path) {
    return path != null
        && path.matches(
            "(maps|tokens|tiles|audio)/[a-f0-9]{64}\\.(png|jpg|jpeg|webp|gif|avif|mp3|ogg|wav|m4a|flac|webm|opus)");
  }

  private void accept() {
    while (!closed)
      try {
        Socket socket = listener.accept();
        if (!lan(socket.getInetAddress()) || sockets.size() >= 32) {
          socket.close();
          continue;
        }
        socket.setSoTimeout(10000);
        socket.setTcpNoDelay(true);
        sockets.add(socket);
        try {
          workers.execute(() -> handle(socket));
        } catch (RejectedExecutionException e) {
          sockets.remove(socket);
          socket.close();
        }
      } catch (IOException e) {
        if (!closed) close();
      }
  }

  public static boolean lan(InetAddress address) {
    return address.isLoopbackAddress() || address.isSiteLocalAddress();
  }

  private static String line(InputStream in, int limit) throws IOException {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    int value;
    while ((value = in.read()) != -1) {
      if (value == '\n') break;
      if (value != '\r') bytes.write(value);
      if (bytes.size() > limit) throw new IOException("Cabeçalho grande demais.");
    }
    if (value == -1 && bytes.size() == 0) return null;
    return bytes.toString(StandardCharsets.US_ASCII.name());
  }

  private void handle(Socket socket) {
    try {
      InputStream in = new BufferedInputStream(socket.getInputStream());
      OutputStream out = socket.getOutputStream();
      String first = line(in, 8192);
      if (first == null) return;
      String[] request = first.split(" ");
      if (request.length != 3 || !request[1].startsWith("/")) return;
      Map<String, String> headers = new HashMap<>();
      int size = first.length();
      String value;
      while ((value = line(in, 8192)) != null && !value.isEmpty()) {
        size += value.length();
        if (size > 16384) throw new IOException("Cabeçalho grande demais.");
        int colon = value.indexOf(':');
        if (colon < 1) throw new IOException("Cabeçalho inválido.");
        String name = value.substring(0, colon).toLowerCase(Locale.ROOT);
        if (headers.put(name, value.substring(colon + 1).trim()) != null)
          throw new IOException("Cabeçalho repetido.");
      }
      String host = headers.getOrDefault("host", "");
      if (!validHost(host, port())) {
        respond(out, 403, "text/plain", new byte[0], false, headers());
        return;
      }
      URI uri = URI.create(request[1]);
      String path = uri.getPath();
      boolean authorized = key.equals(query(uri, "k"));
      boolean origin = validOrigin(headers.get("origin"), host);
      if (path.equals("/socket") && "GET".equals(request[0])) {
        upgrade(socket, in, out, headers, authorized, origin);
        return;
      }
      if (path.equals("/healthz") && (request[0].equals("GET") || request[0].equals("HEAD"))) {
        respond(
            out,
            200,
            "text/plain",
            "ok".getBytes(StandardCharsets.UTF_8),
            request[0].equals("HEAD"),
            headers());
        return;
      }
      if (path.equals("/seat/join") && request[0].equals("POST")) {
        if (!authorized || !origin) {
          respond(out, 403, "text/plain", new byte[0], false, headers());
          return;
        }
        if (blocked(socket.getInetAddress().getHostAddress(), false)) {
          respond(
              out,
              429,
              "application/json",
              "{\"error\":\"Tente novamente em alguns instantes.\"}"
                  .getBytes(StandardCharsets.UTF_8),
              false,
              headers("Retry-After", "60"));
          return;
        }
        long length = Long.parseLong(headers.getOrDefault("content-length", "0"));
        if (length < 1 || length > MAX_BODY || headers.containsKey("transfer-encoding")) {
          respond(out, 413, "text/plain", new byte[0], false, headers());
          return;
        }
        Joined joined =
            authority.join(new String(readExactly(in, (int) length), StandardCharsets.UTF_8));
        if (joined == null) {
          blocked(socket.getInetAddress().getHostAddress(), true);
          respond(
              out,
              401,
              "application/json",
              "{\"error\":\"Código inválido.\"}".getBytes(StandardCharsets.UTF_8),
              false,
              headers());
          return;
        }
        respond(
            out,
            200,
            "application/json",
            ("{\"seat\":" + joined.seat + "}").getBytes(StandardCharsets.UTF_8),
            false,
            headers(
                "Set-Cookie",
                "runas_seat="
                    + joined.token
                    + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400"));
        return;
      }
      if (!request[0].equals("GET") && !request[0].equals("HEAD")) {
        respond(out, 405, "text/plain", new byte[0], false, headers());
        return;
      }
      boolean head = request[0].equals("HEAD");
      if (path.equals("/seat")) {
        String seat = origin ? authority.authenticate(cookie(headers)) : null;
        respond(
            out,
            seat == null ? 401 : 200,
            "application/json",
            (seat == null ? "{}" : "{\"seat\":" + seat + "}").getBytes(StandardCharsets.UTF_8),
            head,
            headers());
        return;
      }
      String bundle =
          path.equals("/") || path.equals("/player.html")
              ? "player.html"
              : path.replaceFirst("^/", "");
      boolean staticAsset =
          bundle.matches("assets/[A-Za-z0-9_-]+\\.(js|css|woff2?|png|svg|webp|ico)");
      if (!authorized && !staticAsset) {
        respond(out, 404, "text/plain", new byte[0], head, headers());
        return;
      }
      Resource resource = null;
      if (path.startsWith("/assets/")
          && validAsset(path.substring(8))
          && assets.contains(path.substring(8))) resource = files.asset(path.substring(8));
      else if (bundle.equals("player.html") || staticAsset) resource = files.bundle(bundle);
      if (resource == null) {
        respond(out, 404, "text/plain", new byte[0], head, headers());
        return;
      }
      try (ResourceStream body = new ResourceStream(resource.stream)) {
        long start = 0, end = resource.size - 1;
        String range = headers.get("range");
        Map<String, String> extra = new LinkedHashMap<>();
        extra.put("Accept-Ranges", "bytes");
        if (range != null) {
          long[] parsed = range(range, resource.size);
          if (parsed == null) {
            extra.put("Content-Range", "bytes */" + resource.size);
            respond(out, 416, resource.mime, new byte[0], head, extra);
            return;
          }
          start = parsed[0];
          end = parsed[1];
          extra.put("Content-Range", "bytes " + start + "-" + end + "/" + resource.size);
        }
        long length = Math.max(0, end - start + 1);
        writeHeaders(out, range == null ? 200 : 206, resource.mime, length, extra);
        if (!head) {
          skip(body.stream, start);
          copy(body.stream, out, length);
        }
      }
    } catch (Exception ignored) {
      /* Entrada inválida ou conexão encerrada: nunca enviar detalhes do cofre. */
    } finally {
      sockets.remove(socket);
      try {
        socket.close();
      } catch (IOException ignored) {
      }
    }
  }

  private static final class ResourceStream implements AutoCloseable {
    final InputStream stream;

    ResourceStream(InputStream s) {
      stream = s;
    }

    public void close() throws IOException {
      stream.close();
    }
  }

  private synchronized boolean blocked(String address, boolean add) {
    long now = System.currentTimeMillis();
    failures.values().forEach(list -> list.removeIf(at -> now - at >= 60000));
    failures.entrySet().removeIf(e -> e.getValue().isEmpty());
    List<Long> local = failures.computeIfAbsent(address, k -> new ArrayList<>());
    boolean blocked =
        local.size() >= 5 || failures.values().stream().mapToInt(List::size).sum() >= 20;
    if (add) local.add(now);
    return blocked;
  }

  private static boolean validHost(String host, int port) {
    try {
      URI uri = URI.create("http://" + host);
      String hostname = uri.getHost();
      return uri.getPort() == port
          && hostname != null
          && (hostname.matches("[0-9.]+") || hostname.equals("localhost"))
          && lan(InetAddress.getByName(hostname));
    } catch (Exception e) {
      return false;
    }
  }

  private static boolean validOrigin(String origin, String host) {
    return origin == null || origin.equals("http://" + host);
  }

  private static Map<String, String> headers(String... pairs) {
    Map<String, String> result = new LinkedHashMap<>();
    for (int i = 0; i < pairs.length; i += 2) result.put(pairs[i], pairs[i + 1]);
    return result;
  }

  private static String base64(byte[] bytes) {
    String alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < bytes.length; i += 3) {
      int n =
          ((bytes[i] & 255) << 16)
              | (i + 1 < bytes.length ? (bytes[i + 1] & 255) << 8 : 0)
              | (i + 2 < bytes.length ? bytes[i + 2] & 255 : 0);
      out.append(alphabet.charAt(n >>> 18))
          .append(alphabet.charAt((n >>> 12) & 63))
          .append(i + 1 < bytes.length ? alphabet.charAt((n >>> 6) & 63) : '=')
          .append(i + 2 < bytes.length ? alphabet.charAt(n & 63) : '=');
    }
    return out.toString();
  }

  private static String query(URI uri, String name) {
    for (String part : (uri.getRawQuery() == null ? "" : uri.getRawQuery()).split("&")) {
      String[] pair = part.split("=", 2);
      if (pair.length == 2 && pair[0].equals(name)) return pair[1];
    }
    return "";
  }

  private static String cookie(Map<String, String> headers) {
    for (String part : headers.getOrDefault("cookie", "").split(";")) {
      String text = part.trim();
      if (text.startsWith("runas_seat=")) {
        String token = text.substring(11);
        return token.matches("[a-f0-9]{64}") ? token : "";
      }
    }
    return "";
  }

  private void upgrade(
      Socket socket,
      InputStream in,
      OutputStream out,
      Map<String, String> headers,
      boolean authorized,
      boolean origin)
      throws Exception {
    String token = cookie(headers),
        seat = authority.authenticate(token),
        nonce = headers.getOrDefault("sec-websocket-key", "");
    if ((!authorized && seat == null)
        || !origin
        || !"websocket".equalsIgnoreCase(headers.get("upgrade"))
        || !"13".equals(headers.get("sec-websocket-version"))
        || !nonce.matches("[A-Za-z0-9+/]{22}==")
        || clients.size() >= MAX_CLIENTS) return;
    String accept =
        base64(
            MessageDigest.getInstance("SHA-1")
                .digest(
                    (nonce + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
                        .getBytes(StandardCharsets.US_ASCII)));
    out.write(
        ("HTTP/1.1 101 Switching Protocols\r\n"
             + "Upgrade: websocket\r\n"
             + "Connection: Upgrade\r\n"
             + "Sec-WebSocket-Accept: "
                + accept
                + "\r\n\r\n")
            .getBytes(StandardCharsets.US_ASCII));
    out.flush();
    Client client = new Client(socket, seat, token);
    clients.add(client);
    counts();
    socket.setSoTimeout(60000);
    try {
      client.send(1, authority.snapshot(seat).getBytes(StandardCharsets.UTF_8));
      if (seat != null)
        client.send(
            1,
            ("{\"type\":\"seat-status\",\"seat\":" + seat + "}").getBytes(StandardCharsets.UTF_8));
      while (!closed) {
        int first = in.read(), second = in.read();
        if (first < 0 || second < 0) return;
        int opcode = first & 15;
        long length = second & 127;
        if (length == 126) length = ((long) required(in) << 8) | required(in);
        else if (length == 127) {
          length = 0;
          for (int i = 0; i < 8; i++) {
            int b = required(in);
            if (i < 6 && b != 0) throw new IOException("Frame grande demais.");
            length = (length << 8) | b;
          }
        }
        if ((first & 0xf0) != 0x80
            || (second & 128) == 0
            || length > MAX_FRAME
            || (opcode >= 8 && length > 125)) return;
        byte[] mask = readExactly(in, 4), payload = readExactly(in, (int) length);
        for (int i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
        client.lastSeen = System.currentTimeMillis();
        if (opcode == 8) return;
        if (opcode == 9) {
          client.send(10, payload);
          continue;
        }
        if (opcode == 10) continue;
        if (opcode != 1) return;
        long now = System.currentTimeMillis();
        while (!client.recent.isEmpty() && now - client.recent.peekFirst() >= 1000)
          client.recent.removeFirst();
        if (client.recent.size() >= 8) continue;
        client.recent.add(now);
        if (seat != null && authority.authenticate(token) == null) return;
        String reply = authority.message(seat, new String(payload, StandardCharsets.UTF_8));
        if (reply != null) client.send(1, reply.getBytes(StandardCharsets.UTF_8));
      }
    } finally {
      clients.remove(client);
      counts();
    }
  }

  private void counts() {
    int players = (int) clients.stream().filter(c -> c.seat != null).count();
    authority.counts(players, clients.size() - players);
  }

  public void publish(String message, Map<String, String> perSeat) {
    for (Client client : clients)
      try {
        workers.execute(
            () -> {
              try {
                if (client.seat != null && authority.authenticate(client.token) == null) {
                  client.socket.close();
                  return;
                }
                String value =
                    perSeat == null
                        ? message
                        : perSeat.getOrDefault(
                            client.seat == null ? "" : authority.slotId(client.seat),
                            perSeat.get(""));
                if (value != null) client.send(1, value.getBytes(StandardCharsets.UTF_8));
              } catch (Exception e) {
                try {
                  client.socket.close();
                } catch (IOException ignored) {
                }
              }
            });
      } catch (RejectedExecutionException e) {
        try {
          client.socket.close();
        } catch (IOException ignored) {
        }
      }
  }

  private void heartbeat() {
    for (Client client : clients)
      try {
        if (System.currentTimeMillis() - client.lastSeen > 55000) client.socket.close();
        else client.send(9, new byte[0]);
      } catch (IOException e) {
        try {
          client.socket.close();
        } catch (IOException ignored) {
        }
      }
  }

  @Override
  public void close() {
    closed = true;
    try {
      listener.close();
    } catch (IOException ignored) {
    }
    for (Socket socket : sockets)
      try {
        socket.close();
      } catch (IOException ignored) {
      }
    clients.clear();
    sockets.clear();
    workers.shutdownNow();
    clock.shutdownNow();
    assets.clear();
    counts();
  }

  private static int required(InputStream in) throws IOException {
    int b = in.read();
    if (b < 0) throw new EOFException();
    return b;
  }

  private static byte[] readExactly(InputStream in, int size) throws IOException {
    byte[] result = new byte[size];
    int offset = 0;
    while (offset < size) {
      int n = in.read(result, offset, size - offset);
      if (n < 0) throw new EOFException();
      offset += n;
    }
    return result;
  }

  private static void skip(InputStream in, long count) throws IOException {
    while (count > 0) {
      long n = in.skip(count);
      if (n == 0) {
        if (in.read() < 0) throw new EOFException();
        n = 1;
      }
      count -= n;
    }
  }

  private static void copy(InputStream in, OutputStream out, long count) throws IOException {
    byte[] bytes = new byte[32768];
    while (count > 0) {
      int n = in.read(bytes, 0, (int) Math.min(count, bytes.length));
      if (n < 0) throw new EOFException();
      out.write(bytes, 0, n);
      count -= n;
    }
    out.flush();
  }

  public static long[] range(String value, long size) {
    try {
      if (!value.matches("bytes=\\d*-\\d*") || size < 1) return null;
      String[] pair = value.substring(6).split("-", -1);
      long start, end;
      if (pair[0].isEmpty()) {
        long suffix = Long.parseLong(pair[1]);
        if (suffix < 1) return null;
        start = Math.max(0, size - suffix);
        end = size - 1;
      } else {
        start = Long.parseLong(pair[0]);
        end = pair[1].isEmpty() ? size - 1 : Math.min(Long.parseLong(pair[1]), size - 1);
      }
      return start >= 0 && start <= end && start < size ? new long[] {start, end} : null;
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private static byte[] frame(int opcode, byte[] payload) throws IOException {
    if (payload.length > 1024 * 1024) throw new IOException("Mensagem grande demais.");
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    out.write(128 | opcode);
    if (payload.length < 126) out.write(payload.length);
    else if (payload.length < 65536) {
      out.write(126);
      out.write(payload.length >> 8);
      out.write(payload.length);
    } else {
      out.write(127);
      for (int i = 7; i >= 0; i--) out.write((int) ((long) payload.length >> (i * 8)));
    }
    out.write(payload);
    return out.toByteArray();
  }

  private static void respond(
      OutputStream out,
      int status,
      String mime,
      byte[] body,
      boolean head,
      Map<String, String> extra)
      throws IOException {
    writeHeaders(out, status, mime, body.length, extra);
    if (!head) out.write(body);
    out.flush();
  }

  private static void writeHeaders(
      OutputStream out, int status, String mime, long size, Map<String, String> extra)
      throws IOException {
    StringBuilder h =
        new StringBuilder(
            "HTTP/1.1 "
                + status
                + " "
                + (status == 200 ? "OK" : status == 206 ? "Partial Content" : "Response")
                + "\r\nContent-Type: "
                + mime
                + "\r\nContent-Length: "
                + size
                + "\r\n"
                + "Cache-Control: no-store\r\n"
                + "X-Content-Type-Options: nosniff\r\n"
                + "Referrer-Policy: no-referrer\r\n"
                + "Connection: close\r\n");
    for (Map.Entry<String, String> e : extra.entrySet())
      h.append(e.getKey()).append(": ").append(e.getValue()).append("\r\n");
    h.append("\r\n");
    out.write(h.toString().getBytes(StandardCharsets.US_ASCII));
    out.flush();
  }
}
