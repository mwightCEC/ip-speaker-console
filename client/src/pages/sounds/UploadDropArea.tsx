import { Box, Stack, Text } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import classes from "./UploadDropArea.module.css";

interface UploadDropAreaProps {
  onDrop: (files: File[]) => void;
  children: ReactNode;
}

/** Whether something being dragged is files, rather than text or a link from the page. */
function carriesFiles(event: DragEvent): boolean {
  return event.dataTransfer.types.includes("Files");
}

/**
 * Accepts files dragged onto its content, showing a "drop here" overlay while they're over it.
 * The Upload button does the same for people who don't drag, or can't.
 */
export function UploadDropArea({ onDrop, children }: UploadDropAreaProps) {
  const [dragging, setDragging] = useState(false);
  // Entering a child fires dragleave on the parent, so count rather than toggle.
  const depth = useRef(0);

  return (
    <Box
      className={classes.area}
      data-dragging={dragging || undefined}
      onDragEnter={(event) => {
        if (!carriesFiles(event)) return;
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (!carriesFiles(event)) return;
        depth.current = Math.max(depth.current - 1, 0);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        onDrop([...event.dataTransfer.files]);
      }}
    >
      {children}
      {dragging && (
        <Stack className={classes.overlay} align="center" justify="center" gap="xs">
          <IconUpload size={32} aria-hidden />
          <Text fw={600}>Drop WAV files to upload them</Text>
        </Stack>
      )}
    </Box>
  );
}
