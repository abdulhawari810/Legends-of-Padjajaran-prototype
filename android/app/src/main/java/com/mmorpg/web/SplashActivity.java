package com.mmorpg.web;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.widget.VideoView;

import androidx.appcompat.app.AppCompatActivity;

// Splash video 10 detik -> MainActivity (game).
// File: android/app/src/main/res/raw/splash.mp4 (huruf kecil semua).
// Kalau file belum ada / error, langsung loncat ke game (tidak crash).
// Ketuk layar = skip.
public class SplashActivity extends AppCompatActivity {

    private static final long MAX_SPLASH_MS = 10_000;

    private boolean wentToMain = false;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable timeout = this::goToMain;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSystemUI();
        setContentView(R.layout.activity_splash);

        int videoRes = getResources().getIdentifier("splash", "raw", getPackageName());
        if (videoRes == 0) {
            goToMain();
            return;
        }

        VideoView video = findViewById(R.id.splash_video);
        video.setOnClickListener(v -> goToMain());
        video.setOnCompletionListener(mp -> goToMain());
        video.setOnErrorListener((mp, what, extra) -> {
            goToMain();
            return true;
        });

        try {
            Uri uri = Uri.parse("android.resource://" + getPackageName() + "/" + videoRes);
            video.setVideoURI(uri);
            video.start();
        } catch (Exception e) {
            goToMain();
            return;
        }

        handler.postDelayed(timeout, MAX_SPLASH_MS);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(timeout);
        super.onDestroy();
    }

    private void goToMain() {
        if (wentToMain) {
            return;
        }
        wentToMain = true;
        handler.removeCallbacks(timeout);
        startActivity(new Intent(this, MainActivity.class));
        // tanpa animasi pindah: langsung diam ke scene game
        overridePendingTransition(0, 0);
        finish();
    }

    private void hideSystemUI() {
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            //noinspection deprecation
            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }
}
