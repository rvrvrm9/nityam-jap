package com.jaapmala.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class FloatingBeadModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "FloatingBeadModule"
        var reactContextInstance: ReactApplicationContext? = null

        fun sendIncrementEvent(count: Int, mala: String) {
            val params = Arguments.createMap().apply {
                putInt("count", count)
                putString("mala", mala)
            }
            reactContextInstance
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("onFloatingBeadIncrement", params)
        }
    }

    init {
        reactContextInstance = reactContext
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun checkPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val hasPermission = Settings.canDrawOverlays(reactContext)
                promise.resolve(hasPermission)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactContext.packageName}")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun showFloatingBead(currentCount: Int, selectedMala: String) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
                requestPermission()
                return
            }

            val intent = Intent(reactContext, FloatingBeadService::class.java).apply {
                putExtra(FloatingBeadService.EXTRA_COUNT, currentCount)
                putExtra(FloatingBeadService.EXTRA_MALA, selectedMala)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun updateCount(count: Int) {
        try {
            if (FloatingBeadService.isRunning) {
                val intent = Intent(reactContext, FloatingBeadService::class.java).apply {
                    putExtra(FloatingBeadService.EXTRA_COUNT, count)
                }
                reactContext.startService(intent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun hideFloatingBead() {
        try {
            val intent = Intent(reactContext, FloatingBeadService::class.java)
            reactContext.stopService(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun isShowing(promise: Promise) {
        promise.resolve(FloatingBeadService.isRunning)
    }
}
