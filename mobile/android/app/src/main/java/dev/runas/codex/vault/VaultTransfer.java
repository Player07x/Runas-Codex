package dev.runas.codex.vault;

import java.io.File;
import java.io.IOException;
import java.util.List;

/** Única área oculta transportável: mesas do programa; demais preferências e arquivos de controle ficam de fora. */
final class VaultTransfer {
    static final String PREFIX = ".runas/mesas/";
    static String relative(String path) throws IOException {
        if (path == null || !path.startsWith(PREFIX) || path.indexOf('\\') >= 0) throw new VaultStore.VaultError("Caminho inválido para os dados da mesa.");
        String value = path.substring(PREFIX.length());
        List<String> parts = VaultStore.split(value);
        if (parts.size() < 2 || !String.join("/", parts).equals(value)) throw new VaultStore.VaultError("Caminho inválido para os dados da mesa.");
        for (String part : parts) if (part.startsWith(".") || part.indexOf('\0') >= 0) throw new VaultStore.VaultError("Caminho oculto inválido para a mesa.");
        String rest = value.substring(value.indexOf('/') + 1);
        if (!rest.equals("mesa.json") && !rest.equals("outros.json") && !rest.matches("cenas/[^/]+\\.json") && !rest.matches("assets/(maps|tokens|tiles|audio)/[^/]+")) throw new VaultStore.VaultError("Arquivo interno não autorizado para importar a mesa.");
        return value;
    }
    static boolean accepts(String path) {
        try { relative(path); return true; } catch (IOException e) { return false; }
    }
    static VaultFs worlds(VaultFs store, File journal, boolean create) throws IOException {
        if (store instanceof DocumentVaultStore) return ((DocumentVaultStore) store).worlds(journal, create);
        if (!(store instanceof VaultStore)) throw new VaultStore.VaultError("Modo de cofre sem suporte aos pacotes de mesas.");
        File root = ((VaultStore) store).root().getCanonicalFile(), folder = root;
        for (String part : new String[] { ".runas", "mesas" }) {
            folder = new File(folder, part);
            if (!folder.exists()) {
                if (!create) return null;
                if (!folder.mkdir() && !folder.isDirectory()) throw new VaultStore.VaultError("Não deu para criar a pasta interna das mesas.");
            }
            if (!folder.isDirectory() || !folder.getCanonicalFile().equals(folder.getAbsoluteFile()) || !folder.getCanonicalPath().startsWith(root.getPath() + File.separator)) {
                throw new VaultStore.VaultError("A pasta de mesas não pode ser um link simbólico, arquivo ou caminho fora do cofre.");
            }
        }
        return new VaultStore(folder);
    }
}
