import { Session } from "next-auth";

const Header = ({ session }: { session: Session }) => {
  return (
    <header className="admin-header">
      <div className="space-y-1 sm:space-y-2">
        <h2 className="text-xl font-semibold text-dark-400 sm:text-2xl">
          {session?.user?.name}
        </h2>
        <p className="text-sm text-slate-500 sm:text-base">
          Monitor all of your users and books here
        </p>
      </div>

      {/*<p>Search</p>*/}
    </header>
  );
};
export default Header;
