import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Lock,
  Key,
  AlertCircle,
  Check,
  Search
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Secret {
  id: string;
  key: string;
  value: string;
  lastModified: string;
  isRevealed?: boolean;
}

export function ReplitSecretsPanel({ projectId }: { projectId?: string }) {
  const [secrets, setSecrets] = useState<Secret[]>([
    {
      id: '1',
      key: 'DATABASE_URL',
      value: 'postgresql://user:pass@localhost:5432/mydb',
      lastModified: '2 days ago'
    },
    {
      id: '2',
      key: 'API_KEY',
      value: 'sk-1234567890abcdef1234567890abcdef',
      lastModified: '1 week ago'
    },
    {
      id: '3',
      key: 'JWT_SECRET',
      value: 'super-secret-jwt-token-key-here',
      lastModified: '1 month ago'
    },
    {
      id: '4',
      key: 'STRIPE_SECRET_KEY',
      value: 'sk_live_1234567890abcdefghijklmnop',
      lastModified: '3 days ago'
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredSecrets = secrets.filter(secret =>
    secret.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleReveal = (secretId: string) => {
    setSecrets(secrets.map(s => 
      s.id === secretId ? { ...s, isRevealed: !s.isRevealed } : s
    ));
  };

  const handleAddSecret = () => {
    if (newSecretKey && newSecretValue) {
      const newSecret: Secret = {
        id: Date.now().toString(),
        key: newSecretKey.toUpperCase().replace(/\s+/g, '_'),
        value: newSecretValue,
        lastModified: 'just now'
      };
      setSecrets([...secrets, newSecret]);
      setNewSecretKey('');
      setNewSecretValue('');
      setShowAddDialog(false);
    }
  };

  const handleUpdateSecret = () => {
    if (editingSecret && newSecretKey && newSecretValue) {
      setSecrets(secrets.map(s => 
        s.id === editingSecret.id 
          ? { ...s, key: newSecretKey.toUpperCase().replace(/\s+/g, '_'), value: newSecretValue, lastModified: 'just now' }
          : s
      ));
      setEditingSecret(null);
      setNewSecretKey('');
      setNewSecretValue('');
    }
  };

  const handleDeleteSecret = (secretId: string) => {
    setSecrets(secrets.filter(s => s.id !== secretId));
  };

  const handleCopyValue = (secret: Secret) => {
    navigator.clipboard.writeText(secret.value);
    setCopiedId(secret.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    const envContent = secrets.map(s => `${s.key}=${s.value}`).join('\n');
    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    a.click();
  };

  const maskValue = (value: string) => {
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '•'.repeat(value.length - 8) + value.slice(-4);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Secrets</h3>
            <Badge variant="secondary" className="text-xs">
              {secrets.length}
            </Badge>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Secret
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search secrets..."
            className="pl-9 text-sm"
          />
        </div>

        {/* Warning */}
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div className="text-xs text-yellow-800">
            <p className="font-medium">Keep your secrets safe!</p>
            <p className="mt-0.5">Never commit secrets to your repository or share them publicly.</p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={handleExport}>
          <Download className="h-3 w-3 mr-1" />
          Export .env
        </Button>
        <Button variant="outline" size="sm" className="text-xs">
          <Upload className="h-3 w-3 mr-1" />
          Import
        </Button>
      </div>

      {/* Secrets List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredSecrets.length > 0 ? (
            filteredSecrets.map((secret) => (
              <div
                key={secret.id}
                className="mb-2 p-3 border border-gray-200 rounded hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-gray-400" />
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {secret.key}
                      </span>
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {secret.lastModified}
                      </Badge>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">
                        {secret.isRevealed ? secret.value : maskValue(secret.value)}
                      </code>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleToggleReveal(secret.id)}
                    >
                      {secret.isRevealed ? (
                        <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                      ) : (
                        <Eye className="h-3.5 w-3.5 text-gray-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopyValue(secret)}
                    >
                      {copiedId === secret.id ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-gray-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingSecret(secret);
                        setNewSecretKey(secret.key);
                        setNewSecretValue(secret.value);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5 text-gray-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteSecret(secret.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Lock className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                {searchQuery ? 'No secrets found' : 'No secrets yet'}
              </p>
              {!searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add your first secret
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog || !!editingSecret} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingSecret(null);
          setNewSecretKey('');
          setNewSecretValue('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSecret ? 'Edit Secret' : 'Add New Secret'}
            </DialogTitle>
            <DialogDescription>
              {editingSecret 
                ? 'Update the key and value for this secret.'
                : 'Add a new environment secret to your project.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="key" className="text-sm font-medium">
                Key
              </label>
              <Input
                id="key"
                value={newSecretKey}
                onChange={(e) => setNewSecretKey(e.target.value)}
                placeholder="SECRET_KEY_NAME"
                className="mt-1 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use uppercase letters and underscores
              </p>
            </div>
            
            <div>
              <label htmlFor="value" className="text-sm font-medium">
                Value
              </label>
              <Input
                id="value"
                type="password"
                value={newSecretValue}
                onChange={(e) => setNewSecretValue(e.target.value)}
                placeholder="Enter secret value"
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingSecret(null);
                setNewSecretKey('');
                setNewSecretValue('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingSecret ? handleUpdateSecret : handleAddSecret}>
              {editingSecret ? 'Update' : 'Add'} Secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}