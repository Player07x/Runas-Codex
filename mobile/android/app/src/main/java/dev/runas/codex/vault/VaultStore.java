package dev.runas.codex.vault;

import android.annotation.SuppressLint;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * O cofre no disco do Android, com a mesma gravação segura do desktop (desktop/src/main/vault.ts):
 * - nada fora da pasta do cofre (caminho absoluto, "..", link simbólico para fora);
 * - nada gravado em pastas ou arquivos com ponto (.obsidian, .trash…), a não ser o snippet;
 * - grava com a versão lida (tamanho e data): se o arquivo mudou fora do app, recusa; `null` só cria;
 * - conteúdo igual ao do disco não é regravado;
 * - grava num temporário e troca de uma vez (sem arquivo pela metade);
 * - "apagar" manda para a lixeira do cofre (.trash, a mesma do Obsidian).
 *
 * Java puro (só uma anotação do Android), para os testes de unidade rodarem na JVM.
 */
public final class VaultStore implements VaultFs {

    /** Erro com mensagem para o usuário (chega à interface como está). */
    public static final class VaultError extends IOException {
        public VaultError(String message) {
            super(message);
        }
    }

    /** Um arquivo do cofre: caminho com "/", tamanho e data de modificação (ms). */
    public static final class Entry {
        public final String path;
        public final long size;
        public final long mtime;
        public final String uri;

        public Entry(String path, long size, long mtime) {
            this(path, size, mtime, null);
        }

        public Entry(String path, long size, long mtime, String uri) {
            this.path = path;
            this.size = size;
            this.mtime = mtime;
            this.uri = uri;
        }
    }

    /** A versão que o app leu (para recusar se o arquivo mudou). */
    public static final class Version {
        public final long size;
        public final double mtime;

        public Version(long size, double mtime) {
            this.size = size;
            this.mtime = mtime;
        }
    }

    public static final long MAX_BINARY_SIZE = 50L * 1024 * 1024;
    public static final List<String> SPACE_FOLDERS = Arrays.asList("Notas", "Agenda", "Wikis", "Campanhas", "Livros", "Mesas");
    public static final String SNIPPET_PATH = ".obsidian/snippets/runas-codex.css";
    private static final Pattern BACKUP_TEXT = Pattern.compile("\\.(md|canvas|base)$", Pattern.CASE_INSENSITIVE);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final File root;

    public VaultStore(File root) {
        this.root = root;
    }

    public File root() {
        return root;
    }

    public String identity() { return root.getAbsolutePath(); }
    public String name() { return root.getName(); }
    public String mode() { return "direct"; }
    public String source(String path) throws IOException { return resolveInside(path).getAbsolutePath(); }

    // ---------- Caminhos ----------

    static List<String> split(String path) throws VaultError {
        if (path == null || path.isEmpty() || path.indexOf('\0') >= 0) throw new VaultError("Caminho inválido.");
        if (path.startsWith("/") || path.startsWith("\\") || path.matches("^[a-zA-Z]:.*")) throw new VaultError("Caminho fora do cofre: " + path);
        List<String> parts = new ArrayList<>();
        for (String part : path.split("[\\\\/]")) {
            if (part.equals("..")) throw new VaultError("Caminho fora do cofre: " + path);
            if (!part.isEmpty() && !part.equals(".")) parts.add(part);
        }
        if (parts.isEmpty()) throw new VaultError("Caminho inválido.");
        return parts;
    }

    private String realRoot() throws IOException {
        return root.getCanonicalPath();
    }

    private static boolean inside(String realRoot, String real) {
        return real.equals(realRoot) || real.startsWith(realRoot + File.separator);
    }

    private File join(List<String> parts) {
        File file = root;
        for (String part : parts) file = new File(file, part);
        return file;
    }

    /** Arquivo existente dentro do cofre (sem sair por link simbólico). */
    public File resolveInside(String path) throws IOException {
        List<String> parts = split(path);
        File file = join(parts);
        if (!file.exists()) throw new VaultError("Arquivo não encontrado no cofre: " + path);
        if (!inside(realRoot(), file.getCanonicalPath())) throw new VaultError("Caminho fora do cofre: " + path);
        return file;
    }

