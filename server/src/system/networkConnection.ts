import { networkInterfaces } from "node:os";
import type { ConnectionType } from "@ip-speaker-console/shared";

/**
 * Guesses a connection's type from its interface name: "wlan0" or "Wi-Fi" is wireless,
 * "eth0", "enp3s0" or "Ethernet" is wired.
 */
export function connectionTypeOf(interfaceName: string): ConnectionType {
  if (/^(wl|wi-?fi|wireless)/iu.test(interfaceName)) {
    return "wifi";
  }
  if (/^(eth|en|ethernet)/iu.test(interfaceName)) {
    return "ethernet";
  }
  return "other";
}

/**
 * The name of the interface the device is connected through: the first with an external IPv4
 * address, else the first with any external address. Undefined when it isn't connected.
 */
export function primaryInterface(
  interfaces: ReturnType<typeof networkInterfaces> = networkInterfaces(),
): string | undefined {
  const external = Object.entries(interfaces).filter(([, entries]) =>
    (entries ?? []).some((entry) => !entry.internal),
  );
  const withIPv4 = external.find(([, entries]) =>
    (entries ?? []).some((entry) => !entry.internal && entry.family === "IPv4"),
  );
  return (withIPv4 ?? external[0])?.[0];
}
