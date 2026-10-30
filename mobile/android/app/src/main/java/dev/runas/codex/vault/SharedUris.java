package dev.runas.codex.vault;

import java.util.Set;

/**
 * O que outro app pode mandar ao Runas-Codex. O "Compartilhar com" guarda no cofre, sem perguntar, o que chega; se
 * aceitasse um `file://` ou um endereço dos provedores do próprio app (o `FileProvider` alcança a pasta privada), outro
 * app faria o Runas-Codex copiar para o cofre, que fica no armazenamento compartilhado, arquivos que só ele lê.
 */
final class SharedUris {
    private SharedUris() {}

    /** Só `content://` de um provedor que não é deste app. */
    static boolean accepted(String scheme, String authority, Set<String> ownAuthorities, String packageName) {
        if (!"content".equals(scheme) || authority == null || authority.isEmpty()) return false;
        for (String part : authority.split(";")) {
            if (ownAuthorities.contains(part) || part.equals(packageName) || part.startsWith(packageName + ".")) return false;
        }
        return true;
    }

    /** O widget da Agenda é quem manda rotas: só as da Agenda abrem por um intent de fora. */
    static boolean route(String route) {
        return route != null && route.matches("/agenda(/(?!\\.+(/|$))[A-Za-z0-9%._~-]+)*");
    }
}
