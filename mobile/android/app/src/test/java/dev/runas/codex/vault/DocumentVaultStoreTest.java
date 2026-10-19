package dev.runas.codex.vault;

import static org.junit.Assert.*;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

/** O mesmo contrato do disco, incluindo falhas do provedor durante a publicação do temporário. */
public class DocumentVaultStoreTest {
    @Rule public TemporaryFolder temp = new TemporaryFolder();
    private MemoryDocuments documents;
    private DocumentVaultStore store;

    @Before public void prepare() throws IOException {
        documents = new MemoryDocuments();
        store = new DocumentVaultStore(documents);
    }

    private interface Action { void run() throws IOException; }
    private static void refuses(String message, Action action) {
        try { action.run(); fail("Deveria recusar: " + message); }
        catch (IOException error) { assertTrue(error.getMessage(), error.getMessage().contains(message)); }
    }
    private String text(String path) throws IOException { return store.readTexts(Arrays.asList(path)).get(path); }

    @Test public void pacotesUsamSubarvoreInternaSemLiberarOutrosOcultos() throws Exception {
        assertNull(VaultTransfer.worlds(store, temp.newFolder(), false));
        VaultFs worlds = VaultTransfer.worlds(store, temp.newFolder(), true);
        VaultStore.Entry entry = worlds.writeBinary("porto/mesa.json", "{}".getBytes(StandardCharsets.UTF_8), null, true);
        assertTrue(entry.uri.startsWith("content://local/document/"));
        assertEquals(entry.uri, store.source(".runas/mesas/porto/mesa.json"));
        assertEquals("{}", store.readTexts(Arrays.asList(".runas/mesas/porto/mesa.json")).get(".runas/mesas/porto/mesa.json"));
        refuses("ocultos", () -> store.writeText(".runas/mesas/porto/mesa.json", "fora do contrato", null, false));
        assertEquals(0, store.list("", false).size());
    }

    @Test public void listaCincoMilNotasComUmaConsultaPorPasta() throws IOException {
        for (int i = 0; i < 5000; i++) documents.file("Notas/Nota " + i + ".md", "# " + i);
        documents.file(".obsidian/app.json", "{}");
        documents.queries = 0;
        List<VaultStore.Entry> entries = store.list("", false);
        assertEquals(5000, entries.size());
        assertEquals(2, documents.queries); // Raiz e Notas; nenhuma consulta por arquivo.
        assertEquals(5000, store.readTexts(entries.stream().map(e -> e.path).collect(Collectors.toList())).size());
        assertEquals(2, documents.queries);
    }

    @Test public void leBytesSemMudarBomEQuebrasDeLinha() throws IOException {
        documents.file("Notas/a.md", "\ufeff# Olá\r\n");
        store.list("", false);
        assertEquals("\ufeff# Olá\r\n", text("Notas/a.md"));
        assertFalse(store.readTexts(Arrays.asList("sumiu.md")).containsKey("sumiu.md"));
    }

    @Test public void recusaEscapesEOcultosEmTodasAsMutacoes() throws IOException {
        documents.file("Notas/a.md", "original");
        refuses("fora do cofre", () -> store.readTexts(Arrays.asList("../fora.md")));
        refuses("fora do cofre", () -> store.writeText("/fora.md", "x", null, false));
        refuses("fora do cofre", () -> store.writeText("Notas\\..\\fora.md", "x", null, false));
        refuses("ocultos", () -> store.writeText(".obsidian/app.json", "{}", null, false));
        refuses("ocultos", () -> store.createFolder("Notas/.oculta"));
        refuses("ocultos", () -> store.rename("Notas/a.md", ".trash/a.md"));
        refuses("ocultos", () -> store.trash(".obsidian/app.json"));
    }

    @Test public void versaoEsperadaENullSoCria() throws IOException {
        VaultStore.Entry first = store.writeText("Notas/a.md", "primeira", null, true);
        refuses("Já existe", () -> store.writeText("Notas/a.md", "outra", null, true));
        VaultStore.Entry next = store.writeText("Notas/a.md", "segunda", new VaultStore.Version(first.size, first.mtime), false);
        documents.file("Notas/a.md", "do Obsidian");
        refuses("mudou fora do app", () -> store.writeText("Notas/a.md", "minha", new VaultStore.Version(next.size, next.mtime), false));
        assertEquals("do Obsidian", text("Notas/a.md"));
        refuses("mudou fora do app", () -> store.writeText("nova.md", "x", new VaultStore.Version(1, 1), false));
    }

