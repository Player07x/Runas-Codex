package dev.runas.codex.room;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.view.WindowManager;
import android.webkit.MimeTypeMap;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import dev.runas.codex.vault.*;
import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

/** Socket e arquivos são nativos; a autoridade recebe pedidos pequenos pela ponte. */
@CapacitorPlugin(
    name = "RunasRoom",
    permissions = {
      @Permission(
          alias = "notifications",
          strings = {android.Manifest.permission.POST_NOTIFICATIONS})
    })
public class RunasRoomPlugin extends Plugin {
  private volatile RoomHttpServer server;
  private volatile String address = "127.0.0.1";
  private final Map<String, CompletableFuture<JSONObject>> pending = new ConcurrentHashMap<>();
  private final ExecutorService io = Executors.newSingleThreadExecutor();
  private String vaultIdentity;

  private RunasVaultPlugin vault() throws IOException {
    PluginHandle handle = getBridge().getPlugin("RunasVault");
    if (handle == null || !(handle.getInstance() instanceof RunasVaultPlugin))
      throw new IOException("O cofre não está disponível.");
    return (RunasVaultPlugin) handle.getInstance();
  }

  private JSONObject request(String kind, JSONObject payload) throws Exception {
    String id = UUID.randomUUID().toString();
    CompletableFuture<JSONObject> answer = new CompletableFuture<>();
    pending.put(id, answer);
    JSObject event = new JSObject();
    event.put("id", id);
    event.put("kind", kind);
    event.put("payload", payload);
    getActivity().runOnUiThread(() -> notifyListeners("request", event));
    try {
      JSONObject result = answer.get(8, TimeUnit.SECONDS);
      if (result.has("error")) throw new IOException("A autoridade recusou o pedido.");
      return result;
    } finally {
      pending.remove(id);
    }
  }

  @PluginMethod
  public void answer(PluginCall call) {
    CompletableFuture<JSONObject> answer = pending.get(call.getString("id", ""));
    if (answer != null) answer.complete(call.getObject("result", new JSObject()));
    call.resolve();
  }

  @PluginMethod
  public void start(PluginCall call) {
    if (Build.VERSION.SDK_INT >= 33
        && getPermissionState("notifications") != PermissionState.GRANTED) {
      requestPermissionForAlias("notifications", call, "notificationPermission");
      return;
    }
    startRoom(call);
  }

  @PermissionCallback
  private void notificationPermission(PluginCall call) {
    startRoom(call);
  }

