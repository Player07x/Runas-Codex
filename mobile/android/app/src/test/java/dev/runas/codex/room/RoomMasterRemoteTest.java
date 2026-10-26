package dev.runas.codex.room;

import static org.junit.Assert.*;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.*;
import org.junit.Test;

public class RoomMasterRemoteTest {
  private static final String PLAYER = "0123456789abcdef0123456789abcdef";
  private static final String SECRET =
      "tokens/" + String.join("", Collections.nCopies(64, "a")) + ".png";
  private static final String PUT = "vtt:documents-put", CHANGED = "vtt:documents-changed";

  private RoomHttpServer room() throws Exception {
    int port;
    try (ServerSocket reserve = new ServerSocket(0)) {
      port = reserve.getLocalPort();
    }
    RoomHttpServer result =
        new RoomHttpServer(
            port,
            PLAYER,
            new RoomHttpServer.Authority() {
              public RoomHttpServer.Joined join(String body) {
                return null;
              }

              public String authenticate(String token) {
                return null;
              }

              public String snapshot(String seat) {
                return "{}";
              }

              public String message(String seat, String body) {
                return null;
              }

              public void counts(int players, int spectators) {}

              public String masterWorld() {
                return "{\"id\":\"mesa-ci\",\"title\":\"Mesa\"}";
              }

              public String masterCall(String channel, String body, Set<String> allowed) {
                if (channel == null) {
                  Matcher match = Pattern.compile("\"channel\":\"([^\"]+)\"").matcher(body);
                  channel = match.find() ? match.group(1) : "";
                }
                if (!allowed.contains(channel)) throw new SecurityException();
                return "{\"result\":\"gravado\"}";
              }

              public String masterImport(String kind, String name, byte[] bytes) {
                assertEquals("tokens", kind);
                assertEquals("símbolo.png", name);
                assertArrayEquals(new byte[] {1, 2, 3}, bytes);
                return "{\"result\":\"" + SECRET + "\"}";
              }
            },
            new RoomHttpServer.Files() {
              public RoomHttpServer.Resource bundle(String name) {
                return resource(name);
              }

              public RoomHttpServer.Resource asset(String path) throws IOException {
                if (!path.equals(SECRET)) throw new IOException("Ausente");
                return resource("0123456789");
              }

              private RoomHttpServer.Resource resource(String body) {
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                return new RoomHttpServer.Resource(
                    new ByteArrayInputStream(bytes), bytes.length, "text/plain");
              }
            });
    result.enableMaster(Arrays.asList(PUT), Arrays.asList(CHANGED));
    return result;
  }

  private HttpURLConnection get(RoomHttpServer server, String path) throws Exception {
    HttpURLConnection connection =
        (HttpURLConnection) new URL("http://127.0.0.1:" + server.port() + path).openConnection();
    connection.setConnectTimeout(3000);
    connection.setReadTimeout(3000);
    return connection;
  }

  private String body(HttpURLConnection request) throws Exception {
    try (InputStream in = request.getInputStream();
        ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      byte[] bytes = new byte[1024];
      int size;
      while ((size = in.read(bytes)) != -1) out.write(bytes, 0, size);
      return out.toString("UTF-8");
    } finally {
      request.disconnect();
    }
  }

  private static final class Events implements AutoCloseable {
    final HttpURLConnection request;
    final BufferedReader input;
    final String session;

    Events(HttpURLConnection request) throws Exception {
      this.request = request;
      assertEquals(200, request.getResponseCode());
      assertTrue(request.getContentType().startsWith("text/event-stream"));
      input =
          new BufferedReader(
              new InputStreamReader(request.getInputStream(), StandardCharsets.UTF_8));
      String hello = next();
      assertTrue(hello.contains("mesa-ci"));
      Matcher match = Pattern.compile("\"session\":\"([a-f0-9]{32})\"").matcher(hello);
      assertTrue(match.find());
      session = match.group(1);
    }

    String next() throws Exception {
      String value;
      while ((value = input.readLine()) != null) if (value.startsWith("data: ")) return value;
      return null;
    }

