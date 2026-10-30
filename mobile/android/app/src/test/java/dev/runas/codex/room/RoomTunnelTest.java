package dev.runas.codex.room;

import static org.junit.Assert.*;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import org.junit.Test;

/** R4 (ADR 0032): o túnel da sala do celular, sem falar com a Cloudflare. */
public class RoomTunnelTest {
  @Test
  public void leASaidaDoCloudflaredComoODesktop() {
    String banner =
        "2026-10-30T12:00:00Z INF |  https://riding-brave-owl.trycloudflare.com                                |";
    String registered =
        "2026-10-30T12:00:02Z INF Registered tunnel connection connIndex=0 connection=abc event=0 ip=198.41.192.7"
            + " location=gru01 protocol=http2";
    assertEquals("https://riding-brave-owl.trycloudflare.com", TunnelOutput.quickTunnelUrl(banner));
    assertNull(TunnelOutput.quickTunnelUrl("POST https://api.trycloudflare.com/tunnel"));
    assertTrue(TunnelOutput.registered(registered));
    assertEquals("gru01", TunnelOutput.detail(registered, "location"));
    assertEquals("http2", TunnelOutput.detail(registered, "protocol"));
    assertEquals(
        2,
        TunnelOutput.edgeFailures(
            "ERR Unable to establish connection with Cloudflare edge ... Unable to establish connection with Cloudflare edge"));
    assertEquals("riding-brave-owl.trycloudflare.com", TunnelOutput.host("https://Riding-Brave-Owl.trycloudflare.com/"));
    assertEquals(
        "https://riding-brave-owl.trycloudflare.com/?k=abc", TunnelOutput.playerUrl("https://riding-brave-owl.trycloudflare.com", "abc"));
  }

  @Test
  public void passaAoCloudflaredSoEnderecosNumericosEOrepasseLocal() {
    List<String> args =
        RoomTunnel.arguments("/lib/libcloudflared.so", 30000, "http://127.0.0.1:4000/segredo", Arrays.asList("198.41.192.7:7844", "198.41.200.13:7844"));
    String joined = String.join(" ", args);
    assertTrue(joined.startsWith("/lib/libcloudflared.so tunnel --no-autoupdate --protocol http2"));
    assertTrue(joined.contains("--quick-service http://127.0.0.1:4000/segredo"));
    assertTrue(joined.contains("--edge 198.41.192.7:7844 --edge 198.41.200.13:7844"));
    assertTrue(joined.endsWith("--url http://127.0.0.1:30000"));
  }

  @Test
  public void aceitaODominioDoTunelSoVindoDoProprioAparelho() throws Exception {
    InetAddress loopback = InetAddress.getByName("127.0.0.1"), lan = InetAddress.getByName("192.168.0.20");
    String host = "riding-brave-owl.trycloudflare.com";
    assertTrue(RoomHttpServer.tunneled(loopback, "Riding-Brave-Owl.trycloudflare.com", host));
    assertFalse(RoomHttpServer.tunneled(lan, host, host));
    assertFalse(RoomHttpServer.tunneled(loopback, "outro.trycloudflare.com", host));
    assertFalse(RoomHttpServer.tunneled(loopback, host, null));
    assertTrue(RoomHttpServer.validTunnelOrigin(null, host));
    assertTrue(RoomHttpServer.validTunnelOrigin("https://" + host, host));
    assertFalse(RoomHttpServer.validTunnelOrigin("http://" + host, host));
    assertFalse(RoomHttpServer.validTunnelOrigin("https://evil.example", host));
    Map<String, String> headers = new HashMap<>();
    headers.put("cf-connecting-ip", "203.0.113.9");
    assertEquals("203.0.113.9", RoomHttpServer.clientAddress(loopback, headers, true));
    // Na rede local o cabeçalho não vale: qualquer um poderia inventá-lo para fugir do limite.
    assertEquals("192.168.0.20", RoomHttpServer.clientAddress(lan, headers, false));
  }

  @Test
  public void repasseLocalSoAtendeOPedidoDoTunelComOCaminhoSecreto() throws Exception {
    try (ServerSocket fake = new ServerSocket(0, 4, InetAddress.getByName("127.0.0.1"))) {
      CompletableFuture<String> seen = new CompletableFuture<>();
      Thread service =
          new Thread(
              () -> {
                try (Socket socket = fake.accept()) {
                  BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.US_ASCII));
                  String first = in.readLine(), line;
                  String agent = "";
                  while ((line = in.readLine()) != null && !line.isEmpty())
                    if (line.toLowerCase(Locale.ROOT).startsWith("user-agent:")) agent = line.substring(11).trim();
                  seen.complete(first + " | " + agent);
                  byte[] body = "{\"success\":true,\"result\":{\"hostname\":\"x.trycloudflare.com\"}}".getBytes(StandardCharsets.UTF_8);
                  OutputStream out = socket.getOutputStream();
                  out.write(("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + body.length + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
                  out.write(body);
                  out.flush();
                } catch (IOException e) {
                  seen.completeExceptionally(e);
                }
              });
      service.start();
      try (QuickServiceRelay relay = new QuickServiceRelay("http://127.0.0.1:" + fake.getLocalPort() + "/tunnel")) {
        assertEquals(404, post(relay.base().replaceFirst("/[a-f0-9]{32}$", "/errado") + "/tunnel").status);
        Reply ok = post(relay.base() + "/tunnel");
        assertEquals(200, ok.status);
        assertTrue(ok.body.contains("x.trycloudflare.com"));
        assertEquals("POST /tunnel HTTP/1.1 | cloudflared/2026.9.3", seen.get(5, TimeUnit.SECONDS));
      }
    }
  }

  private static final class Reply {
    int status;
    String body;
  }

  private static Reply post(String url) throws IOException {
    HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
    connection.setRequestMethod("POST");
    connection.setRequestProperty("User-Agent", "cloudflared/2026.9.3");
    connection.setDoOutput(true);
    connection.setFixedLengthStreamingMode(0);
    connection.getOutputStream().close();
    Reply reply = new Reply();
    reply.status = connection.getResponseCode();
    InputStream in = reply.status >= 400 ? connection.getErrorStream() : connection.getInputStream();
    reply.body = in == null ? "" : new String(in.readAllBytes(), StandardCharsets.UTF_8);
    connection.disconnect();
    return reply;
  }
}
