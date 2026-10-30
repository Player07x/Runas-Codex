package dev.runas.codex.room;

import android.content.Context;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/**
 * Link público da sala hospedada no celular (R4, ADR 0032): o `cloudflared` oficial vai no APK como biblioteca nativa
 * (`lib/<abi>/libcloudflared.so`, a única pasta de onde o Android deixa um app executar um binário; a versão e o
 * SHA-256 são conferidos no build) e abre um Quick Tunnel até a porta local da sala. Como o binário é de Linux e não
 * acha o DNS do Android, o app resolve os endereços da borda da Cloudflare e os passa com `--edge`, e o pedido do
 * túnel passa pelo {@link QuickServiceRelay}. Só começa quando o mestre pede e termina junto com a sala.
 */
final class RoomTunnel {
  static final String[] EDGE_HOSTS = {"region1.v2.argotunnel.com", "region2.v2.argotunnel.com"};
  static final int EDGE_PORT = 7844;
  static final long TIMEOUT_MS = 60_000;

  interface Listener {
    /** O processo encerrou depois de o túnel estar de pé. */
    void lost();
  }

  final String url;
  final String location;
  final String protocol;
  private final Process process;
  private final QuickServiceRelay relay;
  private volatile boolean stopped;

  private RoomTunnel(Process process, QuickServiceRelay relay, String url, String location, String protocol) {
    this.process = process;
    this.relay = relay;
    this.url = url;
    this.location = location;
    this.protocol = protocol;
  }

  static File binary(Context context) {
    return new File(context.getApplicationInfo().nativeLibraryDir, "libcloudflared.so");
  }

  /** O APK traz o binário desta arquitetura (nas outras vai um marcador pequeno, para o APK instalar em todas). */
  static boolean available(Context context) {
    File file = binary(context);
    if (!file.isFile() || file.length() < 1_000_000) return false;
    try (InputStream in = new FileInputStream(file)) {
      byte[] magic = new byte[4];
      return in.read(magic) == 4 && magic[0] == 0x7f && magic[1] == 'E' && magic[2] == 'L' && magic[3] == 'F';
    } catch (IOException e) {
      return false;
    }
  }

  /** IPv4 da borda, resolvidos pelo Android (o `cloudflared` não alcança o DNS do sistema). */
  static List<String> edges() throws IOException {
    List<String> result = new ArrayList<>();
    for (String host : EDGE_HOSTS)
      for (InetAddress address : InetAddress.getAllByName(host))
        if (address instanceof Inet4Address && result.size() < 8)
          result.add(address.getHostAddress() + ":" + EDGE_PORT);
    if (result.isEmpty()) throw new UnknownHostException("Sem endereço da Cloudflare.");
    return result;
  }

  static List<String> arguments(String binary, int port, String quickService, List<String> edges) {
    List<String> args = new ArrayList<>(Arrays.asList(binary, "tunnel", "--no-autoupdate", "--protocol", "http2",
        "--edge-ip-version", "4", "--metrics", "127.0.0.1:0", "--quick-service", quickService));
    for (String edge : edges) {
      args.add("--edge");
      args.add(edge);
    }
    args.add("--url");
    args.add("http://127.0.0.1:" + port);
    return args;
  }

  static RoomTunnel start(Context context, int port, Listener listener) throws IOException {
    if (!available(context))
      throw new IOException("O link público não está disponível neste aparelho (o processador não é ARM de 64 bits).");
    List<String> edges;
    try {
      edges = edges();
    } catch (IOException e) {
      throw new IOException("Sem internet: o celular não encontrou a Cloudflare. Confira os dados móveis ou o Wi-Fi.");
    }
    QuickServiceRelay relay = new QuickServiceRelay();
    File home = new File(context.getFilesDir(), "cloudflared");
    if (!home.isDirectory() && !home.mkdirs()) throw new IOException("Não foi possível preparar o túnel.");
    ProcessBuilder builder =
        new ProcessBuilder(arguments(binary(context).getAbsolutePath(), port, relay.base(), edges))
            .redirectErrorStream(true)
            .directory(home);
    builder.environment().put("HOME", home.getAbsolutePath());
    builder.environment().put("TMPDIR", context.getCacheDir().getAbsolutePath());
    Process process;
    try {
      process = builder.start();
    } catch (IOException e) {
      relay.close();
      throw new IOException("Não foi possível iniciar o cloudflared: " + e.getMessage());
    }
    CompletableFuture<String[]> ready = new CompletableFuture<>();
    RoomTunnel[] created = new RoomTunnel[1];
    Thread reader =
        new Thread(
            () -> {
              StringBuilder recent = new StringBuilder();
              String found = null;
              int failures = 0;
              try (BufferedReader lines =
                  new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                // Continua lendo depois do link: um pipe cheio travaria o cloudflared no meio da sessão.
                while ((line = lines.readLine()) != null) {
                  if (ready.isDone()) continue;
                  recent.append(line).append('\n');
                  if (recent.length() > 12000) recent.delete(0, recent.length() - 12000);
                  failures += TunnelOutput.edgeFailures(line);
                  if (failures >= 2) ready.completeExceptionally(new IOException(TunnelOutput.EDGE_BLOCKED));
                  if (found == null) found = TunnelOutput.quickTunnelUrl(line);
                  if (found != null && TunnelOutput.registered(line))
                    ready.complete(
                        new String[] {found, TunnelOutput.detail(line, "location"), TunnelOutput.detail(line, "protocol")});
                }
              } catch (IOException ignored) {
                // O processo foi encerrado.
              }
              int code = -1;
              try {
                code = process.waitFor();
              } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
              }
              if (!ready.isDone())
                ready.completeExceptionally(
                    new IOException("cloudflared encerrou antes de criar o túnel (" + code + "). " + tail(recent)));
              RoomTunnel tunnel = created[0];
              if (tunnel != null && !tunnel.stopped) {
                tunnel.relay.close();
                listener.lost();
              }
            },
            "runas-tunnel");
    reader.setDaemon(true);
    reader.start();
    try {
      String[] result = ready.get(TIMEOUT_MS, TimeUnit.MILLISECONDS);
      RoomTunnel tunnel = new RoomTunnel(process, relay, result[0], result[1], result[2]);
      created[0] = tunnel;
      // Corrida: o processo pode ter morrido entre o link e esta linha.
      if (exited(process)) {
        tunnel.stop();
        throw new IOException("O túnel caiu logo depois de abrir. Tente de novo.");
      }
      return tunnel;
    } catch (TimeoutException e) {
      process.destroy();
      relay.close();
      throw new IOException(
          "O túnel não ficou pronto em " + TIMEOUT_MS / 1000 + " s. Confira a internet e se a porta 7844 está liberada.");
    } catch (ExecutionException e) {
      process.destroy();
      relay.close();
      Throwable cause = e.getCause();
      throw cause instanceof IOException ? (IOException) cause : new IOException(String.valueOf(cause));
    } catch (InterruptedException e) {
      process.destroy();
      relay.close();
      Thread.currentThread().interrupt();
      throw new IOException("Túnel interrompido.");
    }
  }

  /** `Process.isAlive()` só existe a partir do Android 8; o app instala desde o 7. */
  private static boolean exited(Process process) {
    try {
      process.exitValue();
      return true;
    } catch (IllegalThreadStateException running) {
      return false;
    }
  }

  private static String tail(StringBuilder output) {
    String text = output.toString().trim();
    int start = Math.max(0, text.length() - 400);
    return text.substring(start);
  }

  void stop() {
    stopped = true;
    process.destroy();
    relay.close();
  }
}
