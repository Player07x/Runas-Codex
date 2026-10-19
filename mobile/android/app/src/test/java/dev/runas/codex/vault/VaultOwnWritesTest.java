package dev.runas.codex.vault;

import static org.junit.Assert.*;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.Test;

public class VaultOwnWritesTest {
    @Test public void scanAtrasadoNaoReenviaUmaVersaoAnteriorDoAutosave() {
        AtomicLong now = new AtomicLong(1000);
        VaultOwnWrites own = new VaultOwnWrites(now::get);
        VaultStore.Entry first = new VaultStore.Entry("Notas/a.md", 11, 100);
        VaultStore.Entry second = new VaultStore.Entry("Notas/a.md", 16, 200);
        own.remember(first);
        now.addAndGet(500);
        own.remember(second);
        assertTrue(own.contains(first));
        assertTrue(own.contains(second));
        assertFalse(own.contains(new VaultStore.Entry("Notas/a.md", 20, 300)));
    }

    @Test public void versoesAntigasExpiramSemEsconderMudancasExternasPosteriores() {
        AtomicLong now = new AtomicLong(1000);
        VaultOwnWrites own = new VaultOwnWrites(now::get);
        VaultStore.Entry first = new VaultStore.Entry("a.md", 1, 100);
        own.remember(first);
        now.addAndGet(5001);
        assertFalse(own.contains(first));
        own.remember(new VaultStore.Entry("a.md", 2, 200));
        assertFalse(own.contains(new VaultStore.Entry("a.md", 2, 300)));
    }

    @Test public void recriarOArquivoNaoEscondeUmaRemocaoExterna() {
        VaultOwnWrites own = new VaultOwnWrites(() -> 1000L);
        own.remember(new VaultStore.Entry("a.md", 1, 100));
        own.forget("a.md");
        assertTrue(own.deleted("a.md"));
        own.remember(new VaultStore.Entry("a.md", 2, 200));
        assertFalse(own.deleted("a.md"));
    }
}
