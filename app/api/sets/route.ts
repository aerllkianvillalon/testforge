import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveSetSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in to save a set.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  // Re-validated against the generation schemas: the client round-trip is not
  // a reason to trust the payload.
  const parsed = saveSetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "That set didn't match the expected format." }, { status: 400 });
  }

  const { type, title, items, sourceExcerpt, modelVersion } = parsed.data;

  const { data, error } = await supabase
    .from('study_sets')
    .insert({
      user_id: user.id,
      title: title || null,
      type,
      items,
      source_excerpt: sourceExcerpt,
      model_version: modelVersion,
    })
    .select('id')
    .single();

  if (error) {
    console.error('save failed', error);
    return NextResponse.json({ error: "We couldn't save that set. Try again." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
