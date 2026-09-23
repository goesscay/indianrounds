import {
  BarChart3,
  Briefcase,
  CalendarCheck,
  CalendarRange,
  ClipboardCheck,
  Compass,
  CreditCard,
  FileText,
  Handshake,
  History,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  Map,
  MapPin,
  Megaphone,
  MessageSquareWarning,
  Newspaper,
  PieChart,
  Quote,
  Receipt,
  Settings,
  Settings2,
  ShieldCheck,
  Tags,
  TrendingUp,
  Undo2,
  UserCog,
  UserPlus,
  Users,
  Users2,
  UserSearch,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; perm: string | null; icon: LucideIcon };
export type NavGroup = { label: string; icon: LucideIcon; items: NavItem[] };

/** Always visible, not part of a group. */
export const dashboardItem: NavItem = { href: "/admin", label: "Dashboard", perm: null, icon: LayoutDashboard };

export const navGroups: NavGroup[] = [
  {
    label: "Tours & Destinations",
    icon: Compass,
    items: [
      { href: "/admin/tours", label: "Tours", perm: "tours.view", icon: Map },
      { href: "/admin/destinations", label: "Destinations", perm: "destinations.view", icon: MapPin },
      { href: "/admin/tour-categories", label: "Tour Categories", perm: "tours.view", icon: Tags },
    ],
  },
  {
    label: "Sales & Enquiries",
    icon: Handshake,
    items: [
      { href: "/admin/leads", label: "Leads", perm: "leads.view", icon: UserPlus },
      { href: "/admin/bookings", label: "Bookings", perm: "bookings.view", icon: CalendarCheck },
      { href: "/admin/customers", label: "Customers", perm: "customers.view", icon: Users },
    ],
  },
  {
    label: "Finance",
    icon: Wallet,
    items: [
      { href: "/admin/payments", label: "Payments", perm: "payments.view", icon: CreditCard },
      { href: "/admin/refunds", label: "Refunds", perm: "refunds.view", icon: Undo2 },
      { href: "/admin/credit-notes", label: "Credit Notes", perm: "credit_notes.view", icon: Receipt },
    ],
  },
  {
    label: "Content & Marketing",
    icon: Megaphone,
    items: [
      { href: "/admin/testimonials", label: "Testimonials", perm: "testimonials.view", icon: Quote },
      { href: "/admin/posts", label: "Blog Posts", perm: "posts.view", icon: Newspaper },
      { href: "/admin/case-studies", label: "Case Studies", perm: "case_studies.manage", icon: FileText },
    ],
  },
  {
    label: "Customer Support",
    icon: LifeBuoy,
    items: [{ href: "/admin/grievances", label: "Grievances", perm: "grievances.view", icon: MessageSquareWarning }],
  },
  {
    label: "Operations",
    icon: ClipboardCheck,
    items: [{ href: "/admin/approvals", label: "Approvals", perm: null, icon: ClipboardCheck }],
  },
  {
    label: "Team & Access",
    icon: ShieldCheck,
    items: [
      { href: "/admin/users", label: "Team", perm: "users.manage", icon: UserCog },
      { href: "/admin/roles", label: "Roles & Access", perm: "users.manage", icon: Lock },
    ],
  },
  {
    label: "Careers",
    icon: Briefcase,
    items: [{ href: "/admin/careers", label: "Job Applications", perm: "careers.view", icon: UserSearch }],
  },
  {
    label: "Reports",
    icon: BarChart3,
    items: [
      { href: "/admin/reports/bookings", label: "Booking Reports", perm: "bookings.view", icon: CalendarRange },
      { href: "/admin/reports/sales", label: "Sales Reports", perm: "leads.view", icon: TrendingUp },
      { href: "/admin/reports/payments", label: "Payment Reports", perm: "payments.view", icon: PieChart },
      { href: "/admin/reports/customers", label: "Customer Reports", perm: "customers.view", icon: Users2 },
    ],
  },
  {
    label: "System",
    icon: Settings2,
    items: [
      { href: "/admin/audit", label: "Audit Log", perm: "audit.view", icon: History },
      { href: "/admin/settings", label: "Settings", perm: "settings.manage", icon: Settings },
    ],
  },
];
