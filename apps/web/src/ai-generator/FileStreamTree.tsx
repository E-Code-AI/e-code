import { FileCode2, TerminalSquare } from 'lucide-react';
import type { GeneratedFileDelta } from './types';

export function FileStreamTree({ files, logs }: { files: GeneratedFileDelta[]; logs: string[] }) {
  return (
    <div className="ecode-file-stream">
      <div>
        <h3><FileCode2 aria-hidden /> Files</h3>
        <ol>
          {files.map((file) => (
            <li key={file.path} data-layer={file.layer}>
              <span>{file.status}</span>
              <code>{file.path}</code>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h3><TerminalSquare aria-hidden /> Build logs</h3>
        <pre>{logs.join('\n')}</pre>
      </div>
    </div>
  );
}
