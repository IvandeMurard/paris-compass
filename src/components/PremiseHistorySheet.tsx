/**
 * The premise sheet — the consumer `PLAN.md` §2.7 says is missing.
 *
 * Two steps, and the first one is the whole honesty of the panel.
 *
 * **Step one, resolution.** OpenStreetMap and APUR's BDCom share no identifier. Linking a
 * card to a surveyed premise is therefore a spatial inference, and measurement says it is a
 * weak one: around Les Halles on 24 August 2026, a 25 m radius holds a median of five
 * candidates and up to 125, and the nearest one is frequently the wrong shop — "Les Trésors
 * Pets" in OpenStreetMap has "BA&SH" 0 m away in BDCom. So the panel lists the candidates
 * with their address and sign and lets a human pick. Choosing for them would attach one
 * premise's history to another, which is the second of the two founding errors of
 * `PLAN.md` §2.5 rebuilt in a new place.
 *
 * **Step two, the chronology.** Rendered row by row from `compass_address_timeline`, each
 * one carrying its evidence, its confidence level and the rule that produced it. No row is
 * summarised, reordered or merged, and no absent value is filled in from a neighbour. What
 * a row may say is decided in `src/i18n/timelineText.ts`, where it is tested.
 */

import { useState } from 'react';
import { AlertCircle, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { usePremiseCandidates, usePremiseTimeline } from '@/hooks/usePremiseHistory';
import { useLocale } from '@/i18n/locale';
import {
  describeTimelineRow,
  licenceLabel,
  TIMELINE_COPY,
  type TimelineRow,
} from '@/i18n/timelineText';
import { RESOLUTION_RADIUS_M, type PremiseCandidate } from '@/services/compass/premiseHistory';

const COPY = {
  fr: {
    title: 'Historique du local',
    chooseTitle: 'Quel local relevé ?',
    chooseIntro: (n: number, radius: number) =>
      `${n} ${n > 1 ? 'locaux relevés' : 'local relevé'} par l’APUR en 2023 à moins de ${radius} m de ce point.`,
    chooseRule:
      'OpenStreetMap et la BDCom de l’APUR ne partagent aucun identifiant : le rattachement ne peut être que spatial, donc déduit. Compass ne choisit pas à votre place — comparez l’adresse et l’enseigne.',
    truncated: (shown: number, total: number) =>
      `${shown} affichés sur ${total} dans le rayon.`,
    emptyTitle: 'Aucun local relevé à moins de ' + RESOLUTION_RADIUS_M + ' m',
    emptyBody:
      'Le millésime 2023 ne couvre que les commerces et services commerciaux : un local vacant, ou qui n’est pas un commerce, n’y figure pas. Les millésimes 2017 et 2020 sont retenus pour raison de licence — ni leur contenu, ni l’existence d’un relevé. Cette absence ne dit donc pas qu’il n’y a rien ici.',
    withheldTitle: 'Millésime retenu',
    withheldBody:
      'Ce millésime n’est pas redistribuable publiquement : sa licence n’a pas été lue. Ni son contenu ni son existence ne sont divulgués.',
    back: 'Changer de local',
    distance: (d: number) => `à ${d} m du point OpenStreetMap`,
    spatialCaveat:
      'Rattachement spatial, déduit : aucune source ne relie ce point OpenStreetMap à ce local relevé.',
    vacant: 'Recensé vacant',
    timelineTitle: 'Chronologie',
    loadError: 'La base n’a pas répondu.',
    surveyNote:
      'Le relevé de l’APUR a un pas de trois ans. Un local devenu boulangerie, puis vacant, puis kebab entre deux enquêtes s’affiche « boulangerie → kebab » : un local peut paraître stable en ayant tourné trois fois.',
    departureNote:
      'Une suite d’activités ne dit jamais pourquoi quelqu’un est parti. Vente réussie, dépôt de bilan, départ en retraite et immeuble repris s’affichent à l’identique.',
    priceNote:
      'Un prix est extrait de la phrase publiée au BODACC, conservée telle quelle en justification. Les deux se lisent ensemble.',
    reference: 'Référence',
    open: 'Consulter la source',
    ordre: 'Identifiant BDCom',
    empty: 'La base ne renvoie aucune ligne pour ce local.',
  },
  en: {
    title: 'Premise history',
    chooseTitle: 'Which surveyed premise?',
    chooseIntro: (n: number, radius: number) =>
      `${n} premise${n > 1 ? 's' : ''} surveyed by APUR in 2023 within ${radius} m of this point.`,
    chooseRule:
      'OpenStreetMap and APUR’s BDCom share no identifier: the link can only be spatial, and is therefore inferred. Compass does not choose for you — compare the address and the trading name.',
    truncated: (shown: number, total: number) => `${shown} shown out of ${total} in the radius.`,
    emptyTitle: 'No surveyed premise within ' + RESOLUTION_RADIUS_M + ' m',
    emptyBody:
      'The 2023 vintage covers retail and commercial services only: a vacant unit, or one that is not a shop, is not in it. The 2017 and 2020 vintages are withheld for licence reasons — neither their content nor whether a record exists. This absence does not say there is nothing here.',
    withheldTitle: 'Withheld vintage',
    withheldBody:
      'This vintage may not be redistributed publicly: its licence has not been read. Neither its content nor its existence is disclosed.',
    back: 'Choose another premise',
    distance: (d: number) => `${d} m from the OpenStreetMap point`,
    spatialCaveat:
      'Spatial link, inferred: no source connects this OpenStreetMap point to this surveyed premise.',
    vacant: 'Recorded vacant',
    timelineTitle: 'Chronology',
    loadError: 'The database did not answer.',
    surveyNote:
      'APUR surveys every three years. A unit that became a bakery, then vacant, then a kebab shop between two surveys shows as "bakery → kebab": a premise can look stable having turned over three times.',
    departureNote:
      'A sequence of activities never says why anyone left. A successful sale, a bankruptcy, a retirement and a repossessed building all render identically.',
    priceNote:
      'A price is extracted from the sentence published in BODACC, kept verbatim as the justification. Read the two together.',
    reference: 'Reference',
    open: 'Open the source',
    ordre: 'BDCom identifier',
    empty: 'The database returns no row for this premise.',
  },
} as const;

/**
 * "1er arrondissement", not "1e" and not a bare "1".
 *
 * The bare number is what the panel showed first, and next to a quartier name it read as a
 * count. `PropertyCard` still says "1e arrondissement" for the first — a separate defect,
 * recorded in `DIAGNOSTIC.md`; this panel is not going to add a third spelling.
 */
const arrondissementLabel = (n: number, locale: 'fr' | 'en'): string =>
  locale === 'fr'
    ? `${n === 1 ? '1er' : `${n}e`} arrondissement`
    : `arrondissement ${n}`;

const CONFIDENCE_TONE: Record<string, string> = {
  etabli: 'bg-emerald-100 text-emerald-800',
  corrobore: 'bg-sky-100 text-sky-800',
  probable: 'bg-amber-100 text-amber-800',
  indetermine: 'bg-gray-100 text-gray-700',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The point the reader clicked from, in OpenStreetMap's coordinates. */
  point: { lat: number; lng: number };
  /** What the card calls this premise, shown only to say where the panel was opened from. */
  originLabel: string;
}

/** One candidate, with everything a human needs to recognise it — and nothing ranked. */
const CandidateRow = ({
  candidate,
  onSelect,
  locale,
}: {
  candidate: PremiseCandidate;
  onSelect: () => void;
  locale: 'fr' | 'en';
}) => {
  const c = COPY[locale];
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted"
      >
        <span className="block text-sm font-medium">
          {candidate.address ?? '—'}
        </span>
        <span className="block text-sm text-muted-foreground">
          {candidate.activityLabel ?? '—'}
          {candidate.signName ? ` · ${candidate.signName}` : ''}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {c.distance(Math.round(candidate.distanceM))}
          {candidate.situationLabel ? ` · ${candidate.situationLabel}` : ''}
          {candidate.sizeLabel ? ` · ${candidate.sizeLabel}` : ''}
        </span>
        {candidate.isVacant && (
          <Badge variant="outline" className="mt-1 text-[10px]">
            {c.vacant}
          </Badge>
        )}
      </button>
    </li>
  );
};

