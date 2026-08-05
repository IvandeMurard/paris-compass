import { Link } from 'react-router-dom';
import { FAQ } from '@/content/faq';
import { GUIDES } from '@/content/guides';
import { ARRONDISSEMENTS } from '@/content/arrondissements';
import { DATA_SOURCES } from '@/services/opendata/sources';

/** Indexable editorial content rendered below the map on the home page. */
const HomeContent = () => (
  <div className="bg-white border-t">
    <div className="mx-auto max-w-4xl px-6 py-14 space-y-14">
      <section>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Trouver un local commercial en Île-de-France par son environnement
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Compass est un outil gratuit qui replace chaque local commercial dans son contexte :
          commerces actifs, transports, écoles, santé, parcs, bruit routier estimé, qualité de
          l’air et loyer de référence du quartier. Les données proviennent uniquement de sources
          publiques, interrogées en direct pour la zone affichée sur la carte.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Chercher par besoin, pas seulement par adresse</h2>
        <p className="mt-3 text-muted-foreground">
          Un local ne se juge pas sur sa surface et son loyer : il se juge sur ce qui l’entoure.
          Compass traduit un besoin — « du passage matin et soir », « près d’écoles », « au calme »,
          « à moins de 300 mètres d’un métro » — en seuils sur des scores calculés à partir de
          données ouvertes, puis n’affiche que les locaux qui les satisfont.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Marchabilité</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Densité de services accessibles à pied dans un rayon de 800 mètres, pondérée par
              famille d’équipements.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Flux piéton estimé</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Proxy combinant la densité de commerces actifs à 400 mètres et l’accès aux
              transports.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Environnement</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Qualité de l’air horaire, exposition estimée au bruit routier et risques recensés par
              Géorisques.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Des données publiques, une méthode publiée</h2>
        <p className="mt-3 text-muted-foreground">
          Aucune donnée de démonstration : chaque indicateur provient d’un jeu de données ouvert et
          chaque formule est documentée.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
          {DATA_SOURCES.map((s) => (
            <li key={s.name}>
              <span className="font-medium text-foreground">{s.name}</span> — {s.usage}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <Link className="text-primary underline" to="/sources">Toutes les sources et licences</Link>
          {' · '}
          <Link className="text-primary underline" to="/methodologie">La méthodologie de calcul</Link>
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Guides pratiques</h2>
        <ul className="mt-4 space-y-3">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link to={`/guides/${g.slug}`} className="font-medium text-primary hover:underline">
                {g.title}
              </Link>
              <p className="text-sm text-muted-foreground">{g.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Explorer Paris arrondissement par arrondissement</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {ARRONDISSEMENTS.map((a) => (
            <li key={a.slug}>
              <Link
                to={`/paris/${a.slug}`}
                className="rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-primary"
              >
                {a.label} — {a.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Questions fréquentes</h2>
        <div className="mt-4 space-y-5">
          {FAQ.slice(0, 5).map((f) => (
            <div key={f.question}>
              <h3 className="font-semibold">{f.question}</h3>
              <p className="mt-1 text-muted-foreground">{f.answer}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm">
          <Link className="text-primary underline" to="/faq">Voir toutes les questions</Link>
        </p>
      </section>
    </div>
  </div>
);

export default HomeContent;