    /** Caminho para criar ou gravar: além das regras de leitura, nada oculto e nada através de link simbólico. */
    public File resolveForWrite(String path) throws IOException {
        List<String> parts = split(path);
        for (String part : parts) if (part.startsWith(".")) throw new VaultError("O app não grava em pastas ou arquivos ocultos: " + path);
        String realRoot = realRoot();
        File full = join(parts);
        File ancestor = full.getParentFile();
        while (ancestor != null && !ancestor.exists()) ancestor = ancestor.getParentFile();
        if (ancestor == null || !inside(realRoot, ancestor.getCanonicalPath())) throw new VaultError("Caminho fora do cofre: " + path);
        if (full.exists() && isSymlink(full)) throw new VaultError("O app não grava através de links simbólicos: " + path);
        return full;
    }

    private static boolean nioAvailable = true;

    /** Link simbólico? (`lstat` pelo java.nio, do Android 8 em diante; antes, comparando o caminho canônico). */
    @SuppressLint("NewApi") // No Android 7, a chamada falha (NoClassDefFoundError) e o caminho canônico assume.
    private static boolean isSymlink(File file) {
        if (nioAvailable) {
            try {
                return java.nio.file.Files.isSymbolicLink(file.toPath());
            } catch (Throwable e) {
                nioAvailable = false;
            }
        }
        try {
            File parent = file.getParentFile();
            if (parent == null) return false;
            File canonicalParent = parent.getCanonicalFile();
            File same = new File(canonicalParent, file.getName());
            return !same.getCanonicalFile().equals(same.getAbsoluteFile());
        } catch (IOException e) {
            return true;
        }
    }

    // ---------- Leitura ----------

    /** Lista os arquivos (pastas com ponto e links simbólicos ficam de fora, como no desktop). */
    public List<Entry> list(String prefix, boolean includeHidden) throws IOException {
        List<Entry> out = new ArrayList<>();
        walk(root.getCanonicalFile(), "", includeHidden, out);
        List<Entry> filtered = new ArrayList<>();
        String p = prefix == null ? "" : prefix;
        for (Entry e : out) if (e.path.startsWith(p)) filtered.add(e);
        Collections.sort(filtered, (a, b) -> a.path.compareTo(b.path));
        return filtered;
    }

    private static void walk(File dir, String rel, boolean includeHidden, List<Entry> out) {
        File[] items = dir.listFiles();
        if (items == null) return;
        for (File item : items) {
            String name = item.getName();
            if (name.startsWith(".") && !includeHidden) continue;
            if (isSymlink(item)) continue;
            String path = rel.isEmpty() ? name : rel + "/" + name;
            if (item.isDirectory()) walk(item, path, includeHidden, out);
            else if (item.isFile()) out.add(new Entry(path, item.length(), item.lastModified()));
        }
    }

    /** As pastas visíveis do cofre (para o observador de mudanças). */
    public List<File> folders() throws IOException {
        List<File> out = new ArrayList<>();
        collectFolders(root.getCanonicalFile(), out);
        return out;
    }

    private static void collectFolders(File dir, List<File> out) {
        out.add(dir);
        File[] items = dir.listFiles();
        if (items == null) return;
        for (File item : items) if (item.isDirectory() && !item.getName().startsWith(".") && !isSymlink(item)) collectFolders(item, out);
    }

    public Entry entry(String path) throws IOException {
        File file = resolveInside(path);
        return new Entry(path, file.length(), file.lastModified());
    }

    /** Lê vários textos de uma vez; os que sumiram ficam fora do resultado. */
    public Map<String, String> readTexts(List<String> paths) throws IOException {
        Map<String, String> out = new LinkedHashMap<>();
        for (String path : paths) {
            File file;
            try {
                file = resolveInside(path);
            } catch (VaultError e) {
                if (e.getMessage() != null && e.getMessage().startsWith("Arquivo não encontrado")) continue;
                throw e;
            }
            out.put(path, new String(readAll(file), StandardCharsets.UTF_8));
        }
        return out;
    }