    @Test public void naoRegravaConteudoIgual() throws IOException {
        VaultStore.Entry before = store.writeText("a.md", "igual", null, true);
        documents.writes = 0;
        VaultStore.Entry after = store.writeText("a.md", "igual", new VaultStore.Version(before.size, before.mtime), false);
        assertEquals(before.mtime, after.mtime);
        assertEquals(0, documents.writes);
    }

    @Test public void confereAVersaoDeNovoDepoisDeGravarOTemporario() throws IOException {
        VaultStore.Entry before = store.writeText("a.md", "original", null, true);
        documents.onWrite = () -> documents.file("a.md", "mudou durante o temporário");
        refuses("mudou fora do app", () -> store.writeText("a.md", "minha", new VaultStore.Version(before.size, before.mtime), false));
        assertEquals("mudou durante o temporário", text("a.md"));
        assertEquals(1, store.list("", true).size());
    }

    @Test public void nullTambemRecusaCriacaoConcorrenteDuranteOTemporario() throws IOException {
        documents.onWrite = () -> documents.file("a.md", "do Obsidian");
        refuses("Já existe", () -> store.writeText("a.md", "minha", null, true));
        assertEquals("do Obsidian", text("a.md"));
    }

    @Test public void falhaNaEscritaNaoTruncaOOriginal() throws IOException {
        documents.file("a.md", "original inteiro");
        documents.failWrite = true;
        refuses("escrita interrompida", () -> store.writeText("a.md", "novo", null, false));
        assertEquals("original inteiro", text("a.md"));
        assertEquals(1, store.list("", true).size());
    }

    @Test public void falhaAoPublicarRestauraOOriginal() throws IOException {
        documents.file("a.md", "original");
        documents.failPublish = true;
        refuses("publicação recusada", () -> store.writeText("a.md", "novo", null, false));
        assertEquals("original", text("a.md"));
        assertEquals(1, store.list("", true).size());
    }

    @Test public void preservaOOriginalSeOProvedorTambemRecusarARestauracao() throws IOException {
        documents.file("a.md", "original");
        documents.failPublish = true;
        documents.failRecovery = true;
        refuses("original foi preservado", () -> store.writeText("a.md", "novo", null, false));
        VaultStore.Entry saved = store.list("", true).get(0);
        assertTrue(saved.path.contains(".previous-a.md"));
        assertEquals("original", text(saved.path));
    }

    @Test public void anexosRecebemUriNovaDepoisDaTroca() throws IOException {
        VaultStore.Entry before = store.writeBinary("Anexos/imagem.png", new byte[] { 1, 2, 3 }, null, true);
        VaultStore.Entry after = store.writeBinary("Anexos/imagem.png", new byte[] { 4, 5, 6 }, new VaultStore.Version(before.size, before.mtime), false);
        assertNotEquals(before.uri, after.uri);
        assertEquals(after.uri, store.source("Anexos/imagem.png"));
        assertArrayEquals(new byte[] { 4, 5, 6 }, store.readBinary("Anexos/imagem.png"));
    }

    @Test public void reabrirRecuperaOriginalAposInterrupcaoAntesDaPublicacao() throws IOException {
        File journal = temp.newFolder("journal");
        store = new DocumentVaultStore(documents, journal);
        documents.file("Notas/a.md", "original");
        documents.crashBeforePublish = true;
        assertThrows(PowerLoss.class, () -> store.writeText("Notas/a.md", "nova", null, false));
        documents.crashBeforePublish = false;
        store = new DocumentVaultStore(documents, journal);
        assertEquals("original", text("Notas/a.md"));
        assertEquals(1, store.list("", true).size());
    }

