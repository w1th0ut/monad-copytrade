"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

type TradingViewChartProps = {
  symbol: string;
};

export function TradingViewChart({ symbol }: TradingViewChartProps) {
  const chartId = useId();
  const containerId = useMemo(
    () => `tv-chart-${chartId.replace(/:/g, "")}`,
    [chartId],
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    const initializeChart = () => {
      if (!window.TradingView || !containerRef.current || cancelled) {
        return;
      }

      containerRef.current.replaceChildren();

      try {
        new window.TradingView.widget({
          autosize: true,
          symbol,
          interval: "5",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          allow_symbol_change: false,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          details: false,
          hotlist: false,
          calendar: false,
          withdateranges: true,
          studies: [],
          container_id: containerId,
        });
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    };

    if (window.TradingView) {
      initializeChart();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.getElementById(
      "tradingview-widget-script",
    ) as HTMLScriptElement | null;

    const handleLoad = () => initializeChart();
    const handleError = () => setStatus("error");

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);
    } else {
      const script = document.createElement("script");
      script.id = "tradingview-widget-script";
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      const script = document.getElementById("tradingview-widget-script");
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
  }, [containerId, symbol]);

  return (
    <div className="relative h-[440px] w-full sm:h-[540px]">
      {status !== "ready" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-canvas/88 text-center backdrop-blur-sm">
          <span className="status-orb h-2.5 w-2.5 rounded-full bg-positive" />
          <div>
            <p className="font-medium text-foreground">
              {status === "error" ? "Chart failed to load" : "Loading chart"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {status === "error"
                ? "TradingView widget is unavailable right now."
                : "Initializing TradingView market view for the trading workspace."}
            </p>
          </div>
        </div>
      )}
      <div ref={containerRef} id={containerId} className="h-full w-full" />
    </div>
  );
}
