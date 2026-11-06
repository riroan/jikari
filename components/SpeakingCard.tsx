"use client";

import { stopSpeaking } from "@/lib/tts";
import { useEffect, useRef, useState } from "react";
import { RubyText } from "./Furigana";
import { SpeakButton } from "./SpeakButton";
import { judgeSpeech, type SpeechJudgement } from "@/lib/speaking";
import type { ExpressionCard } from "@/lib/types";

/* 최소한의 Web Speech 인식 타입 (lib.dom에 없음). */
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "마이크나 음성 인식 권한이 꺼져 있어요. 설정에서 허용하거나 아래로 직접 확인할 수 있어요.",
  "service-not-allowed": "마이크나 음성 인식 권한이 꺼져 있어요. 설정에서 허용하거나 아래로 직접 확인할 수 있어요.",
  "no-speech": "목소리가 들리지 않았어요.",
  "audio-capture": "마이크를 찾지 못했어요.",
  network: "음성 인식 서버에 닿지 못했어요.",
};

type Phase = "idle" | "listening" | "heard" | "revealed";

const ghost =
  "inline-flex items-center justify-center px-4 text-caption tracking-tab text-[color:var(--fg-soft)] border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors";

/** 말하기 한 문제: 뜻을 보고 일본어로 말하기 → 인식 결과 비교 → 정답 공개. SRS 무관. */
export function SpeakingCard({
  card,
  reading,
  onResolved,
}: {
  card: ExpressionCard;
  reading: string;
  onResolved: (ok: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [judge, setJudge] = useState<SpeechJudgement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const gotRef = useRef(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [ctor] = useState(getCtor);
  const text = card.expression_jp;

  // abort()가 onend를 불러 상태를 덮어쓰지 않도록 핸들러를 먼저 뗀다.
  const kill = () => {
    const r = recRef.current;
    if (!r) return;
    r.onresult = r.onerror = r.onend = null;
    r.abort();
    recRef.current = null;
  };
  useEffect(() => kill, []);
  useEffect(() => {
    if (phase === "revealed") nextRef.current?.focus();
  }, [phase]);

  const start = () => {
    if (!ctor) return;
    // iOS 오디오 세션: 재생 중이면 마이크가 막히거나 소리가 겹친다.
    stopSpeaking();
    kill();
    const rec = new ctor();
    rec.lang = "ja-JP";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    gotRef.current = false;
    rec.onresult = (e) => {
      gotRef.current = true;
      const alts = Array.from(e.results[0] ?? [], (a) => a.transcript);
      const j = judgeSpeech(alts, reading, text);
      setJudge(j);
      setNotice(null);
      if (j.tier === "exact") {
        setOk(true);
        setPhase("revealed");
      } else setPhase("heard");
    };
    rec.onerror = (e) => {
      if (e.error === "aborted") return;
      gotRef.current = true;
      setNotice(ERRORS[e.error] ?? "음성 인식이 잘 되지 않았어요.");
      setPhase("idle");
    };
    rec.onend = () => {
      if (gotRef.current) return;
      setNotice("목소리가 들리지 않았어요.");
      setPhase("idle");
    };
    recRef.current = rec;
    setNotice(null);
    setPhase("listening");
    try {
      rec.start();
    } catch {
      setNotice("음성 인식을 시작하지 못했어요.");
      setPhase("idle");
    }
  };

  const stop = () => {
    kill();
    setNotice(null);
    setPhase("idle");
  };
  const reveal = (good: boolean) => {
    kill();
    setOk(good);
    setPhase("revealed");
  };

  const status =
    phase === "listening"
      ? "듣고 있어요…"
      : phase === "heard" && judge
        ? judge.tier === "close"
          ? "거의 맞아요"
          : "다시 말해 볼까요?"
        : phase === "revealed" && judge?.tier === "exact"
          ? "정확해요"
          : (notice ?? "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-caption tracking-label text-[color:var(--fg-faint)]">일본어로 말해 보세요</p>
        <p data-testid="speak-meaning" className="text-h2 leading-snug font-medium" style={{ fontFamily: "var(--font-kr-sans)", color: "var(--fg)" }}>
          {card.translation_ko}
        </p>
        <p className="text-small text-[color:var(--fg-faint)]" style={{ fontFamily: "var(--font-kr-sans)" }}>
          {card.situation_ko}
        </p>
      </div>

      {phase !== "revealed" && (
        <div className="flex flex-col gap-4">
          {ctor ? (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={phase === "listening" ? stop : start}
                aria-pressed={phase === "listening"}
                aria-label="말하기"
                className="speak-mic inline-flex items-center justify-center rounded-full border border-[color:var(--fg)] text-[color:var(--fg)] hover:bg-[color:var(--bg-deep)] transition-colors"
                data-listening={phase === "listening"}
                style={{ width: 56, height: 56 }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              <span className="text-body text-[color:var(--fg-soft)]">
                {phase === "listening" ? "" : phase === "heard" ? "" : "눌러서 말하기"}
              </span>
            </div>
          ) : (
            <p className="text-small text-[color:var(--fg-faint)]">
              이 브라우저는 음성 인식을 지원하지 않아요. 소리 내어 말한 뒤 직접 확인해 주세요.
            </p>
          )}

          <p role="status" aria-live="polite" className="min-h-[1.5em] text-small text-[color:var(--fg-soft)]">
            {status}
          </p>

          {phase === "heard" && judge && (
            <div className="flex flex-col gap-1 text-caption text-[color:var(--fg-faint)]">
              <div>
                들린 말:{" "}
                <span lang="ja" className="text-[color:var(--accent-korean)]" style={{ fontFamily: "var(--font-jp-sans)" }}>
                  {judge.heard || "—"}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {ctor && phase === "heard" && (
              <button type="button" onClick={start} className={ghost} style={{ minHeight: 44 }}>
                다시 말하기
              </button>
            )}
            {ctor && phase === "idle" && notice && (
              <button type="button" onClick={start} className={ghost} style={{ minHeight: 44 }}>
                다시 말하기
              </button>
            )}
            {(!ctor || notice || phase === "heard") && (
              <button type="button" onClick={() => reveal(true)} className={ghost} style={{ minHeight: 44 }}>
                말했다고 표시
              </button>
            )}
            {phase === "heard" && judge?.tier === "close" && (
              <button type="button" onClick={() => reveal(true)} className={ghost} style={{ minHeight: 44 }}>
                이 정도면 OK
              </button>
            )}
            <button type="button" onClick={() => reveal(false)} className={ghost} style={{ minHeight: 44 }}>
              {phase === "heard" ? "정답 보기" : "건너뛰기"}
            </button>
          </div>
        </div>
      )}

      {phase === "revealed" && (
        <div className="flex flex-col gap-4 pt-4 border-t border-[color:var(--line)]">
          <p role="status" aria-live="polite" className="text-small text-[color:var(--fg-soft)]">
            {status}
          </p>
          <div
            className="text-h2 leading-[1.8] font-medium"
            lang="ja"
            style={{ fontFamily: "var(--font-jp-serif)", color: "var(--fg)" }}
          >
            <RubyText text={card.ruby ?? card.expression_jp} />
          </div>
          {judge && judge.tier !== "exact" && judge.heard && (
            <div className="text-caption text-[color:var(--fg-faint)]">
              들린 말:{" "}
              <span lang="ja" style={{ fontFamily: "var(--font-jp-sans)" }}>
                {judge.heard}
              </span>
            </div>
          )}
          <div className="flex items-center justify-end gap-1">
            <SpeakButton text={card.ruby ?? card.expression_jp} slow />
            <button
              ref={nextRef}
              type="button"
              onClick={() => onResolved(ok)}
              aria-label="다음 문제"
              className={ghost}
              style={{ minHeight: 44 }}
            >
              다음 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
