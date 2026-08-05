import { Link } from 'react-router-dom';
import { MAIN_NAV } from '@/content/site';
import { DATA_SOURCES } from '@/services/opendata/sources';

const SiteFooter = () => (
  <footer className="border-t bg-white">
    <div className="mx-auto max-w-5xl px-6 py-10 grid gap-8 sm:grid-cols-3 text-sm">
      <div>
        <p className="font-semibold text-primary">Compass</p>
        <p className="mt-2 text-muted-foreground">
          Trouver un local commercial en Île-de-France par son environnement, à partir de
          données publiques.
        </p>
        <p className="mt-3 text-muted-foreground">Conçu par Ivan de Murard.</p>
      </div>
      <nav aria-label="Pages du site">
        <p className="font-semibold">Explorer</p>
        <ul className="mt-2 space-y-1">
          {MAIN_NAV.map((item) => (
            <li key={item.to}>
              <Link className="text-muted-foreground hover:text-primary" to={item.to}>
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <Link className="text-muted-foreground hover:text-primary" to="/paris">
              Locaux par arrondissement
            </Link>
          </li>
        </ul>
      </nav>
      <div>
        <p className="font-semibold">Données</p>
        <ul className="mt-2 space-y-1">
          {DATA_SOURCES.slice(0, 5).map((s) => (
            <li key={s.name}>
              <a
                className="text-muted-foreground hover:text-primary"
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