/**
 * One row of the chronology.
 *
 * Every field it shows comes from the row it is given. There is no `??` chain across
 * columns and none across years: an absent value is phrased as absent, in its own words.
 */
const TimelineEntry = ({ row, locale }: { row: TimelineRow; locale: 'fr' | 'en' }) => {
  const c = COPY[locale];
  const line = describeTimelineRow(row, locale);

  return (
    <li className="border-l-2 border-muted pl-4">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-xs text-muted-foreground">{line.when}</span>
        <span className={line.absent ? 'text-sm italic text-muted-foreground' : 'text-sm font-medium'}>
          {line.headline}
        </span>
        <Badge
          variant="secondary"
          className={`font-normal ${CONFIDENCE_TONE[row.confidence] ?? ''}`}
          title={line.confidenceMeaning}
        >
          {line.confidenceLabel}
        </Badge>
      </div>

      {line.detail && <p className="text-sm text-muted-foreground">{line.detail}</p>}
      {line.amount && <p className="text-sm font-medium">{line.amount}</p>}

      {line.evidence && (
        <p className="mt-1 text-xs text-muted-foreground">
          {/* The space before the colon is French typography and does not travel: an
              English page must read "justification:" and not "justification :". */}
          <span className="font-medium">
            {TIMELINE_COPY[locale].evidenceLabel}
            {locale === 'fr' ? ' : ' : ': '}
          </span>
          <q>{line.evidence}</q>
        </p>
      )}

      {line.reason && <p className="text-[11px] text-muted-foreground">{line.reason}</p>}

      <p className="mt-1 text-[11px] text-muted-foreground">
        {row.source}
        {row.source_licence ? ` · ${licenceLabel(row.source_licence)}` : ''}
        {row.source_ref ? ` · ${c.reference} ${row.source_ref}` : ''}
        {row.source_url && (
          <>
            {' · '}
            <a
              href={row.source_url}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted hover:text-foreground"
            >
              {c.open}
              <ExternalLink size={11} className="ml-0.5 inline" />
            </a>
          </>
        )}
      </p>
    </li>
  );
};

