import { API_PREFIX, type DeviceInfo } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import type { ServerConfig } from "../config.js";
import { APP_VERSION } from "../version.js";
import type { RebootService } from "./rebootService.js";
import type { SystemDriver } from "./systemDriver.js";

const DEVICE_PATH = `${API_PREFIX}/device`;

interface DeviceRoutesOptions {
  driver: SystemDriver;
  reboot: RebootService;
  config: ServerConfig;
}

/**
 * `GET /api/device` reports facts about the device. `POST /api/device/reboot` reboots it,
 * answering 202 with the boot that's ending; the device is back when /api/health reports
 * another.
 */
export async function registerDeviceRoutes(
  app: FastifyInstance,
  { driver, reboot, config }: DeviceRoutesOptions,
): Promise<void> {
  app.get(DEVICE_PATH, async (): Promise<DeviceInfo> => {
    const info = await driver.info();
    return {
      ...info,
      softwareVersion: APP_VERSION,
      audioDriver: config.audioDriver,
      systemDriver: driver.name,
      mixerControl: config.mixerControl,
    };
  });

  app.post(`${DEVICE_PATH}/reboot`, async (_request, reply) =>
    reply.code(202).send(await reboot.reboot()),
  );
}
