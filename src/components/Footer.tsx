import { MessageCircle } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card mt-8">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🦜</span>
            <span className="font-display font-bold text-foreground">ParrotNG</span>
            <span className="text-xs text-muted-foreground">· parrot.com.ng</span>
          </div>

          <a
            href="https://wa.me/2347030553134"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-[#25D366]/10 px-4 py-2 text-sm font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Contact us on WhatsApp
          </a>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          © {year} ParrotNG — What Nigerians Really Think
        </div>
      </div>
    </footer>
  );
};

export default Footer;