    @Test public void reabrirPreservaAsDuasVersoesSeAPublicacaoJaTinhaAcontecido() throws IOException {
        File journal = temp.newFolder("journal");
        store = new DocumentVaultStore(documents, journal);
        documents.file("a.md", "original");
        documents.crashAfterPublish = true;
        assertThrows(PowerLoss.class, () -> store.writeText("a.md", "nova", null, false));
        documents.crashAfterPublish = false;
        store = new DocumentVaultStore(documents, journal);
        assertEquals("nova", text("a.md"));
        List<VaultStore.Entry> trash = store.listTrash();
        assertEquals(1, trash.size());
        assertEquals("original", text(trash.get(0).path));
    }

    @Test public void reabrirRecuperaMovimentoInterrompidoEmOutraPasta() throws IOException {
        File journal = temp.newFolder("journal");
        store = new DocumentVaultStore(documents, journal);
        documents.file("Notas/a.md", "original");
        documents.crashBeforePublish = true;
        assertThrows(PowerLoss.class, () -> store.rename("Notas/a.md", "Outra/b.md"));
        documents.crashBeforePublish = false;
        store = new DocumentVaultStore(documents, journal);
        assertEquals("original", text("Notas/a.md"));
        assertEquals(1, store.list("", true).size());
    }

    @Test public void movePastasETrocaMaiusculasSemSobrescrever() throws IOException {
        documents.file("Notas/a.md", "a");
        store.rename("Notas/a.md", "Outra/A.md");
        assertEquals("a", text("Outra/A.md"));
        store.rename("Outra/A.md", "Outra/a.md");
        store.rename("Outra", "Renomeada");
        assertEquals("a", text("Renomeada/a.md"));
        documents.file("Renomeada/b.md", "b");
        refuses("Já existe", () -> store.rename("Renomeada/a.md", "Renomeada/b.md"));
        refuses("dentro dela", () -> store.rename("Renomeada", "Renomeada/Subpasta"));
    }

    @Test public void lixeiraGeraNomesLivresERestauraSemSubstituir() throws IOException {
        documents.file("Notas/a.md", "um");
        assertEquals(".trash/a.md", store.trash("Notas/a.md"));
        documents.file("Notas/a.md", "dois");
        assertEquals(".trash/a 1.md", store.trash("Notas/a.md"));
        assertEquals(2, store.listTrash().size());
        store.restoreTrash(".trash/a.md", "Notas/a.md");
        assertEquals("um", text("Notas/a.md"));
        refuses("Já existe", () -> store.restoreTrash(".trash/a 1.md", "Notas/a.md"));
        refuses("lixeira", () -> store.restoreTrash("Notas/a.md", "Notas/b.md"));
    }

    @Test public void snippetEInicializacaoNaoSubstituemConfiguracoesExistentes() throws IOException {
        documents.file(".obsidian/app.json", "meu");
        store.initialize();
        assertEquals("meu", text(".obsidian/app.json"));
        assertEquals(VaultStore.SNIPPET_PATH, store.installSnippet("body{}"));
        assertEquals("body{}", text(VaultStore.SNIPPET_PATH));
        store.writeText("Notas/a.md", "a", null, true);
        refuses("pasta vazia", () -> store.initialize());
    }

    @Test public void backupLevaTextosEConfiguracoesSemLixeiraNemAnexos() throws IOException {
        documents.file("Notas/a.md", "a"); documents.file("Quadro.canvas", "{}");
        documents.file(".obsidian/app.json", "{}"); documents.file(".obsidian/workspace.json", "{}");
        documents.file(".trash/velha.md", "x"); documents.file("Anexos/foto.png", "binário");
        File folder = temp.newFolder("backups");
        VaultStore.Backup backup = store.backup(folder, 15);
        assertEquals(3, backup.files);
        List<String> names = new ArrayList<>();
        try (ZipInputStream zip = new ZipInputStream(new FileInputStream(new File(folder, backup.id + ".zip")))) {
            for (ZipEntry e = zip.getNextEntry(); e != null; e = zip.getNextEntry()) names.add(e.getName());
        }
        assertEquals(Arrays.asList(".obsidian/app.json", "Notas/a.md", "Quadro.canvas"), names);
    }

    private static final class PowerLoss extends Error {}

