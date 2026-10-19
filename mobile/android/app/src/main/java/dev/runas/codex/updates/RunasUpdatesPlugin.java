package dev.runas.codex.updates;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import dev.runas.codex.BuildConfig;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.atomic.AtomicBoolean;

/** Rede apenas por ação explícita; o renderer nunca fornece um endereço para baixar. */
@CapacitorPlugin(name = "RunasUpdates")
public class RunasUpdatesPlugin extends Plugin {
    private final AtomicBoolean busy = new AtomicBoolean();
    private JSONArray releases;
    private File pendingFile;
    private String pendingHash, pendingVersion;
    private String testOrigin;
    private long checkedAt;

    private PackageInfo installed() throws PackageManager.NameNotFoundException {
        return getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES);
    }
    private void begin() throws IOException { if (!busy.compareAndSet(false, true)) throw new IOException("Já existe uma verificação ou instalação em andamento."); }
    private void fail(PluginCall call, Exception error) { busy.set(false); call.reject(error.getMessage() == null ? "Não foi possível atualizar o aplicativo." : error.getMessage()); }
    private void clearDownload() { if (pendingFile != null) pendingFile.delete(); pendingFile = null; pendingHash = null; pendingVersion = null; }
    private boolean testUrl(String url) { return BuildConfig.RUNAS_UPDATE_TEST && testOrigin != null && url.startsWith(testOrigin + "/"); }
    private HttpURLConnection open(String address, boolean api) throws IOException {
        if (!(api && UpdatePolicy.API.equals(address)) && !UpdatePolicy.trustedDownload(address) && !testUrl(address)) throw new IOException("Endereço de atualização inesperado.");
        for (int hop = 0; hop < 6; hop++) {
            HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
            connection.setConnectTimeout(20000); connection.setReadTimeout(20000); connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Accept", api ? "application/vnd.github+json" : "application/octet-stream");
            connection.setRequestProperty("User-Agent", "Runas-Codex/Android");
            int status = connection.getResponseCode();
            if (status >= 300 && status <= 399) {
                String location = connection.getHeaderField("Location"); connection.disconnect();
                if (location == null) throw new IOException("O servidor não informou o destino do download.");
                address = URI.create(address).resolve(location).toString();
                if (!UpdatePolicy.trustedRedirect(address) && !testUrl(address)) throw new IOException("Redirecionamento inesperado no download.");
                continue;
            }
            if (status != 200) { connection.disconnect(); throw new IOException(status == 403 || status == 429 ? "O GitHub limitou as consultas. Tente novamente em alguns minutos." : "O servidor respondeu " + status + "."); }
            return connection;
        }
        throw new IOException("O download redirecionou vezes demais.");
    }
    private String text(String address, boolean api, int limit) throws IOException {
        HttpURLConnection connection = open(address, api);
        try (InputStream stream = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192]; int total = 0;
            for (int count; (count = stream.read(buffer)) != -1;) { total += count; if (total > limit) throw new IOException("A resposta de atualização excede o limite."); output.write(buffer, 0, count); }
            return output.toString(StandardCharsets.UTF_8.name());
        } finally { connection.disconnect(); }
    }
    @PluginMethod public void check(PluginCall call) {
        try { begin(); } catch (IOException error) { call.reject(error.getMessage()); return; }
        releases = null;
        new Thread(() -> {
            try {
                JSONArray found = new JSONArray(text(testOrigin == null ? UpdatePolicy.API : testOrigin + "/releases", true, 4 * 1024 * 1024));
                PackageInfo current = installed();
                releases = found; checkedAt = System.currentTimeMillis();
                JSObject out = new JSObject(); out.put("current", current.versionName); out.put("releases", new JSArray(found.toString()));
                busy.set(false); call.resolve(out);
            } catch (Exception error) { fail(call, error); }
        }, "runas-verificar-atualizacao").start();
    }
    private JSONObject asset(JSONObject release, String pattern) throws IOException {
        JSONArray assets = release.optJSONArray("assets");
        if (assets != null) for (int i = 0; i < assets.length(); i++) {
            JSONObject item = assets.optJSONObject(i);
            if (item != null && item.optString("name").matches(pattern)) return item;
        }
        throw new IOException("A release não tem APK ou SHA256SUMS.txt para esta atualização.");
    }
    private JSONObject selected(String tag) throws IOException {
        if (releases == null || System.currentTimeMillis() - checkedAt > 30 * 60 * 1000L) throw new IOException("Verifique as atualizações novamente antes de instalar.");
        for (int i = 0; i < releases.length(); i++) {
            JSONObject item = releases.optJSONObject(i);
            if (item != null && !item.optBoolean("draft") && item.optString("tag_name").equals(tag) && tag.matches("v?\\d+\\.\\d+\\.\\d+(?:-(?:alpha|beta|rc)\\.\\d+)?")) return item;
        }
        throw new IOException("Esta versão não veio da última consulta de atualizações.");
    }
    @PluginMethod public void install(PluginCall call) {
        try { begin(); } catch (IOException error) { call.reject(error.getMessage()); return; }
        new Thread(() -> {
            try {
                clearDownload();
                String tag = call.getString("tag", ""); JSONObject release = selected(tag);
                JSONObject apk;
                try { apk = asset(release, "Runas-Codex-.+-android\\.apk"); }
                catch (IOException missingSigned) { apk = asset(release, "Runas-Codex-.+-android-debug\\.apk"); }
                JSONObject sums = asset(release, "SHA256SUMS\\.txt");
                String address = apk.optString("browser_download_url"), sumAddress = sums.optString("browser_download_url"), name = apk.optString("name");
                if (!testUrl(address) && (!UpdatePolicy.trustedDownload(address) || !address.equals(UpdatePolicy.DOWNLOAD + tag + "/" + name))) throw new IOException("O APK não pertence à release escolhida.");
                if (!testUrl(sumAddress) && !sumAddress.equals(UpdatePolicy.DOWNLOAD + tag + "/SHA256SUMS.txt")) throw new IOException("As somas não pertencem à release escolhida.");
                String expected = UpdatePolicy.checksum(text(sumAddress, false, 256 * 1024), name);
                File folder = new File(getContext().getCacheDir(), "runas-updates");
                if (!folder.isDirectory() && !folder.mkdirs()) throw new IOException("Não foi possível preparar o download.");
                File file = new File(folder, "atualizacao.apk"); pendingFile = file;
                HttpURLConnection connection = open(address, false);
                String hash;
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(file)) {
                    final long[] notified = {0};
                    hash = UpdatePolicy.copy(input, output, apk.optLong("size"), (received, total) -> {
                        long now = System.currentTimeMillis();
                        if (received == total || now - notified[0] >= 200) {
                            notified[0] = now; JSObject progress = new JSObject(); progress.put("received", received); progress.put("total", total); notifyListeners("progress", progress);
                        }
                    });
                    output.getFD().sync();
                } finally { connection.disconnect(); }
                if (!expected.equals(hash)) throw new IOException("O APK não confere com a soma SHA-256 da release. Nada foi instalado.");
                pendingHash = expected; pendingVersion = tag.replaceFirst("^v", "");
                verify(file, pendingVersion);
                getActivity().runOnUiThread(() -> {
                    try {
                        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
                            Intent permission = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
                            startActivityForResult(call, permission, "permissionResult");
                        } else openInstaller(call);
                    } catch (Exception error) { clearDownload(); fail(call, error); }
                });
            } catch (Exception error) { clearDownload(); fail(call, error); }
        }, "runas-baixar-atualizacao").start();
    }
    private String[] signers(PackageInfo info) {
        Signature[] signatures = Build.VERSION.SDK_INT >= 28 && info.signingInfo != null ? info.signingInfo.getApkContentsSigners() : info.signatures;
        if (signatures == null) return new String[0];
        String[] out = new String[signatures.length];
        for (int i = 0; i < signatures.length; i++) out[i] = UpdatePolicy.hex(signatures[i].toByteArray());
        return out;
    }
    private void verify(File file, String version) throws Exception {
        PackageManager manager = getContext().getPackageManager();
        PackageInfo candidate = manager.getPackageArchiveInfo(file.getPath(), Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES);
        if (candidate == null) throw new IOException("O arquivo baixado não é um APK válido.");
        PackageInfo current = installed();
        UpdatePolicy.identity(current.packageName, candidate.packageName, Build.VERSION.SDK_INT >= 28 ? current.getLongVersionCode() : current.versionCode, Build.VERSION.SDK_INT >= 28 ? candidate.getLongVersionCode() : candidate.versionCode, version, candidate.versionName, signers(current), signers(candidate));
    }
    @ActivityCallback private void permissionResult(PluginCall call, ActivityResult result) {
        if (call == null) { clearDownload(); busy.set(false); return; }
        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) { clearDownload(); fail(call, new IOException("Instalação não autorizada. O aplicativo e o cofre continuam abertos; você pode tentar novamente.")); return; }
        // A autorização pode levar tempo; confere novamente fora da thread da interface.
        new Thread(() -> {
            try {
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                try (FileInputStream input = new FileInputStream(pendingFile)) { byte[] bytes = new byte[65536]; for (int count; (count = input.read(bytes)) != -1;) digest.update(bytes, 0, count); }
                if (!UpdatePolicy.hex(digest.digest()).equals(pendingHash)) throw new IOException("O download mudou durante a autorização. Verifique novamente.");
                verify(pendingFile, pendingVersion);
                getActivity().runOnUiThread(() -> { try { openInstaller(call); } catch (Exception error) { clearDownload(); fail(call, error); } });
            } catch (Exception error) { clearDownload(); fail(call, error); }
        }, "runas-confirmar-atualizacao").start();
    }
    private void openInstaller(PluginCall call) throws Exception {
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", pendingFile);
        Intent intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getActivity().startActivity(intent);
        busy.set(false);
        JSObject result = new JSObject(); result.put("result", "pacote-aberto"); call.resolve(result);
        // Não apaga antes de o instalador ler. A próxima tentativa remove o arquivo, e o Android pode limpar o cache.
    }
    /** Disponível apenas no APK separado do CI, nunca no APK publicado (nem no debug distribuído). */
    @PluginMethod public void testSource(PluginCall call) {
        if (!BuildConfig.RUNAS_UPDATE_TEST) { call.reject("A origem de teste não está disponível neste APK."); return; }
        if (busy.get()) { call.reject("Já existe uma operação em andamento."); return; }
        Integer port = call.getInt("port");
        if (port == null || port < 1024 || port > 65535) { call.reject("Porta inválida."); return; }
        testOrigin = "http://127.0.0.1:" + port; releases = null; call.resolve();
    }
}