const PremiseHistorySheet = ({ open, onOpenChange, point, originLabel }: Props) => {
  const { locale } = useLocale();
  const c = COPY[locale];
  const [selected, setSelected] = useState<PremiseCandidate | null>(null);

  const candidates = usePremiseCandidates(point, open);
  const timeline = usePremiseTimeline(selected?.locationId ?? null);

  // A different card reuses the same panel: the previous choice must not survive it.
  const handleOpenChange = (next: boolean) => {
    if (!next) setSelected(null);
    onOpenChange(next);
  };

  const hasPrice = (timeline.data ?? []).some((row) => row.amount_eur !== null);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{c.title}</SheetTitle>
          <SheetDescription>{originLabel}</SheetDescription>
        </SheetHeader>

        {candidates.isLoading && (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {candidates.isError && (
          <p className="mt-6 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {(candidates.error as Error)?.message ?? c.loadError}
          </p>
        )}

        {!selected && candidates.data && (
          <div className="mt-6 space-y-3">
            {candidates.data.withheld ? (
              <>
                <h3 className="text-sm font-semibold">{c.withheldTitle}</h3>
                <p className="text-sm text-muted-foreground">{c.withheldBody}</p>
              </>
            ) : candidates.data.candidates.length === 0 ? (
              <>
                <h3 className="text-sm font-semibold">{c.emptyTitle}</h3>
                <p className="text-sm text-muted-foreground">{c.emptyBody}</p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold">{c.chooseTitle}</h3>
                <p className="text-sm text-muted-foreground">
                  {c.chooseIntro(candidates.data.totalMatched, candidates.data.radiusM)}
                </p>
                <p className="text-xs text-muted-foreground">{c.chooseRule}</p>
                {candidates.data.candidates.length < candidates.data.totalMatched && (
                  <p className="text-xs text-muted-foreground">
                    {c.truncated(
                      candidates.data.candidates.length,
                      candidates.data.totalMatched,
                    )}
                  </p>
                )}
                <ul className="space-y-2">
                  {candidates.data.candidates.map((candidate) => (
                    <CandidateRow
                      key={candidate.locationId}
                      candidate={candidate}
                      locale={locale}
                      onSelect={() => setSelected(candidate)}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {selected && (
          <div className="mt-6 space-y-4">
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setSelected(null)}>
              <ArrowLeft size={14} className="mr-1" /> {c.back}
            </Button>

            <div>
              <h3 className="text-base font-semibold">{selected.address ?? '—'}</h3>
              <p className="text-sm text-muted-foreground">
                {selected.quartierName ?? '—'}
                {selected.arrondissement
                  ? ` · ${arrondissementLabel(selected.arrondissement, locale)}`
                  : ''}
                {selected.ordre !== null ? ` · ${c.ordre} ${selected.ordre}` : ''}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {c.distance(Math.round(selected.distanceM))} — {c.spatialCaveat}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold">{c.timelineTitle}</h4>

              {timeline.isLoading && (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                </p>
              )}

              {timeline.isError && (
                <p className="mt-2 flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {(timeline.error as Error)?.message ?? c.loadError}
                </p>
              )}

              {timeline.data && timeline.data.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">{c.empty}</p>
              )}

              {timeline.data && timeline.data.length > 0 && (
                <ul className="mt-3 space-y-4">
                  {timeline.data.map((row) => (
                    <TimelineEntry
                      key={`${row.occurred_on}-${row.source}-${row.source_ref ?? ''}`}
                      row={row}
                      locale={locale}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Reserves that bound what the sequence above may be used to assert. They are
                displayed rather than documented, per PLAN.md §2.5 — a caveat that lives in
                a document does not travel with the figure. */}
            <div className="space-y-2 border-t pt-3 text-xs text-muted-foreground">
              <p>{c.surveyNote}</p>
              <p>{c.departureNote}</p>
              {hasPrice && <p>{c.priceNote}</p>}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default PremiseHistorySheet;
