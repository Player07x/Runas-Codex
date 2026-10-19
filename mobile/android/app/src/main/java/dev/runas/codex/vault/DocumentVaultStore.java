package dev.runas.codex.vault;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.Properties;
import java.util.TimeZone;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import dev.runas.codex.vault.DocumentTree.Node;
import dev.runas.codex.vault.VaultStore.Entry;
import dev.runas.codex.vault.VaultStore.Version;
import dev.runas.codex.vault.VaultStore.VaultError;

/** Regras do cofre sobre documentos. Listar consulta cada pasta uma vez, sem stat por arquivo. */
final class DocumentVaultStore implements VaultFs {
    private final DocumentTree tree;
    private final Node root;
    private final VaultJournal journal;
    private final Map<String, Node> cache = new HashMap<>();

    DocumentVaultStore(DocumentTree tree) throws IOException {
        this(tree, null);
    }

    DocumentVaultStore(DocumentTree tree, File journalBase) throws IOException {
        this.tree = tree;
        root = tree.root();
        if (!root.folder) throw new VaultError("Escolha uma pasta para o cofre.");
        journal = journalBase == null ? null : new VaultJournal(journalBase, tree.identity());
        cache.put("", root);
        recover();
    }

    public String identity() { return tree.identity(); }
    public String name() { return root.name; }
    public String mode() { return "saf"; }

    private static String path(String value, boolean writing) throws VaultError {
        List<String> parts = VaultStore.split(value);
        if (writing) for (String part : parts) if (part.startsWith(".")) throw new VaultError("O app não grava em pastas ou arquivos ocultos: " + value);
        StringBuilder normalized = new StringBuilder();
        for (String part : parts) {
            if (normalized.length() > 0) normalized.append('/');
            normalized.append(part);
        }
        return normalized.toString();
    }

    private static String parent(String path) { int slash = path.lastIndexOf('/'); return slash < 0 ? "" : path.substring(0, slash); }
    private static String leaf(String path) { return path.substring(path.lastIndexOf('/') + 1); }
    private static String join(String parent, String name) { return parent.isEmpty() ? name : parent + "/" + name; }

    private List<Node> children(Node folder) throws IOException {
        if (!folder.folder) throw new VaultError("O caminho não é uma pasta do cofre.");
        List<Node> nodes = tree.children(folder);
        Set<String> names = new HashSet<>();
        for (Node n : nodes) {
            if (n.name == null || n.name.isEmpty() || n.name.equals(".") || n.name.equals("..") || n.name.contains("/") || n.name.contains("\\") || n.name.indexOf('\0') >= 0 || n.id.equals(folder.id)) {
                throw new VaultError("O provedor retornou um caminho inválido para a árvore do cofre.");
            }
            if (!names.add(n.name)) throw new VaultError("O provedor retornou nomes duplicados no cofre: " + n.name);
        }
        return nodes;
    }

    private Node find(String path, boolean fresh) throws IOException {
        if (path.isEmpty()) return root;
        if (!fresh && cache.containsKey(path)) return cache.get(path);
        Node folder = find(parent(path), fresh);
        for (Node n : children(folder)) {
            cache.put(join(parent(path), n.name), n);
            if (n.name.equals(leaf(path))) return n;
        }
        cache.remove(path);
        throw new FileNotFoundException("Arquivo não encontrado no cofre: " + path);
    }

    private Node optional(String path, boolean fresh) throws IOException {
        try { return find(path, fresh); } catch (FileNotFoundException e) { return null; }
    }

    private Node folder(String path) throws IOException {
        if (path.isEmpty()) return root;
        Node existing = optional(path, true);
        if (existing != null) {
            if (!existing.folder) throw new VaultError("O caminho não é uma pasta: " + path);
            return existing;
        }
        Node created = tree.create(folder(parent(path)), leaf(path), true);
        if (!created.name.equals(leaf(path))) throw new VaultError("O provedor mudou o nome da pasta: " + path);
        cache.put(path, created);
        return created;
    }

    private Entry asEntry(String path, Node n) { return new Entry(path, n.size, n.mtime, tree.source(n)); }

    private Node staged(String folder, String token, String marker) throws IOException {
        for (Node n : children(find(folder, true))) if (n.name.startsWith(".runas-" + token + marker)) return n;
        return null;
    }

    private void preserve(Node file, Node parent, String name) throws IOException {
        Node trash = folder(".trash");
        String saved = "Recuperada " + UUID.randomUUID() + " " + name;
        Node renamed = renamed(file, saved);
        if (!parent.id.equals(trash.id)) tree.move(renamed, parent, trash);
    }

