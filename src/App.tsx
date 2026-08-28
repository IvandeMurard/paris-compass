import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { LocaleProvider } from "@/i18n/locale";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Pages off the entry path are loaded on demand, so rollup emits one chunk each instead of
// folding every page into the bundle the landing screen has to download first. The split is
// declared here rather than through `build.rollupOptions.output.manualChunks` on purpose: this
// file is application code, while `vite.config.ts` is rewritten from a template by Lovable and
// `vite.config.local.ts` only drives `build:local` — a rule placed in either could silently
// stop applying, or make the two build paths disagree.
//
// `Index` and `NotFound` stay eager: lazily loading the page the visitor already asked for
// would only add a round trip.
const Presentation = lazy(() => import("./pages/Presentation"));
const About = lazy(() => import("./pages/About"));
const Faq = lazy(() => import("./pages/Faq"));
const Sources = lazy(() => import("./pages/Sources"));
const Methodology = lazy(() => import("./pages/Methodology"));
const Guides = lazy(() => import("./pages/Guides"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));
const Glossary = lazy(() => import("./pages/Glossary"));
const ParisIndex = lazy(() => import("./pages/ParisIndex"));
const Arrondissement = lazy(() => import("./pages/Arrondissement"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Profile = lazy(() => import("./pages/Profile"));

const queryClient = new QueryClient();

/** Route table shared by both locales; the English tree is mounted under /en. */
const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/presentation" element={<Presentation />} />
    <Route path="/a-propos" element={<About />} />
    <Route path="/faq" element={<Faq />} />
    <Route path="/sources" element={<Sources />} />
    <Route path="/methodologie" element={<Methodology />} />
    <Route path="/guides" element={<Guides />} />
    <Route path="/guides/:slug" element={<GuideDetail />} />
    <Route path="/glossaire" element={<Glossary />} />
    <Route path="/paris" element={<ParisIndex />} />
    <Route path="/paris/:slug" element={<Arrondissement />} />
    <Route path="/signin" element={<SignIn />} />
    <Route path="/signup" element={<SignUp />} />
    <Route path="/profile" element={<Profile />} />

    <Route path="/en" element={<Index />} />
    <Route path="/en/presentation" element={<Presentation />} />
    <Route path="/en/a-propos" element={<About />} />
    <Route path="/en/faq" element={<Faq />} />
    <Route path="/en/sources" element={<Sources />} />
    <Route path="/en/methodologie" element={<Methodology />} />
    <Route path="/en/guides" element={<Guides />} />
    <Route path="/en/guides/:slug" element={<GuideDetail />} />
    <Route path="/en/glossaire" element={<Glossary />} />
    <Route path="/en/paris" element={<ParisIndex />} />
    <Route path="/en/paris/:slug" element={<Arrondissement />} />
    <Route path="/en/signin" element={<SignIn />} />
    <Route path="/en/signup" element={<SignUp />} />
    <Route path="/en/profile" element={<Profile />} />

    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LocaleProvider>
            {/* Inside LocaleProvider so a page still resolving keeps the locale it was asked in. */}
            <Suspense fallback={null}>
              <AppRoutes />
            </Suspense>
          </LocaleProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
