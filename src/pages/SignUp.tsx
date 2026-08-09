
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
import { LockIcon, MailIcon, UserIcon } from 'lucide-react';

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
    confirmRequired: 'La confirmation du mot de passe est requise',
    passwordsMismatch: 'Les mots de passe ne correspondent pas',
    brand: 'Compass',
    title: 'Créer un compte',
    subtitle: 'Inscrivez-vous pour enregistrer vos locaux favoris et recevoir des notifications',
    email: 'E-mail',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    creating: 'Création du compte…',
    signUp: "S'inscrire",
    alreadyAccount: 'Vous avez déjà un compte ?',
    signIn: 'Se connecter',
    continueWithGoogle: 'Continuer avec Google',
    or: 'ou',
    googleError: 'La connexion Google a échoué.',
  },
  en: {
    invalidEmail: 'Please enter a valid email address',
    passwordMin: 'Password must be at least 6 characters',
    confirmRequired: 'Confirm password is required',
    passwordsMismatch: "Passwords don't match",
    brand: 'Compass',
    title: 'Create an Account',
    subtitle: 'Sign up to save your favorite properties and receive notifications',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    creating: 'Creating account...',
    signUp: 'Sign Up',
    alreadyAccount: 'Already have an account?',
    signIn: 'Sign In',
    continueWithGoogle: 'Continue with Google',
    or: 'or',
    googleError: 'Google sign-in failed.',
  },
} as const;

const SignUp = () => {
  const { signUp, user } = useAuth();
  const { locale, lp } = useLocale();
  const copy = COPY[locale];
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const formSchema = z.object({
    email: z.string().email(copy.invalidEmail),
    password: z.string().min(6, copy.passwordMin),
    confirmPassword: z.string().min(6, copy.confirmRequired),
  }).refine(data => data.password === data.confirmPassword, {
    message: copy.passwordsMismatch,
    path: ['confirmPassword'],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    await signUp(values.email, values.password);
    setIsLoading(false);
  };

  const handleGoogleSignUp = async () => {
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
      <Seo title={copy.title} description={copy.subtitle} path="/signup" noindex />
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">{copy.brand}</h1>
          <h2 className="mt-6 text-xl font-semibold">{copy.title}</h2>
          <p className="mt-2 text-sm text-gray-500">
            {copy.subtitle}
          </p>
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
                    <Input placeholder="your@email.com" type="email" {...field} />
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

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <LockIcon size={16} />
                    {copy.confirmPassword}
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
              {isLoading ? copy.creating : copy.signUp}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm">
          <p>
            {copy.alreadyAccount}{' '}
            <Link to={lp('/signin')} className="text-primary hover:underline font-medium">
              {copy.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
