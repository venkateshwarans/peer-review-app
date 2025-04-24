'use client';

import Link from 'next/link';
import { useGitHub } from '@/lib/github/context';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function Navbar() {
  const { organization, setOrganization, refreshData } = useGitHub();
  
  const handleOrgChange = (value: string) => {
    setOrganization(value);
  };

  return (
    <nav className="border-b bg-background">
      <div className="container flex h-16 items-center px-4 mx-auto">
        <div className="flex items-center space-x-4">
          <Link href="/" className="font-bold text-xl">
            Rubber Ducks
          </Link>
        </div>
        
        <div className="ml-auto flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Organization:</span>
            <Select value={organization} onValueChange={handleOrgChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sarasanalytics-com">sarasanalytics-com</SelectItem>
                {/* Add more organizations as needed */}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refreshData()}
          >
            Refresh Data
          </Button>
          
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
