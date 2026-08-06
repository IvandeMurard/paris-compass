import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLocale } from "@/i18n/locale";

const COPY = {
  fr: {
    notFound: 'Oups ! Page introuvable',
    returnHome: "Retour à l'accueil",
  },
  en: {
    notFound: 'Oops! Page not found',
    returnHome: 'Return to Home',
  },
} as const;

const NotFound = () => {
  const location = useLocation();
  const { locale, lp } = useLocale();
  const copy = COPY[locale];

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">{copy.notFound}</p>
        <Link to={lp('/')} className="text-blue-500 hover:text-blue-700 underline">
          {copy.returnHome}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
