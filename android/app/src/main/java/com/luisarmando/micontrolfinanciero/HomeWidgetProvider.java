package com.luisarmando.micontrolfinanciero;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Widget de la pantalla de inicio. No calcula nada: pinta el resumen que la
 * app web dejó guardado en SharedPreferences (vía HomeWidgetPlugin).
 */
public class HomeWidgetProvider extends AppWidgetProvider {

    public static final String PREFS = "mcf_widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        for (int widgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_home);
            views.setTextViewText(R.id.widget_title, prefs.getString("title", "Mi Control Financiero"));
            views.setTextViewText(R.id.widget_line1, prefs.getString("line1", "Abre la app para ver tus datos"));
            views.setTextViewText(R.id.widget_line2, prefs.getString("line2", ""));
            views.setTextViewText(R.id.widget_line3, prefs.getString("line3", ""));
            views.setTextViewText(R.id.widget_line4, prefs.getString("line4", ""));
            views.setTextViewText(R.id.widget_updated, prefs.getString("updated", ""));

            Intent openApp = new Intent(context, MainActivity.class);
            openApp.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pending = PendingIntent.getActivity(
                context,
                0,
                openApp,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_root, pending);

            appWidgetManager.updateAppWidget(widgetId, views);
        }
    }

    /** Refresca todos los widgets colocados (lo llama el plugin al guardar). */
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, HomeWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        if (ids != null && ids.length > 0) {
            new HomeWidgetProvider().onUpdate(context, manager, ids);
        }
    }
}
