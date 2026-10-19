package dev.runas.codex.vault;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.function.LongSupplier;

/** Um scan pode ter lido a primeira gravação enquanto a segunda termina. Ambas continuam sendo do app. */
final class VaultOwnWrites {
    private static final long TTL_MS = 5000;
    private final LongSupplier clock;
    private final Map<String, List<long[]>> recent = new HashMap<>();

    VaultOwnWrites() { this(System::currentTimeMillis); }
    VaultOwnWrites(LongSupplier clock) { this.clock = clock; }

    private void prune() {
        long now = clock.getAsLong();
        for (Iterator<Map.Entry<String, List<long[]>>> it = recent.entrySet().iterator(); it.hasNext();) {
            List<long[]> versions = it.next().getValue();
            versions.removeIf(stamp -> now - stamp[2] > TTL_MS);
            if (versions.isEmpty()) it.remove();
        }
    }

    private void add(String path, long size, long mtime) {
        prune();
        recent.computeIfAbsent(path, key -> new ArrayList<>()).add(new long[] { size, mtime, clock.getAsLong() });
    }

    synchronized void remember(VaultStore.Entry entry) { add(entry.path, entry.size, entry.mtime); }
    synchronized void forget(String path) { add(path, -1, -1); }

    synchronized boolean contains(VaultStore.Entry entry) {
        prune();
        List<long[]> versions = recent.get(entry.path);
        if (versions == null) return false;
        for (long[] stamp : versions) if (stamp[1] >= 0 && stamp[0] == entry.size && Math.abs(stamp[1] - entry.mtime) < 2) return true;
        return false;
    }

    synchronized boolean deleted(String path) {
        prune();
        List<long[]> versions = recent.get(path);
        return versions != null && versions.get(versions.size() - 1)[1] == -1;
    }
}
