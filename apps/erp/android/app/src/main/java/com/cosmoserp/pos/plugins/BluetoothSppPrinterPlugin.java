package com.cosmoserp.pos.plugins;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
  name = "BluetoothSppPrinter",
  permissions = {
    @Permission(
      alias = "bluetooth",
      strings = {
        Manifest.permission.BLUETOOTH,
        Manifest.permission.BLUETOOTH_ADMIN
      }
    ),
    @Permission(
      alias = "bluetooth12",
      strings = {
        Manifest.permission.BLUETOOTH_CONNECT,
        Manifest.permission.BLUETOOTH_SCAN
      }
    )
  }
)
public class BluetoothSppPrinterPlugin extends Plugin {
  private static final UUID DEFAULT_SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

  private final ExecutorService executor = Executors.newSingleThreadExecutor();

  private BluetoothSocket socket;
  private OutputStream out;

  @PluginMethod
  public void ensurePermissions(PluginCall call) {
    if (!needsBluetoothRuntimePermissions()) {
      call.resolve();
      return;
    }

    if (hasAllBluetoothRuntimePermissions()) {
      call.resolve();
      return;
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      requestPermissionForAlias("bluetooth12", call, "permissionsCallback");
    } else {
      requestPermissionForAlias("bluetooth", call, "permissionsCallback");
    }
  }

  @PermissionCallback
  private void permissionsCallback(PluginCall call) {
    if (hasAllBluetoothRuntimePermissions()) call.resolve();
    else call.reject("Bluetooth permission not granted");
  }

  @PluginMethod
  public void listBondedDevices(PluginCall call) {
    if (needsBluetoothRuntimePermissions() && !hasAllBluetoothRuntimePermissions()) {
      call.reject("Bluetooth permission not granted");
      return;
    }

    BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
    if (adapter == null) {
      call.reject("Bluetooth not supported on this device");
      return;
    }

    if (!adapter.isEnabled()) {
      call.reject("Bluetooth is disabled");
      return;
    }

    Set<BluetoothDevice> bonded = adapter.getBondedDevices();
    JSArray arr = new JSArray();

    if (bonded != null) {
      for (BluetoothDevice d : bonded) {
        JSObject o = new JSObject();
        o.put("name", d.getName());
        o.put("address", d.getAddress());
        arr.put(o);
      }
    }

    JSObject res = new JSObject();
    res.put("devices", arr);
    call.resolve(res);
  }

  @PluginMethod
  public void disconnect(PluginCall call) {
    executor.execute(() -> {
      closeSocketQuietly();
      call.resolve();
    });
  }

  @PluginMethod
  public void printBase64(PluginCall call) {
    if (needsBluetoothRuntimePermissions() && !hasAllBluetoothRuntimePermissions()) {
      call.reject("Bluetooth permission not granted");
      return;
    }

    BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
    if (adapter == null) {
      call.reject("Bluetooth not supported on this device");
      return;
    }

    if (!adapter.isEnabled()) {
      call.reject("Bluetooth is disabled");
      return;
    }

    String address = call.getString("address");
    String dataBase64 = call.getString("dataBase64");
    String uuidStr = call.getString("uuid");

    if (address == null || address.trim().isEmpty()) {
      call.reject("Missing 'address'");
      return;
    }
    if (dataBase64 == null || dataBase64.isEmpty()) {
      call.reject("Missing 'dataBase64'");
      return;
    }

    UUID uuid = DEFAULT_SPP_UUID;
    if (uuidStr != null && !uuidStr.trim().isEmpty()) {
      try {
        uuid = UUID.fromString(uuidStr);
      } catch (IllegalArgumentException e) {
        call.reject("Invalid UUID");
        return;
      }
    }

    byte[] bytes;
    try {
      bytes = android.util.Base64.decode(dataBase64, android.util.Base64.DEFAULT);
    } catch (IllegalArgumentException e) {
      call.reject("Invalid base64 payload");
      return;
    }

    UUID finalUuid = uuid;
    executor.execute(() -> {
      try {
        ensureConnected(adapter, address, finalUuid);
        out.write(bytes);
        out.flush();
        call.resolve();
      } catch (Exception e) {
        closeSocketQuietly();
        call.reject(e.getMessage() != null ? e.getMessage() : "Print failed");
      }
    });
  }

  private void ensureConnected(BluetoothAdapter adapter, String address, UUID uuid) throws IOException {
    if (socket != null && socket.isConnected() && out != null) return;

    closeSocketQuietly();

    BluetoothDevice device = adapter.getRemoteDevice(address);

    adapter.cancelDiscovery();
    BluetoothSocket s = device.createRfcommSocketToServiceRecord(uuid);
    s.connect();

    OutputStream o = s.getOutputStream();
    socket = s;
    out = o;
  }

  private void closeSocketQuietly() {
    try {
      if (out != null) out.close();
    } catch (Exception ignored) {}
    try {
      if (socket != null) socket.close();
    } catch (Exception ignored) {}
    out = null;
    socket = null;
  }

  private boolean needsBluetoothRuntimePermissions() {
    return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S;
  }

  private boolean hasAllBluetoothRuntimePermissions() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      return getPermissionState(Manifest.permission.BLUETOOTH_CONNECT) == PermissionState.GRANTED;
    }
    return true;
  }
}
