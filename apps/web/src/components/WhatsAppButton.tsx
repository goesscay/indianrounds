import { MessageCircle } from "lucide-react";
import { site } from "@/lib/site";

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hi Indian Rounds, I'd like help planning a trip.")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-float transition hover:scale-105"
    >
      <MessageCircle size={28} />
    </a>
  );
}
