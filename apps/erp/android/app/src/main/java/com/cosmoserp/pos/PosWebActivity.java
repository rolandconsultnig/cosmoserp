package com.cosmoserp.pos;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.cosmoserp.pos.plugins.BluetoothSppPrinterPlugin;
import com.cosmoserp.pos.plugins.AuthBridgePlugin;

public class PosWebActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    registerPlugin(BluetoothSppPrinterPlugin.class);
    registerPlugin(AuthBridgePlugin.class);
  }
}
