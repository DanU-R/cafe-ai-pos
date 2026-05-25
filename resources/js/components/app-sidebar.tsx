import { Link, usePage } from '@inertiajs/react';
import {
    BadgeAlert,
    BarChart3,
    Boxes,
    ChefHat,
    ClipboardList,
    FlaskConical,
    History,
    LayoutDashboard,
    ReceiptText,
    RotateCcw,
    Settings,
    ShoppingCart,
    Sparkles,
    Table2,
    Tags,
    TicketPercent,
    TrendingUp,
    Truck,
    UserCog,
    UsersRound,
    Utensils,
    Wallet,
    Warehouse,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';
import type { User } from '@/types/auth';

const cashierNavItems: NavItem[] = [
    {
        title: 'Kasir/POS',
        href: '/pos',
        icon: ShoppingCart,
    },
    {
        title: 'Shift Kasir',
        href: '/cashier-shifts',
        icon: Wallet,
    },
    {
        title: 'Riwayat Transaksi',
        href: '/orders',
        icon: ReceiptText,
    },
    {
        title: 'Kitchen Display',
        href: '/kitchen',
        icon: ChefHat,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutDashboard,
    },
    ...cashierNavItems,
    {
        title: 'Manajemen User',
        href: '/users',
        icon: UserCog,
    },
    {
        title: 'Customer/Member',
        href: '/customers',
        icon: UsersRound,
    },
    {
        title: 'Promo/Voucher',
        href: '/promotions',
        icon: TicketPercent,
    },
    {
        title: 'Setting POS',
        href: '/settings/payment',
        icon: Settings,
    },
    {
        title: 'Audit Log',
        href: '/audit-logs',
        icon: ClipboardList,
    },
    {
        title: 'Laporan Penjualan',
        href: '/reports/sales',
        icon: BarChart3,
    },
    {
        title: 'Laporan Profit',
        href: '/reports/profit',
        icon: TrendingUp,
    },
    {
        title: 'Laporan Refund',
        href: '/reports/refunds',
        icon: RotateCcw,
    },
    {
        title: 'Laporan Stok',
        href: '/reports/stock-movements',
        icon: Warehouse,
    },
    {
        title: 'Alert Stok Minimum',
        href: '/reports/low-stock',
        icon: BadgeAlert,
    },
    {
        title: 'Kategori',
        href: '/categories',
        icon: Tags,
    },
    {
        title: 'Meja Dine-in',
        href: '/dining-tables',
        icon: Table2,
    },
    {
        title: 'Produk/Menu',
        href: '/products',
        icon: Utensils,
    },
    {
        title: 'Bahan Baku',
        href: '/raw-materials',
        icon: FlaskConical,
    },
    {
        title: 'Wastage Bahan',
        href: '/wastage/create',
        icon: History,
    },
    {
        title: 'Stock Opname',
        href: '/stock-opnames',
        icon: Warehouse,
    },
    {
        title: 'Supplier',
        href: '/suppliers',
        icon: Truck,
    },
    {
        title: 'Pembelian Stok',
        href: '/purchases',
        icon: Boxes,
    },
    {
        title: 'Pembelian Bahan',
        href: '/raw-material-purchases',
        icon: Boxes,
    },
    {
        title: 'AI Deskripsi Menu',
        href: '/ai/menu-description',
        icon: Sparkles,
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const user = usePage().props.auth.user as User;
    const isAdmin = user.role === 'super_admin' || user.role === 'admin';
    const mainNavItems = isAdmin ? adminNavItems : cashierNavItems;
    const homeHref = isAdmin ? dashboard() : '/pos';

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={homeHref} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
