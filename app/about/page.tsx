import Link from 'next/link';

export default function About() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Takoa</h1>
            <span className="text-muted-foreground text-sm ml-2">Find Your People</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <span className="text-foreground">About</span>
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-foreground">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold">Takoa - Find Your People</h2>
          <p className="text-sm text-muted-foreground">Inspired by wabi.ai&apos;s about page.</p>
        </div>

        <div className="space-y-5 text-base leading-relaxed">
          <p>
            Apps like Bumble BFF and offline events such as Timeleft and weAreNeverReallyStrangers
            promised a better way to make friends. Friend-finder apps full of promise.
          </p>

          <p>But the loneliness epidemic rages on.</p>

          <p>
            Visions of a real connection gave way to a people who genuinely
            wanted to help you make a friend. A dozen apps produced by small
            companies have become huge players in the market today. Weren&apos;t they supposed to solve our
            loneliness? If they did, why do they still exist - how do they drive revenue and even
            IPO?
          </p>

          <p>
            You get endless swipes, ghosting, abundance of choice, sunk-cost hope that maybe you find the one who finally goes above and beyond. And so, we pick our clothes. Our
            tunes. Our furniture. But our friends? They&apos;re still one-size-fits-all. Swipe till you
            drop. Made for billions. Not for us.
          </p>

          <p>
            When friendship software is oriented around you, it&apos;s freed from these dark patterns. 
            
          </p>

          <p>
            We believe software has a greater purpose: to help each of us live our lives - with
            real people.
          </p>

          <p>
            That&apos;s why we built Takoa. The first personal friendship platform. 
          </p>
          <p>
            No generic personality quizzes. Converse naturally; we learn your life, context, vibe. Science-backed
            algorithms generate your perfect questions,
            craft a custom itinerary, and group you with four others for a real meetup. Persistent
            memory makes every connection click. Not just another friend-finder... but this time,
            one for you.
          </p>

          <p>
            We use a backed-by-science algorithm - generating the best questions
            for you, building a custom itinerary, then matching you with four others for a real
            meetup. Here&apos;s where we are very careful: no part of AI touches the connections you
            can potentially make. Everything is sorted by algorithms, fixed logic free from
            preferential bias.
          </p>

          <p>
            Our point? Not repeat users. This isn&apos;t business - it&apos;s a venture. A venture into helping you get the love and support you deserve. Love(platonic) is the only serious business at
            Takoa.
          </p>

          <p>
            What will these bonds become? Hard to say. We don&apos;t know you yet. But someday, we&apos;ll
            look back on friend-finder apps like cable TV - mass content for the masses, with a
            slice of superficiality. A new era of connection is here.
          </p>
          <p>
            Takoa. Even our name isn&apos;t easy to pronounce or spell; we really don&apos;t want returning users.
          </p>
        </div>
      </section>
    </main>
  );
}
