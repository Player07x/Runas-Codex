package dev.runas.codex.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import dev.runas.codex.MainActivity;
import dev.runas.codex.R;

/**
 * Widget da Agenda na tela inicial: os próximos eventos, como a interface os mandou da última vez
 * (RunasVaultPlugin.setAgendaWidget). Tocar abre a Agenda.
 */
public class AgendaWidget extends AppWidgetProvider {

    public static final String PREFS = "runas-widget";
    private static final int[] ROWS = { R.id.agenda_row_1, R.id.agenda_row_2, R.id.agenda_row_3, R.id.agenda_row_4 };
    private static final int[] WHEN = { R.id.agenda_when_1, R.id.agenda_when_2, R.id.agenda_when_3, R.id.agenda_when_4 };
    private static final int[] TITLE = { R.id.agenda_title_1, R.id.agenda_title_2, R.id.agenda_title_3, R.id.agenda_title_4 };

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, views(context));
    }

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, AgendaWidget.class));
        for (int id : ids) manager.updateAppWidget(id, views(context));
    }

    private static RemoteViews views(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.agenda_widget);
        JSONArray items;
        try {
            items = new JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("items", "[]"));
        } catch (JSONException e) {
            items = new JSONArray();
        }
        for (int i = 0; i < ROWS.length; i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) {
                views.setViewVisibility(ROWS[i], View.GONE);
                continue;
            }
            views.setViewVisibility(ROWS[i], View.VISIBLE);
            views.setTextViewText(WHEN[i], item.optString("when"));
            views.setTextViewText(TITLE[i], item.optString("title"));
        }
        views.setViewVisibility(R.id.agenda_empty, items.length() == 0 ? View.VISIBLE : View.GONE);
        Intent open = new Intent(context, MainActivity.class).putExtra("runasRoute", "/agenda").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.agenda_widget_root, pending);
        return views;
    }
}
