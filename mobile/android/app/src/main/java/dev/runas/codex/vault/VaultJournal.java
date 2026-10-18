package dev.runas.codex.vault;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Properties;

/** Registro privado e durável da troca SAF. Permite recuperar uma operação interrompida entre renomeações. */
final class VaultJournal {
    private final File file;

    VaultJournal(File base, String identity) throws IOException {
        File folder = VaultStore.backupFolder(base, identity);
        if (!folder.isDirectory() && !folder.mkdirs()) throw new IOException("Não deu para preparar a recuperação do cofre.");
        file = new File(folder, "pending.properties");
    }

    Properties read() throws IOException {
        Properties data = new Properties();
        if (file.exists()) try (FileInputStream in = new FileInputStream(file)) { data.load(in); }
        return data;
    }

    void begin(String kind, String from, String to, String token) throws IOException {
        Properties data = new Properties();
        data.setProperty("kind", kind); data.setProperty("from", from); data.setProperty("to", to); data.setProperty("token", token);
        File temp = new File(file.getParentFile(), "pending.tmp");
        try {
            try (FileOutputStream out = new FileOutputStream(temp)) { data.store(out, "Recuperacao do cofre SAF"); out.getFD().sync(); }
            if (!temp.renameTo(file)) throw new IOException("Não deu para registrar a recuperação da gravação.");
        } finally { if (temp.exists()) temp.delete(); }
    }

    void finish() { if (file.exists()) file.delete(); }
}
