'use client';

import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Label, Select, Textarea } from '@/components/ui/field';
import {
  FileTextIcon,
  LayersIcon,
  ListChecksIcon,
  SparklesIcon,
  SpinnerIcon,
  UploadIcon,
} from '@/components/ui/icons';
import { Segmented } from '@/components/ui/segmented';
import { NETWORK_ERROR } from '@/lib/api-client';
import { fileTooLargeMessage, MAX_FILE_BYTES, MAX_FILE_MB, MAX_SOURCE_CHARS } from '@/lib/limits';
import { cn } from '@/lib/utils';
import { MAX_ITEMS, MIN_ITEMS } from '@/lib/validation';
import type { GeneratedSet } from '@/lib/types';
import type { Difficulty, StudySetType } from '@/lib/ai/schemas';

// Real material, so "Try sample notes" produces a genuinely useful first set.
const SAMPLE_NOTES = `Photosynthesis is the process by which plants, algae and some bacteria convert light energy into chemical energy stored in glucose. It takes place in chloroplasts, which contain the green pigment chlorophyll.

The light-dependent reactions happen in the thylakoid membranes: light splits water molecules, releasing oxygen and producing ATP and NADPH. The Calvin cycle, which occurs in the stroma, uses that ATP and NADPH to fix carbon dioxide into glucose.

The overall equation is 6CO2 + 6H2O + light energy → C6H12O6 + 6O2. The rate of photosynthesis is limited by light intensity, carbon dioxide concentration and temperature.`;

export function GeneratorForm({ onResult }: { onResult: (set: GeneratedSet) => void }) {
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<StudySetType>('flashcards');
  const [itemCount, setItemCount] = useState(8);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const overLimit = text.length > MAX_SOURCE_CHARS;
  const canSubmit = !pending && (mode === 'paste' ? text.trim().length > 0 && !overLimit : Boolean(file));

  function pickFile(next: File | null) {
    setError(null);
    setFile(next);
  }

  function dropFile(dropped: File | undefined) {
    if (!dropped) return;
    // The picker filters by `accept`; a drop doesn't, so check here.
    if (!/\.(pdf|txt)$/i.test(dropped.name)) {
      setError('That file type isn’t supported. Use a PDF or a .txt file.');
      return;
    }
    pickFile(dropped);
  }

  function clearFile() {
    pickFile(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function submit() {
    setError(null);
    setNotice(null);

    // Mirrors the server-side cap so the common mistake gets an instant answer.
    // The server check is the one that counts.
    if (mode === 'upload' && file && file.size > MAX_FILE_BYTES) {
      setError(fileTooLargeMessage(file.size));
      return;
    }

    const body = new FormData();
    body.set('type', type);
    body.set('itemCount', String(itemCount));
    body.set('difficulty', difficulty);
    if (mode === 'paste') body.set('text', text);
    else if (file) body.set('file', file);

    setPending(true);
    try {
      const response = await fetch('/api/generate', { method: 'POST', body });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? 'Something failed on our side. Try again in a moment.');
        return;
      }

      if (payload.truncated) {
        setNotice(`Your notes were longer than ${MAX_SOURCE_CHARS.toLocaleString()} characters, so only the first part was used.`);
      }

      onResult({
        type: payload.type,
        items: payload.items,
        modelVersion: payload.modelVersion,
        sourceExcerpt: payload.sourceExcerpt,
      });
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  const nearLimit = text.length > MAX_SOURCE_CHARS * 0.9;

  return (
    <Card className="text-left shadow-md">
      <CardBody className="space-y-6 p-5 sm:p-7">
        <Segmented
          label="Where your notes come from"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'paste', label: 'Paste text', icon: <FileTextIcon /> },
            { value: 'upload', label: 'Upload a file', icon: <UploadIcon /> },
          ]}
        />

        {mode === 'paste' ? (
          <div>
            <Label htmlFor="notes">Your notes</Label>
            <Textarea
              id="notes"
              rows={10}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canSubmit) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Paste lecture notes, a textbook section, or your own summary."
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p
                className={cn(
                  'text-xs tabular-nums',
                  overLimit ? 'text-destructive' : nearLimit ? 'text-warning' : 'text-muted-foreground',
                )}
              >
                {text.length.toLocaleString()} / {MAX_SOURCE_CHARS.toLocaleString()} characters
                {overLimit ? ' — trim this down before generating.' : ''}
              </p>
              {text.length === 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE_NOTES)}>
                  <SparklesIcon className="size-3.5" />
                  Try sample notes
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <label
              htmlFor="file"
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                dropFile(event.dataTransfer.files?.[0]);
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors',
                'hover:bg-accent/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
                dragOver && 'border-foreground bg-accent',
              )}
            >
              <input
                id="file"
                ref={fileInput}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
              <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
                {file ? <FileTextIcon className="size-5" /> : <UploadIcon className="size-5" />}
              </span>
              {file ? (
                <span>
                  <span className="block text-sm font-medium">{file.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatSize(file.size)} · click to choose a different file
                  </span>
                </span>
              ) : (
                <span>
                  <span className="block text-sm font-medium">Drop a PDF or text file here, or click to browse</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Up to {MAX_FILE_MB}MB. Scanned PDFs without selectable text won&apos;t work — paste the text instead.
                  </span>
                </span>
              )}
            </label>
            {file ? (
              <Button variant="ghost" size="sm" onClick={clearFile} className="mt-2">
                Remove file
              </Button>
            ) : null}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="mb-2 text-sm font-medium leading-none">Output</p>
            <Segmented
              label="Output"
              value={type}
              onChange={setType}
              className="w-full"
              options={[
                { value: 'flashcards', label: 'Flashcards', icon: <LayersIcon /> },
                { value: 'quiz', label: 'Quiz', icon: <ListChecksIcon /> },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="count">Items</Label>
            <Select id="count" value={itemCount} onChange={(e) => setItemCount(Number(e.target.value))}>
              {countOptions().map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </div>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}
        {notice ? <Alert tone="info">{notice}</Alert> : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={submit} disabled={!canSubmit} aria-busy={pending}>
            {pending ? <SpinnerIcon className="animate-spin" /> : <SparklesIcon />}
            {pending ? 'Generating…' : 'Generate'}
          </Button>
          {pending ? (
            <p className="text-sm text-muted-foreground" role="status">
              Reading your notes and writing {type === 'flashcards' ? 'cards' : 'questions'} — this takes a few seconds.
            </p>
          ) : mode === 'paste' ? (
            <p className="hidden text-xs text-muted-foreground sm:block">or press Ctrl + Enter</p>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

function countOptions(): number[] {
  const options: number[] = [];
  for (let n = MIN_ITEMS; n <= MAX_ITEMS; n += 1) options.push(n);
  return options;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}