
import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/providers/AuthProvider';
import { useLocale } from '@/i18n/locale';
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

const COPY = {
  fr: {
    invalidEmail: 'Veuillez saisir une adresse e-mail valide',
    passwordMin: 'Le mot de passe doit contenir au moins 6 caractères',
    brand: 'Paris Property Compass',
    title: 'Connexion',
    subtitle: 'Saisissez vos identifiants pour accéder à votre compte',
    email: 'E-mail',
    password: 'Mot de passe',
    signingIn: 'Connexion en cours…',
    signIn: 'Se connecter',
    noAccount: "Vous n'avez pas de compte ?",
    signUp: 'Créer un compte',
  },
  en: {
    invalidEmail: 'Please enter a valid email address',
    passwordMin: 'Password must be at least 6 characters',
    brand: 'Paris Property Compass',
    title: 'Sign In',
    subtitle: 'Enter your details to access your account',
    email: 'Email',
    password: 'Password',
    signingIn: 'Signing in...',
    signIn: 'Sign In',
    noAccount: "Don't have an account?",
    signUp: 'Sign Up',
  },
} as const;

const SignIn = () => {
  const { signIn, user } = useAuth();
  const { locale, lp } = useLocale();
  const copy = COPY[locale];
  const [isLoading, setIsLoading] = useState(false);

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
    const { success } = await signIn(values.email, values.password);
    setIsLoading(false);
  };

  // Redirect if user is already signed in
  if (user) {
    return <Navigate to={lp('/')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
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
