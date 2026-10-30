package dev.runas.codex;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import dev.runas.codex.vault.RunasVaultPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // O cofre real (plugin próprio, fora do npm) precisa ser registrado antes de a ponte subir.
        registerPlugin(RunasVaultPlugin.class);
        registerPlugin(dev.runas.codex.updates.RunasUpdatesPlugin.class);
        registerPlugin(dev.runas.codex.room.RunasRoomPlugin.class);
        super.onCreate(savedInstanceState);
        registerBackNavigation();
    }

    /**
     * Voltar do sistema (R1): fecha o diálogo aberto, senão volta uma tela no app; só na primeira tela sai do app.
     * Sem isto o Android fechava o app no primeiro toque em voltar.
     */
    private void registerBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new androidx.activity.OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                android.webkit.WebView webView = getBridge() == null ? null : getBridge().getWebView();
                if (webView == null) { leave(); return; }
                // O app decide (app/src/lib/router.ts, systemBack): fecha o diálogo ou volta pelo próprio histórico.
                webView.evaluateJavascript(
                    "(window.runasCodexVoltar ? window.runasCodexVoltar() : null)",
                    handled -> {
                        if ("true".equals(handled)) return;
                        // Sem resposta do app (ainda carregando), vale o histórico do WebView.
                        if (!"false".equals(handled) && webView.canGoBack()) webView.goBack();
                        else leave();
                    });
            }

            private void leave() {
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
    }
}