    public void close() {
      request.disconnect();
    }
  }

  private Events events(RoomHttpServer server, String key) throws Exception {
    return new Events(get(server, "/master/events?m=" + key));
  }

  private HttpURLConnection post(
      RoomHttpServer server, String path, String key, String session, byte[] bytes)
      throws Exception {
    HttpURLConnection request = get(server, path + (path.contains("?") ? "&" : "?") + "m=" + key);
    request.setRequestMethod("POST");
    request.setRequestProperty("x-runas-session", session);
    request.setDoOutput(true);
    request.getOutputStream().write(bytes);
    return request;
  }

  @Test
  public void chaveSeparadaDoJogadorENovaAoReligar() throws Exception {
    String previous;
    try (RoomHttpServer server = room()) {
      previous = server.master().key();
      assertTrue(previous.matches("[a-f0-9]{32}"));
      assertNotEquals(PLAYER, previous);
      assertEquals(404, get(server, "/master?m=" + PLAYER).getResponseCode());
      assertEquals(404, get(server, "/master.html?k=" + PLAYER).getResponseCode());
      assertEquals("master.html", body(get(server, "/master?m=" + previous)));
      assertEquals("master.html", body(get(server, "/master/?m=" + previous)));
      assertEquals(404, get(server, "/master/asset/../mesa.json?m=" + previous).getResponseCode());
    }
    try (RoomHttpServer server = room()) {
      assertNotEquals(previous, server.master().key());
    }
  }

  @Test
  public void sessaoUnicaEListaDeComandosValemNosDoisEndpoints() throws Exception {
    try (RoomHttpServer server = room()) {
      String key = server.master().key();
      try (Events stream = events(server, key)) {
        assertTrue(server.master().connected());
        assertEquals(409, get(server, "/master/events?m=" + key).getResponseCode());
        byte[] args = "[]".getBytes(StandardCharsets.UTF_8);
        assertEquals(
            403, post(server, "/master/call/" + PUT, key, "sem-sessao", args).getResponseCode());
        assertEquals(
            403,
            post(server, "/master/call/vtt:worlds-create", key, stream.session, args)
                .getResponseCode());
        assertEquals(
            "{\"result\":\"gravado\"}",
            body(post(server, "/master/call/" + PUT, key, stream.session, args)));
        byte[] rpc = ("{\"channel\":\"" + PUT + "\",\"args\":[]}").getBytes(StandardCharsets.UTF_8);
        assertEquals(200, post(server, "/master/rpc", key, stream.session, rpc).getResponseCode());
        assertEquals(
            403,
            post(
                    server,
                    "/master/rpc",
                    key,
                    stream.session,
                    "{\"channel\":\"vault:read\"}".getBytes(StandardCharsets.UTF_8))
                .getResponseCode());
        server.master().emit("proibido", "{}");
        server.master().emit(CHANGED, "{\"id\":\"token-do-tablet\"}");
        assertTrue(stream.next().contains("token-do-tablet"));
      }
    }
  }

  @Test
  public void assetsPrivadosSoParaMestreComRangeEHead() throws Exception {
    try (RoomHttpServer server = room()) {
      String path = "/master/asset/" + SECRET + "?m=" + server.master().key();
      assertEquals(404, get(server, "/assets/" + SECRET + "?k=" + PLAYER).getResponseCode());
      HttpURLConnection request = get(server, path);
      request.setRequestProperty("Range", "bytes=2-5");
      assertEquals(206, request.getResponseCode());
      assertEquals("bytes 2-5/10", request.getHeaderField("Content-Range"));
      assertEquals("2345", body(request));
      request = get(server, path);
      request.setRequestMethod("HEAD");
      assertEquals(200, request.getResponseCode());
      assertEquals(10, request.getContentLength());
      assertEquals("", body(request));
      request = get(server, path);
      request.setRequestProperty("Range", "bytes=100-");
      assertEquals(416, request.getResponseCode());
      assertEquals(
          404,
          get(
                  server,
                  "/master/asset/tokens/"
                      + String.join("", Collections.nCopies(64, "b"))
                      + ".png?m="
                      + server.master().key())
              .getResponseCode());
    }
  }

