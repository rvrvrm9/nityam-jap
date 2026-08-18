package com.jaapmala.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

class FloatingBeadService : Service() {

    private var windowManager: WindowManager? = null
    private var floatingView: FrameLayout? = null
    private var params: WindowManager.LayoutParams? = null

    private var countTextView: TextView? = null
    private var beadImageView: ImageView? = null

    private var currentCount = 0
    private var selectedMala = "rudraksha"

    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var lastTapTime: Long = 0
    private val DOUBLE_TAP_THRESHOLD = 300L
    private val CLICK_DRAG_TOLERANCE = 15f

    companion object {
        var isRunning = false
        const val CHANNEL_ID = "nityam_jaap_floating_channel"
        const val NOTIFICATION_ID = 108
        const val EXTRA_COUNT = "extra_count"
        const val EXTRA_MALA = "extra_mala"
        const val ACTION_SHOW = "com.jaapmala.app.ACTION_SHOW"
        const val ACTION_HIDE = "com.jaapmala.app.ACTION_HIDE"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        startForegroundNotification()
        initFloatingView()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let {
            if (it.hasExtra(EXTRA_COUNT)) {
                currentCount = it.getIntExtra(EXTRA_COUNT, currentCount)
            }
            if (it.hasExtra(EXTRA_MALA)) {
                selectedMala = it.getStringExtra(EXTRA_MALA) ?: selectedMala
            }
            updateBeadDrawable()
            updateCountDisplay()

            val action = it.action
            if (action == ACTION_HIDE) {
                floatingView?.visibility = View.GONE
            } else {
                floatingView?.visibility = View.VISIBLE
            }
        }
        return START_NOT_STICKY
    }