    public byte[] readBinary(String path) throws IOException {
        File file = resolveInside(path);
        if (file.length() > MAX_BINARY_SIZE) throw new VaultError("“" + path + "” passa de " + (MAX_BINARY_SIZE / 1024 / 1024) + " MB.");
        return readAll(file);
    }

    static byte[] readAll(File file) throws IOException {
        try (InputStream in = new FileInputStream(file); ByteArrayOutputStream out = new ByteArrayOutputStream((int) Math.max(32, file.length()))) {
            byte[] buffer = new byte[64 * 1024];
            int n;
            while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
            return out.toByteArray();
        }
    }

    // ---------- Gravação ----------

    public static boolean sameVersion(Entry current, Version expected) {
        return current.size == expected.size && Math.abs(current.mtime - expected.mtime) < 2;
    }

    /**
     * Grava com segurança. `expected` = versão lida pelo app; `createOnly` = só cria (recusa se já existir); sem os dois,
     * grava por cima (como o desktop sem versão).
     */
    public Entry write(String path, byte[] content, Version expected, boolean createOnly) throws IOException {
        File full = resolveForWrite(path);
        Entry current = full.isFile() ? new Entry(path, full.length(), full.lastModified()) : null;
        if (createOnly && current != null) throw new VaultError("Já existe “" + path + "”.");
        if (expected != null && (current == null || !sameVersion(current, expected))) {
            throw new VaultError("“" + path + "” mudou fora do app (por exemplo, no Obsidian). Recarregue antes de gravar.");
        }
        if (current != null && current.size == content.length && Arrays.equals(readAll(full), content)) return current;
        File folder = full.getParentFile();
        if (folder != null && !folder.isDirectory() && !folder.mkdirs()) throw new VaultError("Não deu para criar a pasta de “" + path + "”.");
        File temp = new File(folder, "." + full.getName() + "." + randomHex() + ".runas-tmp");
        try {
            try (FileOutputStream out = new FileOutputStream(temp)) {
                out.write(content);
                out.getFD().sync();
            }
            if (!temp.renameTo(full)) throw new VaultError("Não deu para gravar “" + path + "”.");
        } finally {
            if (temp.exists() && !temp.delete()) temp.deleteOnExit();
        }
        return new Entry(path, full.length(), full.lastModified());
    }

    public Entry writeText(String path, String content, Version expected, boolean createOnly) throws IOException {
        return write(path, content.getBytes(StandardCharsets.UTF_8), expected, createOnly);
    }

    public Entry writeBinary(String path, byte[] bytes, Version expected, boolean createOnly) throws IOException {
        if (bytes.length > MAX_BINARY_SIZE) throw new VaultError("“" + path + "” passa de " + (MAX_BINARY_SIZE / 1024 / 1024) + " MB.");
        return write(path, bytes, expected, createOnly);
    }

    public void createFolder(String path) throws IOException {
        File folder = resolveForWrite(path);
        if (!folder.isDirectory() && !folder.mkdirs()) throw new VaultError("Não deu para criar a pasta “" + path + "”.");
    }

    private static String fold(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
    }

    /** Renomeia ou move arquivo ou pasta; trocar só maiúsculas passa por um nome temporário. */
    public void rename(String from, String to) throws IOException {
        for (String part : split(from)) if (part.startsWith(".")) throw new VaultError("O app não mexe em arquivos ocultos: " + from);
        File source = resolveInside(from);
        File target = resolveForWrite(to);
        boolean caseOnly = fold(source.getAbsolutePath()).equals(fold(target.getAbsolutePath())) && !source.getAbsolutePath().equals(target.getAbsolutePath());
        if (target.exists() && !caseOnly) throw new VaultError("Já existe “" + to + "”.");
        File folder = target.getParentFile();
        if (folder != null && !folder.isDirectory() && !folder.mkdirs()) throw new VaultError("Não deu para criar a pasta de “" + to + "”.");
        if (caseOnly) {
            File temp = new File(target.getAbsolutePath() + "." + randomHex() + ".runas-tmp");
            if (!source.renameTo(temp) || !temp.renameTo(target)) throw new VaultError("Não deu para renomear “" + from + "”.");
        } else if (!source.renameTo(target)) throw new VaultError("Não deu para mover “" + from + "” para “" + to + "”.");
    }