    private static final class MemoryDocuments implements DocumentTree {
        private static final class Item {
            String id, parent, name; boolean folder; long mtime; byte[] data = new byte[0];
            Item(String id, String parent, String name, boolean folder, long mtime) {
                this.id = id; this.parent = parent; this.name = name; this.folder = folder; this.mtime = mtime;
            }
            Node node() { return new Node(id, name, folder, data.length, mtime, -1); }
        }
        final Map<String, Item> items = new LinkedHashMap<>();
        int sequence, queries, writes; long clock = 1000;
        boolean failWrite, failPublish, failRecovery;
        boolean crashBeforePublish, crashAfterPublish;
        Runnable onWrite;
        MemoryDocuments() { items.put("raiz", new Item("raiz", null, "Cofre", true, clock)); }
        public String identity() { return "content://local/tree/cofre"; }
        public Node root() { return items.get("raiz").node(); }
        private Item item(Node n) throws IOException {
            Item item = items.get(n.id);
            if (item == null) throw new FileNotFoundException(n.name);
            return item;
        }
        private Item child(String parent, String name) {
            return items.values().stream().filter(i -> parent.equals(i.parent) && name.equals(i.name)).findFirst().orElse(null);
        }
        void file(String path, String text) {
            String[] parts = path.split("/"); Item parent = items.get("raiz");
            for (int i = 0; i < parts.length; i++) {
                Item existing = child(parent.id, parts[i]);
                if (existing == null) {
                    existing = new Item("documento:" + ++sequence, parent.id, parts[i], i < parts.length - 1, ++clock);
                    items.put(existing.id, existing);
                }
                if (i == parts.length - 1) { existing.data = text.getBytes(StandardCharsets.UTF_8); existing.mtime = ++clock; }
                parent = existing;
            }
        }
        public List<Node> children(Node parent) {
            queries++;
            return items.values().stream().filter(i -> parent.id.equals(i.parent)).map(Item::node).collect(Collectors.toList());
        }
        public InputStream read(Node file) throws IOException { return new ByteArrayInputStream(item(file).data); }
        public Node create(Node parent, String name, boolean folder) throws IOException {
            item(parent);
            if (child(parent.id, name) != null) throw new IOException("Já existe: " + name);
            Item item = new Item("documento:" + ++sequence, parent.id, name, folder, ++clock);
            items.put(item.id, item); return item.node();
        }
        public void write(Node file, byte[] bytes) throws IOException {
            writes++; Item item = item(file); item.data = bytes.clone(); item.mtime = ++clock;
            if (failWrite) { item.data = new byte[] { 0 }; throw new IOException("escrita interrompida"); }
            if (onWrite != null) { Runnable action = onWrite; onWrite = null; action.run(); }
        }
        private Node change(Item item, String parent, String name) throws IOException {
            Item occupied = child(parent, name);
            if (occupied != null && occupied != item) throw new IOException("Já existe: " + name);
            String old = item.id;
            items.remove(old); item.id = "documento:" + ++sequence; item.parent = parent; item.name = name;
            for (Item child : items.values()) if (old.equals(child.parent)) child.parent = item.id;
            items.put(item.id, item); return item.node();
        }
        public Node rename(Node file, String name) throws IOException {
            Item item = item(file);
            boolean publishing = item.name.endsWith(".runas-tmp") && !name.startsWith(".runas-");
            if (crashBeforePublish && publishing) throw new PowerLoss();
            if (failPublish && item.name.endsWith(".runas-tmp") && !name.startsWith(".runas-")) throw new IOException("publicação recusada");
            if (failRecovery && item.name.contains(".previous-") && !name.startsWith(".runas-")) throw new IOException("restauração recusada");
            Node result = change(item, item.parent, name);
            if (crashAfterPublish && publishing) throw new PowerLoss();
            return result;
        }
        public Node move(Node file, Node from, Node to) throws IOException {
            Item item = item(file); item(from); item(to);
            if (!from.id.equals(item.parent)) throw new IOException("Pasta de origem errada.");
            return change(item, to.id, item.name);
        }
        public void delete(Node file) throws IOException { Item item = item(file); items.remove(item.id); }
        public String source(Node file) { return "content://local/document/" + file.id; }
    }
}