  private void startRoom(PluginCall call) {
    io.execute(
        () -> {
          try {
            stopServer();
            String path = call.getString("worldPath", "");
            if (!path.matches("\\.runas/mesas/[^/.\\\\]+"))
              throw new IOException("Caminho de mesa inválido.");
            String folder = path.substring(".runas/mesas/".length());
            VaultFs worlds = vault().roomWorlds();
            worlds.entry(folder + "/mesa.json");
            vaultIdentity = vault().roomIdentity();
            address = lanAddress();
            if (address == null)
              throw new IOException(
                  "Conecte o celular a uma rede local ou ative um ponto de acesso antes de abrir a"
                      + " sala.");
            RoomHttpServer created =
                new RoomHttpServer(
                    call.getInt("port", 30000),
                    call.getString("key"),
                    new RoomHttpServer.Authority() {
                      public RoomHttpServer.Joined join(String body) throws Exception {
                        JSONObject payload = new JSONObject(body);
                        String code = payload.optString("code", "");
                        if (code.length() > 128) return null;
                        JSONObject result = request("join", new JSONObject().put("code", code));
                        JSONObject seat = result.optJSONObject("seat");
                        String token = result.optString("token", "");
                        return seat == null || !token.matches("[a-f0-9]{64}")
                            ? null
                            : new RoomHttpServer.Joined(seat.toString(), token);
                      }

                      public String authenticate(String token) throws Exception {
                        if (token.isEmpty()) return null;
                        JSONObject seat =
                            request("authenticate", new JSONObject().put("token", token))
                                .optJSONObject("seat");
                        return seat == null ? null : seat.toString();
                      }

                      public String snapshot(String seat) throws Exception {
                        return request(
                                "snapshot",
                                new JSONObject()
                                    .put(
                                        "seat",
                                        seat == null ? JSONObject.NULL : new JSONObject(seat)))
                            .getJSONObject("message")
                            .toString();
                      }

                      public String message(String seat, String body) throws Exception {
                        JSONObject value = new JSONObject(body);
                        if ("ping".equals(value.optString("type"))) return "{\"type\":\"pong\"}";
                        JSONObject message =
                            request(
                                    "message",
                                    new JSONObject()
                                        .put(
                                            "seat",
                                            seat == null ? JSONObject.NULL : new JSONObject(seat))
                                        .put("message", value))
                                .optJSONObject("message");
                        return message == null ? null : message.toString();
                      }

                      public String slotId(String seat) {
                        try {
                          return new JSONObject(seat).optString("slotId", "");
                        } catch (JSONException e) {
                          return "";
                        }
                      }

                      public void counts(int players, int spectators) {
                        JSObject event = new JSObject();
                        event.put("players", players);
                        event.put("spectators", spectators);
                        notifyListeners("counts", event);
                      }
                    },
                    new RoomHttpServer.Files() {
                      public RoomHttpServer.Resource bundle(String name) throws IOException {
                        InputStream stream = getContext().getAssets().open("public/" + name);
                        return new RoomHttpServer.Resource(stream, stream.available(), mime(name));
                      }

                      public RoomHttpServer.Resource asset(String name) throws IOException {
                        if (!RoomHttpServer.validAsset(name)
                            || !vault().roomIdentity().equals(vaultIdentity))
                          throw new IOException("Asset inválido.");
                        String relative = folder + "/assets/" + name;
                        VaultStore.Entry entry = worlds.entry(relative);
                        String source = worlds.source(relative);
                        if (!source.startsWith("content:")) {
                          File root =
                              new File(worlds.source(folder + "/mesa.json"))
                                  .getParentFile()
                                  .getCanonicalFile();
                          if (!new File(source)
                              .getCanonicalPath()
                              .startsWith(
                                  root.getPath() + File.separator + "assets" + File.separator))
                            throw new IOException("Asset fora da mesa aberta.");
                        }
                        InputStream stream =
                            source.startsWith("content:")
                                ? getContext()
                                    .getContentResolver()
                                    .openInputStream(Uri.parse(source))
                                : new FileInputStream(source);
                        if (stream == null) throw new IOException("Asset indisponível.");
                        return new RoomHttpServer.Resource(stream, entry.size, mime(name));
                      }
                    });
            server = created;
            String link =
                "http://" + address + ":" + created.port() + "/?k=" + call.getString("key");
            RoomService.start(getContext(), link, call.getString("key"), this::stopServer);
            getActivity()
                .runOnUiThread(
                    () ->
                        getActivity()
                            .getWindow()
                            .addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
            JSObject result = new JSObject();
            result.put("port", created.port());
            result.put("address", address);
            call.resolve(result);
          } catch (Exception e) {
            stopServer();
            call.reject(e.getMessage() == null ? "Não foi possível abrir a sala." : e.getMessage());
          }
        });
  }

  private synchronized void stopServer() {
    RoomHttpServer current = server;
    server = null;
    if (current != null) current.close();
    for (CompletableFuture<JSONObject> answer : pending.values())
      answer.completeExceptionally(new IOException("Sala encerrada."));
    pending.clear();
    if (getActivity() != null)
      getActivity()
          .runOnUiThread(
              () ->
                  getActivity()
                      .getWindow()
                      .clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
    if (current != null) {
      JSObject event = new JSObject();
      event.put("enabled", false);
      notifyListeners("stopped", event);
    }
  }

  @PluginMethod
  public void stop(PluginCall call) {
    RoomService.stop(getContext());
    stopServer();
    call.resolve();
  }

  @PluginMethod
  public void publish(PluginCall call) {
    RoomHttpServer current = server;
    if (current == null) {
      call.resolve();
      return;
    }
    JSArray allowed = call.getArray("assets", new JSArray());
    List<String> paths = new ArrayList<>();
    for (int i = 0; i < allowed.length(); i++) paths.add(allowed.optString(i));
    current.allowedAssets(paths);
    JSObject perSeat = call.getObject("perSeat");
    Map<String, String> messages = null;
    if (perSeat != null) {
      messages = new HashMap<>();
      Iterator<String> keys = perSeat.keys();
      while (keys.hasNext()) {
        String seat = keys.next();
        messages.put(seat, perSeat.optJSONObject(seat).toString());
      }
    }
    JSObject message = call.getObject("message");
    current.publish(message == null ? null : message.toString(), messages);
    call.resolve();
  }

  @PluginMethod
  public void openUrl(PluginCall call) {
    try {
      Uri uri = Uri.parse(call.getString("url", ""));
      if (!"http".equals(uri.getScheme()) && !"https".equals(uri.getScheme()))
        throw new IOException("Use um link HTTP ou HTTPS da sala.");
      if (uri.getHost() == null || uri.getUserInfo() != null)
        throw new IOException("Link de sala inválido.");
      getActivity().startActivity(new Intent(Intent.ACTION_VIEW, uri));
      call.resolve();
    } catch (Exception e) {
      call.reject("Não foi possível abrir o link da sala.");
    }
  }

  @Override
  protected void handleOnDestroy() {
    RoomService.stop(getContext());
    stopServer();
    io.shutdownNow();
    super.handleOnDestroy();
  }

  private static String mime(String path) {
    String extension = path.substring(path.lastIndexOf('.') + 1);
    if (extension.equals("js")) return "text/javascript";
    if (extension.equals("html")) return "text/html; charset=utf-8";
    if (extension.equals("css")) return "text/css";
    String value = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
    return value == null ? "application/octet-stream" : value;
  }

  private static String lanAddress() throws SocketException {
    List<NetworkInterface> networks = Collections.list(NetworkInterface.getNetworkInterfaces());
    networks.sort(
        Comparator.comparingInt(
            n -> n.getName().startsWith("wlan") || n.getName().startsWith("ap") ? 0 : 1));
    for (NetworkInterface network : networks)
      if (network.isUp()
          && !network.isLoopback()
          && !network.getName().startsWith("tun")
          && !network.getName().startsWith("rmnet"))
        for (InetAddress address : Collections.list(network.getInetAddresses()))
          if (address instanceof Inet4Address && address.isSiteLocalAddress())
            return address.getHostAddress();
    return null;
  }
}