    /** Manda para a lixeira do cofre; devolve o caminho lá dentro. */
    public String trash(String path) throws IOException {
        File source = resolveInside(path);
        File trash = new File(root.getCanonicalFile(), ".trash");
        if (!trash.isDirectory() && !trash.mkdirs()) throw new VaultError("Não deu para criar a lixeira do cofre.");
        String name = source.getName();
        int dot = source.isFile() ? name.lastIndexOf('.') : -1;
        String stem = dot > 0 ? name.substring(0, dot) : name;
        String ext = dot > 0 ? name.substring(dot) : "";
        for (int n = 0; ; n++) {
            String candidate = n == 0 ? stem + ext : stem + " " + n + ext;
            File target = new File(trash, candidate);
            if (!target.exists()) {
                if (!source.renameTo(target)) throw new VaultError("Não deu para mandar “" + path + "” para a lixeira.");
                return ".trash/" + candidate;
            }
        }
    }

    /** Arquivos da lixeira, os mais recentes primeiro. */
    public List<Entry> listTrash() throws IOException {
        File trash = new File(root.getCanonicalFile(), ".trash");
        if (!trash.isDirectory() || isSymlink(trash)) return new ArrayList<>();
        List<Entry> out = new ArrayList<>();
        walk(trash.getCanonicalFile(), "", true, out);
        List<Entry> prefixed = new ArrayList<>();
        for (Entry e : out) prefixed.add(new Entry(".trash/" + e.path, e.size, e.mtime));
        Collections.sort(prefixed, (a, b) -> Long.compare(b.mtime, a.mtime));
        return prefixed;
    }

    /** Devolve um arquivo da lixeira para `target` (nunca substitui um que existe). */
    public Entry restoreTrash(String path, String target) throws IOException {
        List<String> parts = split(path);
        if (!parts.get(0).equals(".trash") || parts.size() < 2) throw new VaultError("Caminho de lixeira inválido.");
        File source = resolveInside(path);
        String trashRoot = new File(root.getCanonicalFile(), ".trash").getCanonicalPath();
        if (!source.getCanonicalPath().startsWith(trashRoot + File.separator) || !source.isFile()) throw new VaultError("Escolha um arquivo da lixeira.");
        Entry entry = write(target, readAll(source), null, true);
        if (!source.delete()) throw new VaultError("O arquivo voltou, mas não saiu da lixeira.");
        return entry;
    }

    /** Grava o snippet `runas-codex.css` (a única gravação dentro do .obsidian). */
    public String installSnippet(String css) throws IOException {
        if (css == null || css.length() > 200_000) throw new VaultError("Snippet inválido.");
        String realRoot = realRoot();
        File config = new File(root, ".obsidian");
        if (!config.isDirectory() && !config.mkdirs()) throw new VaultError("Não deu para criar a pasta .obsidian.");
        if (!inside(realRoot, config.getCanonicalPath()) || config.getCanonicalPath().equals(realRoot)) throw new VaultError("A pasta .obsidian fica fora do cofre.");
        File folder = new File(config.getCanonicalFile(), "snippets");
        if (!folder.isDirectory() && !folder.mkdirs()) throw new VaultError("Não deu para criar a pasta de snippets.");
        if (!inside(realRoot, folder.getCanonicalPath())) throw new VaultError("A pasta .obsidian/snippets fica fora do cofre.");
        File target = new File(folder, "runas-codex.css");
        File temp = new File(folder, ".runas-codex.css." + randomHex() + ".runas-tmp");
        try (FileOutputStream out = new FileOutputStream(temp)) {
            out.write(css.getBytes(StandardCharsets.UTF_8));
            out.getFD().sync();
        }
        if (!temp.renameTo(target)) {
            temp.delete();
            throw new VaultError("Não deu para gravar o snippet.");
        }
        return SNIPPET_PATH;
    }

