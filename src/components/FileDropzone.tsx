import { useCallback, useRef, useState } from 'react';

interface Props {
  onFileAccepted: (file: File) => void;
  disabled?: boolean;
  status?: string;
}

const FileDropzone = ({ onFileAccepted, disabled = false, status }: Props) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const file = files[0];
    if (!file.name.endsWith('.ttl')) {
      // We only support Turtle for now to keep parsing predictable.
      return;
    }
    onFileAccepted(file);
  }, [onFileAccepted]);

  return (
    <div
      className={['dropzone', disabled ? 'disabled' : '', isDragging ? 'dragging' : ''].join(' ').trim()}
      onDragOver={(event) => {
        event.preventDefault();
        if (disabled) return;
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        if (disabled) return;
        setDragging(false);
        handleFiles(event.dataTransfer?.files ?? null);
      }}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".ttl"
        hidden
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />
      <p className="dropzone-title">Drop a Turtle (.ttl) file here</p>
      <p className="dropzone-sub">or click to browse</p>
      {status && <p className="dropzone-status">{status}</p>}
    </div>
  );
};

export default FileDropzone;
