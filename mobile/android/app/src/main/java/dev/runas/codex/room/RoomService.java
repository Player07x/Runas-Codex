package dev.runas.codex.room;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.net.wifi.WifiManager;
import android.os.*;
import androidx.core.app.NotificationCompat;
import dev.runas.codex.MainActivity;
import dev.runas.codex.R;

/** Mantém a transmissão solicitada pelo mestre; nunca reabre uma sala após encerrar o processo. */
public class RoomService extends Service {
  private static final String CHANNEL = "runas-room", STOP = "dev.runas.codex.room.STOP";
  private static volatile Runnable onStop;
  private PowerManager.WakeLock cpu;
  private WifiManager.WifiLock wifi;

  public static void start(Context context, String link, String code, Runnable stop) {
    onStop = stop;
    Intent intent =
        new Intent(context, RoomService.class).putExtra("link", link).putExtra("code", code);
    androidx.core.content.ContextCompat.startForegroundService(context, intent);
  }

  public static void stop(Context context) {
    Runnable callback = onStop;
    onStop = null;
    if (callback != null) callback.run();
    context.stopService(new Intent(context, RoomService.class));
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int id) {
    if (intent == null || STOP.equals(intent.getAction())) {
      stop(this);
      stopSelf();
      return START_NOT_STICKY;
    }
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel channel =
          new NotificationChannel(CHANNEL, "Sala do VTT", NotificationManager.IMPORTANCE_LOW);
      channel.setDescription("Transmissão na rede local enquanto a sala estiver aberta.");
      getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }
    PendingIntent open =
        PendingIntent.getActivity(
            this,
            0,
            new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    PendingIntent end =
        PendingIntent.getService(
            this,
            1,
            new Intent(this, RoomService.class).setAction(STOP),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    String link = intent.getStringExtra("link"), code = intent.getStringExtra("code");
    Notification notification =
        new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_runa)
            .setContentTitle("Sala do VTT aberta")
            .setContentText(link)
            .setStyle(
                new NotificationCompat.BigTextStyle().bigText(link + "\nCódigo da sala: " + code))
            .setContentIntent(open)
            .addAction(0, "Encerrar sala", end)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .build();
    if (Build.VERSION.SDK_INT >= 29)
      startForeground(7301, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
    else startForeground(7301, notification);
    if (cpu == null) {
      cpu =
          ((PowerManager) getSystemService(POWER_SERVICE))
              .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "RunasCodex:Sala");
      cpu.setReferenceCounted(false);
      cpu.acquire();
      WifiManager manager = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
      if (manager != null) {
        wifi = manager.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "RunasCodex:Sala");
        wifi.setReferenceCounted(false);
        wifi.acquire();
      }
    }
    return START_NOT_STICKY;
  }

  @Override
  public void onTaskRemoved(Intent rootIntent) {
    stop(this);
    stopSelf();
  }

  @Override
  public void onDestroy() {
    Runnable callback = onStop;
    onStop = null;
    if (callback != null) callback.run();
    if (cpu != null && cpu.isHeld()) cpu.release();
    if (wifi != null && wifi.isHeld()) wifi.release();
    stopForeground(true);
    super.onDestroy();
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }
}
