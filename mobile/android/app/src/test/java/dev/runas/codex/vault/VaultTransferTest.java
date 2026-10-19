package dev.runas.codex.vault;

import static org.junit.Assert.*;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class VaultTransferTest {
    @Rule public TemporaryFolder temporary = new TemporaryFolder();
    @Test public void leituraNaoCriaPastasInternas() throws Exception {
        VaultStore store = new VaultStore(temporary.newFolder());
        assertNull(VaultTransfer.worlds(store, temporary.newFolder(), false));
        assertEquals(0, store.root().list().length);
    }
    @Test public void escreveSomenteNoSubcofreComVersaoEsperada() throws Exception {
        VaultStore root = new VaultStore(temporary.newFolder());
        VaultFs worlds = VaultTransfer.worlds(root, temporary.newFolder(), true);
        String relative = VaultTransfer.relative(".runas/mesas/porto/mesa.json");
        VaultStore.Entry first = worlds.writeBinary(relative, "original".getBytes(StandardCharsets.UTF_8), null, true);
        assertThrows(java.io.IOException.class, () -> worlds.writeBinary(relative, new byte[] {1}, null, true));
        VaultStore.Entry equal = worlds.writeBinary(relative, "original".getBytes(StandardCharsets.UTF_8), new VaultStore.Version(first.size, first.mtime), false);
        assertEquals(first.mtime, equal.mtime, 0);
        Files.write(new File(root.root(), ".runas/mesas/porto/mesa.json").toPath(), "externo maior".getBytes(StandardCharsets.UTF_8));
        assertThrows(java.io.IOException.class, () -> worlds.writeBinary(relative, new byte[] {1}, new VaultStore.Version(first.size, first.mtime), false));
    }
    @Test public void recusaCaminhosOcultosOuForaDaAreaDeMesas() {
        for (String path : new String[] { ".obsidian/app.json", ".runas/senhas.json", ".runas/mesas/p/../fora.json", ".runas/mesas/p/.oculto", ".runas/mesas/p/arquivo.js" }) {
            assertFalse(path, VaultTransfer.accepts(path));
        }
        assertTrue(VaultTransfer.accepts(".runas/mesas/porto/mesa.json"));
        assertTrue(VaultTransfer.accepts(".runas/mesas/porto/assets/maps/mapa.png"));
    }
    @Test public void recusaLinkNaPastaInternaSemCriarArquivosForaDoCofre() throws Exception {
        File root = temporary.newFolder(), outside = temporary.newFolder();
        Files.createSymbolicLink(new File(root, ".runas").toPath(), outside.toPath());
        assertThrows(java.io.IOException.class, () -> VaultTransfer.worlds(new VaultStore(root), temporary.newFolder(), true));
        assertEquals(0, outside.list().length);
    }
}
