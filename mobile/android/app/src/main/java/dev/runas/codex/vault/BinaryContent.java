package dev.runas.codex.vault;

import java.io.*;

/** Fonte reabrível: comparar e publicar um binário não exige outra cópia dele na memória nativa. */
final class BinaryContent {
    static final long MAX_SIZE = 512L * 1024 * 1024;
    interface Source { InputStream open() throws IOException; }
    private final long size;
    private final Source source;
    private BinaryContent(long size,Source source) { this.size=size;this.source=source; }
    static BinaryContent file(File file) { return source(file.length(),()->new FileInputStream(file)); }
    static BinaryContent bytes(byte[] bytes) { return source(bytes.length,()->new ByteArrayInputStream(bytes)); }
    static BinaryContent source(long size,Source source) { return new BinaryContent(size,source); }
    long size() { return size; }
    InputStream open() throws IOException { return source.open(); }
    boolean same(InputStream existing) throws IOException {
        try (InputStream a = existing; InputStream b = open()) {
            byte[] left = new byte[65536], right = new byte[65536];
            while (true) {
                int n = readChunk(a, left), m = readChunk(b, right);
                if (n != m) return false;
                if (n == 0) return true;
                for (int i = 0; i < n; i++) if (left[i] != right[i]) return false;
            }
        }
    }
    static int readChunk(InputStream in, byte[] buffer) throws IOException {
        int at = 0;
        while (at < buffer.length) { int n = in.read(buffer, at, buffer.length - at); if (n < 0) break; if (n == 0) throw new IOException("A leitura do arquivo não avançou."); at += n; }
        return at;
    }
    static void copy(InputStream in, OutputStream out, long size) throws IOException {
        byte[] buffer = new byte[65536]; long total = 0; int n;
        while ((n = in.read(buffer)) != -1) {
            if (n == 0) throw new IOException("A leitura do arquivo não avançou.");
            total += n;
            if (total > size) throw new IOException("O arquivo mudou de tamanho durante a gravação.");
            out.write(buffer, 0, n);
        }
        if (total != size) throw new IOException("O arquivo terminou antes do tamanho informado.");
    }
}
