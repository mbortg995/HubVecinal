import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterOrganization() {
  const { registerOrganization } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ organizationName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerOrganization(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear la organización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">HubVecinal</h1>
          <p className="text-sm text-muted-foreground">Da de alta tu administradora de fincas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nueva organización</CardTitle>
            <CardDescription>
              Crea la cuenta de tu administradora. Serás el <strong>superadmin</strong> y podrás dar de
              alta y gestionar todas tus comunidades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="organizationName">Nombre de la administradora</Label>
                <Input
                  id="organizationName"
                  value={form.organizationName}
                  onChange={update('organizationName')}
                  placeholder="Ej. Administraciones García"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Tu nombre</Label>
                <Input id="name" value={form.name} onChange={update('name')} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={update('email')} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={update('password')}
                  minLength={6}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creando…' : 'Crear organización'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
