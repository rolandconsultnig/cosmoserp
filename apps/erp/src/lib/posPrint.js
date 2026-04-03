import { Capacitor, registerPlugin } from '@capacitor/core';

const BluetoothSppPrinter = registerPlugin('BluetoothSppPrinter');

const SETTINGS_KEY = 'posPrinterSettings';

export function getPrinterSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {
        mode: 'SYSTEM',
        drawerEnabled: false,
        btSpp: null,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      mode: parsed?.mode || 'SYSTEM',
      drawerEnabled: parsed?.drawerEnabled === true,
      usb: parsed?.usb || null,
      ble: parsed?.ble || null,
      btSpp: parsed?.btSpp || null,
    };
  } catch {
    return { mode: 'SYSTEM', drawerEnabled: false, btSpp: null };
  }
}

export function setPrinterSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getPrintSupport() {
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.getPlatform && Capacitor.getPlatform() !== 'web';
  return {
    system: true,
    usb: typeof navigator !== 'undefined' && !!navigator.usb,
    ble: typeof navigator !== 'undefined' && !!navigator.bluetooth,
    btSpp: isNative,
  };
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function listBondedBluetoothPrinters() {
  const support = getPrintSupport();
  if (!support.btSpp) throw new Error('Bluetooth SPP printing is only available in the Android app');
  await BluetoothSppPrinter.ensurePermissions();
  const res = await BluetoothSppPrinter.listBondedDevices();
  return res?.devices || [];
}

function escposEncodeReceipt({ sale, tenant, user }) {
  const enc = new TextEncoder();

  const lines = [];
  const tn = tenant?.tradingName || tenant?.businessName || 'Mixtio POS';

  lines.push('\x1B\x40'); // init
  lines.push('\x1B\x61\x01'); // center
  lines.push(tn + '\n');
  lines.push('Point of Sale Receipt\n');
  lines.push((sale?.receiptNo || '') + '\n');
  lines.push(new Date().toLocaleString('en-NG') + '\n');
  lines.push('\n');

  lines.push('\x1B\x61\x00'); // left
  lines.push(`Cashier: ${user?.firstName || ''} ${user?.lastName || ''}`.trim() + '\n');
  if (sale?.customerName) lines.push(`Customer: ${sale.customerName}\n`);
  lines.push('--------------------------------\n');

  for (const it of sale?.items || []) {
    const name = String(it.name || '').slice(0, 32);
    const qty = Number(it.qty) || 0;
    const unitPrice = Number(it.unitPrice) || 0;
    const total = qty * unitPrice;
    lines.push(`${name}\n`);
    lines.push(`  ${qty} x ${unitPrice.toFixed(2)} = ${total.toFixed(2)}\n`);
  }

  lines.push('--------------------------------\n');
  lines.push(`Subtotal: ${(Number(sale?.subtotal) || 0).toFixed(2)}\n`);
  if ((Number(sale?.discountAmt) || 0) > 0) {
    lines.push(`Discount: -${(Number(sale.discountAmt) || 0).toFixed(2)}\n`);
  }
  lines.push(`VAT: ${(Number(sale?.vat) || 0).toFixed(2)}\n`);
  lines.push(`TOTAL: ${(Number(sale?.total) || 0).toFixed(2)}\n`);
  lines.push(`Payment: ${sale?.payMethod || ''}\n`);

  if (sale?.payMethod === 'CASH') {
    lines.push(`Tendered: ${(Number(sale?.amountTendered) || 0).toFixed(2)}\n`);
    lines.push(`Change: ${(Number(sale?.change) || 0).toFixed(2)}\n`);
  }

  lines.push('\nThank you!\n\n');

  // cut
  lines.push('\x1D\x56\x41\x10');

  const joined = lines.join('');
  return enc.encode(joined);
}

function escposDrawerKick() {
  // ESC p m t1 t2 (kick drawer on pin 2)
  return new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
}

async function bleConnect() {
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      // Common BLE printer services vary; we just request generic access.
      0x1800,
      0x1801,
    ],
  });
  const server = await device.gatt.connect();

  // Heuristic: find first writable characteristic.
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    for (const ch of chars) {
      if (ch.properties?.writeWithoutResponse || ch.properties?.write) {
        return { device, server, characteristic: ch };
      }
    }
  }
  throw new Error('No writable BLE characteristic found on this device');
}

async function bleWriteAll(characteristic, data) {
  // BLE MTU is limited. Chunk conservatively.
  const chunkSize = 180;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (characteristic.properties?.writeWithoutResponse) {
      // eslint-disable-next-line no-await-in-loop
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      // eslint-disable-next-line no-await-in-loop
      await characteristic.writeValue(chunk);
    }
  }
}

async function usbConnect() {
  const device = await navigator.usb.requestDevice({ filters: [] });
  await device.open();
  if (device.configuration == null) {
    await device.selectConfiguration(1);
  }

  const iface = device.configuration.interfaces.find((i) => i.alternates?.some((a) => a.endpoints?.length));
  if (!iface) throw new Error('No USB interface found');

  const alt = iface.alternates[0];
  await device.claimInterface(iface.interfaceNumber);

  const outEp = alt.endpoints.find((e) => e.direction === 'out');
  if (!outEp) throw new Error('No OUT endpoint found');

  return { device, interfaceNumber: iface.interfaceNumber, endpointNumber: outEp.endpointNumber };
}

async function usbWriteAll(conn, data) {
  const chunkSize = 1024;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    // eslint-disable-next-line no-await-in-loop
    await conn.device.transferOut(conn.endpointNumber, chunk);
  }
}

export async function printReceipt({ sale, tenant, user }) {
  const settings = getPrinterSettings();

  if (settings.mode === 'SYSTEM') {
    window.print();
    return { mode: 'SYSTEM' };
  }

  const bytes = escposEncodeReceipt({ sale, tenant, user });
  const kick = settings.drawerEnabled ? escposDrawerKick() : null;

  if (settings.mode === 'USB') {
    if (!navigator.usb) throw new Error('USB printing not supported on this device/browser');
    const conn = await usbConnect();
    await usbWriteAll(conn, bytes);
    if (kick) await usbWriteAll(conn, kick);
    return { mode: 'USB' };
  }

  if (settings.mode === 'BLE') {
    if (!navigator.bluetooth) throw new Error('Bluetooth printing not supported on this device/browser');
    const conn = await bleConnect();
    await bleWriteAll(conn.characteristic, bytes);
    if (kick) await bleWriteAll(conn.characteristic, kick);
    return { mode: 'BLE' };
  }

  if (settings.mode === 'BT_SPP') {
    const support = getPrintSupport();
    if (!support.btSpp) throw new Error('Bluetooth SPP printing is only available in the Android app');
    const address = settings?.btSpp?.address;
    if (!address) throw new Error('No Bluetooth printer selected');

    await BluetoothSppPrinter.ensurePermissions();

    const payload = kick ? new Uint8Array([...bytes, ...kick]) : bytes;
    await BluetoothSppPrinter.printBase64({
      address,
      dataBase64: bytesToBase64(payload),
    });
    return { mode: 'BT_SPP' };
  }

  throw new Error('Unknown printer mode');
}