    /** Nunca substitui um arquivo que apareceu depois da interrupção; nesse caso, preserva ambos na .trash. */
    private void recover() throws IOException {
        if (journal == null) return;
        Properties data = journal.read();
        if (data.isEmpty()) return;
        String token = data.getProperty("token", "");
        if (!token.matches("[0-9a-fA-F-]{36}")) throw new VaultError("Registro de recuperação do cofre inválido.");
        String from = path(data.getProperty("from"), false), to = path(data.getProperty("to"), false);
        Node oldParent = find(parent(from), true);
        if ("write".equals(data.getProperty("kind"))) {
            Node previous = staged(parent(from), token, ".previous-");
            if (previous != null) {
                if (optional(from, true) == null) renamed(previous, leaf(from));
                else preserve(previous, oldParent, leaf(from));
            }
            Node temp = staged(parent(from), token, ".runas-tmp");
            if (temp != null) tree.delete(temp);
        } else if ("move".equals(data.getProperty("kind"))) {
            Node staged = staged(parent(from), token, ".runas-tmp");
            Node stagedParent = oldParent;
            if (staged == null && !parent(from).equals(parent(to))) {
                staged = staged(parent(to), token, ".runas-tmp");
                stagedParent = find(parent(to), true);
            }
            if (staged != null) {
                if (optional(from, true) != null) preserve(staged, stagedParent, leaf(from));
                else {
                    if (!stagedParent.id.equals(oldParent.id)) staged = tree.move(staged, stagedParent, oldParent);
                    renamed(staged, leaf(from));
                }
            }
        } else throw new VaultError("Registro de recuperação do cofre inválido.");
        journal.finish();
        cache.clear(); cache.put("", root);
    }

    public synchronized String source(String path) throws IOException { return tree.source(find(path(path, false), false)); }

    public synchronized List<Entry> list(String prefix, boolean includeHidden) throws IOException {
        Map<String, Node> next = new HashMap<>();
        next.put("", root);
        List<Entry> out = new ArrayList<>();
        walk(root, "", includeHidden, out, next, new HashSet<>());
        cache.clear(); cache.putAll(next);
        String wanted = prefix == null ? "" : prefix;
        out.removeIf(e -> !e.path.startsWith(wanted));
        Collections.sort(out, (a, b) -> a.path.compareTo(b.path));
        return out;
    }

    private void walk(Node dir, String path, boolean hidden, List<Entry> out, Map<String, Node> nodes, Set<String> visited) throws IOException {
        if (!visited.add(dir.id)) throw new VaultError("O provedor retornou um ciclo na árvore do cofre.");
        for (Node n : children(dir)) {
            if (!hidden && n.name.startsWith(".")) continue;
            String full = join(path, n.name);
            nodes.put(full, n);
            if (n.folder) walk(n, full, hidden, out, nodes, visited);
            else out.add(asEntry(full, n));
        }
    }

    public synchronized Entry entry(String path) throws IOException {
        String p = path(path, false);
        Node n = find(p, true);
        if (n.folder) throw new VaultError("Escolha um arquivo do cofre: " + p);
        return asEntry(p, n);
    }

    private byte[] bytes(Node file, long limit) throws IOException {
        if (file.folder) throw new VaultError("Escolha um arquivo do cofre.");
        if (file.size > limit) throw new VaultError("O arquivo passa do tamanho permitido.");
        try (InputStream in = tree.read(file); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[64 * 1024];
            int n; long total = 0;
            while ((n = in.read(buffer)) != -1) {
                total += n;
                if (total > limit) throw new VaultError("O arquivo passa do tamanho permitido.");
                out.write(buffer, 0, n);
            }
            return out.toByteArray();
        }
    }

    public synchronized Map<String, String> readTexts(List<String> paths) throws IOException {
        Map<String, String> out = new LinkedHashMap<>();
        for (String value : paths) {
            String p = path(value, false);
            try { out.put(value, new String(bytes(find(p, false), Integer.MAX_VALUE), StandardCharsets.UTF_8)); }
            catch (FileNotFoundException ignored) { cache.remove(p); }
        }
        return out;
    }

    public synchronized byte[] readBinary(String path) throws IOException { return bytes(find(path(path, false), false), VaultStore.MAX_BINARY_SIZE); }

    private static void version(String path, Node current, Version expected, boolean createOnly) throws VaultError {
        if (current != null && current.folder) throw new VaultError("Já existe uma pasta em “" + path + "”.");
        if (createOnly && current != null) throw new VaultError("Já existe “" + path + "”.");
        if (current != null && (current.size < 0 || current.mtime <= 0)) throw new VaultError("O provedor não informa tamanho e data confiáveis para gravar “" + path + "”.");
        if (expected != null && (current == null || !VaultStore.sameVersion(new Entry(path, current.size, current.mtime), expected))) {
            throw new VaultError("“" + path + "” mudou fora do app. Recarregue antes de gravar.");
        }
    }

