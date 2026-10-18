package dev.runas.codex.vault;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

/** As mesmas garantias da gravação segura do desktop (desktop/tests e o --smoke --write). */
public class VaultStoreTest {

    @Rule
    public TemporaryFolder temp = new TemporaryFolder();

    private File root;
    private VaultStore store;

    @Before
    public void setUp() throws IOException {
        root = temp.newFolder("cofre");
        store = new VaultStore(root);
    }

    private void file(String path, String content) throws IOException {
        File f = new File(root, path);
        f.getParentFile().mkdirs();
        Files.write(f.toPath(), content.getBytes(StandardCharsets.UTF_8));
    }

    private String text(String path) throws IOException {
        return new String(Files.readAllBytes(new File(root, path).toPath()), StandardCharsets.UTF_8);
    }

    private static void refuses(String expected, ThrowingRunnable action) {
        try {
            action.run();
            fail("deveria recusar: " + expected);
        } catch (IOException e) {
            assertTrue(e.getMessage(), e.getMessage().contains(expected));
        }
    }

    /** Os backups têm o nome da hora em milissegundos. */
    private static void pause() {
        try {
            Thread.sleep(5);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    private interface ThrowingRunnable {
        void run() throws IOException;
    }

    @Test
    public void listaSemOcultosEmOrdem() throws IOException {
        file("Notas/b.md", "b");
        file("Notas/a.md", "a");
        file(".obsidian/app.json", "{}");
        file(".trash/velha.md", "x");
        List<String> paths = new ArrayList<>();
        for (VaultStore.Entry e : store.list("", false)) paths.add(e.path);
        assertEquals(Arrays.asList("Notas/a.md", "Notas/b.md"), paths);
        assertEquals(4, store.list("", true).size());
        assertEquals(1, store.list("Notas/b", false).size());
    }

    @Test
    public void leVariosTextosEIgnoraOsQueSumiram() throws IOException {
        file("a.md", "﻿olá");
        assertEquals("﻿olá", store.readTexts(Arrays.asList("a.md", "sumiu.md")).get("a.md"));
        assertEquals(1, store.readTexts(Arrays.asList("a.md", "sumiu.md")).size());
    }

    @Test
    public void recusaCaminhosForaDoCofreEOcultos() throws IOException {
        refuses("fora do cofre", () -> store.readTexts(Arrays.asList("../fora.md")));
        refuses("fora do cofre", () -> store.writeText("/etc/passwd", "x", null, false));
        refuses("ocultos", () -> store.writeText(".obsidian/app.json", "{}", null, false));
        refuses("ocultos", () -> store.writeText("Notas/.oculta.md", "x", null, false));
    }

    @Test
    public void recusaLinkSimbolicoParaFora() throws IOException {
        File outside = temp.newFolder("fora");
        Files.write(new File(outside, "segredo.md").toPath(), "s".getBytes(StandardCharsets.UTF_8));
        Files.createSymbolicLink(new File(root, "atalho").toPath(), outside.toPath());
        refuses("fora do cofre", () -> store.readTexts(Arrays.asList("atalho/segredo.md")));
        refuses("fora do cofre", () -> store.writeText("atalho/nova.md", "x", null, false));
        for (VaultStore.Entry e : store.list("", false)) assertFalse(e.path.startsWith("atalho"));
    }

    @Test
    public void criarSoCriaEVersaoErradaRecusa() throws IOException {
        VaultStore.Entry first = store.writeText("Notas/Smoke.md", "um", null, true);
        refuses("Já existe", () -> store.writeText("Notas/Smoke.md", "dois", null, true));
        VaultStore.Version read = new VaultStore.Version(first.size, first.mtime);
        VaultStore.Entry second = store.writeText("Notas/Smoke.md", "dois!", read, false);
        assertEquals("dois!", text("Notas/Smoke.md"));
        // Mudou fora do app depois da leitura: recusa e não perde nada.
        file("Notas/Smoke.md", "do Obsidian");
        refuses("mudou fora do app", () -> store.writeText("Notas/Smoke.md", "três", new VaultStore.Version(second.size, second.mtime), false));
        assertEquals("do Obsidian", text("Notas/Smoke.md"));
        refuses("mudou fora do app", () -> store.writeText("Notas/Nova.md", "x", new VaultStore.Version(1, 1), false));
    }

    @Test
    public void conteudoIgualNaoRegrava() throws IOException {
        VaultStore.Entry first = store.writeText("a.md", "igual", null, true);
        new File(root, "a.md").setLastModified(1_000_000L);
        VaultStore.Entry again = store.writeText("a.md", "igual", null, false);
        assertEquals(1_000_000L, again.mtime);
        assertEquals(first.size, again.size);
    }

    @Test
    public void naoDeixaTemporarios() throws IOException {
        store.writeText("Notas/a.md", "x", null, true);
        String[] names = new File(root, "Notas").list();
        assertEquals(Arrays.asList("a.md"), Arrays.asList(names));
    }

    @Test
    public void binarioIdaEVolta() throws IOException {
        byte[] png = { (byte) 0x89, 'P', 'N', 'G', 0, 1, 2, 3 };
        store.writeBinary("Anexos/a.png", png, null, true);
        assertArrayEquals(png, store.readBinary("Anexos/a.png"));
        refuses("Já existe", () -> store.writeBinary("Anexos/a.png", png, null, true));
    }

    @Test
    public void renomeiaMoveETrocaSoMaiusculas() throws IOException {
        file("Notas/a.md", "a");
        store.rename("Notas/a.md", "Outra/b.md");
        assertEquals("a", text("Outra/b.md"));
        store.rename("Outra/b.md", "Outra/B.md");
        assertTrue(Arrays.asList(new File(root, "Outra").list()).contains("B.md"));
        file("Outra/c.md", "c");
        refuses("Já existe", () -> store.rename("Outra/c.md", "Outra/B.md"));
        refuses("ocultos", () -> store.rename("Outra/c.md", ".trash/c.md"));
    }

    @Test
    public void lixeiraComNomesNovosEDevolucao() throws IOException {
        file("Notas/a.md", "1");
        assertEquals(".trash/a.md", store.trash("Notas/a.md"));
        file("Notas/a.md", "2");
        assertEquals(".trash/a 1.md", store.trash("Notas/a.md"));
        assertEquals(2, store.listTrash().size());
        store.restoreTrash(".trash/a.md", "Notas/a.md");
        assertEquals("1", text("Notas/a.md"));
        refuses("Já existe", () -> store.restoreTrash(".trash/a 1.md", "Notas/a.md"));
        refuses("lixeira", () -> store.restoreTrash("Notas/a.md", "Notas/z.md"));
    }

    @Test
    public void snippetEhAUnicaGravacaoNoObsidian() throws IOException {
        assertEquals(".obsidian/snippets/runas-codex.css", store.installSnippet("body{}"));
        assertEquals("body{}", text(".obsidian/snippets/runas-codex.css"));
    }

    @Test
    public void cofreNovoTemOsEspacosESemSobrescrever() throws IOException {
        file(".obsidian/app.json", "meu");
        VaultStore.createVault(root);
        for (String folder : VaultStore.SPACE_FOLDERS) assertTrue(new File(root, folder).isDirectory());
        assertEquals("meu", text(".obsidian/app.json"));
    }

    @Test
    public void backupLevaNotasEConfiguracoes() throws IOException {
        file("Notas/a.md", "a");
        file("Quadro.canvas", "{}");
        file("img.png", "binário");
        file(".obsidian/app.json", "{}");
        file(".obsidian/workspace.json", "{}");
        File backups = temp.newFolder("backups");
        VaultStore.Backup backup = store.backup(backups, 2);
        assertEquals(3, backup.files);
        List<String> names = new ArrayList<>();
        try (ZipInputStream zip = new ZipInputStream(new FileInputStream(new File(backups, backup.id + ".zip")))) {
            for (ZipEntry e = zip.getNextEntry(); e != null; e = zip.getNextEntry()) names.add(e.getName());
        }
        assertTrue(names.containsAll(Arrays.asList("Notas/a.md", "Quadro.canvas", ".obsidian/app.json")));
        assertFalse(names.contains("img.png"));
        assertFalse(names.contains(".obsidian/workspace.json"));
        pause();
        store.backup(backups, 2);
        pause();
        store.backup(backups, 2);
        assertEquals(2, VaultStore.listBackups(backups).size());
    }
}
