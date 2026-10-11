/**
 * The block that hands over the dossier — w6-dossier (#33).
 *
 * **It sits on the sheet and nowhere else, and that placement IS the doctrine.** `docs/PLAN.md`
 * §2.6: « l'export part d'une fiche, jamais de la liste de résultats. » There is no button on
 * `/carte`, none on a result list, and `downloadDossier` has no plural form to call from one —
 * so the refusal of the broker's portfolio holds in the structure rather than in whoever is
 * reading the guidelines that week.
 *
 * **Nothing here composes the file.** The content comes from `buildDossier` in `src/core/`, which
 * is the same function an agent reaches through the MCP server; this component decides when the
 * click happens, and says in the reader's language what they are about to receive.
 *
 * **Why the doctrine sentence travels INSIDE the file.** A line of prose next to a button is read
 * by the person who clicks; the file is read by the banker, the accountant and the franchise
 * network the sheet never meets. `Dossier.doctrine` is where « un dossier, une adresse » reaches
 * them — and where it would have to be deleted from, visibly, for the refusal to be dropped.
 */

import { Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { buildDossier, type DossierInput } from '@/core';
import { CONTEXT_COPY } from '@/i18n/contextText';
import { useLocale } from '@/i18n/locale';
import { downloadDossier } from '@/lib/downloadDossier';

/**
 * Everything but the clock and the prose, which this component owns.
 *
 * `issuedAt` is taken here rather than passed in because `src/core/` reads no clock and the page
 * has nothing to say about when a visitor clicked. It is read at the click, never at render: a
 * timestamp fixed when the sheet mounted would date the file to the moment the page opened, which
 * is the wrong minute on a tab left open for an hour.
 */
export type ContextDossierProps = Omit<DossierInput, 'issuedAt' | 'copy' | 'locale'>;

const ContextDossier = (props: ContextDossierProps) => {
  const { locale } = useLocale();
  const c = CONTEXT_COPY[locale];
  const [written, setWritten] = useState<string | null>(null);

  const onClick = () => {
    const dossier = buildDossier({
      ...props,
      locale,
      issuedAt: new Date().toISOString(),
      copy: { methodology: c.dossierMethodology, doctrine: c.dossierDoctrine },
    });
    setWritten(downloadDossier(dossier));
  };

  return (
    <section aria-labelledby="dossier" className="rounded-lg border bg-white p-5">
      <h2
        id="dossier"
        className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {c.dossierHeading}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{c.dossierIntro}</p>
      <p className="mt-2 text-sm text-muted-foreground">{c.dossierNote}</p>

      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onClick}>
        <Download size={14} className="mr-2" aria-hidden />
        {c.dossierButton}
      </Button>

      {/* `aria-live` because the only other signal that the click worked is a browser chrome a
          screen reader does not describe. */}
      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        {written ? c.dossierDone(written) : c.dossierDoctrine}
      </p>
    </section>
  );
};

export default ContextDossier;
