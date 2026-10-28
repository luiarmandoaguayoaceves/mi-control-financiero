package com.luisarmando.micontrolfinanciero;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Puente para el widget: la app web manda las 4 líneas del resumen y aquí se
 * guardan en SharedPreferences para que el widget las pinte sin abrir la app.
 */
@CapacitorPlugin(name = "HomeWidget")
public class HomeWidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        JSObject data = call.getObject("data", new JSObject());
        SharedPreferences prefs = getContext().getSharedPreferences(HomeWidgetProvider.PREFS, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("title", data.getString("title", "Mi Control Financiero"));
        editor.putString("line1", data.getString("line1", ""));
        editor.putString("line2", data.getString("line2", ""));
        editor.putString("line3", data.getString("line3", ""));
        editor.putString("line4", data.getString("line4", ""));
        editor.putString("updated", data.getString("updated", ""));
        editor.apply();

        HomeWidgetProvider.refresh(getContext());
        call.resolve();
    }
}
