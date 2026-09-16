/**
 * Wording of the three trade modes — w6-modes (#36).
 *
 * Prose only, same contract as `contextText.ts`: **nothing here holds a number.** Every figure
 * the checklist shows comes off `TradeCheck.measured`, and the sentences below take their
 * counts and their radius as arguments rather than writing them. A « 25 m » typed here would be
 * a literal on screen that nothing keeps in step with `TRADE_RADIUS_M`.
 *
 * **Two verb forms per check, per language, and it is not decoration.** French will not let one
 * template serve « 3 des 5 locaux **portent** » and « **aucun** des 5 locaux **ne porte** », and
 * building the negative by prefixing the positive is how a page ends up saying « aucun des 5
 * locaux portent ». English needs the same pair for its own reason — *carry* against *carries* —
 * so the shape is symmetric rather than a French special case.
 *
 * **The reserve travels with the answer, never under it.** A PLU protection read here is
 * informational and has no regulatory value: the authority is the Portail des Règles
 * d'Urbanisme (`docs/PLAN.md` §2.4). A terrace authorisation is an administrative fact and
 * never proof that a terrace stands today (`src/i18n/terrasseText.ts`, `w1-terrasses`). Both
 * reserves are fields of the check rather than a footnote at the bottom of the block, because a
 * footnote is read by nobody and a positive answer is exactly the moment the reserve matters.
 */

import { TRADE_MODES, type TradeCheckId, type TradeCheckState, type TradeMode } from '@/core';
import type { Locale } from '@/i18n/locale';

export const MODE_NAMES: Record<Locale, Record<TradeMode, string>> = {
  fr: {
    restauration: 'Restauration',
    boutique: 'Boutique',
    artisanat: 'Artisanat',
  },
  en: {
    restauration: 'Food service',
    boutique: 'Retail',
    artisanat: 'Craft',
  },
};

/** The three, in the order the ticket names them. Derived, so a fourth mode needs no edit. */
export const MODE_ORDER = TRADE_MODES;

export const MODE_COPY = {
  fr: {
    heading: 'Lire cette adresse comme…',
    /** The one sentence that says what a mode does and, above all, what it does not. */
    intro:
      'Le métier change l’ordre de lecture et la liste des points à vérifier. Il ne change aucun chiffre, et il n’existe pas de note par métier.',
    clear: 'Sans métier',
    clearHint: 'Revenir à l’ordre du noyau, celui qui n’appartient à aucun métier.',
    checklistHeading: 'À vérifier pour ce métier',
    checklistIntro:
      'Une checklist, pas un score. Ce que le corpus sait est compté avec sa population ; ce qu’il ne sait pas est nommé avec ce qui lui manque.',
    reorderNote: 'Les constats et les alertes ci-dessous sont dans l’ordre de ce métier.',
    issue: (n: number) => `suivi en #${n}`,
  },
  en: {
    heading: 'Read this address as…',
    intro:
      'The trade changes the reading order and the list of things to check. It changes no figure, and there is no per-trade score.',
    clear: 'No trade',
    clearHint: 'Back to the core’s order, the one that belongs to no trade.',
    checklistHeading: 'To check for this trade',
    checklistIntro:
      'A checklist, not a score. What the corpus knows is counted with its population; what it does not know is named along with what it is missing.',
    reorderNote: 'The findings and the gaps below are in this trade’s order.',
    issue: (n: number) => `tracked in #${n}`,
  },
} as const;

interface CheckCopy {
  name: string;
  /** Verb phrase after « N des M locaux relevés dans R m … ». */
  positive: string;
  /**
   * The WHOLE negated verb phrase after « Aucun des M locaux relevés dans R m … », the negation
   * particle included.
   *
   * **It carries « ne » / « n’ » itself, and the reason was measured on screen.** The template
   * used to write « ne » and take a bare verb, which produced *« aucun des 25 locaux relevés à
   * moins de 25 m **ne est** sur un linéaire protégé »* on rue de Bretagne, 16 September 2026 —
   * French elides before a vowel and a template cannot know whether the next word starts with
   * one. The unit tests were green on it: they asked whether the sentence contained « ne », and
   * it did. `modeText.test.ts` now refuses the elision itself, on every French sentence this
   * module can produce.
   */
  negative: string;
  /** What this question is, when the corpus cannot answer it at all. */
  about: string;
  /** What a positive answer does NOT license the reader to conclude. */
  reserve?: string;
}

