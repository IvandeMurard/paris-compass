
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
import { LockIcon, MailIcon, UserIcon } from 'lucide-react';

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
  },
} as const;

const SignUp = () => {
  const { signUp, user } = useAuth();
  const { locale, lp } = useLocale();
  const copy = COPY[locale];
  const [isLoading, setIsLoading] = useState(false);

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
    const { success } = await signUp(values.email, values.password);
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
