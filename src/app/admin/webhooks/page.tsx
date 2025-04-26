'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy, CheckCircle2, AlertCircle } from 'lucide-react';

export default function WebhooksPage() {
  const [copied, setCopied] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  
  // Generate webhook URL based on current hostname
  const getWebhookUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.origin;
      return `${hostname}/api/webhooks/github`;
    }
    return '[Your app URL]/api/webhooks/github';
  };
  
  // Generate a random secret key
  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setSecretKey(secret);
  };
  
  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">GitHub Webhook Setup</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Create a Webhook Secret</CardTitle>
            <CardDescription>
              Generate a secure secret key to authenticate webhook requests from GitHub
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <Input 
                  type={showSecret ? "text" : "password"} 
                  value={secretKey} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecretKey(e.target.value)}
                  placeholder="Webhook Secret Key"
                  className="font-mono"
                />
                <Button 
                  variant="outline" 
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? "Hide" : "Show"}
                </Button>
                <Button onClick={generateSecret}>Generate</Button>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Save this secret key securely. You&apos;ll need to add it to your Vercel environment variables.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>2. Add Secret to Vercel Environment</CardTitle>
            <CardDescription>
              Add the webhook secret to your Vercel project environment variables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-4 pl-4">
              <li>Go to your Vercel project dashboard</li>
              <li>Navigate to <strong>Settings</strong> &gt; <strong>Environment Variables</strong></li>
              <li>Add a new environment variable:
                <div className="bg-muted p-3 rounded-md mt-2 font-mono">
                  <div><span className="text-muted-foreground">Name:</span> GITHUB_WEBHOOK_SECRET</div>
                  <div><span className="text-muted-foreground">Value:</span> {showSecret ? secretKey || '[your generated secret]' : '••••••••••••••••'}</div>
                </div>
              </li>
              <li>Click <strong>Save</strong> and redeploy your application</li>
            </ol>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>3. Configure GitHub Webhook</CardTitle>
            <CardDescription>
              Set up the webhook in your GitHub repository or organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="repo">
              <TabsList className="mb-4">
                <TabsTrigger value="repo">Repository Webhook</TabsTrigger>
                <TabsTrigger value="org">Organization Webhook</TabsTrigger>
              </TabsList>
              
              <TabsContent value="repo" className="space-y-4">
                <ol className="list-decimal list-inside space-y-4 pl-4">
                  <li>Go to your GitHub repository</li>
                  <li>Navigate to <strong>Settings</strong> &gt; <strong>Webhooks</strong> &gt; <strong>Add webhook</strong></li>
                  <li>
                    Enter the Payload URL:
                    <div className="flex items-center mt-2">
                      <code className="bg-muted p-2 rounded-md flex-1 font-mono text-sm">
                        {getWebhookUrl()}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(getWebhookUrl())}
                        className="ml-2"
                      >
                        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </li>
                  <li>Set Content type to <strong>application/json</strong></li>
                  <li>Enter your webhook secret</li>
                  <li>
                    Select events to trigger the webhook:
                    <ul className="list-disc list-inside pl-6 mt-2">
                      <li>Pull requests</li>
                      <li>Pull request reviews</li>
                      <li>Pushes</li>
                    </ul>
                  </li>
                  <li>Click <strong>Add webhook</strong></li>
                </ol>
              </TabsContent>
              
              <TabsContent value="org" className="space-y-4">
                <ol className="list-decimal list-inside space-y-4 pl-4">
                  <li>Go to your GitHub organization</li>
                  <li>Navigate to <strong>Settings</strong> &gt; <strong>Webhooks</strong> &gt; <strong>Add webhook</strong></li>
                  <li>
                    Enter the Payload URL:
                    <div className="flex items-center mt-2">
                      <code className="bg-muted p-2 rounded-md flex-1 font-mono text-sm">
                        {getWebhookUrl()}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(getWebhookUrl())}
                        className="ml-2"
                      >
                        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </li>
                  <li>Set Content type to <strong>application/json</strong></li>
                  <li>Enter your webhook secret</li>
                  <li>
                    Select events to trigger the webhook:
                    <ul className="list-disc list-inside pl-6 mt-2">
                      <li>Pull requests</li>
                      <li>Pull request reviews</li>
                      <li>Pushes</li>
                    </ul>
                  </li>
                  <li>Click <strong>Add webhook</strong></li>
                </ol>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>4. Test the Webhook</CardTitle>
            <CardDescription>
              Verify that your webhook is working correctly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-4 pl-4">
              <li>Go to the webhook settings in GitHub</li>
              <li>Scroll down to &quot;Recent Deliveries&quot;</li>
              <li>Click on &quot;Redeliver&quot; to test an existing payload or create a new pull request to trigger the webhook</li>
              <li>Check the response code (should be 200 OK)</li>
              <li>Visit the <a href="/admin/sync" className="text-blue-600 hover:underline">Sync Status</a> page to verify that webhook events are being recorded</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
