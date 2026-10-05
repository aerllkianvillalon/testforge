import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const uuid = z.string().uuid();

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.safeParse(id).success) {
    return NextResponse.json({ error: 'Unknown set.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  // The user_id filter is belt-and-braces: RLS already scopes deletes to the
  // owner. Both are kept so that a policy change can never silently widen this.
  const { error } = await supabase.from('study_sets').delete().eq('id', id).eq('user_id', user.id);

  if (error) {
    console.error('delete failed', error);
    return NextResponse.json({ error: "We couldn't delete that set." }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
