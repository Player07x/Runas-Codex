package dev.runas.codex.room;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Leitura da saída do `cloudflared`, igual à do desktop (`desktop/src/main/vtt/cloudflared.ts`). */
final class TunnelOutput {
  private static final Pattern URL =
      Pattern.compile("https://(?!api\\.)[-a-z0-9]+\\.trycloudflare\\.com", Pattern.CASE_INSENSITIVE);
  private static final Pattern EDGE_FAILURE =
      Pattern.compile("Unable to establish connection with Cloudflare edge", Pattern.CASE_INSENSITIVE);
  private static final Pattern REGISTERED =
      Pattern.compile("Registered tunnel connection", Pattern.CASE_INSENSITIVE);

  static final String EDGE_BLOCKED =
      "Esta rede não deixa o cloudflared falar com a Cloudflare: a saída na porta 7844 está bloqueada,"
          + " então o link público não funciona daqui. Use outra rede (por exemplo, os dados móveis) ou"
          + " peça para liberar a porta 7844. A sala na rede local continua funcionando.";

  private TunnelOutput() {}

  /** Primeiro endereço de Quick Tunnel citado na saída. */
  static String quickTunnelUrl(String output) {
    Matcher match = URL.matcher(output);
    return match.find() ? match.group() : null;
  }

  static boolean registered(String line) {
    return REGISTERED.matcher(line).find();
  }

  static int edgeFailures(String line) {
    Matcher match = EDGE_FAILURE.matcher(line);
    int count = 0;
    while (match.find()) count++;
    return count;
  }

  /** `location=` e `protocol=` da linha "Registered tunnel connection". */
  static String detail(String line, String name) {
    Matcher match = Pattern.compile("\\b" + name + "=([\\w-]+)", Pattern.CASE_INSENSITIVE).matcher(line);
    return match.find() ? match.group(1) : null;
  }

  /** Link que os jogadores abrem: o túnel só entrega a página com a chave da sala. */
  static String playerUrl(String tunnelUrl, String key) {
    return tunnelUrl.replaceAll("/+$", "") + "/?k=" + key;
  }

  /** `abc-def.trycloudflare.com` de `https://abc-def.trycloudflare.com`. */
  static String host(String tunnelUrl) {
    return tunnelUrl.replaceFirst("^https://", "").replaceAll("/.*$", "").toLowerCase(java.util.Locale.ROOT);
  }
}
