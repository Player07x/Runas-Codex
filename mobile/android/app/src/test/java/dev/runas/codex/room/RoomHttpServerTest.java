package dev.runas.codex.room;

import static org.junit.Assert.*;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.Test;

public class RoomHttpServerTest {
  private static final String KEY = "0123456789abcdef0123456789abcdef",
      ASSET = "audio/" + String.join("", Collections.nCopies(64, "a")) + ".mp3";

  private RoomHttpServer room() throws Exception {
    ServerSocket reserve = new ServerSocket(0);
    int port = reserve.getLocalPort();
    reserve.close();
    RoomHttpServer server =
        new RoomHttpServer(
            port,
            KEY,
            new RoomHttpServer.Authority() {
              public RoomHttpServer.Joined join(String body) {
                return body.contains("ABCDEFGH")
                    ? new RoomHttpServer.Joined(
                        "{\"slotId\":\"player-1\",\"label\":\"Jogador 1\"}",
                        String.join("", Collections.nCopies(64, "b")))
                    : null;
              }

              public String authenticate(String token) {
                return token.equals(String.join("", Collections.nCopies(64, "b")))
                    ? "{\"slotId\":\"player-1\"}"
                    : null;
              }

              public String snapshot(String seat) {
                return "{\"type\":\"snapshot\",\"projection\":{}}";
              }

              public String message(String seat, String body) {
                return "{\"type\":\"pong\"}";
              }

              public void counts(int players, int spectators) {}
            },
            new RoomHttpServer.Files() {
              public RoomHttpServer.Resource bundle(String path) {
                return new RoomHttpServer.Resource(
                    new ByteArrayInputStream(path.getBytes(StandardCharsets.UTF_8)),
                    path.length(),
                    "text/plain");
              }

              public RoomHttpServer.Resource asset(String path) {
                return new RoomHttpServer.Resource(
                    new ByteArrayInputStream("0123456789".getBytes(StandardCharsets.UTF_8)),
                    10,
                    "audio/mpeg");
              }
            });
    server.allowedAssets(Collections.singletonList(ASSET));
    return server;
  }

  private HttpURLConnection get(RoomHttpServer server, String path) throws Exception {
    return (HttpURLConnection) new URL("http://127.0.0.1:" + server.port() + path).openConnection();
  }