export const CHECK_COPY: Record<Locale, Record<TradeCheckId, CheckCopy>> = {
  fr: {
    terrasse: {
      name: 'Terrasse ou étalage autorisé',
      positive: 'portent une autorisation de terrasse ou d’étalage',
      negative: 'ne porte d’autorisation de terrasse ou d’étalage',
      about: 'Une autorisation de terrasse ou d’étalage à ce numéro.',
      reserve:
        'Une autorisation n’est pas une terrasse installée aujourd’hui, et elle ne se transmet pas avec le bail.',
    },
    cuisine: {
      name: 'Extraction et conduit de cuisine',
      positive: '',
      negative: '',
      about:
        'La possibilité d’installer une extraction — conduit en façade ou en toiture, accord de la copropriété.',
    },
    ppri_cave: {
      name: 'Cave en zone inondable',
      positive: '',
      negative: '',
      about:
        'Le zonage PPRI et la remontée de nappe à cette adresse, qui décident ce qu’une réserve en sous-sol peut stocker.',
    },
    licence_debit: {
      name: 'Licence de débit de boissons',
      positive: '',
      negative: '',
      about: 'La licence attachée au fonds, et les périmètres de protection qui l’interdisent.',
    },
    plu_lineaire: {
      name: 'Linéaire protégé au PLU',
      positive: 'sont sur un linéaire portant au moins une des trois protections',
      negative: 'n’est sur un linéaire portant une protection',
      about: 'La protection du commerce et de l’artisanat sur ce linéaire de rue.',
      reserve:
        'Informatif, sans valeur réglementaire : l’autorité est le Portail des Règles d’Urbanisme. Sur un linéaire protégé, un rez-de-chaussée ne peut pas changer de destination.',
    },
    rotation_metier: {
      name: 'Rotation du prêt-à-porter dans ce quartier',
      positive: '',
      negative: '',
      about:
        'La part des locaux du même métier encore en activité six ans plus tard, ici et non à l’échelle de Paris.',
    },
    plu_artisanat: {
      name: 'Protection du commerce artisanal de proximité',
      positive: 'sont sur un linéaire protégé au titre du commerce artisanal de proximité',
      negative: 'n’est sur un linéaire protégé au titre du commerce artisanal de proximité',
      about:
        'La protection « ppa » du PLU, plus étroite que la protection générale, et celle qui vise l’artisanat.',
      reserve:
        'Informatif, sans valeur réglementaire : l’autorité est le Portail des Règles d’Urbanisme.',
    },
    copropriete: {
      name: 'Règlement de copropriété',
      positive: '',
      negative: '',
      about:
        'Ce que le règlement autorise au rez-de-chaussée : activité, nuisances, horaires, parties communes.',
    },
    livraison: {
      name: 'Accès livraison',
      positive: '',
      negative: '',
      about: 'La possibilité de livrer : aire de livraison, largeur de trottoir, sens de circulation.',
    },
  },
  en: {
    terrasse: {
      name: 'Authorised terrace or display stall',
      positive: 'carry a terrace or display-stall authorisation',
      negative: 'carries a terrace or display-stall authorisation',
      about: 'A terrace or display-stall authorisation at this street number.',
      reserve:
        'An authorisation is not a terrace standing today, and it does not transfer with the lease.',
    },
    cuisine: {
      name: 'Kitchen extraction and flue',
      positive: '',
      negative: '',
      about:
        'Whether an extraction flue can be fitted — on the façade or through the roof, with the building’s consent.',
    },
    ppri_cave: {
      name: 'Cellar in a flood zone',
      positive: '',
      negative: '',
      about:
        'The flood-plan zoning and groundwater rise at this address, which decide what a basement store can hold.',
    },
    licence_debit: {
      name: 'Alcohol licence',
      positive: '',
      negative: '',
      about: 'The licence attached to the business, and the protection perimeters that forbid it.',
    },
    plu_lineaire: {
      name: 'Protected commercial frontage (PLU)',
      positive: 'sit on a stretch carrying at least one of the three protections',
      negative: 'sits on a stretch carrying a protection',
      about: 'The PLU protection of commerce and craft on this stretch of street.',
      reserve:
        'Informational, with no regulatory value: the authority is the Portail des Règles d’Urbanisme. On a protected stretch, a ground floor cannot change use.',
    },
    rotation_metier: {
      name: 'Clothing-trade turnover in this quartier',
      positive: '',
      negative: '',
      about:
        'The share of premises in the same trade still trading six years later, here rather than across Paris.',
    },
    plu_artisanat: {
      name: 'Protection of local craft trade',
      positive: 'sit on a stretch protected for local craft trade',
      negative: 'sits on a stretch protected for local craft trade',
      about:
        'The PLU’s « ppa » protection, narrower than the general one, and the one aimed at craft.',
      reserve:
        'Informational, with no regulatory value: the authority is the Portail des Règles d’Urbanisme.',
    },
    copropriete: {
      name: 'Building rules',
      positive: '',
      negative: '',
      about:
        'What the building’s rules allow on the ground floor: activity, nuisance, hours, common parts.',
    },
    livraison: {
      name: 'Delivery access',
      positive: '',
      negative: '',
      about: 'Whether deliveries are possible: loading bay, pavement width, traffic direction.',
    },
  },
};