  @Test
  public void importacaoExigeSessaoELimitaTamanhoAntesDeLer() throws Exception {
    try (RoomHttpServer server = room()) {
      String key = server.master().key();
      try (Events stream = events(server, key)) {
        String path = "/master/asset?kind=tokens&name=s%C3%ADmbolo.png";
        assertEquals(403, post(server, path, key, "invalida", new byte[] {1}).getResponseCode());
        assertTrue(
            body(post(server, path, key, stream.session, new byte[] {1, 2, 3})).contains(SECRET));
        assertEquals(
            413,
            raw(
                server,
                "127.0.0.1",
                null,
                "POST",
                path + "&m=" + key,
                stream.session,
                50 * 1024 * 1024 + 1));
        assertEquals(
            413,
            raw(
                server,
                "127.0.0.1",
                null,
                "POST",
                "/master/rpc?m=" + key,
                stream.session,
                8 * 1024 * 1024 + 1));
      }
    }
  }

  @Test
  public void revogacaoFechaStreamERecusaSessaoAntiga() throws Exception {
    try (RoomHttpServer server = room()) {
      String key = server.master().key();
      try (Events stream = events(server, key)) {
        server.master().disconnect();
        assertFalse(server.master().connected());
        assertNull(stream.next());
        assertEquals(
            403,
            post(server, "/master/call/" + PUT, key, stream.session, new byte[] {'[', ']'})
                .getResponseCode());
      }
      try (Events stream = events(server, key)) {
        server.master().rotate();
        assertNotEquals(key, server.master().key());
        assertNull(stream.next());
        assertEquals(404, get(server, "/master?m=" + key).getResponseCode());
      }
      try (Events stream = events(server, server.master().key())) {
        server.close();
        assertNull(stream.next());
        assertNull(server.master().key());
      }
    }
  }

  @Test
  public void recusaOriginExternoHostNaoLocalELimitaTentativas() throws Exception {
    try (RoomHttpServer server = room()) {
      String path = "/master?m=" + server.master().key();
      assertEquals(403, raw(server, "externo.invalid", null, "GET", path, "", 0));
      assertEquals(404, raw(server, "127.0.0.1", "https://externo.invalid", "GET", path, "", 0));
      for (int i = 0; i < 4; i++)
        assertEquals(404, get(server, "/master?m=errada").getResponseCode());
      assertEquals(429, get(server, path).getResponseCode());
    }
  }

  @Test
  public void fecharNavegadorLiberaSessaoSemTrocarChave() throws Exception {
    try (RoomHttpServer server = room()) {
      String key = server.master().key();
      Events first = events(server, key);
      first.close();
      for (int i = 0; i < 100 && server.master().connected(); i++) Thread.sleep(10);
      assertFalse(server.master().connected());
      try (Events second = events(server, key)) {
        assertNotEquals(first.session, second.session);
      }
    }
  }

  private int raw(
      RoomHttpServer server,
      String host,
      String origin,
      String method,
      String path,
      String session,
      int length)
      throws Exception {
    try (Socket socket = new Socket("127.0.0.1", server.port())) {
      socket.setSoTimeout(3000);
      String request =
          method
              + " "
              + path
              + " HTTP/1.1\r\nHost: "
              + host
              + ":"
              + server.port()
              + "\r\nx-runas-session: "
              + session
              + "\r\nContent-Length: "
              + length
              + "\r\n"
              + (origin == null ? "" : "Origin: " + origin + "\r\n")
              + "\r\n";
      socket.getOutputStream().write(request.getBytes(StandardCharsets.US_ASCII));
      String response =
          new BufferedReader(
                  new InputStreamReader(socket.getInputStream(), StandardCharsets.US_ASCII))
              .readLine();
      return Integer.parseInt(response.split(" ")[1]);
    }
  }
}
