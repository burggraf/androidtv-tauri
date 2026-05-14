import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { xstreamAuthenticate } from '@/lib/xstream'
import { type ProviderInput } from '@/hooks/useProviders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const providerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  baseUrl: z.string().url('Must be a valid URL'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type ProviderFormValues = z.infer<typeof providerSchema>

interface AuthTestResult {
  status: string
  expiry?: string
  maxConnections?: number
  activeConnections?: number
}

interface ProviderFormProps {
  onSubmit: (data: ProviderInput) => Promise<void>
  onCancel: () => void
}

export default function ProviderForm({ onSubmit, onCancel }: ProviderFormProps) {
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: { name: '', baseUrl: '', username: '', password: '' },
  })

  const [showPassword, setShowPassword] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<AuthTestResult | null>(null)

  const handleTest = async () => {
    setTestError(null)
    setTestResult(null)
    setTesting(true)

    try {
      const values = getValues()
      if (!values.baseUrl || !values.username || !values.password) {
        setTestError('Fill in URL, username, and password first.')
        return
      }

      const auth = await xstreamAuthenticate(values.baseUrl, values.username, values.password)
      const info = auth.user_info!

      const expDate = info.exp_date ? new Date(parseInt(info.exp_date) * 1000) : null

      setTestResult({
        status: info.status ?? 'Unknown',
        expiry: expDate?.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        maxConnections: info.max_connections ? parseInt(info.max_connections) : undefined,
        activeConnections: info.active_cons ? parseInt(info.active_cons) : undefined,
      })
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="pf-name">Provider Name</Label>
        <Input id="pf-name" placeholder="My IPTV Provider" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {/* Base URL */}
      <div className="space-y-2">
        <Label htmlFor="pf-baseurl">Server URL</Label>
        <Input id="pf-baseurl" type="url" placeholder="http://example.com:8080" {...register('baseUrl')} />
        {errors.baseUrl && <p className="text-sm text-destructive">{errors.baseUrl.message}</p>}
      </div>

      {/* Credentials */}
      <div className="rounded-md border border-zinc-700 p-4 space-y-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Xtream Codes Credentials
        </p>

        <div className="space-y-2">
          <Label htmlFor="pf-username">Username</Label>
          <Input id="pf-username" placeholder="your_username" {...register('username')} />
          {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pf-password">Password</Label>
          <div className="relative">
            <Input id="pf-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pr-10" {...register('password')} />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        {testResult && (
          <div className="text-xs space-y-0.5">
            <span className="text-green-400 font-medium">✓ Connected</span>
            <div className="text-zinc-500">
              Status: {testResult.status}
              {testResult.expiry && ` · Expires: ${testResult.expiry}`}
              {testResult.maxConnections != null && ` · Connections: ${testResult.activeConnections ?? 0}/${testResult.maxConnections}`}
            </div>
          </div>
        )}
      </div>
      {testError && (
        <p className="text-sm text-destructive">{testError}</p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Provider'}
        </Button>
      </div>
    </form>
  )
}
