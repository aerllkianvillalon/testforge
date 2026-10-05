import { Generator } from '@/components/generator/generator';
import { HeroDeck } from '@/components/hero-deck';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DownloadIcon,
  FileTextIcon,
  InfoIcon,
  LayersIcon,
  ListChecksIcon,
  SparklesIcon,
  UploadIcon,
  UserIcon,
} from '@/components/ui/icons';
import { getSessionUser } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: LayersIcon,
    title: 'Flashcards or a quiz',
    body: 'Pick the format when you generate: cards you can flip and sort, or multiple choice with an explanation for every answer.',
  },
  {
    icon: DownloadIcon,
    title: 'Take it with you',
    body: "Flashcards export as a file Anki can import; quizzes export as a CSV — both from the same screen you study on.",
  },
  {
    icon: UserIcon,
    title: 'Save sets to a dashboard',
    body: 'Sign in to keep a set and pick up where you left off. Trying it out first needs no account at all.',
  },
  {
    icon: ListChecksIcon,
    title: 'A week of study at a glance',
    body: "Streaks and daily totals show up on your dashboard as you finish rounds, kept on this device.",
  },
];

const faqs = [
  {
    icon: InfoIcon,
    question: 'Will the questions be accurate?',
    answer: 'Questions come from a language model, so double-check anything you will be tested on.',
  },
  {
    icon: FileTextIcon,
    question: 'How much of my notes get used?',
    answer: 'Only the first 8,000 characters of a long document are used. Split big notes into sections.',
  },
  {
    icon: UploadIcon,
    question: 'Does it work with scanned PDFs?',
    answer: "Not yet — scanned PDFs without selectable text won't work. Paste the text instead.",
  },
  {
    icon: SparklesIcon,
    question: 'Why is generation limited?',
    answer: 'Each generation costs real money to run, so requests are limited per person.',
  },
];

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <>
      <SiteHeader email={user?.email ?? null} />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="bg-dots pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-3xl items-start gap-10 px-5 pb-14 pt-14 sm:pt-20 lg:max-w-5xl lg:grid-cols-[1.15fr_minmax(420px,0.85fr)] lg:gap-6">
            <div className="text-left">
              <Badge className="rounded-full px-3 py-1">
                <CheckCircleIcon className="size-3.5" />
                No account needed to try it
              </Badge>
              <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-[3.25rem] lg:leading-[1.1]">
                Turn your notes into flashcards and quizzes
              </h1>
              <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg md:max-w-2xl md:text-xl lg:max-w-xl lg:text-lg">
                Paste text or upload a PDF. Flip through cards you can sort as you go, or take a multiple-choice quiz
                with explanations.
              </p>
              <div className="mt-8">
                <a href="#generate" className={buttonVariants('primary', 'lg')}>
                  Make a set from your notes
                  <ArrowRightIcon />
                </a>
              </div>
            </div>

            <div className="hidden lg:block">
              <HeroDeck />
            </div>
          </div>
        </section>

        <section id="generate" className="mx-auto max-w-3xl scroll-mt-20 px-5">
          <Generator signedIn={Boolean(user)} />
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-16 pt-16">
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold tracking-tight">What you get</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Four things that matter once your notes have to become something you actually study from.
            </p>
          </div>

          <div className="mt-9 grid gap-x-8 gap-y-9 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, body }, i) => {
              // The save/dashboard feature is the one thing worth making the
              // reader's eye land on first — everything else stays quiet.
              const emphasize = i === 2;
              return (
                <div key={title} className="flex gap-4">
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-full',
                      // text-white, not text-primary-foreground: the brand
                      // orange is fixed across themes, so its icon needs a
                      // fixed contrast color too — primary-foreground flips
                      // to near-black in dark mode and would go muddy here.
                      emphasize ? 'bg-brand text-white' : 'bg-brand/10 text-brand',
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="pt-0.5">
                    <h3 className="text-[15px] font-semibold leading-tight">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-20">
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold tracking-tight">Worth knowing</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The honest answers to what people usually ask before relying on a generated set.
            </p>
          </div>

          <div className="mt-7 divide-y border-t">
            {faqs.map(({ icon: Icon, question, answer }) => (
              <details key={question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-3.5 text-[15px] font-medium">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    {question}
                  </span>
                  <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 pl-[1.9rem] text-sm leading-relaxed text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}