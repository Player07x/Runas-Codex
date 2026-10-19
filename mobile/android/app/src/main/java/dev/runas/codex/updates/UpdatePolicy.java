package dev.runas.codex.updates;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/** Contrato verificável sem Android: origem, tamanho, integridade e identidade do APK. */
final class UpdatePolicy {
    static final String REPOSITORY = "Player07x/Runas-Codex";
    static final String API = "https://api.github.com/repos/" + REPOSITORY + "/releases?per_page=20";
    static final String DOWNLOAD = "https://github.com/" + REPOSITORY + "/releases/download/";
    static final long MAX_APK = 256L * 1024 * 1024;
    static boolean trustedDownload(String url) {
        try {
            URI uri = URI.create(url);
            return "https".equals(uri.getScheme()) && "github.com".equals(uri.getHost()) && uri.getPort() == -1 && uri.getRawUserInfo() == null && uri.getRawQuery() == null && uri.getRawFragment() == null && url.startsWith(DOWNLOAD) && !uri.getRawPath().contains("%") && !uri.getPath().contains("/../");
        } catch (IllegalArgumentException error) { return false; }
    }
    static boolean trustedRedirect(String url) {
        try {
            URI uri = URI.create(url);
            return "https".equals(uri.getScheme()) && uri.getRawUserInfo() == null && uri.getPort() == -1 && uri.getRawFragment() == null && (trustedDownload(url) || "release-assets.githubusercontent.com".equals(uri.getHost()) || "objects.githubusercontent.com".equals(uri.getHost()));
        } catch (IllegalArgumentException error) { return false; }
    }
    static String checksum(String sums, String name) throws IOException {
        String found = null;
        for (String line : sums.split("\\r?\\n")) {
            java.util.regex.Matcher match = java.util.regex.Pattern.compile("^([a-fA-F0-9]{64})\\s+\\*?(.+)$").matcher(line.trim());
            if (match.matches() && match.group(2).equals(name)) {
                if (found != null) throw new IOException("Há somas repetidas para o APK na release.");
                found = match.group(1).toLowerCase(java.util.Locale.ROOT);
            }
        }
        if (found == null) throw new IOException("A release não tem a soma SHA-256 deste APK.");
        return found;
    }
    interface Progress { void changed(long received, long total); }
    static String copy(InputStream input, OutputStream output, long size, Progress progress) throws IOException {
        if (size <= 0 || size > MAX_APK) throw new IOException("O tamanho do APK está ausente ou acima do limite de 256 MB.");
        MessageDigest digest;
        try { digest = MessageDigest.getInstance("SHA-256"); } catch (NoSuchAlgorithmException error) { throw new IOException(error); }
        byte[] buffer = new byte[65536]; long received = 0;
        for (int count; (count = input.read(buffer)) != -1;) {
            received += count;
            if (received > size || received > MAX_APK) throw new IOException("O APK excede o tamanho informado na release.");
            output.write(buffer, 0, count); digest.update(buffer, 0, count); progress.changed(received, size);
        }
        if (received != size) throw new IOException("O download do APK ficou incompleto. Tente novamente.");
        return hex(digest.digest());
    }
    static String hex(byte[] bytes) { StringBuilder text = new StringBuilder(); for (byte value : bytes) text.append(String.format(java.util.Locale.ROOT, "%02x", value & 255)); return text.toString(); }
    static void identity(String installedPackage, String candidatePackage, long installedCode, long candidateCode, String selectedVersion, String candidateVersion, String[] installedSigners, String[] candidateSigners) throws IOException {
        if (!installedPackage.equals(candidatePackage)) throw new IOException("O arquivo baixado pertence a outro aplicativo.");
        if (candidateCode <= installedCode || !selectedVersion.equals(candidateVersion)) throw new IOException("O APK não corresponde à versão nova escolhida.");
        Set<String> old = new HashSet<>(Arrays.asList(installedSigners)), next = new HashSet<>(Arrays.asList(candidateSigners));
        if (old.isEmpty() || !old.equals(next)) throw new IOException("A assinatura deste APK é diferente da versão instalada. Esta instalação antiga precisa de migração manual; o app não substituiu nem removeu seus dados.");
    }
}
