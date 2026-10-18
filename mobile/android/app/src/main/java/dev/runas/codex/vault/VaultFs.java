package dev.runas.codex.vault;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;

/** As operações do cofre usadas pela ponte, tanto no disco quanto numa árvore do SAF. */
public interface VaultFs {
    String identity();
    String name();
    String mode();
    String source(String path) throws IOException;
    List<VaultStore.Entry> list(String prefix, boolean includeHidden) throws IOException;
    VaultStore.Entry entry(String path) throws IOException;
    Map<String, String> readTexts(List<String> paths) throws IOException;
    byte[] readBinary(String path) throws IOException;
    VaultStore.Entry writeText(String path, String content, VaultStore.Version expected, boolean createOnly) throws IOException;
    VaultStore.Entry writeBinary(String path, byte[] bytes, VaultStore.Version expected, boolean createOnly) throws IOException;
    void createFolder(String path) throws IOException;
    void rename(String from, String to) throws IOException;
    String trash(String path) throws IOException;
    List<VaultStore.Entry> listTrash() throws IOException;
    VaultStore.Entry restoreTrash(String path, String target) throws IOException;
    String installSnippet(String css) throws IOException;
    VaultStore.Backup backup(File folder, int keep) throws IOException;
}
