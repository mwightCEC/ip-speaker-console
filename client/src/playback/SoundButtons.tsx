import { ActionIcon, Button, Tooltip } from "@mantine/core";
import {
  IconHeadphones,
  IconHeadphonesOff,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
} from "@tabler/icons-react";

/** "full" is a labelled button; "icon" is an icon-only button for lists. */
type ButtonSize = "full" | "icon";

interface PreviewButtonProps {
  name: string;
  /** This sound is being previewed in the browser. */
  previewing: boolean;
  onPreview: () => void;
  onStopPreview: () => void;
  size?: ButtonSize;
}

/** Plays a sound in this browser only, or stops that preview. */
export function PreviewButton({
  name,
  previewing,
  onPreview,
  onStopPreview,
  size = "full",
}: PreviewButtonProps) {
  const label = previewing ? `Stop preview of ${name}` : `Preview ${name} in this browser`;
  const Icon = previewing ? IconHeadphonesOff : IconHeadphones;
  const onClick = previewing ? onStopPreview : onPreview;

  if (size === "icon") {
    return (
      <Tooltip label={previewing ? "Stop preview" : "Preview in this browser"}>
        <ActionIcon
          variant="default"
          size="lg"
          aria-label={label}
          aria-pressed={previewing}
          onClick={onClick}
        >
          <Icon size={16} aria-hidden />
        </ActionIcon>
      </Tooltip>
    );
  }
  return (
    <Button
      variant="default"
      leftSection={<Icon size={16} aria-hidden />}
      aria-label={label}
      aria-pressed={previewing}
      onClick={onClick}
    >
      {previewing ? "Stop preview" : "Preview"}
    </Button>
  );
}

interface PlayButtonProps {
  name: string;
  /** This sound is playing on the speaker. */
  playing: boolean;
  /** A play request for this sound is in flight. */
  starting: boolean;
  /** A stop request is in flight. */
  stopping?: boolean;
  onPlay: () => void;
  onStop: () => void;
  size?: ButtonSize;
  /** "filled" makes Play the main button of its area. Stop always uses the light style. */
  variant?: "filled" | "light";
}

/** Plays a sound on the speaker, or stops it while it's playing there. */
export function PlayButton({
  name,
  playing,
  starting,
  stopping = false,
  onPlay,
  onStop,
  size = "full",
  variant = "light",
}: PlayButtonProps) {
  const common = playing
    ? {
        color: "danger",
        loading: stopping,
        "aria-label": `Stop ${name} on the speaker`,
        onClick: onStop,
      }
    : { loading: starting, "aria-label": `Play ${name} on the speaker`, onClick: onPlay };
  const Icon = playing ? IconPlayerStopFilled : IconPlayerPlayFilled;

  if (size === "icon") {
    return (
      <Tooltip label={playing ? "Stop on the speaker" : "Play on the speaker"}>
        <ActionIcon variant="light" size="lg" {...common}>
          <Icon size={16} aria-hidden />
        </ActionIcon>
      </Tooltip>
    );
  }
  return (
    <Button
      variant={playing ? "light" : variant}
      leftSection={<Icon size={16} aria-hidden />}
      {...common}
    >
      {playing ? "Stop" : "Play"}
    </Button>
  );
}
