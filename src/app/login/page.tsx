import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  const mode = process.env.AUTH_MODE === 'db' ? 'db' : 'demo';

  return (
    <Suspense>
      <LoginForm mode={mode} />
    </Suspense>
  );
}
