import { LiveTerminal } from "@/components/terminal/LiveTerminal";
import { getSnapshot } from "@/lib/api";
import { mockSnapshot } from "@/lib/mock";
import { getInitialSymbolFromSearchParams } from "@/lib/symbolPersistence";

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialSymbol = getInitialSymbolFromSearchParams(resolvedSearchParams);

  try {
    const snapshot = await getSnapshot(initialSymbol);
    return <LiveTerminal initialSnapshot={snapshot} initialDataSource="backend" />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown backend error";

    return (
      <LiveTerminal
        initialSnapshot={{
          ...mockSnapshot,
          symbol: initialSymbol,
          requested_symbol: initialSymbol,
          resolved_symbol: initialSymbol,
        }}
        initialDataSource="mock-fallback"
        initialFetchError={message}
      />
    );
  }
}