    private fun startForegroundNotification() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "नित्यम जप साधना (Floating Bead)",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "फ्लोटिंग मनका स्क्रीन पर सक्रिय है"
                    setShowBadge(false)
                }
                val manager = getSystemService(NotificationManager::class.java)
                manager?.createNotificationChannel(channel)
            }

            val launchIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            )

            val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("नित्यम जप साधना 📿")
                .setContentText("फ्लोटिंग मनका सक्रिय है। स्क्रीन पर टैप करके जाप करें।")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                    } else {
                        0
                    }
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun initFloatingView() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            return
        }

        try {
            windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

            val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

            params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = 40
                y = 350
            }

            val density = resources.displayMetrics.density
            floatingView = FrameLayout(this).apply {
                setPadding(8, 8, 8, 8)
                clipChildren = false
                clipToPadding = false
            }

            val innerLayout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
                clipChildren = false
                clipToPadding = false
            }

            // Bead Frame with glow
            val beadFrame = FrameLayout(this).apply {
                val size = (64 * density).toInt()
                layoutParams = LinearLayout.LayoutParams(size, size)
                val glowBg = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.parseColor("#33E05E26"))
                    setStroke((2 * density).toInt(), Color.parseColor("#FFA726"))
                }
                background = glowBg
                setPadding(4, 4, 4, 4)
                clipChildren = false
                clipToPadding = false
            }

            // Bead Image
            beadImageView = ImageView(this).apply {
                val size = (56 * density).toInt()
                layoutParams = FrameLayout.LayoutParams(size, size, Gravity.CENTER)
                scaleType = ImageView.ScaleType.FIT_CENTER
                setImageResource(getBeadDrawableResource(selectedMala))
            }
            beadFrame.addView(beadImageView)

            // Close button
            val closeBtn = TextView(this).apply {
                text = "✕"
                textSize = 9f
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
                val btnSize = (18 * density).toInt()
                layoutParams = FrameLayout.LayoutParams(btnSize, btnSize, Gravity.TOP or Gravity.END)
                val btnBg = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.parseColor("#E53935"))
                    setStroke((1 * density).toInt(), Color.WHITE)
                }
                background = btnBg
                setOnClickListener {
                    stopSelf()
                }
            }
            beadFrame.addView(closeBtn)

            innerLayout.addView(beadFrame)

            // Count Badge
            countTextView = TextView(this).apply {
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = (2 * density).toInt()
                }
                layoutParams = lp
                text = "$currentCount/108"
                textSize = 10.5f
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
                setPadding((7 * density).toInt(), (1 * density).toInt(), (7 * density).toInt(), (1 * density).toInt())
                val pillBg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = 10 * density
                    setColor(Color.parseColor("#E05E26"))
                    setStroke((1 * density).toInt(), Color.WHITE)
                }
                background = pillBg
            }
            innerLayout.addView(countTextView)

            floatingView?.addView(innerLayout)

            // Touch Listener on Bead Frame
            beadFrame.setOnTouchListener(object : View.OnTouchListener {
                override fun onTouch(v: View?, event: MotionEvent?): Boolean {
                    if (event == null || params == null) return false

                    when (event.action) {
                        MotionEvent.ACTION_DOWN -> {
                            initialX = params!!.x
                            initialY = params!!.y
                            initialTouchX = event.rawX
                            initialTouchY = event.rawY
                            return true
                        }
                        MotionEvent.ACTION_MOVE -> {
                            val dx = (event.rawX - initialTouchX).toInt()
                            val dy = (event.rawY - initialTouchY).toInt()
                            params!!.x = initialX + dx
                            params!!.y = initialY + dy
                            try {
                                windowManager?.updateViewLayout(floatingView, params)
                            } catch (_: Exception) {}
                            return true
                        }
                        MotionEvent.ACTION_UP -> {
                            val dx = Math.abs(event.rawX - initialTouchX)
                            val dy = Math.abs(event.rawY - initialTouchY)

                            if (dx < CLICK_DRAG_TOLERANCE * density && dy < CLICK_DRAG_TOLERANCE * density) {
                                val currentTime = System.currentTimeMillis()
                                if (currentTime - lastTapTime < DOUBLE_TAP_THRESHOLD) {
                                    openMainActivity()
                                } else {
                                    onBeadTapped()
                                }
                                lastTapTime = currentTime
                            }
                            return true
                        }
                    }
                    return false
                }
            })

            windowManager?.addView(floatingView, params)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun onBeadTapped() {
        currentCount++
        triggerVibration(false)

        // Visual Pulse Effect
        beadImageView?.animate()
            ?.scaleX(1.25f)
            ?.scaleY(1.25f)
            ?.setDuration(80)
            ?.withEndAction {
                beadImageView?.animate()
                    ?.scaleX(1.0f)
                    ?.scaleY(1.0f)
                    ?.setDuration(80)
                    ?.start()
            }
            ?.start()

        if (currentCount >= 108) {
            currentCount = 0
            triggerVibration(true)
        }

        updateCountDisplay()

        // Send event to React Native JS
        FloatingBeadModule.sendIncrementEvent(currentCount, selectedMala)
    }

    private fun updateCountDisplay() {
        Handler(Looper.getMainLooper()).post {
            countTextView?.text = "$currentCount/108"
        }
    }

    private fun updateBeadDrawable() {
        Handler(Looper.getMainLooper()).post {
            beadImageView?.setImageResource(getBeadDrawableResource(selectedMala))
        }
    }

    private fun getBeadDrawableResource(mala: String): Int {
        return when (mala.lowercase()) {
            "rudraksha" -> R.drawable.bead_rudraksha
            "tulsi" -> R.drawable.bead_tulsi
            "chandan" -> R.drawable.bead_chandan
            "crystal" -> R.drawable.bead_crystal
            "kamalgatta", "kamal" -> R.drawable.bead_kamalgatta
            "karungali" -> R.drawable.bead_karungali
            "om" -> R.drawable.bead_om
            else -> R.drawable.bead_rudraksha
        }
    }

    private fun triggerVibration(isCompletion: Boolean) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                val vibrator = vibratorManager?.defaultVibrator
                if (isCompletion) {
                    vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 150, 100, 250), -1))
                } else {
                    vibrator?.vibrate(VibrationEffect.createOneShot(45, VibrationEffect.DEFAULT_AMPLITUDE))
                }
            } else {
                @Suppress("DEPRECATION")
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (isCompletion) {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(longArrayOf(0, 150, 100, 250), -1)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(45)
                }
            }
        } catch (_: Exception) {}
    }

    private fun openMainActivity() {
        try {
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // Whenever the app is closed/swiped away from recent tasks, automatically stop service & remove bead
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        if (floatingView != null) {
            try {
                windowManager?.removeView(floatingView)
            } catch (_: Exception) {}
            floatingView = null
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
        } catch (_: Exception) {}
    }
}
