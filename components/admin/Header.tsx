import { Session } from "next-auth";
import NotificationBell from "@/components/NotificationBell";

interface AdminHeaderProps {
  session: Session;
  /** SSR-seeded unread count — paints the badge on first byte, no fetch flash. */
  initialUnreadCount?: number;
}

const Header = ({ session, initialUnreadCount }: AdminHeaderProps) => {
  return (
    <header className="admin-header">
      <div className="space-y-1 sm:space-y-2">
        <h2 className="text-xl font-semibold text-dark-400 sm:text-xl">
          {session?.user?.name}
        </h2>
        <p className="text-sm text-slate-500 sm:text-base">
          Monitor all of your users and books here
        </p>
      </div>

      <NotificationBell variant="light" initialUnreadCount={initialUnreadCount} />
    </header>
  );
};
export default Header;