const STATE_COPY = {
  fr: {
    all: (of: number, radiusM: number, verb: string) =>
      `Les ${of} locaux relevés à moins de ${radiusM} m ${verb}.`,
    some: (count: number, of: number, radiusM: number, verb: string) =>
      `${count} des ${of} locaux relevés à moins de ${radiusM} m ${verb}.`,
    none: (of: number, radiusM: number, verb: string) =>
      `Aucun des ${of} locaux relevés à moins de ${radiusM} m ${verb}.`,
    indetermine: (n: number) =>
      ` ${n} relèvent d’une adresse où la source ne dit pas lequel est concerné : inconnu, pas absent.`,
    aucunLocal: (radiusM: number) =>
      `Aucun local n’est relevé à moins de ${radiusM} m de ce point : c’est inconnu ici, pas absent.`,
    coucheAbsente:
      'La couche des locaux n’a pas répondu : c’est inconnu, pas absent. Revenir plus tard peut changer la réponse.',
    sansSource: 'Aucune source ouverte n’a été identifiée pour cette question.',
    sansSourceSuivi: 'Aucune source ouverte ne porte cette question aujourd’hui',
    retenue:
      'Le chiffre existe en base et n’est pas redistribuable : le millésime de la cohorte est retenu tant que l’APUR n’a pas répondu',
  },
  en: {
    all: (of: number, radiusM: number, verb: string) =>
      `All ${of} premises surveyed within ${radiusM} m ${verb}.`,
    some: (count: number, of: number, radiusM: number, verb: string) =>
      `${count} of the ${of} premises surveyed within ${radiusM} m ${verb}.`,
    none: (of: number, radiusM: number, verb: string) =>
      `None of the ${of} premises surveyed within ${radiusM} m ${verb}.`,
    indetermine: (n: number) =>
      ` ${n} sit at a street number where the source does not say which one it applies to: unknown, not absent.`,
    aucunLocal: (radiusM: number) =>
      `No premise is surveyed within ${radiusM} m of this point: unknown here, not absent.`,
    coucheAbsente:
      'The premises layer did not answer: unknown, not absent. Coming back later may change it.',
    sansSource: 'No open dataset has been identified for this question.',
    sansSourceSuivi: 'No open dataset answers this question today',
    retenue:
      'The figure exists in the database and is not redistributable: the cohort vintage is withheld until the APUR answers',
  },
} as const;

/**
 * The sentence a resolved check reads.
 *
 * `all` exists beside `some` because « les 5 locaux … » and « 5 des 5 locaux … » are the same
 * count and not the same sentence: the first is a statement about the frontage, which is what
 * the reader came for, and the second invites them to wonder which one is the exception.
 *
 * **The undecided tail is appended to all three, and it is what keeps « aucun » honest.** On
 * rue de Bretagne the terrace register answers `oui` for none of the surveyed premises and
 * `inconnu` for 26 of the 28 locations: the sentence that stopped at « aucun » said there is no
 * terrace authorised here, when what is true is that authorisations are there and the register
 * does not attribute them. Measured on screen, 16 September 2026, before this clause existed.
 */
export function checkStateText(
  id: TradeCheckId,
  state: TradeCheckState,
  locale: Locale,
): string {
  const copy = CHECK_COPY[locale][id];
  const s = STATE_COPY[locale];
  switch (state.kind) {
    case 'constate': {
      const tail = state.indetermine > 0 ? s.indetermine(state.indetermine) : '';
      if (state.count === 0) return s.none(state.of, state.radiusM, copy.negative) + tail;
      if (state.count === state.of) return s.all(state.of, state.radiusM, copy.positive) + tail;
      return s.some(state.count, state.of, state.radiusM, copy.positive) + tail;
    }
    case 'aucun_local':
      return s.aucunLocal(state.radiusM);
    case 'couche_absente':
      return s.coucheAbsente;
    case 'sans_source': {
      const colon = locale === 'fr' ? ' — ' : ' — ';
      const base = state.gap.retenueLicence ? s.retenue : s.sansSourceSuivi;
      if (state.gap.issue === null) return s.sansSource;
      return `${base}${colon}${MODE_COPY[locale].issue(state.gap.issue)}.`;
    }
  }
}
