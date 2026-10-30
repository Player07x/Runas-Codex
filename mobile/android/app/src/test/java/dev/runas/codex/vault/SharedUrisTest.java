package dev.runas.codex.vault;

import static org.junit.Assert.*;

import java.util.*;
import org.junit.Test;

public class SharedUrisTest {
    private static final Set<String> OWN = new HashSet<>(Arrays.asList("dev.runas.codex.fileprovider", "dev.runas.codex.androidx-startup"));

    @Test
    public void aceitaSoArquivosDeOutrosApps() {
        assertTrue(SharedUris.accepted("content", "com.android.providers.media.documents", OWN, "dev.runas.codex"));
        assertTrue(SharedUris.accepted("content", "media", OWN, "dev.runas.codex"));
        // Arquivos privados do próprio app nunca vão para o cofre por um intent de fora.
        assertFalse(SharedUris.accepted("file", null, OWN, "dev.runas.codex"));
        assertFalse(SharedUris.accepted("content", "dev.runas.codex.fileprovider", OWN, "dev.runas.codex"));
        assertFalse(SharedUris.accepted("content", "dev.runas.codex.outro", OWN, "dev.runas.codex"));
        assertFalse(SharedUris.accepted("content", "media;dev.runas.codex.fileprovider", OWN, "dev.runas.codex"));
        assertFalse(SharedUris.accepted("content", "", OWN, "dev.runas.codex"));
        assertFalse(SharedUris.accepted(null, "media", OWN, "dev.runas.codex"));
    }

    @Test
    public void soAsRotasDaAgendaAbremPorIntent() {
        assertTrue(SharedUris.route("/agenda"));
        assertTrue(SharedUris.route("/agenda/2026-10-30"));
        assertFalse(SharedUris.route("/vtt/criar"));
        assertFalse(SharedUris.route("/notas/nova"));
        assertFalse(SharedUris.route("/agenda/../config"));
        assertFalse(SharedUris.route("/agenda?x=1"));
        assertFalse(SharedUris.route(null));
    }
}
