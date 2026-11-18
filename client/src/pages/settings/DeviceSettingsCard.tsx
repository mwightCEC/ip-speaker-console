import { DEVICE_NAME_MAX_LENGTH, type DeviceSettings } from "@ip-speaker-console/shared";
import { Button, Group, Select, Skeleton, Stack, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { ApiRequestError } from "../../api/apiRequest";
import { updateSettings } from "../../api/device";
import { SectionCard } from "../../components/SectionCard";
import classes from "./DeviceSettingsCard.module.css";
import { timeZoneOptions, type TimeZoneOption } from "./timeZones";

/** The device name and time zone, with Save. */
export function DeviceSettingsCard({ settings }: { settings: DeviceSettings | undefined }) {
  return (
    <SectionCard title="Device">
      {settings ? (
        // Keyed so the form shows a change saved here or in another browser.
        <SettingsForm key={`${settings.deviceName}|${settings.timeZone}`} settings={settings} />
      ) : (
        <Stack gap="md">
          <Skeleton h={58} />
          <Skeleton h={58} />
        </Stack>
      )}
    </SectionCard>
  );
}

function SettingsForm({ settings }: { settings: DeviceSettings }) {
  const [deviceName, setDeviceName] = useState(settings.deviceName);
  const [timeZone, setTimeZone] = useState(settings.timeZone);
  const [nameError, setNameError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const options = useMemo(() => timeZoneOptions(settings.timeZone), [settings.timeZone]);

  const changed = deviceName.trim() !== settings.deviceName || timeZone !== settings.timeZone;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (deviceName.trim() === "") {
      setNameError("Give the speaker a name.");
      return;
    }
    setSaving(true);
    try {
      await updateSettings({ deviceName, timeZone });
      notifications.show({
        color: "success",
        title: "Settings saved",
        message: "The speaker is using the new settings.",
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "invalid_name") {
        setNameError(error.message);
      } else {
        notifications.show({
          color: "danger",
          title: "Couldn't save the settings",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void save(event)}>
      <Stack gap="md">
        <TextInput
          label="Name"
          description="Shown in the browser tab, to tell speakers apart."
          value={deviceName}
          maxLength={DEVICE_NAME_MAX_LENGTH}
          error={nameError}
          onChange={(event) => {
            setDeviceName(event.currentTarget.value);
            setNameError(undefined);
          }}
        />
        <TimeZoneSelect options={options} value={timeZone} onChange={setTimeZone} />
        <Group justify="flex-end">
          <Button type="submit" loading={saving} disabled={!changed}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

interface TimeZoneSelectProps {
  options: TimeZoneOption[];
  value: string;
  onChange: (timeZone: string) => void;
}

/**
 * A searchable list of time zones that opens and closes on click, like a plain dropdown. Opening
 * it empties the field (the current zone stays as a faded hint), so typing starts a new search
 * instead of editing the current zone's name.
 */
function TimeZoneSelect({ options, value, onChange }: TimeZoneSelectProps) {
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState("");
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  // Whether the list was open when the click began; by the time onClick runs, Mantine has
  // already opened it.
  const openWhenPressed = useRef(false);

  return (
    <Select
      label="Time zone"
      description="The speaker's clock, and the times shown in the console."
      data={options}
      value={value}
      onChange={(next) => next && onChange(next)}
      searchable
      allowDeselect={false}
      nothingFoundMessage="No time zone matches"
      searchValue={opened ? search : selectedLabel}
      onSearchChange={setSearch}
      placeholder={selectedLabel}
      dropdownOpened={opened}
      onDropdownOpen={() => {
        setSearch("");
        setOpened(true);
      }}
      onDropdownClose={() => setOpened(false)}
      onMouseDown={() => {
        openWhenPressed.current = opened;
      }}
      onClick={() => {
        if (openWhenPressed.current) setOpened(false);
      }}
      classNames={{ input: classes.timeZoneInput }}
    />
  );
}
