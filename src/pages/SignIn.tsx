
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/providers/AuthProvider';
import { useLocale } from '@/i18n/locale';
import { lovable } from '@/integrations/lovable';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LockIcon, MailIcon } from 'lucide-react';

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.766 12.2764c0-.7958-.0706-1.5623-.2032-2.2968H12.2422v4.3418h6.4849c-.2801 1.4985-1.1172 2.766-2.3785 3.6159v3.0077h3.8524c2.2545-2.0756 3.5551-5.1323 3.5551-8.6686z" fill="#4285F4" />
    <path d="M12.2422 24c3.2178 0 5.9173-1.0663 7.8893-2.8865l-3.8524-3.0077c-1.0668.7142-2.4311 1.1348-4.0369 1.1348-3.1053 0-5.7353-2.0934-6.6717-4.9057H1.7655v3.1032C3.8318 21.2935 7.7252 24 12.2422 24z" fill="#34A853" />
    <path d="M5.5705 14.3351c-.2422-.7142-.3814-1.4742-.3814-2.2617 0-.7875.1392-1.5475.3814-2.2617V6.7085H1.7655C.6483 8.9382 0 11.4215 0 14.0734s.6483 5.1351 1.7655 7.3648l3.805-3.1032z" fill="#FBBC05" />
    <path d="M12.2422 4.7945c1.7526 0 3.3262.6013 4.5623 1.7826l3.4226-3.4226C17.9221 1.1558 15.2227 0 12.2422 0 7.7252 0 3.8318 2.7065 1.7655 6.7085l3.805 3.1032c.9364-2.8123 3.5664-4.9057 6.6717-4.9057z" fill="#EA4335" />
  </svg>
);

const COPY = {
  fr: {
    invalidEmail: 'Veuillez saisir une adresse e-mail valide',
    passwordMin: 'Le mot de passe doit contenir au moins 6 caractères',
    brand: 'Compass',
    title: 'Connexion',
    subtitle: 'Saisissez vos identifiants pour accéder à votre compte',
    email: 'E-mail',
    password: 'Mot de passe',
    signingIn: 'Connexion en cours…',
    signIn: 'Se connecter',
    noAccount: "Vous n'avez pas de compte ?",
    signUp: 'Créer un compte',
    continueWithGoogle: 'Continuer avec Google',
    or: 'ou',
    googleError: 'La connexion Google a échoué.',
  },
  en: {
    invalidEmail: 'Please enter a valid email address',
    passwordMin: 'Password must be at least 6 characters',
    brand: 'Compass',
    title: 'Sign In',
    subtitle: 'Enter your details to access your account',
    email: 'Email',
    password: 'Password',
    signingIn: 'Signing in...',
    signIn: 'Sign In',
    noAccount: "Don't have an account?",
    signUp: 'Sign Up',
    continueWithGoogle: 'Continue with Google',
    or: 'or',
    googleError: 'Google sign-in failed.',
  },
} as const;

const SignIn = () => {
  const { signIn, user } = useAuth();
  const { locale, lp } = useLocale();
  const copy = COPY[locale];
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const formSchema = z.object({
    email: z.string().email(copy.invalidEmail),
    password: z.string().min(6, copy.passwordMin),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    await signIn(values.email, values.password);
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setGoogleError(null);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    setIsGoogleLoading(false);
    if (result.error) {
      setGoogleError(copy.googleError);
    }
  };

  // Redirect if user is already signed in
  if (user) {
    return <Navigate to={lp('/')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <Seo title={copy.title} description={copy.subtitle} path="/signin" noindex />
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">{copy.brand}</h1>
          <h2 className="mt-6 text-xl font-semibold">{copy.title}</h2>
          <p className="mt-2 text-sm text-gray-500">
            {copy.subtitle}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <span className="animate-pulse">{copy.continueWithGoogle}</span>
          ) : (
            <>
              <GoogleIcon className="mr-2 h-4 w-4" />
              {copy.continueWithGoogle}
            </>
          )}
        </Button>

        {googleError && (
          <p className="text-sm text-red-600 text-center">{googleError}</p>
        )}

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <span className="relative bg-white px-3 text-xs text-gray-500">{copy.or}</span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MailIcon size={16} />
                    {copy.email}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="your@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <LockIcon size={16} />
                    {copy.password}
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? copy.signingIn : copy.signIn}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm">
          <p>
            {copy.noAccount}{' '}
            <Link to={lp('/signup')} className="text-primary hover:underline font-medium">
              {copy.signUp}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