    /** Prepara a pasta como cofre (pastas dos espaços e .obsidian), sem apagar nem sobrescrever nada. */
    public static void createVault(File root) throws IOException {
        for (String folder : SPACE_FOLDERS) {
            File f = new File(root, folder);
            if (!f.isDirectory() && !f.mkdirs()) throw new VaultError("Não deu para criar " + folder + ".");
        }
        File config = new File(root, ".obsidian");
        if (!config.isDirectory() && !config.mkdirs()) throw new VaultError("Não deu para criar .obsidian.");
        File app = new File(config, "app.json");
        if (!app.exists()) {
            try (FileOutputStream out = new FileOutputStream(app)) {
                out.write("{\n  \"newLinkFormat\": \"shortest\",\n  \"useMarkdownLinks\": false,\n  \"alwaysUpdateLinks\": true\n}\n".getBytes(StandardCharsets.UTF_8));
            }
        }
    }

    // ---------- Backups ----------

    public static final class Backup {
        public final String id;
        public final long createdAt;
        public final int files;
        public final long size;

        Backup(String id, long createdAt, int files, long size) {
            this.id = id;
            this.createdAt = createdAt;
            this.files = files;
            this.size = size;
        }
    }

    /** Pasta dos backups deste cofre (fora do cofre, para não ir para a sincronização). */
    public static File backupFolder(File backupsRoot, File vaultRoot) throws IOException {
        return backupFolder(backupsRoot, vaultRoot.getCanonicalPath());
    }

    static File backupFolder(File backupsRoot, String identity) throws IOException {
        try {
            MessageDigest sha1 = MessageDigest.getInstance("SHA-1");
            byte[] hash = sha1.digest(identity.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format(Locale.ROOT, "%02x", b));
            return new File(backupsRoot, hex.substring(0, 12));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IOException(e);
        }
    }

    /** Zip das notas (.md, .canvas, .base) e das configurações .json do .obsidian; guarda os `keep` mais recentes. */
    public Backup backup(File folder, int keep) throws IOException {
        if (!folder.isDirectory() && !folder.mkdirs()) throw new VaultError("Não deu para criar a pasta de backups.");
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH-mm-ss-SSS'Z'", Locale.ROOT);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        long createdAt = System.currentTimeMillis();
        String id = format.format(new Date(createdAt));
        File zip = new File(folder, id + ".zip");
        int files = 0;
        try (ZipOutputStream out = new ZipOutputStream(new FileOutputStream(zip))) {
            for (Entry e : list("", true)) {
                boolean hidden = false;
                for (String part : e.path.split("/")) if (part.startsWith(".")) hidden = true;
                boolean obsidianConfig = e.path.startsWith(".obsidian/") && e.path.endsWith(".json") && !e.path.contains("workspace");
                if ((!hidden && BACKUP_TEXT.matcher(e.path).find()) || obsidianConfig) {
                    out.putNextEntry(new ZipEntry(e.path));
                    out.write(readAll(join(Arrays.asList(e.path.split("/")))));
                    out.closeEntry();
                    files++;
                }
            }
        }
        List<Backup> all = listBackups(folder);
        for (int i = keep; i < all.size(); i++) new File(folder, all.get(i).id + ".zip").delete();
        return new Backup(id, createdAt, files, zip.length());
    }

    public static List<Backup> listBackups(File folder) {
        List<Backup> out = new ArrayList<>();
        File[] items = folder.listFiles();
        if (items == null) return out;
        for (File f : items) {
            if (f.isFile() && f.getName().endsWith(".zip")) out.add(new Backup(f.getName().substring(0, f.getName().length() - 4), f.lastModified(), 0, f.length()));
        }
        Collections.sort(out, (a, b) -> Long.compare(b.createdAt, a.createdAt));
        return out;
    }

    private static String randomHex() {
        byte[] bytes = new byte[4];
        RANDOM.nextBytes(bytes);
        StringBuilder hex = new StringBuilder();
        for (byte b : bytes) hex.append(String.format(Locale.ROOT, "%02x", b));
        return hex.toString();
    }
}
