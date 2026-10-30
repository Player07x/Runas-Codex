package dev.runas.codex.room;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Locale;

/**
 * Repasse local do pedido de túnel rápido (ADR 0032). O `cloudflared` de Linux não acha o DNS do Android, então o
 * pedido `POST /tunnel` vai para este endereço de loopback (opção `--quick-service`) e o app o faz em
 * https://api.trycloudflare.com pela pilha de rede do Android. Só esse pedido passa, só do próprio aparelho e só com
 * o caminho secreto desta execução.
 */
final class QuickServiceRelay implements Closeable {
  static final String SERVICE = "https://api.trycloudflare.com/tunnel";
  private static final int MAX_BODY = 4096, MAX_RESPONSE = 1 << 20, TIMEOUT_MS = 15000;
  private final ServerSocket listener;
  private final String token;
  private final String service;
  private volatile boolean closed;

  QuickServiceRelay() throws IOException {
    this(SERVICE);
  }

  /** `service` só muda nos testes, que não falam com a Cloudflare. */
  QuickServiceRelay(String service) throws IOException {
    this.service = service;
    byte[] random = new byte[16];
    new SecureRandom().nextBytes(random);
    StringBuilder hex = new StringBuilder();
    for (byte value : random) hex.append(String.format(Locale.ROOT, "%02x", value));
    token = hex.toString();
    listener = new ServerSocket(0, 4, InetAddress.getByName("127.0.0.1"));
    Thread thread = new Thread(this::accept, "runas-quick-service");
    thread.setDaemon(true);
    thread.start();
  }

  /** Valor de `--quick-service`; o `cloudflared` acrescenta `/tunnel`. */
  String base() {
    return "http://127.0.0.1:" + listener.getLocalPort() + "/" + token;
  }

  private void accept() {
    while (!closed)
      try (Socket socket = listener.accept()) {
        socket.setSoTimeout(TIMEOUT_MS);
        if (!socket.getInetAddress().isLoopbackAddress()) continue;
        handle(socket.getInputStream(), socket.getOutputStream());
      } catch (IOException e) {
        if (closed) return;
      }
  }

  private void handle(InputStream raw, OutputStream out) throws IOException {
    InputStream in = new BufferedInputStream(raw);
    String first = line(in);
    long length = 0;
    String userAgent = "cloudflared", value;
    int size = 0;
    while ((value = line(in)) != null && !value.isEmpty()) {
      size += value.length();
      if (size > 16384) throw new IOException("Cabeçalho grande demais.");
      int colon = value.indexOf(':');
      if (colon < 1) continue;
      String name = value.substring(0, colon).trim().toLowerCase(Locale.ROOT);
      String content = value.substring(colon + 1).trim();
      if (name.equals("content-length")) length = Long.parseLong(content);
      if (name.equals("transfer-encoding")) length = -1;
      if (name.equals("user-agent")) userAgent = content;
    }
    if (first == null || !first.equals("POST /" + token + "/tunnel HTTP/1.1") || length < 0 || length > MAX_BODY) {
      reply(out, 404, new byte[0]);
      return;
    }
    byte[] body = new byte[(int) length];
    int read = 0;
    while (read < body.length) {
      int count = in.read(body, read, body.length - read);
      if (count < 0) throw new EOFException();
      read += count;
    }
    HttpURLConnection connection = (HttpURLConnection) new URL(service).openConnection();
    try {
      connection.setRequestMethod("POST");
      connection.setConnectTimeout(TIMEOUT_MS);
      connection.setReadTimeout(TIMEOUT_MS);
      connection.setInstanceFollowRedirects(false);
      connection.setRequestProperty("Content-Type", "application/json");
      connection.setRequestProperty("User-Agent", userAgent);
      connection.setDoOutput(true);
      connection.setFixedLengthStreamingMode(body.length);
      try (OutputStream upload = connection.getOutputStream()) {
        upload.write(body);
      }
      int status = connection.getResponseCode();
      InputStream answer = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
      reply(out, status, answer == null ? new byte[0] : limited(answer));
    } finally {
      connection.disconnect();
    }
  }

  private static byte[] limited(InputStream in) throws IOException {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    byte[] buffer = new byte[8192];
    int count;
    while ((count = in.read(buffer)) != -1) {
      bytes.write(buffer, 0, count);
      if (bytes.size() > MAX_RESPONSE) throw new IOException("Resposta grande demais.");
    }
    return bytes.toByteArray();
  }

  private static void reply(OutputStream out, int status, byte[] body) throws IOException {
    String head =
        "HTTP/1.1 " + status + " OK\r\nContent-Type: application/json\r\nContent-Length: " + body.length
            + "\r\nConnection: close\r\n\r\n";
    out.write(head.getBytes(StandardCharsets.US_ASCII));
    out.write(body);
    out.flush();
  }

  private static String line(InputStream in) throws IOException {
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    int value;
    while ((value = in.read()) != -1) {
      if (value == '\n') break;
      if (value != '\r') bytes.write(value);
      if (bytes.size() > 8192) throw new IOException("Linha grande demais.");
    }
    if (value == -1 && bytes.size() == 0) return null;
    return bytes.toString(StandardCharsets.US_ASCII.name());
  }

  @Override
  public void close() {
    closed = true;
    try {
      listener.close();
    } catch (IOException ignored) {
      // Já estava fechado.
    }
  }
}
