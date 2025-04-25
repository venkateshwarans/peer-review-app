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
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function Navbar() {
  const { organization, setOrganization, refreshData } = useGitHub();
  
  const handleOrgChange = (value: string) => {
    setOrganization(value);
  };

  return (
    <nav className="border-b bg-background">
      <div className="container flex h-16 items-center mx-auto">
        <div className="flex items-center space-x-4">
          <Link href="/" className="font-semibold text-2xl tracking-tight font-sans">
            Rubber Ducks
          </Link>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium font-sans">Rubber Duck Debugging</h4>
                <p className="text-sm text-muted-foreground font-sans">
                  <span className="font-medium">Pronunciation:</span> &quot;/ˈrʌbə dʌk dɪˈbʌɡɪŋ&quot;
                </p>
                <p className="text-sm text-muted-foreground font-sans">
                  A method of debugging code by explaining it line-by-line to an inanimate object, such as a rubber duck. 
                  The act of explaining the problem often leads to discovering the solution.
                </p>
                <p className="text-sm text-muted-foreground font-sans">
                  <span className="font-medium">Origin:</span> The concept was popularized in the book &quot;The Pragmatic Programmer&quot; 
                  by Andrew Hunt and David Thomas.
                </p>
              </div>
            </PopoverContent>
          </Popover>
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
            className='pointer'
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