  private String body(HttpURLConnection connection) throws Exception {
    try (InputStream in = connection.getInputStream();
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] buffer = new byte[1024];
      int n;
      while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
      return out.toString("UTF-8");
    } finally {
      connection.disconnect();
    }
  }

  @Test
  public void exigeChaveERecusaArquivosPrivados() throws Exception {
    try (RoomHttpServer server = room()) {
      assertEquals(404, get(server, "/").getResponseCode());
      assertEquals("player.html", body(get(server, "/?k=" + KEY)));
      assertEquals(404, get(server, "/index.html?k=" + KEY).getResponseCode());
      assertEquals(404, get(server, "/mesa.json?k=" + KEY).getResponseCode());
      assertEquals(200, get(server, "/assets/player-a.js").getResponseCode());
      assertEquals(404, get(server, "/assets/../mesa.json?k=" + KEY).getResponseCode());
      assertEquals(404, get(server, "/assets/" + ASSET).getResponseCode());
      assertEquals(
          404,
          get(
                  server,
                  "/assets/tokens/"
                      + String.join("", Collections.nCopies(64, "c"))
                      + ".png?k="
                      + KEY)
              .getResponseCode());
    }
  }

  @Test
  public void transmiteRangeSemCarregarArquivoInteiro() throws Exception {
    try (RoomHttpServer server = room()) {
      HttpURLConnection request = get(server, "/assets/" + ASSET + "?k=" + KEY);
      request.setRequestProperty("Range", "bytes=2-5");
      assertEquals(206, request.getResponseCode());
      assertEquals("bytes 2-5/10", request.getHeaderField("Content-Range"));
      assertEquals("2345", body(request));
      request = get(server, "/assets/" + ASSET + "?k=" + KEY);
      request.setRequestProperty("Range", "bytes=100-");
      assertEquals(416, request.getResponseCode());
      assertArrayEquals(new long[] {7, 9}, RoomHttpServer.range("bytes=-3", 10));
      assertNull(RoomHttpServer.range("bytes=-0", 10));
      server.allowedAssets(Collections.emptyList());
      assertEquals(404, get(server, "/assets/" + ASSET + "?k=" + KEY).getResponseCode());
    }
  }

  @Test
  public void ingressoUsaCookieHttpOnlyELimitaTentativas() throws Exception {
    try (RoomHttpServer server = room()) {
      HttpURLConnection request = get(server, "/seat/join?k=" + KEY);
      request.setRequestMethod("POST");
      request.setDoOutput(true);
      request.getOutputStream().write("{\"code\":\"ABCDEFGH\"}".getBytes(StandardCharsets.UTF_8));
      assertEquals(200, request.getResponseCode());
      String cookie = request.getHeaderField("Set-Cookie");
      assertTrue(cookie.contains("HttpOnly; SameSite=Strict"));
      assertTrue(body(request).contains("player-1"));
      request = get(server, "/seat");
      request.setRequestProperty("Cookie", cookie.split(";")[0]);
      assertEquals(200, request.getResponseCode());
      try (Socket socket = new Socket("127.0.0.1", server.port())) {
        socket.setSoTimeout(2000);
        socket
            .getOutputStream()
            .write(
                ("GET /seat HTTP/1.1\r\nHost: 127.0.0.1:"
                        + server.port()
                        + "\r\nCookie: "
                        + cookie.split(";")[0]
                        + "\r\nOrigin: https://externo.invalid\r\n\r\n")
                    .getBytes(StandardCharsets.US_ASCII));
        assertTrue(
            new BufferedReader(
                    new InputStreamReader(socket.getInputStream(), StandardCharsets.US_ASCII))
                .readLine()
                .contains("401"));
      }
      for (int i = 0; i < 6; i++) {
        request = get(server, "/seat/join?k=" + KEY);
        request.setRequestMethod("POST");
        request.setDoOutput(true);
        request.getOutputStream().write("{}".getBytes(StandardCharsets.UTF_8));
        assertEquals(i < 5 ? 401 : 429, request.getResponseCode());
        request.disconnect();
      }
    }
  }

  @Test
  public void aceitaSoEnderecosLocaisEHashes() throws Exception {
    assertTrue(RoomHttpServer.lan(InetAddress.getByName("192.168.0.1")));
    assertTrue(RoomHttpServer.lan(InetAddress.getByName("127.0.0.1")));
    assertFalse(RoomHttpServer.lan(InetAddress.getByName("8.8.8.8")));
    assertFalse(RoomHttpServer.validAsset("maps/../../mesa.json"));
    assertTrue(RoomHttpServer.validAsset(ASSET));
    assertFalse(RoomHttpServer.validAsset("audio/arquivo.mp3"));
  }

  @Test
  public void websocketRecusaFrameSemMascara() throws Exception {
    try (RoomHttpServer server = room();
        Socket socket = new Socket("127.0.0.1", server.port())) {
      socket.setSoTimeout(2000);
      OutputStream out = socket.getOutputStream();
      InputStream in = socket.getInputStream();
      out.write(
          ("GET /socket?k="
                  + KEY
                  + " HTTP/1.1\r\nHost: 127.0.0.1:"
                  + server.port()
                  + "\r\n"
                  + "Upgrade: websocket\r\n"
                  + "Connection: Upgrade\r\n"
                  + "Sec-WebSocket-Version: 13\r\n"
                  + "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n")
              .getBytes(StandardCharsets.US_ASCII));
      out.flush();
      ByteArrayOutputStream headers = new ByteArrayOutputStream();
      String text = "";
      while (!text.endsWith("\r\n\r\n")) {
        headers.write(in.read());
        text = headers.toString("US-ASCII");
      }
      assertTrue(text.contains("101 Switching Protocols"));
      assertTrue(text.contains("s3pPLMBiTxaQ9kYGzzhZRbK+xOo="));
      assertEquals(129, in.read());
      int length = in.read();
      for (int i = 0; i < length; i++) assertTrue(in.read() >= 0);
      out.write(new byte[] {(byte) 129, 2, '{', '}'});
      out.flush();
      assertEquals(-1, in.read());
    }
  }
}
