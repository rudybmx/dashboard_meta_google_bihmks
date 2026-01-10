import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useState } from "react";

export function MobileNav({ activeView, setActiveView, isDemoMode }: any) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu size={24} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <Sidebar 
          activeView={activeView} 
          setActiveView={(v: any) => { setActiveView(v); setOpen(false); }} 
          isDemoMode={isDemoMode}
          className="border-none"
        />
      </SheetContent>
    </Sheet>
  );
}
