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
        super.onCreate(savedInstanceState);
    }
}