    private Node renamed(Node file, String name) throws IOException {
        Node result = tree.rename(file, name);
        if (!result.name.equals(name)) throw new VaultError("O provedor mudou o nome ao renomear “" + name + "”.");
        return result;
    }

    private Entry write(String path, byte[] content, Version expected, boolean createOnly) throws IOException {
        recover();
        Node current = optional(path, true);
        version(path, current, expected, createOnly);
        if (current != null && current.size == content.length && Arrays.equals(bytes(current, Integer.MAX_VALUE), content)) return asEntry(path, current);
        Node dir = folder(parent(path));
        String token = UUID.randomUUID().toString();
        Node temp = tree.create(dir, ".runas-" + token + ".runas-tmp", false);
        Node previous = null;
        boolean committed = false;
        try {
            if (journal != null) journal.begin("write", path, path, token);
            tree.write(temp, content);
            Node now = optional(path, true);
            version(path, now, expected, createOnly);
            // A leitura e a gravação do temporário podem ter demorado: confere de novo antes de mudar o original.
            if ((current == null) != (now == null) || (current != null && (!current.id.equals(now.id) || current.size != now.size || current.mtime != now.mtime))) {
                throw new VaultError("“" + path + "” mudou fora do app. Recarregue antes de gravar.");
            }
            if (current != null) previous = renamed(now, ".runas-" + token + ".previous-" + leaf(path));
            Node published = renamed(temp, leaf(path));
            committed = true;
            cache.clear(); cache.put("", root);
            cache.put(path, published);
            return asEntry(path, published);
        } catch (IOException e) {
            if (previous != null && !committed) {
                try {
                    if (optional(path, true) != null) throw new VaultError("O nome já foi ocupado por outro arquivo.");
                    renamed(previous, leaf(path));
                    previous = null;
                } catch (IOException recovery) {
                    e.addSuppressed(recovery);
                    throw new VaultError(e.getMessage() + " O original foi preservado em “" + join(parent(path), previous.name) + "”.");
                }
            }
            throw e;
        } finally {
            cache.clear(); cache.put("", root);
            if (!committed) {
                try { tree.delete(temp); } catch (IOException ignored) { /* O original continua preservado. */ }
            }
            if (committed && previous != null) {
                try { tree.delete(previous); previous = null; } catch (IOException ignored) { /* O registro permite recuperá-la. */ }
            }
            if (committed && previous == null && journal != null) journal.finish();
        }
    }

    public synchronized Entry writeText(String path, String content, Version expected, boolean createOnly) throws IOException {
        return write(path(path, true), content.getBytes(StandardCharsets.UTF_8), expected, createOnly);
    }

    public synchronized Entry writeBinary(String path, byte[] bytes, Version expected, boolean createOnly) throws IOException {
        if (bytes.length > VaultStore.MAX_BINARY_SIZE) throw new VaultError("O arquivo passa de 50 MB.");
        return write(path(path, true), bytes, expected, createOnly);
    }

    public synchronized void createFolder(String path) throws IOException { folder(path(path, true)); }

    private void move(String from, String to, boolean hidden) throws IOException {
        recover();
        String a = path(from, !hidden), b = path(to, !hidden);
        if (a.equals(b)) return;
        if (b.startsWith(a + "/")) throw new VaultError("Uma pasta não pode ser movida para dentro dela mesma.");
        Node source = find(a, true), target = optional(b, true);
        if (target != null && !target.id.equals(source.id)) throw new VaultError("Já existe “" + b + "”.");
        Node oldParent = find(parent(a), true), newParent = folder(parent(b));
        Node moved = source;
        boolean across = false;
        String token = UUID.randomUUID().toString();
        try {
            if (journal != null) journal.begin("move", a, b, token);
            // O nome intermediário evita colisões ao mover para uma pasta que já tem o nome antigo (lixeira).
            moved = renamed(moved, ".runas-" + token + ".runas-tmp");
            if (!oldParent.id.equals(newParent.id)) {
                moved = tree.move(moved, oldParent, newParent);
                across = true;
            }
            moved = renamed(moved, leaf(b));
            if (journal != null) journal.finish();
        } catch (IOException error) {
            try {
                if (across) moved = tree.move(moved, newParent, oldParent);
                if (!moved.name.equals(source.name)) moved = renamed(moved, source.name);
            } catch (IOException recovery) { error.addSuppressed(recovery); }
            throw error;
        } finally { cache.clear(); cache.put("", root); }
    }

