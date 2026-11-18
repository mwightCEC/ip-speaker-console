import type { NetworkInterfaceInfo } from "node:os";
import { describe, expect, it } from "vitest";
import { connectionTypeOf, primaryInterface } from "./networkConnection.js";

function address(family: "IPv4" | "IPv6", internal = false): NetworkInterfaceInfo {
  return {
    address: family === "IPv4" ? "192.168.0.24" : "fe80::1",
    netmask: "",
    family,
    mac: "58:11:22:4d:89:ed",
    internal,
    cidr: null,
    ...(family === "IPv6" && { scopeid: 0 }),
  } as NetworkInterfaceInfo;
}

describe("connectionTypeOf", () => {
  it.each([
    ["eth0", "ethernet"],
    ["enp3s0", "ethernet"],
    ["Ethernet 2", "ethernet"],
    ["wlan0", "wifi"],
    ["Wi-Fi", "wifi"],
    ["usb0", "other"],
  ])("reads %s as %s", (name, type) => {
    expect(connectionTypeOf(name)).toBe(type);
  });
});

describe("primaryInterface", () => {
  it("prefers an interface with an IPv4 address and skips loopback", () => {
    expect(
      primaryInterface({
        lo: [address("IPv4", true)],
        wlan0: [address("IPv6")],
        eth0: [address("IPv4")],
      }),
    ).toBe("eth0");
  });

  it("finds nothing when only loopback is up", () => {
    expect(primaryInterface({ lo: [address("IPv4", true)] })).toBeUndefined();
  });
});
