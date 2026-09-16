export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span className="mb-6 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Vibe Coding
        </span>
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-black sm:text-6xl md:text-7xl dark:text-zinc-50">
          Bienvenue dans l&apos;ère du{" "}
          <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">
            Vibe Coding
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600 sm:text-xl dark:text-zinc-400">
          Codez avec l&apos;énergie du moment : laissez l&apos;intention guider la
          création, et transformez vos idées en réalité.
        </p>
      </main>
    </div>
  );
}