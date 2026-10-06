package io.deki.game;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.Dialog;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Insets;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final int PAPER = Color.WHITE;
    private static final int FOREST = Color.rgb(23, 23, 23);
    private static final int MUTED = Color.rgb(112, 112, 112);
    private static final String SETUP_ORIGIN = "https://setup.deki.invalid";
    private WebView web;
    private ValueCallback<Uri[]> photoCallback;
    private android.widget.ImageView launchSplash;
    private volatile String server;
    private String defaultServer = "";
    private SharedPreferences preferences;
    private Dialog connectionDialog;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        preferences = getSharedPreferences("deki", MODE_PRIVATE);
        setRequestedOrientation("landscape".equals(preferences.getString("layout", "portrait")) ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE : ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT);
        String bundledServer = "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(getAssets().open("server-url.txt"), StandardCharsets.UTF_8))) {
            String line = reader.readLine();
            if (line != null) bundledServer = line.trim();
        } catch (IOException ignored) { }
        defaultServer = bundledServer;
        server = preferences.getString("server", bundledServer);
        if (server == null || server.isEmpty() || SETUP_ORIGIN.equals(server)) server = bundledServer;
        boolean needsSetup = server == null || server.isEmpty();
        if (needsSetup) server = SETUP_ORIGIN;
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(PAPER);
        setContentView(root);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) controller.setSystemBarsAppearance(
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
        }
        web = new WebView(this);
        web.setBackgroundColor(PAPER);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " DekiAndroid/1.0");
        settings.setTextZoom(100);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (photoCallback != null) photoCallback.onReceiveValue(null);
                photoCallback = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE); picker.setType("image/*");
                try { startActivityForResult(picker, 42); } catch (Exception error) {photoCallback.onReceiveValue(null);photoCallback=null;}
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageCommitVisible(WebView view, String url) {
                if(launchSplash != null) launchSplash.setVisibility(View.GONE);
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!"GET".equals(request.getMethod()) || !sameOrigin(request.getUrl())) return null;
                String path = request.getUrl().getPath();
                if (path == null) return null;
                String asset;
                if (path.equals("/") || path.equals("/index.html")) asset = "index.html";
                else if (path.equals("/favicon.svg") || path.startsWith("/assets/")) asset = path.substring(1);
                else return null;
                // Assets are APK-owned. Never expose arbitrary paths or the Android file system.
                if (asset.contains("..") || asset.contains("\\")) return localError(404, "Not found");
                try {
                    WebResourceResponse response = new WebResourceResponse(mime(asset), "UTF-8", getAssets().open("web/" + asset));
                    response.setResponseHeaders(Collections.singletonMap("Cache-Control", "no-cache"));
                    return response;
                } catch (IOException error) { return localError(404, "Missing bundled asset"); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("deki".equals(uri.getScheme()) && "layout".equals(uri.getHost())) {
                    String mode = uri.getQueryParameter("mode");
                    if ("portrait".equals(mode) || "landscape".equals(mode)) {
                        preferences.edit().putString("layout",mode).apply();
                        setRequestedOrientation("landscape".equals(mode) ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE : ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT);
                    }
                    return true;
                }
                if ("deki".equals(uri.getScheme()) && "connection".equals(uri.getHost())) {
                    runOnUiThread(() -> showConnection());
                    return true;
                }
                if (sameOrigin(uri)) return false;
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                }
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) runOnUiThread(() -> showConnection());
            }
        });
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        launchSplash = new android.widget.ImageView(this); launchSplash.setImageResource(io.deki.game.R.drawable.brand_logo); launchSplash.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER); launchSplash.setPadding(dp(64), dp(64), dp(64), dp(64));
        launchSplash.setBackgroundColor(Color.WHITE);
        root.addView(launchSplash, new FrameLayout.LayoutParams(-1,-1));
        web.postDelayed(() -> { if(launchSplash != null) launchSplash.setVisibility(View.GONE); }, 5000);
        web.loadUrl(server + "/");
        if (needsSetup) web.post(() -> showConnection());
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0, () -> handleBack());
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==42 && photoCallback!=null) {
            photoCallback.onReceiveValue(resultCode==RESULT_OK && data!=null && data.getData()!=null ? new Uri[]{data.getData()} : null);
            photoCallback=null;
        }
    }
    private boolean sameOrigin(Uri uri) {
        Uri base = Uri.parse(server);
        return String.valueOf(base.getScheme()).equalsIgnoreCase(String.valueOf(uri.getScheme()))
            && String.valueOf(base.getHost()).equalsIgnoreCase(String.valueOf(uri.getHost()))
            && effectivePort(base) == effectivePort(uri);
    }
    private static int effectivePort(Uri uri) { return uri.getPort() >= 0 ? uri.getPort() : "https".equals(uri.getScheme()) ? 443 : 80; }
    private static String mime(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".woff")) return "font/woff";
        if (path.endsWith(".png")) return "image/png";
        return "application/octet-stream";
    }
    private static WebResourceResponse localError(int code, String text) {
        return new WebResourceResponse("text/plain", "UTF-8", code, text, Collections.emptyMap(),
            new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)));
    }
    private int dp(float value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private GradientDrawable background(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable(); drawable.setColor(color); drawable.setCornerRadius(dp(radius)); return drawable;
    }
    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this); view.setText(value); view.setTextSize(size); view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        view.setLineSpacing(dp(4), 1); return view;
    }
    private void space(LinearLayout parent, int height) { View view = new View(this); parent.addView(view, new LinearLayout.LayoutParams(1, dp(height))); }
    private Button button(String label, boolean primary) {
        Button button = new Button(this); button.setText(label); button.setAllCaps(false); button.setTextSize(15);
        button.setTextColor(primary ? PAPER : FOREST); button.setBackground(background(primary ? FOREST : Color.rgb(240, 240, 240), 12));
        button.setMinHeight(dp(52)); button.setPadding(dp(16), dp(12), dp(16), dp(12)); return button;
    }
    private void showConnection() {
        if (isFinishing() || (connectionDialog != null && connectionDialog.isShowing())) return;
        Dialog dialog = new Dialog(this); connectionDialog = dialog;
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        LinearLayout content = new LinearLayout(this); content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(24), dp(25), dp(24), dp(24)); content.setBackground(background(PAPER, 24));
        TextView eyebrow = text("YOUR TABLE, CONNECTED", 10, MUTED, true); eyebrow.setLetterSpacing(.16f); content.addView(eyebrow);
        space(content, 12); content.addView(text("Find your people.", 27, FOREST, true));
        space(content, 12); content.addView(text("Enter your IVI game address. Everyone using the same address can create and join tables over the internet.", 14, MUTED, false));
        space(content, 22); content.addView(text("Game server", 12, FOREST, true)); space(content, 8);
        EditText address = new EditText(this); address.setSingleLine(true); address.setText(SETUP_ORIGIN.equals(server) ? "" : server); address.setHint("https://your-game.onrender.com"); address.setTextSize(15); address.setTextColor(FOREST);
        address.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        address.setPadding(dp(14), dp(12), dp(14), dp(12)); address.setBackground(background(Color.WHITE, 10));
        content.addView(address, new LinearLayout.LayoutParams(-1, dp(54)));
        space(content, 10); TextView error = text("Use the address shared by your table’s host.", 12, MUTED, false); content.addView(error);
        space(content, 20); Button connect = button("Connect to table", true); content.addView(connect, new LinearLayout.LayoutParams(-1, dp(52)));
        if (!defaultServer.isEmpty()) {
            space(content, 10); Button reset = button("Use IVI public server", false);
            content.addView(reset, new LinearLayout.LayoutParams(-1, dp(48)));
            reset.setOnClickListener(view -> {
                server = defaultServer;
                preferences.edit().remove("server").apply();
                dialog.dismiss(); web.loadUrl(server + "/");
            });
        }
        space(content, 10); Button cancel = button("Back to game", false); content.addView(cancel, new LinearLayout.LayoutParams(-1, dp(48)));
        cancel.setOnClickListener(view -> dialog.dismiss());
        connect.setOnClickListener(view -> {
            try {
                String value = address.getText().toString().trim();
                if (!value.contains("://")) value = "https://" + value;
                URI parsed = new URI(value);
                String scheme = parsed.getScheme().toLowerCase(Locale.ROOT);
                if (!("http".equals(scheme) || "https".equals(scheme)) || parsed.getHost() == null
                    || parsed.getUserInfo() != null || parsed.getRawQuery() != null || parsed.getRawFragment() != null
                    || (parsed.getPath() != null && !parsed.getPath().isEmpty() && !"/".equals(parsed.getPath()))
                    || parsed.getPort() == 0 || parsed.getPort() > 65535) throw new Exception();
                server = new URI(scheme, null, parsed.getHost(), parsed.getPort(), null, null, null).toString();
                preferences.edit().putString("server", server).apply();
                dialog.dismiss(); web.loadUrl(server + "/");
            } catch (Exception invalid) { error.setText("Enter an address such as https://your-game.onrender.com. For local testing, include http:// and the port."); error.setTextColor(Color.rgb(164, 74, 55)); }
        });
        dialog.setContentView(content); dialog.show();
        Window window = dialog.getWindow();
        if (window != null) {
            window.setBackgroundDrawableResource(android.R.color.transparent);
            window.setLayout(Math.min(getResources().getDisplayMetrics().widthPixels - dp(28), dp(430)), -2);
            window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE | WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);
        }
    }
    private void handleBack() {
        web.evaluateJavascript("(function(){var d=document.querySelector('dialog[open]');if(d){d.dispatchEvent(new Event('cancel',{bubbles:true,cancelable:true}));return true;}return false;})()", result -> {
            if ("true".equals(result)) return;
            new AlertDialog.Builder(this).setTitle("Taking a break?")
                .setMessage("Your seat will wait while you’re away. Reopen IVI to reconnect.")
                .setNegativeButton("Keep playing", null).setPositiveButton("Leave app", (dialog, which) -> finish()).show();
        });
    }
    @Override public void onBackPressed() { handleBack(); }
    @Override protected void onDestroy() {
        if(photoCallback!=null) {photoCallback.onReceiveValue(null);photoCallback=null;}
        if (connectionDialog != null) connectionDialog.dismiss();
        if (web != null) { web.stopLoading(); web.destroy(); }
        super.onDestroy();
    }
}
