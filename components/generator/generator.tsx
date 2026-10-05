'use client';

import { useState } from 'react';
import { GeneratorForm } from '@/components/generator/generator-form';
import { ResultPanel } from '@/components/generator/result-panel';
import type { GeneratedSet } from '@/lib/types';

export function Generator({ signedIn }: { signedIn: boolean }) {
  const [set, setSet] = useState<GeneratedSet | null>(null);

  if (set) return <ResultPanel set={set} signedIn={signedIn} onReset={() => setSet(null)} />;
  return <GeneratorForm onResult={setSet} />;
}
