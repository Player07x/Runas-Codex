package dev.runas.codex.vault;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.MimeTypeMap;

import androidx.activity.result.ActivityResult;
import androidx.appcompat.app.AlertDialog;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import dev.runas.codex.widget.AgendaWidget;

/**
 * Ponte do cofre para a interface (app/src/platform/capacitor-platform.ts), em lote como o desktop: listar o cofre de
 * uma vez, ler vários textos num pedido, gravar com a versão lida. O acesso é o de "todos os arquivos" do Android
 * (a pasta é escolhida pelo seletor do sistema e aberta direto no disco); ver docs/adr/0015-android.md.
 */
@CapacitorPlugin(
    name = "RunasVault",
    permissions = { @Permission(alias = "storage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE }) }
)
public class RunasVaultPlugin extends Plugin {

    private static final String PREFS = "runas-vault";
    private static final long DAY_MS = 24L * 60 * 60 * 1000;
    private static final long MAX_SHARED_BYTES = 20L * 1024 * 1024;

    private VaultFs store;
    private String openError;
    private boolean pickSaf;
    private VaultWatcher watcher;
    private boolean testVault;
    private boolean testWritable;
    /** O que o seletor de pasta vai fazer: abrir ("choose") ou criar ("create"). */
    private String pickMode = "choose";

    @Override
    public void load() {
        // Teste no emulador (só no APK de depuração): abrir um cofre pelo caminho, sem o seletor.
        Intent intent = getActivity().getIntent();
        boolean debuggable = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (debuggable && intent != null && intent.getStringExtra("runasVault") != null) {
            testVault = true;
            testWritable = intent.getBooleanExtra("runasWritable", false);
            open(new VaultStore(new File(intent.getStringExtra("runasVault"))));
        } else {
            String saved = prefs().getString("path", null);
            if (saved != null) {
                try {
                    if ("saf".equals(prefs().getString("mode", "direct"))) {
                        open(openSaf(Uri.parse(saved)));
                    } else if (new File(saved).isDirectory() && hasAccess()) open(new VaultStore(new File(saved)));
                } catch (IOException | SecurityException e) {
                    // Permissão revogada ou pasta removida: a interface oferece escolher novamente.
                    store = null;
                    openError = e.getMessage();
                }
            }
        }
        handleShare(intent);
    }

    private DocumentVaultStore openSaf(Uri tree) throws IOException {
        return new DocumentVaultStore(new SafDocuments(getContext().getContentResolver(), tree), new File(getContext().getFilesDir(), "vault-transactions"));
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    // ---------- Cofre aberto ----------

    private void open(VaultFs next) {
        if (watcher != null) watcher.stop();
        store = next;
        openError = null;
        watcher = new VaultWatcher(next, (changed, deleted) -> {
            if (store != next) return;
            JSArray list = new JSArray();
            for (VaultStore.Entry e : changed) {
                JSObject change = new JSObject();
                change.put("type", "changed");
                change.put("entry", entryJson(e));
                list.put(change);
            }
            for (String path : deleted) {
                JSObject change = new JSObject();
                change.put("type", "deleted");
                change.put("path", path);
                list.put(change);
            }
            JSObject data = new JSObject();
            data.put("changes", list);
            notifyListeners("change", data);
        });
        watcher.start();
    }

    private boolean writable() {
        if (store == null) return false;
        if (testVault) return testWritable;
        Set<String> list = prefs().getStringSet("writable", new HashSet<>());
        return list.contains(store.identity());
    }

    private JSObject info() {
        JSObject out = new JSObject();
        if (store == null) {
            out.put("vault", JSONObject.NULL);
            return out;
        }
        JSObject vault = new JSObject();
        vault.put("name", store.name());
        vault.put("path", store.identity());
        vault.put("readOnly", !writable());
        vault.put("mode", store.mode());
        out.put("vault", vault);
        return out;
    }

    private VaultFs requireStore() throws VaultStore.VaultError {
        if (store == null) throw new VaultStore.VaultError("Nenhum cofre aberto. Escolha a pasta em Configurações.");
        return store;
    }

    private VaultFs writableStore() throws IOException {
        VaultFs s = requireStore();
        if (!writable()) throw new VaultStore.VaultError("Cofre em somente leitura. Libere a gravação em Configurações › Cofre.");
        dailyBackup(s);
        return s;
    }

    private static JSObject entryJson(VaultStore.Entry e) {
        JSObject o = new JSObject();
        o.put("path", e.path);
        o.put("size", e.size);
        o.put("mtime", e.mtime);
        if (e.uri != null) o.put("uri", e.uri);
        return o;
    }

    private void fail(PluginCall call, Exception e) {
        call.reject(e.getMessage() != null ? e.getMessage() : e.toString());
    }

    @PluginMethod
    public void current(PluginCall call) {
        if (openError != null) {
            call.reject(openError + " Escolha novamente a pasta em Configurações.");
            return;
        }
        call.resolve(info());
    }

    // ---------- Acesso aos arquivos e escolha da pasta ----------

    private boolean hasAccess() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) return Environment.isExternalStorageManager();
        return getPermissionState("storage") == PermissionState.GRANTED;
    }

    @PluginMethod
    public void access(PluginCall call) {
        JSObject out = new JSObject();
        out.put("granted", hasAccess());
        call.resolve(out);
    }

    @PluginMethod
    public void choose(PluginCall call) {
        pickMode = "choose";
        // O CI usa o seletor real e a permissão persistente. Os parâmetros de teste só valem no APK depurável.
        boolean debug = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (debug && Boolean.TRUE.equals(call.getBoolean("saf", false))) {
            pickSaf = true;
            pickFolder(call);
        } else withAccess(call);
    }

    @PluginMethod
    public void create(PluginCall call) {
        pickMode = "create";
        withAccess(call);
    }

    private void withAccess(PluginCall call) {
        pickSaf = !hasAccess() && prefs().getBoolean("preferSaf", false);
        if (pickSaf || hasAccess()) {
            pickFolder(call);
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
            try {
                startActivityForResult(call, intent, "accessResult");
            } catch (ActivityNotFoundException e) {
                startActivityForResult(call, new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION), "accessResult");
            }
        } else {
            requestPermissionForAlias("storage", call, "storageResult");
        }
    }

    @ActivityCallback
    private void accessResult(PluginCall call, ActivityResult result) {
        afterAccess(call);
    }

    @PermissionCallback
    private void storageResult(PluginCall call) {
        afterAccess(call);
    }

    private void afterAccess(PluginCall call) {
        if (hasAccess()) pickFolder(call);
        else getActivity().runOnUiThread(() -> new AlertDialog.Builder(getActivity())
            .setTitle("Abrir pelo seletor de pastas")
            .setMessage("Você pode abrir uma pasta local sem liberar o acesso a todos os arquivos. O app usará apenas a pasta escolhida; a leitura de cofres grandes pode levar mais tempo.")
            .setPositiveButton("Escolher pasta", (dialog, which) -> {
                prefs().edit().putBoolean("preferSaf", true).apply();
                pickSaf = true;
                pickFolder(call);
            })
            .setNegativeButton("Cancelar", (dialog, which) -> call.resolve(info()))
            .setOnCancelListener(dialog -> call.resolve(info()))
            .show());
    }

    private void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
            .putExtra(Intent.EXTRA_LOCAL_ONLY, true);
        boolean debug = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        String initial = debug ? call.getString("initialUri", null) : null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && initial != null) intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, Uri.parse(initial));
        startActivityForResult(call, intent, "folderResult");
    }

    @ActivityCallback
    private void folderResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.resolve(info());
            return;
        }
        Uri uri = result.getData().getData();
        String mode = pickSaf ? "saf" : prefs().getString("mode:" + uri, "direct");
        try {
            VaultFs selected;
            if ("saf".equals(mode)) {
                int flags = result.getData().getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                if ((flags & Intent.FLAG_GRANT_READ_URI_PERMISSION) == 0 || (flags & Intent.FLAG_GRANT_WRITE_URI_PERMISSION) == 0) {
                    throw new VaultStore.VaultError("Escolha uma pasta local com permissão de leitura e gravação.");
                }
                getContext().getContentResolver().takePersistableUriPermission(uri, flags);
                DocumentVaultStore documents = openSaf(uri);
                if (pickMode.equals("create")) documents.initialize();
                selected = documents;
            } else {
                String path = treeToPath(uri);
                if (path == null) throw new VaultStore.VaultError("Escolha uma pasta da memória interna ou do cartão.");
                File root = new File(path);
                if (!root.isDirectory()) throw new VaultStore.VaultError("A pasta escolhida não está acessível: " + path);
                if (pickMode.equals("create")) {
                    String[] names = root.list();
                    if (names != null) for (String name : names) if (!name.startsWith(".")) throw new VaultStore.VaultError("Escolha uma pasta vazia para o cofre novo.");
                    VaultStore.createVault(root);
                }
                selected = new VaultStore(root);
            }
            if (pickMode.equals("create")) {
                Set<String> list = new HashSet<>(prefs().getStringSet("writable", new HashSet<>()));
                list.add(selected.identity());
                prefs().edit().putStringSet("writable", list).apply();
            }
            testVault = false;
            prefs().edit().putString("path", selected.identity()).putString("mode", selected.mode()).putString("mode:" + uri, selected.mode()).apply();
            open(selected);
            call.resolve(info());
        } catch (IOException | SecurityException e) {
            fail(call, e);
        }
    }

    /** A pasta do seletor do sistema no disco: `primary:Documents/Cofre` → `/storage/emulated/0/Documents/Cofre`. */
    private static String treeToPath(Uri tree) {
        if (!"com.android.externalstorage.documents".equals(tree.getAuthority())) return null;
        String id = DocumentsContract.getTreeDocumentId(tree);
        int colon = id.indexOf(':');
        String volume = colon >= 0 ? id.substring(0, colon) : id;
        String relative = colon >= 0 ? id.substring(colon + 1) : "";
        File base = "primary".equalsIgnoreCase(volume) ? Environment.getExternalStorageDirectory() : new File("/storage/" + volume);
        return relative.isEmpty() ? base.getAbsolutePath() : new File(base, relative).getAbsolutePath();
    }

    @PluginMethod
    public void setWritable(PluginCall call) {
        try {
            VaultFs s = requireStore();
            boolean on = Boolean.TRUE.equals(call.getBoolean("writable", false));
            if (testVault) {
                testWritable = on;
            } else {
                // Liberar a gravação faz um backup antes, para poder voltar atrás.
                if (on) s.backup(backupFolder(s), 15);
                Set<String> list = new HashSet<>(prefs().getStringSet("writable", new HashSet<>()));
                if (on) list.add(s.identity());
                else list.remove(s.identity());
                prefs().edit().putStringSet("writable", list).apply();
            }
            call.resolve(info());
        } catch (IOException e) {
            fail(call, e);
        }
    }

    // ---------- Arquivos ----------

    @PluginMethod
    public void list(PluginCall call) {
        try {
            JSArray out = new JSArray();
            for (VaultStore.Entry e : requireStore().list(call.getString("prefix", ""), false)) out.put(entryJson(e));
            JSObject result = new JSObject();
            result.put("entries", out);
            call.resolve(result);
        } catch (IOException e) {
            fail(call, e);
        }
    }

    private static List<String> strings(JSArray array) throws JSONException {
        List<String> out = new ArrayList<>();
        if (array == null) return out;
        for (int i = 0; i < array.length(); i++) out.add(array.getString(i));
        return out;
    }

    @PluginMethod
    public void read(PluginCall call) {
        try {
            JSObject texts = new JSObject();
            for (Map.Entry<String, String> e : requireStore().readTexts(strings(call.getArray("paths"))).entrySet()) texts.put(e.getKey(), e.getValue());
            JSObject result = new JSObject();
            result.put("texts", texts);
            call.resolve(result);
        } catch (IOException | JSONException e) {
            fail(call, e);
        }
    }

    /** `expected`: ausente = grava por cima; `null` = só cria; `{mtime,size}` = só se for a versão lida. */
    private static VaultStore.Version expectedOf(PluginCall call) {
        JSObject expected = call.getObject("expected", null);
        if (expected == null) return null;
        return new VaultStore.Version(expected.optLong("size", -1), expected.optDouble("mtime", -1));
    }

    private static boolean createOnly(PluginCall call) {
        return call.getData().has("expected") && call.getData().isNull("expected");
    }

    @PluginMethod
    public void write(PluginCall call) {
        try {
            VaultFs s = writableStore();
            String path = call.getString("path");
            VaultStore.Entry entry = s.writeText(path, call.getString("content", ""), expectedOf(call), createOnly(call));
            if (watcher != null) watcher.remember(entry);
            call.resolve(entryJson(entry));
        } catch (IOException e) {
            fail(call, e);
        }
    }

    @PluginMethod
    public void readBinary(PluginCall call) {
        try {
            byte[] bytes = requireStore().readBinary(call.getString("path"));
            JSObject result = new JSObject();
            result.put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP));
            call.resolve(result);
        } catch (IOException e) {
            fail(call, e);
        }
    }

    @PluginMethod
    public void writeBinary(PluginCall call) {
        try {
            VaultFs s = writableStore();
            byte[] bytes = Base64.decode(call.getString("base64", ""), Base64.DEFAULT);
            VaultStore.Entry entry = s.writeBinary(call.getString("path"), bytes, expectedOf(call), createOnly(call));
            if (watcher != null) watcher.remember(entry);
            call.resolve(entryJson(entry));
        } catch (IOException | IllegalArgumentException e) {
            fail(call, e);
        }
    }

    @PluginMethod
    public void createFolder(PluginCall call) {
        try {
            writableStore().createFolder(call.getString("path"));
            call.resolve();
        } catch (IOException e) {
            fail(call, e);
        }
    }

    @PluginMethod
    public void rename(PluginCall call) {
        try {
            VaultFs s = writableStore();
            String from = call.getString("from");
            String to = call.getString("to");
            if (watcher != null) watcher.forget(from);
            s.rename(from, to);
            try {
                if (watcher != null) watcher.remember(s.entry(to));
            } catch (IOException ignored) {
                // Pasta movida: o observador avisa os arquivos.
            }
            call.resolve();
        } catch (IOException e) {
            fail(call, e);
        }
    }

    @PluginMethod
    public void trash(PluginCall call) {
        try {
            VaultFs s = writableStore();
            String path = call.getString("path");
            if (watcher != null) watcher.forget(path);
            s.trash(path);
            call.resolve();
        } catch (IOException e) {
            fail(call, e);
        }
    }

    @PluginMethod
    public void listTrash(PluginCall call) {
        try {
            JSArray out = new JSArray();
            for (VaultStore.Entry e : requireStore().listTrash()) out.put(entryJson(e));
            JSObject result = new JSObject();
            result.put("entries", out);
            call.resolve(result);
        } catch (IOException e) {
            fail(call, e);
        }
    }

    @PluginMethod
    public void restoreTrash(PluginCall call) {
        try {
            VaultStore.Entry entry = writableStore().restoreTrash(call.getString("path"), call.getString("target"));
            if (watcher != null) watcher.remember(entry);
            call.resolve(entryJson(entry));
        } catch (IOException e) {
            fail(call, e);
        }
    }

    @PluginMethod
    public void installSnippet(PluginCall call) {
        try {
            String path = writableStore().installSnippet(call.getString("css", ""));
            JSObject result = new JSObject();
            result.put("path", path);
            call.resolve(result);
        } catch (IOException e) {
            fail(call, e);
        }
    }

    // ---------- Backups ----------

    private File backupFolder(VaultFs s) throws IOException {
        File base = getContext().getExternalFilesDir("backups");
        if (base == null) base = new File(getContext().getFilesDir(), "backups");
        return s instanceof VaultStore ? VaultStore.backupFolder(base, ((VaultStore) s).root()) : VaultStore.backupFolder(base, s.identity());
    }

    /** Backup automático antes da primeira gravação de cada dia. */
    private void dailyBackup(VaultFs s) throws IOException {
        if (testVault) return;
        File folder = backupFolder(s);
        List<VaultStore.Backup> all = VaultStore.listBackups(folder);
        if (all.isEmpty() || System.currentTimeMillis() - all.get(0).createdAt > DAY_MS) s.backup(folder, 15);
    }

    private static JSObject backupJson(VaultStore.Backup b) {
        JSObject o = new JSObject();
        o.put("id", b.id);
        o.put("createdAt", b.createdAt);
        o.put("files", b.files);
        o.put("size", b.size);
        return o;
    }

    @PluginMethod
    public void backup(PluginCall call) {
        try {
            VaultFs s = requireStore();
            call.resolve(backupJson(s.backup(backupFolder(s), 15)));
        } catch (IOException e) {
            fail(call, e);
        }
    }

    @PluginMethod
    public void listBackups(PluginCall call) {
        try {
            JSArray out = new JSArray();
            if (store != null) for (VaultStore.Backup b : VaultStore.listBackups(backupFolder(store))) out.put(backupJson(b));
            JSObject result = new JSObject();
            result.put("backups", out);
            call.resolve(result);
        } catch (IOException e) {
            fail(call, e);
        }
    }

    /** A pasta dos backups (o Android não deixa abrir a pasta do app num gerenciador; a tela mostra o caminho). */
    @PluginMethod
    public void backupsPath(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("path", backupFolder(requireStore()).getAbsolutePath());
            call.resolve(result);
        } catch (IOException e) {
            fail(call, e);
        }
    }

    // ---------- Abrir e salvar fora do cofre ----------

    private static final Set<String> OPENABLE = new HashSet<>(java.util.Arrays.asList(
        "png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "bmp", "mp3", "wav", "ogg", "m4a", "flac", "opus", "3gp", "mp4", "webm", "ogv", "mov", "mkv", "pdf"
    ));

    /** Abre um anexo (imagem, áudio, vídeo, PDF) no app padrão do Android; nunca outros tipos. */
    @PluginMethod
    public void openFile(PluginCall call) {
        try {
            String path = call.getString("path", "");
            String ext = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1).toLowerCase(java.util.Locale.ROOT) : "";
            for (String part : path.split("/")) if (part.startsWith(".")) throw new VaultStore.VaultError("“" + path + "” não é um anexo que o app abre.");
            if (!OPENABLE.contains(ext)) throw new VaultStore.VaultError("“" + path + "” não é um anexo que o app abre.");
            String source = requireStore().source(path);
            Uri uri = source.startsWith("content://") ? Uri.parse(source) : FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", new File(source));
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            Intent intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime != null ? mime : "*/*").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(intent, "Abrir com"));
            call.resolve();
        } catch (IOException | IllegalArgumentException | ActivityNotFoundException e) {
            fail(call, e);
        }
    }

    /** Salva bytes onde o usuário escolher (exportar .ics, PDF, EPUB…); devolve o nome, ou `null` se cancelou. */
    @PluginMethod
    public void saveAs(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(call.getString("mime", "application/octet-stream"))
            .putExtra(Intent.EXTRA_TITLE, call.getString("name", "arquivo"));
        startActivityForResult(call, intent, "saveResult");
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        JSObject out = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            out.put("name", JSONObject.NULL);
            call.resolve(out);
            return;
        }
        Uri uri = result.getData().getData();
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (stream == null) throw new IOException("O Android não deixou gravar o arquivo.");
            stream.write(Base64.decode(call.getString("base64", ""), Base64.DEFAULT));
            out.put("name", displayName(getContext().getContentResolver(), uri, call.getString("name", "arquivo")));
            call.resolve(out);
        } catch (IOException | IllegalArgumentException e) {
            fail(call, e);
        }
    }

    private static String displayName(ContentResolver resolver, Uri uri, String fallback) {
        try (Cursor cursor = resolver.query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) return cursor.getString(0);
        } catch (RuntimeException ignored) {
            // Alguns provedores não informam o nome.
        }
        return fallback;
    }

    @PluginMethod
    public void appVersion(PluginCall call) {
        JSObject out = new JSObject();
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            out.put("version", info.versionName);
        } catch (Exception e) {
            out.put("version", "");
        }
        call.resolve(out);
    }

    // ---------- "Compartilhar com" e o widget ----------

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        handleShare(intent);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        // O Android pode ter pausado os avisos de arquivo com o app em segundo plano.
        if (watcher != null) watcher.schedule();
    }

    /** Texto, link ou imagem compartilhado de outro app (vira nota na interface); ou um toque no widget. */
    private void handleShare(Intent intent) {
        if (intent == null) return;
        String route = intent.getStringExtra("runasRoute");
        if (route != null) {
            JSObject data = new JSObject();
            data.put("route", route);
            notifyListeners("open", data, true);
            intent.removeExtra("runasRoute");
        }
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) return;
        JSObject data = new JSObject();
        data.put("text", intent.getStringExtra(Intent.EXTRA_TEXT));
        data.put("subject", intent.getStringExtra(Intent.EXTRA_SUBJECT));
        JSArray files = new JSArray();
        List<Uri> uris = new ArrayList<>();
        if (Intent.ACTION_SEND.equals(action)) {
            Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (uri != null) uris.add(uri);
        } else {
            ArrayList<Uri> list = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (list != null) uris.addAll(list);
        }
        ContentResolver resolver = getContext().getContentResolver();
        for (Uri uri : uris) {
            try (InputStream in = resolver.openInputStream(uri)) {
                if (in == null) continue;
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[64 * 1024];
                int n;
                long total = 0;
                while ((n = in.read(buffer)) > 0) {
                    total += n;
                    if (total > MAX_SHARED_BYTES) throw new IOException("Arquivo compartilhado grande demais.");
                    out.write(buffer, 0, n);
                }
                JSObject file = new JSObject();
                file.put("name", displayName(resolver, uri, "compartilhado"));
                file.put("mime", resolver.getType(uri));
                file.put("base64", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
                files.put(file);
            } catch (IOException | SecurityException ignored) {
                // Um arquivo que não deu para ler fica de fora; o texto continua.
            }
        }
        data.put("files", files);
        notifyListeners("share", data, true);
        // Não reprocessa ao recriar a atividade (girar a tela).
        intent.setAction(null);
    }

    /** Os próximos eventos para o widget da Agenda (a interface manda depois de cada mudança). */
    @PluginMethod
    public void setAgendaWidget(PluginCall call) {
        try {
            JSArray items = call.getArray("items", new JSArray());
            getContext().getSharedPreferences(AgendaWidget.PREFS, Context.MODE_PRIVATE).edit().putString("items", items.toString()).apply();
            AgendaWidget.updateAll(getContext());
            call.resolve();
        } catch (RuntimeException e) {
            fail(call, e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (watcher != null) watcher.stop();
        super.handleOnDestroy();
    }
}
