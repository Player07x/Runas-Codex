package dev.runas.codex.vault;

import android.os.FileObserver;
import android.os.Handler;
import android.os.HandlerThread;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Observa o cofre e avisa as mudanças feitas fora do app (Obsidian, Syncthing…) em lotes. Um FileObserver por pasta
 * (o do Android não é recursivo) só dispara uma releitura; a releitura compara com a última fotografia (tamanho e
 * data). Ao voltar para o app, também relê (o Android pode ter pausado os avisos). O que o app acabou de gravar não
 * volta como mudança.
 */
public final class VaultWatcher {

    public interface Listener {
        void onChanges(List<VaultStore.Entry> changed, List<String> deleted);
    }

    private static final int MASK = FileObserver.CREATE | FileObserver.DELETE | FileObserver.MODIFY | FileObserver.MOVED_FROM | FileObserver.MOVED_TO | FileObserver.CLOSE_WRITE | FileObserver.DELETE_SELF;
    private static final long DELAY_MS = 400;

    private final VaultFs store;
    private final Listener listener;
    private final HandlerThread thread = new HandlerThread("RunasVaultWatcher");
    private final Handler handler;
    private final List<FileObserver> observers = new ArrayList<>();
    private final Map<String, long[]> snapshot = new HashMap<>();
    private final VaultOwnWrites own = new VaultOwnWrites();
    private final Runnable rescan = this::rescan;
    private volatile boolean stopped;

    public VaultWatcher(VaultFs store, Listener listener) {
        this.store = store;
        this.listener = listener;
        thread.start();
        handler = new Handler(thread.getLooper());
    }

    public void start() {
        handler.post(() -> {
            try {
                for (VaultStore.Entry e : store.list("", false)) snapshot.put(e.path, new long[] { e.size, e.mtime });
            } catch (IOException ignored) {
                // Sem fotografia: a primeira releitura avisa tudo como novo, o que o app trata como "mudou".
            }
            observeFolders();
        });
    }

    @SuppressWarnings("deprecation")
    private void observeFolders() {
        for (FileObserver o : observers) o.stopWatching();
        observers.clear();
        if (stopped) return;
        // O SAF só relê ao voltar para o app; os documentos não são caminhos para FileObserver.
        if (!(store instanceof VaultStore)) return;
        try {
            for (File folder : ((VaultStore) store).folders()) {
                FileObserver observer = new FileObserver(folder.getAbsolutePath(), MASK) {
                    @Override
                    public void onEvent(int event, String path) {
                        if (path != null && path.startsWith(".")) return;
                        schedule();
                    }
                };
                observer.startWatching();
                observers.add(observer);
            }
        } catch (IOException ignored) {
            // A pasta do cofre sumiu: o app avisa ao tentar ler.
        }
    }

    /** Uma releitura daqui a pouco (junta os avisos de uma gravação grande). */
    public void schedule() {
        handler.removeCallbacks(rescan);
        handler.postDelayed(rescan, DELAY_MS);
    }

    /** Registra uma gravação do próprio app, para não avisá-la como mudança externa. */
    public void remember(VaultStore.Entry entry) {
        own.remember(entry);
    }

    /** Esquece um caminho que o app removeu ou moveu. */
    public void forget(String path) {
        own.forget(path);
    }

    private void rescan() {
        if (stopped) return;
        List<VaultStore.Entry> current;
        try {
            current = store.list("", false);
        } catch (IOException e) {
            return;
        }
        List<VaultStore.Entry> changed = new ArrayList<>();
        List<String> deleted = new ArrayList<>();
        Map<String, long[]> next = new HashMap<>();
        boolean newFolders = false;
        for (VaultStore.Entry e : current) {
            next.put(e.path, new long[] { e.size, e.mtime });
            long[] before = snapshot.get(e.path);
            if (before != null && before[0] == e.size && Math.abs(before[1] - e.mtime) < 2) continue;
            if (before == null && e.path.contains("/")) newFolders = true;
            if (own.contains(e)) continue;
            changed.add(e);
        }
        for (String path : snapshot.keySet()) {
            if (next.containsKey(path)) continue;
            if (own.deleted(path)) continue;
            deleted.add(path);
        }
        snapshot.clear();
        snapshot.putAll(next);
        // Pasta nova: passa a observá-la também.
        if (newFolders || !deleted.isEmpty()) observeFolders();
        if (!changed.isEmpty() || !deleted.isEmpty()) listener.onChanges(changed, deleted);
    }

    public void stop() {
        stopped = true;
        handler.removeCallbacks(rescan);
        handler.post(() -> {
            for (FileObserver o : observers) o.stopWatching();
            observers.clear();
            thread.quitSafely();
        });
    }
}
