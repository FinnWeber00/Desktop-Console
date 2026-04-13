import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CardAvatar } from './components/CardAvatar';
import { DEFAULT_APP_LANGUAGE, normalizeAppLanguage, type SupportedAppLanguage } from '../shared/constants/language';
import { formatLastOpened, getUiMessages, localizeErrorMessage } from '../shared/i18n';
import type { Card } from '../shared/types/models';

type Feedback = { type: 'success' | 'error'; message: string } | null;

export const QuickSummon = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [language, setLanguage] = useState<SupportedAppLanguage>(DEFAULT_APP_LANGUAGE);

  const { i18n } = useTranslation();
  const T = getUiMessages(language);

  useEffect(() => {
    const syncLanguage = async () => {
      const result = await window.desktopConsole.settings.get();
      if (result.success) {
        setLanguage(normalizeAppLanguage(result.data.language));
      }
    };

    void syncLanguage();

    const handleFocus = () => {
      void syncLanguage();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncLanguage();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    void i18n.changeLanguage(language);
  }, [i18n, language]);

  useEffect(() => {
    const loadCards = async () => {
      const trimmed = keyword.trim();
      const result = trimmed
        ? await window.desktopConsole.card.search({ keyword: trimmed })
        : await window.desktopConsole.card.list();

      if (result.success) {
        setCards(result.data);
        setSelectedIndex(0);
      } else {
        setFeedback({ type: 'error', message: localizeErrorMessage(result.error, language) });
      }
    };

    void loadCards();
  }, [keyword, language]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const sections = useMemo(() => {
    if (keyword.trim()) {
      return [{ title: T.all, items: cards }];
    }

    const pinned = cards.filter((card) => card.pinned).slice(0, 4);
    const recent = [...cards]
      .filter((card) => card.lastOpenedAt)
      .sort((left, right) => (right.lastOpenedAt ?? '').localeCompare(left.lastOpenedAt ?? ''))
      .slice(0, 4);
    const recentIds = new Set(recent.map((card) => card.id));
    const allItems = cards.filter((card) => !recentIds.has(card.id)).slice(0, 6);

    return [
      { title: T.pinnedSection, items: pinned },
      { title: T.recentSection, items: recent },
      { title: T.all, items: allItems },
    ].filter((section) => section.items.length > 0);
  }, [cards, keyword, language, T.all, T.pinnedSection, T.recentSection]);

  const flatCards = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        window.close();
        return;
      }

      if (flatCards.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((current) => (current + 1) % flatCards.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((current) => (current - 1 + flatCards.length) % flatCards.length);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const target = flatCards[selectedIndex];
        if (!target) return;
        void (async () => {
          const result = await window.desktopConsole.card.open(target.id);
          if (!result.success) {
            setFeedback({
              type: 'error',
              message: T.openFailedWithReason(localizeErrorMessage(result.error, language)),
            });
            return;
          }
          window.close();
        })();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [T, flatCards, language, selectedIndex]);

  let runningIndex = -1;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(196,226,249,0.3),_transparent_45%),linear-gradient(180deg,_rgba(34,54,69,0.92)_0%,_rgba(17,27,37,0.96)_100%)] p-4 text-slate-100">
      <div className="mx-auto max-w-[820px] rounded-[28px] border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_80px_rgba(6,12,18,0.42)] backdrop-blur-2xl">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-200/80">{T.quickSummonTitle}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{T.productName}</h1>
          <p className="mt-2 text-sm text-slate-300">{T.quickSummonHint}</p>
          <input
            autoFocus
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-base text-white outline-none placeholder:text-slate-400 focus:border-sky-300"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={T.quickSummonPlaceholder}
            type="text"
            value={keyword}
          />
          <p className="mt-3 text-xs text-slate-400">{T.navigate}</p>
        </div>

        {feedback ? (
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${feedback.type === 'error' ? 'bg-rose-500/15 text-rose-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
            {feedback.message}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {sections.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-300">
              {keyword.trim() ? T.noResults : T.noData}
            </div>
          ) : (
            sections.map((section) => (
              <section key={section.title} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-slate-200">{section.title}</h2>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{section.items.length}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {section.items.map((card) => {
                    runningIndex += 1;
                    const currentIndex = runningIndex;
                    const isActive = currentIndex === selectedIndex;

                    return (
                      <button
                        key={`${section.title}-${card.id}-${currentIndex}`}
                        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                          isActive ? 'bg-sky-400/20 text-white ring-1 ring-sky-300/40' : 'bg-white/5 text-slate-200 hover:bg-white/10'
                        }`}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        onClick={() => {
                          void (async () => {
                            const result = await window.desktopConsole.card.open(card.id);
                            if (!result.success) {
                              setFeedback({
                                type: 'error',
                                message: T.openFailedWithReason(localizeErrorMessage(result.error, language)),
                              });
                              return;
                            }
                            window.close();
                          })();
                        }}
                        type="button"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <CardAvatar
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-base font-semibold text-sky-100"
                            icon={card.icon}
                            imageClassName="h-full w-full rounded-2xl object-cover"
                            labelClassName="text-base font-semibold text-sky-100"
                            name={card.name}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium">{card.name}</p>
                              {card.pinned ? <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] text-amber-200">{T.pinnedBadge}</span> : null}
                            </div>
                            <p className="truncate text-xs text-slate-400">{card.note ?? card.target}</p>
                          </div>
                        </div>
                        <div className="ml-4 shrink-0 text-right">
                          <p className="text-[11px] text-slate-300">{card.type === 'website' ? T.website : T.app}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{formatLastOpened(card.lastOpenedAt, language)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </main>
  );
};