    public synchronized void rename(String from, String to) throws IOException { move(from, to, false); }

    public synchronized String trash(String path) throws IOException {
        String p = path(path, true);
        Node source = find(p, true);
        folder(".trash");
        int dot = source.folder ? -1 : source.name.lastIndexOf('.');
        String stem = dot > 0 ? source.name.substring(0, dot) : source.name;
        String ext = dot > 0 ? source.name.substring(dot) : "";
        for (int n = 0; ; n++) {
            String target = ".trash/" + stem + (n == 0 ? "" : " " + n) + ext;
            if (optional(target, true) == null) { move(p, target, true); return target; }
        }
    }

    public synchronized List<Entry> listTrash() throws IOException {
        Node trash = optional(".trash", true);
        if (trash == null) return new ArrayList<>();
        List<Entry> entries = new ArrayList<>();
        walk(trash, ".trash", true, entries, new HashMap<>(), new HashSet<>());
        Collections.sort(entries, (a, b) -> Long.compare(b.mtime, a.mtime));
        return entries;
    }

    public synchronized Entry restoreTrash(String path, String target) throws IOException {
        String p = path(path, false), dest = path(target, true);
        if (!p.startsWith(".trash/")) throw new VaultError("Caminho de lixeira inválido.");
        Node source = find(p, true);
        Entry restored = write(dest, bytes(source, VaultStore.MAX_BINARY_SIZE), null, true);
        tree.delete(source);
        return restored;
    }

    public synchronized String installSnippet(String css) throws IOException {
        if (css == null || css.length() > 200_000) throw new VaultError("Snippet inválido.");
        write(VaultStore.SNIPPET_PATH, css.getBytes(StandardCharsets.UTF_8), null, false);
        return VaultStore.SNIPPET_PATH;
    }

    synchronized void initialize() throws IOException {
        if (!list("", false).isEmpty()) throw new VaultError("Escolha uma pasta vazia para o cofre novo.");
        for (String space : VaultStore.SPACE_FOLDERS) folder(space);
        folder(".obsidian");
        if (optional(".obsidian/app.json", true) == null) write(".obsidian/app.json", "{\n  \"newLinkFormat\": \"shortest\",\n  \"useMarkdownLinks\": false,\n  \"alwaysUpdateLinks\": true\n}\n".getBytes(StandardCharsets.UTF_8), null, true);
    }

    public synchronized VaultStore.Backup backup(File folder, int keep) throws IOException {
        if (!folder.isDirectory() && !folder.mkdirs()) throw new VaultError("Não deu para criar a pasta de backups.");
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH-mm-ss-SSS'Z'", Locale.ROOT);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        long createdAt = System.currentTimeMillis();
        String id = format.format(new Date(createdAt));
        File zip = new File(folder, id + ".zip"), temp = new File(folder, id + ".tmp");
        int files = 0;
        try {
            try (ZipOutputStream out = new ZipOutputStream(new FileOutputStream(temp))) {
                for (Entry e : list("", true)) {
                    boolean hidden = Arrays.stream(e.path.split("/")).anyMatch(p -> p.startsWith("."));
                    boolean config = e.path.startsWith(".obsidian/") && e.path.endsWith(".json") && !e.path.contains("workspace");
                    if ((!hidden && e.path.toLowerCase(Locale.ROOT).matches(".*\\.(md|canvas|base)$")) || config) {
                        out.putNextEntry(new ZipEntry(e.path));
                        try (InputStream in = tree.read(find(e.path, false))) {
                            byte[] buffer = new byte[64 * 1024]; int n;
                            while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
                        }
                        out.closeEntry(); files++;
                    }
                }
            }
            if (!temp.renameTo(zip)) throw new VaultError("Não deu para concluir o backup.");
        } finally { if (temp.exists()) temp.delete(); }
        List<VaultStore.Backup> backups = VaultStore.listBackups(folder);
        for (int i = keep; i < backups.size(); i++) new File(folder, backups.get(i).id + ".zip").delete();
        return new VaultStore.Backup(id, createdAt, files, zip.length());
    }
    synchronized VaultFs worlds(File journalBase, boolean create) throws IOException {
        Node documents = create ? folder(".runas/mesas") : optional(".runas/mesas", true);
        if (documents == null) return null;
        if (!documents.folder) throw new VaultError("A pasta interna das mesas não é uma pasta.");
        return new DocumentVaultStore(new DocumentSubtree(tree, documents), journalBase);
    }
}
