import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  nome: z.string().min(1, "O nome é obrigatório"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

const updatePasswordSchema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "A confirmação é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      nome: "",
    },
  });

  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const updatePasswordForm = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    console.log('[AuthPage] Component mounted, checking for recovery mode...');
    
    // Setup auth state listener FIRST (before checking anything)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthPage] Auth event:', event, 'Session:', session ? 'present' : 'missing');
      console.log('[AuthPage] Full session data:', session);
      
      // When PASSWORD_RECOVERY event occurs, set both flags
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[AuthPage] PASSWORD_RECOVERY event detected!');
        setIsRecoveryMode(true);
        setSessionReady(true);
      }
      
      // Also check if we have a session and recovery mode was set
      if (event === 'SIGNED_IN' && session) {
        // Check if this is from a recovery link
        const recoveryFlag = sessionStorage.getItem('passwordRecoveryMode');
        if (recoveryFlag === 'true') {
          console.log('[AuthPage] SIGNED_IN event with recovery flag');
          setIsRecoveryMode(true);
          setSessionReady(true);
          sessionStorage.removeItem('passwordRecoveryMode');
        }
      }
    });

    // Check sessionStorage (set by RecoveryDetector)
    const recoveryFlag = sessionStorage.getItem('passwordRecoveryMode');
    console.log('[AuthPage] Recovery flag in sessionStorage:', recoveryFlag);
    
    if (recoveryFlag === 'true') {
      console.log('[AuthPage] Recovery mode detected from sessionStorage');
      setIsRecoveryMode(true);
      // DON'T remove the flag yet - let the auth listener handle it
    }
    
    // Fallback: check hash directly
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    console.log('[AuthPage] URL hash params - type:', type, 'has token:', !!accessToken);
    
    if (type === 'recovery' && accessToken) {
      console.log('[AuthPage] Recovery mode detected from URL hash - Supabase will process it');
      setIsRecoveryMode(true);
      // DON'T clean the URL yet - let Supabase process the hash first
    }

    // Check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthPage] Current session on mount:', session ? 'present' : 'missing');
      if (session && (recoveryFlag === 'true' || type === 'recovery')) {
        console.log('[AuthPage] Session already exists, setting ready');
        setSessionReady(true);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('[AuthPage] Component unmounting, cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  const onLogin = async (values: LoginFormValues) => {
    setIsLoading(true);
    const loadingToastId = showLoading("Fazendo login...");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      dismissToast(loadingToastId);
      showSuccess("Login realizado com sucesso!");
      navigate("/profile");
    } catch (error) {
      dismissToast(loadingToastId);
      showError(`Erro ao fazer login: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSignup = async (values: SignupFormValues) => {
    setIsLoading(true);
    const loadingToastId = showLoading("Criando conta...");

    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            nome: values.nome,
          },
        },
      });

      if (error) throw error;

      dismissToast(loadingToastId);
      showSuccess("Conta criada com sucesso! Você já pode fazer login.");
      signupForm.reset();
    } catch (error) {
      dismissToast(loadingToastId);
      showError(`Erro ao criar conta: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onResetPassword = async (values: ResetPasswordFormValues) => {
    setIsLoading(true);
    const loadingToastId = showLoading("Enviando email de recuperação...");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      dismissToast(loadingToastId);
      showSuccess("Email de recuperação enviado! Verifique sua caixa de entrada.");
      resetPasswordForm.reset();
    } catch (error) {
      dismissToast(loadingToastId);
      showError(`Erro ao enviar email: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onUpdatePassword = async (values: UpdatePasswordFormValues) => {
    setIsLoading(true);
    const loadingToastId = showLoading("Atualizando senha...");

    try {
      // Verificar se há sessão válida antes de tentar atualizar
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AuthPage] Attempting password update, session:', session ? 'present' : 'missing');
      
      if (!session) {
        throw new Error("Sessão não encontrada. Por favor, clique novamente no link de recuperação.");
      }

      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) throw error;

      console.log('[AuthPage] Password updated successfully');
      
      dismissToast(loadingToastId);
      showSuccess("Senha atualizada com sucesso! Faça login com sua nova senha.");
      
      // Logout para forçar novo login com nova senha (melhor prática de segurança)
      await supabase.auth.signOut();
      console.log('[AuthPage] User signed out after password update');
      
      setIsRecoveryMode(false);
      setSessionReady(false);
      updatePasswordForm.reset();
      
      // Permanecer na página /auth para novo login
      // navigate não necessário pois já estamos em /auth
    } catch (error) {
      dismissToast(loadingToastId);
      showError(`Erro ao atualizar senha: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      console.error('[AuthPage] Error updating password:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-serif text-center">
            {isRecoveryMode ? "Criar Nova Senha" : "Bem-vindo"}
          </CardTitle>
          <CardDescription className="text-center">
            {isRecoveryMode 
              ? "Defina sua nova senha abaixo" 
              : "Entre ou crie uma nova conta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRecoveryMode && !sessionReady ? (
            <div className="flex flex-col items-center justify-center space-y-4 p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Preparando atualização de senha...
              </p>
            </div>
          ) : isRecoveryMode && sessionReady ? (
            <Form {...updatePasswordForm}>
              <form onSubmit={updatePasswordForm.handleSubmit(onUpdatePassword)} className="space-y-4">
                <FormField
                  control={updatePasswordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={updatePasswordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Nova Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  Atualizar Senha
                </Button>
              </form>
            </Form>
          ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Cadastro</TabsTrigger>
                <TabsTrigger value="reset">Recuperar</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="seu@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Entrar
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="signup">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="seu@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Criar Conta
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="reset">
                <Form {...resetPasswordForm}>
                  <form onSubmit={resetPasswordForm.handleSubmit(onResetPassword)} className="space-y-4">
                    <FormField
                      control={resetPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="seu@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      Enviar Link de Recuperação
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
