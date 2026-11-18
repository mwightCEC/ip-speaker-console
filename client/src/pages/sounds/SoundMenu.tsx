import { ActionIcon, Menu } from "@mantine/core";
import {
  IconDots,
  IconDownload,
  IconPencil,
  IconPin,
  IconPinnedOff,
  IconTrash,
} from "@tabler/icons-react";
import { soundFileUrl } from "../../api/sounds";
import type { SoundItemProps } from "./soundItemProps";

type SoundMenuProps = Pick<SoundItemProps, "sound" | "onRename" | "onTogglePin" | "onDelete">;

/** The "…" menu: pin, download, and for uploads, rename and delete. */
export function SoundMenu({ sound, onRename, onTogglePin, onDelete }: SoundMenuProps) {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label={`More actions for ${sound.name}`}
        >
          <IconDots size={18} aria-hidden />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={
            sound.pinned ? (
              <IconPinnedOff size={16} aria-hidden />
            ) : (
              <IconPin size={16} aria-hidden />
            )
          }
          onClick={onTogglePin}
        >
          {sound.pinned ? "Unpin from Quick play" : "Pin to Quick play"}
        </Menu.Item>
        <Menu.Item
          component="a"
          href={soundFileUrl(sound.id, { download: true })}
          download
          leftSection={<IconDownload size={16} aria-hidden />}
        >
          Download
        </Menu.Item>
        {sound.builtIn ? (
          <Menu.Label>Built-in sounds can't be renamed or deleted.</Menu.Label>
        ) : (
          <>
            <Menu.Item leftSection={<IconPencil size={16} aria-hidden />} onClick={onRename}>
              Rename
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="danger"
              leftSection={<IconTrash size={16} aria-hidden />}
              onClick={onDelete}
            >
              Delete
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
